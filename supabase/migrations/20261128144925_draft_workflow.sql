-- owner: C (W1). New migration only.
-- All writes use service_role. Project lock shared with join_project_by_invite.
create function public.create_manual_draft(p_project_id uuid, p_member_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_draft public.division_drafts%rowtype;
  v_version integer;
begin
  perform 1 from public.projects where id = p_project_id for update;
  if not found then raise exception 'PROJECT_NOT_FOUND'; end if;
  if not exists (select 1 from public.members where id = p_member_id and project_id = p_project_id) then
    raise exception 'NOT_MEMBER';
  end if;
  select coalesce(max(version), 0) + 1 into v_version from public.division_drafts where project_id = p_project_id;
  insert into public.division_drafts(project_id, version, source, status, created_by)
  values (p_project_id, v_version, 'manual', 'draft', p_member_id)
  returning * into v_draft;
  return to_jsonb(v_draft);
end;
$$;

-- Compare-and-set against the server-side snapshot; do not trust client timestamps.
create function public.update_division_draft(
  p_draft_id uuid, p_member_id uuid, p_expected_updated_at timestamptz,
  p_tasks jsonb, p_open_questions jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_draft public.division_drafts%rowtype;
begin
  select * into v_draft from public.division_drafts where id = p_draft_id for update;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  if not exists (select 1 from public.members where id = p_member_id and project_id = v_draft.project_id) then
    raise exception 'NOT_MEMBER';
  end if;
  if v_draft.status <> 'draft' then raise exception 'DRAFT_LOCKED'; end if;
  if v_draft.updated_at is distinct from p_expected_updated_at then raise exception 'DRAFT_CHANGED'; end if;
  update public.division_drafts
  set tasks = p_tasks, open_questions = p_open_questions,
      updated_at = greatest(clock_timestamp(), v_draft.updated_at + interval '1 microsecond')
  where id = p_draft_id returning * into v_draft;
  return to_jsonb(v_draft);
end;
$$;

-- The API validates the exact snapshot using validateDivision before this call.
-- Lock project before draft, consistent with the join RPC and future activation.
create function public.submit_division_draft(
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

revoke all on function public.create_manual_draft(uuid,uuid) from public, anon, authenticated;
revoke all on function public.update_division_draft(uuid,uuid,timestamptz,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.submit_division_draft(uuid,uuid,timestamptz,uuid[],date) from public, anon, authenticated;
grant execute on function public.create_manual_draft(uuid,uuid) to service_role;
grant execute on function public.update_division_draft(uuid,uuid,timestamptz,jsonb,jsonb) to service_role;
grant execute on function public.submit_division_draft(uuid,uuid,timestamptz,uuid[],date) to service_role;
