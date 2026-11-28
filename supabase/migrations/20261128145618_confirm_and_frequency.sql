-- owner: C (W1). Apply as a NEW migration after draft_workflow.
-- All mutation RPCs are service_role-only. Lock order: project -> draft -> task.
create function public.activate_draft(p_draft_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_pid uuid;
  v_project public.projects%rowtype;
  v_draft public.division_drafts%rowtype;
  v_task jsonb;
  v_assignee jsonb;
  v_tid uuid;
  v_seen uuid[] := '{}'::uuid[];
  v_evidence integer[];
  v_all_evidence integer[] := '{}'::integer[];
  v_tasks jsonb := '[]'::jsonb;
  v_days integer;
  v_time time;
begin
  select project_id into v_pid from public.division_drafts where id = p_draft_id;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  select * into v_project from public.projects where id = v_pid for update;
  if not found then raise exception 'PROJECT_NOT_FOUND'; end if;
  select * into v_draft from public.division_drafts where id = p_draft_id for update;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  if v_draft.status <> 'pending' then raise exception 'DRAFT_LOCKED'; end if;
  if exists (select 1 from public.division_drafts where project_id = v_pid and status = 'active' and version > v_draft.version) then
    raise exception 'DRAFT_OUTDATED';
  end if;
  -- Direct service-role calls must also obey the all-member confirmation rule.
  if (select count(*) from public.members where project_id = v_pid) <> v_project.member_count then
    raise exception 'MEMBERS_NOT_JOINED';
  end if;
  if exists (select 1 from public.members m where m.project_id = v_pid and not exists (
    select 1 from public.division_confirmations c where c.draft_id = p_draft_id and c.member_id = m.id and c.result = 'confirmed'
  )) then raise exception 'DRAFT_NOT_CONFIRMED'; end if;
  if v_draft.import_id is not null and not exists (select 1 from public.transcript_imports where id = v_draft.import_id and project_id = v_pid) then
    raise exception 'DRAFT_INVALID';
  end if;
  if jsonb_typeof(v_draft.tasks) <> 'array' or jsonb_array_length(v_draft.tasks) = 0 then raise exception 'DRAFT_INVALID'; end if;
  -- Recheck structural integrity, in particular references that may have changed after submit.
  if exists (select 1 from public.members m where m.project_id = v_pid and not exists (
    select 1 from jsonb_array_elements(v_draft.tasks) as t(value) cross join lateral jsonb_array_elements(t.value->'assignees') as a(value) where (a.value->>'memberId')::uuid = m.id
  )) then raise exception 'DRAFT_INVALID'; end if;
  for v_task in select value from jsonb_array_elements(v_draft.tasks) loop
    if nullif(btrim(v_task->>'title'), '') is null or v_task->>'deadline' is null
      or (v_task->>'deadline')::date > v_project.final_deadline
      or coalesce(jsonb_array_length(v_task->'assignees'), 0) = 0 then raise exception 'DRAFT_INVALID'; end if;
    -- Do not invalidate an already submitted agreement solely because midnight passed.
    v_evidence := array(select distinct value::integer from jsonb_array_elements_text(v_task->'evidence') order by value::integer);
    if cardinality(v_evidence) > 0 and (v_draft.import_id is null or exists (
      select 1 from unnest(v_evidence) e(idx) where not exists (
        select 1 from public.transcript_messages m where m.import_id = v_draft.import_id and m.idx = e.idx
      )
    )) then raise exception 'DRAFT_INVALID'; end if;
    v_all_evidence := v_all_evidence || v_evidence;
    v_tid := (v_task->>'taskId')::uuid;
    v_days := (v_task->>'reportEveryDays')::integer;
    v_time := coalesce((v_task->>'reportTime')::time, '21:00'::time);
    if v_tid is null then
      -- DB default is 7 until the frequency screen saves its suggestion/selection.
      insert into public.tasks(project_id,draft_id,title,deadline,report_every_days,report_time,evidence)
      values(v_pid,p_draft_id,v_task->>'title',(v_task->>'deadline')::date,coalesce(v_days,7),v_time,v_evidence)
      returning id, report_every_days, report_time into v_tid,v_days,v_time;
    else
      if v_tid = any(v_seen) then raise exception 'DRAFT_INVALID'; end if;
      -- Preserve progress, created_at and UUID. Null frequency means no new setting.
      update public.tasks set draft_id = p_draft_id, title = v_task->>'title', deadline = (v_task->>'deadline')::date,
        report_every_days = coalesce(v_days,report_every_days), report_time = case when v_days is null then report_time else v_time end,
        evidence = v_evidence where id = v_tid and project_id = v_pid
        returning report_every_days, report_time into v_days,v_time;
      if not found then raise exception 'DRAFT_INVALID'; end if;
    end if;
    v_seen := array_append(v_seen,v_tid);
    for v_assignee in select value from jsonb_array_elements(v_task->'assignees') loop
      if not exists (select 1 from public.members where id = (v_assignee->>'memberId')::uuid and project_id = v_pid) then
        raise exception 'DRAFT_INVALID';
      end if;
      insert into public.task_assignees(task_id, member_id, part, joined_via)
      values(v_tid,(v_assignee->>'memberId')::uuid,v_assignee->>'part','initial')
      on conflict(task_id,member_id) do update set part = excluded.part;
    end loop;
    delete from public.task_assignees a where a.task_id = v_tid and not exists (
      select 1 from jsonb_array_elements(v_task->'assignees') as j(value) where (j.value->>'memberId')::uuid = a.member_id
    );
    -- Keep the activated JSON snapshot consistent with materialized tasks.
    v_tasks := v_tasks || jsonb_build_array(v_task || jsonb_build_object('taskId',v_tid,'reportEveryDays',v_days,'reportTime',left(v_time::text,5)));
  end loop;
  -- Do not delete omitted task rows: future checkins may reference them. Active UI filters by active draft_id.
  update public.division_drafts set status = 'superseded', updated_at = greatest(clock_timestamp(),updated_at + interval '1 microsecond')
    where project_id = v_pid and status = 'active' and id <> p_draft_id;
  update public.division_drafts set status = 'active', tasks = v_tasks,
    updated_at = greatest(clock_timestamp(),updated_at + interval '1 microsecond') where id = p_draft_id;
  if v_draft.import_id is not null then
    delete from public.transcript_messages where import_id = v_draft.import_id and not (idx = any(v_all_evidence));
  end if;
end;
$$;

create function public.confirm_division_draft(
  p_draft_id uuid,p_member_id uuid,p_expected_updated_at timestamptz,p_result text,p_comment text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_pid uuid;
  v_project public.projects%rowtype;
  v_draft public.division_drafts%rowtype;
  v_total integer;
  v_confirmed integer;
  v_status text := 'pending';
begin
  select project_id into v_pid from public.division_drafts where id = p_draft_id;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  select * into v_project from public.projects where id = v_pid for update;
  if not found then raise exception 'PROJECT_NOT_FOUND'; end if;
  select * into v_draft from public.division_drafts where id = p_draft_id for update;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  if not exists (select 1 from public.members where id = p_member_id and project_id = v_pid) then raise exception 'NOT_MEMBER'; end if;
  if v_draft.status <> 'pending' then raise exception 'DRAFT_LOCKED'; end if;
  if v_draft.updated_at is distinct from p_expected_updated_at then raise exception 'DRAFT_CHANGED'; end if;
  select count(*) into v_total from public.members where project_id = v_pid;
  -- W1: submit requires full capacity; no membership removal API. The membership set is stable.
  if v_total <> v_project.member_count then raise exception 'MEMBERS_NOT_JOINED'; end if;
  if p_result = 'change_requested' then
    if p_comment is null or char_length(btrim(p_comment)) = 0 or char_length(p_comment) > 200 then raise exception 'DRAFT_INVALID'; end if;
    delete from public.division_confirmations where draft_id = p_draft_id and result = 'confirmed';
    insert into public.division_confirmations(draft_id,member_id,result,comment)
      values(p_draft_id,p_member_id,'change_requested',p_comment)
      on conflict(draft_id,member_id) do update set result = excluded.result,comment = excluded.comment,created_at = clock_timestamp();
    update public.division_drafts set status = 'draft', updated_at = greatest(clock_timestamp(),updated_at + interval '1 microsecond') where id = p_draft_id;
    return jsonb_build_object('status','draft','confirmed',0,'total',v_total);
  elsif p_result is distinct from 'confirmed' then raise exception 'DRAFT_INVALID'; end if;
  if exists (select 1 from public.division_drafts where project_id = v_pid and status = 'active' and version > v_draft.version) then raise exception 'DRAFT_OUTDATED'; end if;
  insert into public.division_confirmations as c(draft_id,member_id,result,comment)
    values(p_draft_id,p_member_id,'confirmed',null)
    on conflict(draft_id,member_id) do update set result = excluded.result,comment = null
    where c.result <> 'confirmed';
  select count(*) into v_confirmed from public.division_confirmations c join public.members m on m.id = c.member_id
    where c.draft_id = p_draft_id and c.result = 'confirmed' and m.project_id = v_pid;
  if v_confirmed = v_total then
    perform public.activate_draft(p_draft_id);
    v_status := 'active';
  end if;
  -- Ordinary votes do not modify updated_at: parallel votes for the same round are valid.
  return jsonb_build_object('status',v_status,'confirmed',v_confirmed,'total',v_total);
end;
$$;

create function public.set_task_frequency(p_task_id uuid,p_member_id uuid,p_days integer,p_time text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_pid uuid;
  v_task public.tasks%rowtype;
begin
  select project_id into v_pid from public.tasks where id = p_task_id;
  if not found then raise exception 'TASK_NOT_FOUND'; end if;
  perform 1 from public.projects where id = v_pid for update;
  if not found then raise exception 'PROJECT_NOT_FOUND'; end if;
  select * into v_task from public.tasks where id = p_task_id for update;
  if not found then raise exception 'TASK_NOT_FOUND'; end if;
  if not exists (select 1 from public.members where id = p_member_id and project_id = v_pid) then raise exception 'NOT_MEMBER'; end if;
  if not exists (select 1 from public.task_assignees where task_id = p_task_id and member_id = p_member_id) then raise exception 'NOT_ASSIGNEE'; end if;
  if p_days is null or p_days not between 1 and 14 or p_time is null or p_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'FREQUENCY_INVALID'; end if;
  update public.tasks set report_every_days = p_days,report_time = p_time::time where id = p_task_id returning * into v_task;
  return to_jsonb(v_task);
end;
$$;

revoke all on function public.activate_draft(uuid) from public, anon, authenticated;
revoke all on function public.confirm_division_draft(uuid,uuid,timestamptz,text,text) from public, anon, authenticated;
revoke all on function public.set_task_frequency(uuid,uuid,integer,text) from public, anon, authenticated;
grant execute on function public.activate_draft(uuid) to service_role;
grant execute on function public.confirm_division_draft(uuid,uuid,timestamptz,text,text) to service_role;
grant execute on function public.set_task_frequency(uuid,uuid,integer,text) to service_role;
