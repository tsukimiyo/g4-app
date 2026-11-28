-- owner: C (W1). C-09: preserve existing signatures and lock ordering.

create or replace function public.submit_division_draft(
  p_draft_id uuid, p_member_id uuid, p_expected_updated_at timestamptz,
  p_expected_members uuid[], p_expected_final_deadline date
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_pid uuid;
  v_project public.projects%rowtype;
  v_draft public.division_drafts%rowtype;
  v_members uuid[];
begin
  select project_id into v_pid from public.division_drafts where id = p_draft_id;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  select * into v_project from public.projects where id = v_pid for update;
  if not found then raise exception 'PROJECT_NOT_FOUND'; end if;
  select * into v_draft from public.division_drafts where id = p_draft_id for update;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  select coalesce(array_agg(id order by id), '{}'::uuid[]) into v_members from public.members where project_id = v_pid;
  if not (p_member_id = any(v_members)) then raise exception 'NOT_MEMBER'; end if;
  if v_draft.status <> 'draft' then raise exception 'DRAFT_LOCKED'; end if;
  -- Reject an old version while holding the same project lock as activation.
  if exists (select 1 from public.division_drafts
    where project_id = v_pid and status = 'active' and version > v_draft.version) then
    raise exception 'DRAFT_OUTDATED';
  end if;
  if cardinality(v_members) < v_project.member_count then raise exception 'MEMBERS_NOT_JOINED'; end if;
  if v_draft.updated_at is distinct from p_expected_updated_at
    or v_members is distinct from (select array_agg(m order by m) from unnest(p_expected_members) as u(m))
    or v_project.final_deadline is distinct from p_expected_final_deadline then
    raise exception 'DRAFT_CHANGED';
  end if;
  delete from public.division_confirmations where draft_id = p_draft_id;
  insert into public.division_confirmations(draft_id, member_id, result)
  values (p_draft_id, p_member_id, 'confirmed');
  update public.division_drafts set status = 'pending',
    updated_at = greatest(clock_timestamp(), v_draft.updated_at + interval '1 microsecond')
    where id = p_draft_id;
  return jsonb_build_object('status', 'pending', 'confirmed', 1, 'total', cardinality(v_members));
end;
$$;

create or replace function public.set_task_frequency(p_task_id uuid,p_member_id uuid,p_days integer,p_time text)
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
  -- Historical tasks remain for audit, but cannot be edited.
  if not exists (select 1 from public.division_drafts
    where id = v_task.draft_id and project_id = v_pid and status = 'active') then
    raise exception 'TASK_INACTIVE';
  end if;
  if p_days is null or p_days not between 1 and 14 or p_time is null or p_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'FREQUENCY_INVALID'; end if;
  update public.tasks set report_every_days = p_days,report_time = p_time::time where id = p_task_id returning * into v_task;
  return to_jsonb(v_task);
end;
$$;

revoke all on function public.submit_division_draft(uuid,uuid,timestamptz,uuid[],date) from public, anon, authenticated;
revoke all on function public.set_task_frequency(uuid,uuid,integer,text) from public, anon, authenticated;
grant execute on function public.submit_division_draft(uuid,uuid,timestamptz,uuid[],date) to service_role;
grant execute on function public.set_task_frequency(uuid,uuid,integer,text) to service_role;
