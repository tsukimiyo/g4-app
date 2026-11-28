-- owner: C — atomic invite join (new migration only)
create or replace function public.join_project_by_invite(
  p_code text,
  p_user_id uuid,
  p_display_name text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_project public.projects%rowtype;
  v_invite public.invites%rowtype;
  v_member public.members%rowtype;
  v_count integer;
  v_colors text[] := array[
    '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b',
    '#06b6d4', '#ec4899', '#6366f1', '#84cc16', '#64748b'
  ];
  v_color text;
begin
  select i.project_id into v_project_id
  from public.invites i where i.code = p_code;
  if not found then
    raise exception using errcode = 'PT404', message = 'INVITE_INVALID';
  end if;

  -- Serialize joins for this project, including joins via different codes.
  select p.* into v_project
  from public.projects p where p.id = v_project_id
  for update;
  if not found then
    raise exception using errcode = 'PT404', message = 'INVITE_INVALID';
  end if;

  -- Recheck the invite AFTER waiting for the lock; expiry may have changed.
  select i.* into v_invite
  from public.invites i
  where i.code = p_code and i.project_id = v_project.id
  for share;
  if not found or v_invite.expires_at <= clock_timestamp() then
    raise exception using errcode = 'PT404', message = 'INVITE_INVALID';
  end if;

  -- Existing members can reuse a valid invite even when the project is full.
  select m.* into v_member from public.members m
  where m.project_id = v_project.id and m.user_id = p_user_id;
  if found then
    return to_jsonb(v_member);
  end if;

  select count(*) into v_count from public.members m
  where m.project_id = v_project.id;
  if v_count >= v_project.member_count then
    raise exception using errcode = 'PT409', message = 'PROJECT_FULL';
  end if;

  -- First unused color in the fixed palette (normal case: join order).
  select c.color into v_color
  from unnest(v_colors) with ordinality as c(color, position)
  where not exists (
    select 1 from public.members m
    where m.project_id = v_project.id and m.color = c.color
  )
  order by c.position limit 1;

  insert into public.members (project_id, user_id, display_name, color)
  values (v_project.id, p_user_id, p_display_name, v_color)
  returning * into v_member;

  return to_jsonb(v_member);
end;
$$;

-- User IDs must originate in the authenticated Next.js API.
revoke all on function public.join_project_by_invite(text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.join_project_by_invite(text, uuid, text)
  to service_role;
