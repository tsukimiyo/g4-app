-- owner: C
-- 原子化建立專題與第一位組員

create or replace function public.create_project_with_member(
    p_user_id uuid,
    p_course text,
    p_team_name text,
    p_title text,
    p_member_count integer,
    p_final_deadline date,
    p_ta_emails text[],
    p_display_name text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_project public.projects%rowtype;
    v_member public.members%rowtype;
begin
    -- 1. 建立專題
    insert into public.projects (
        course,
        team_name,
        title,
        member_count,
        final_deadline,
        ta_emails,
        created_by
    )
    values (
        p_course,
        p_team_name,
        p_title,
        p_member_count,
        p_final_deadline,
        p_ta_emails,
        p_user_id
    )
    returning * into v_project;

    -- 2. 將建立者加入組員名單
    insert into public.members (
        project_id,
        user_id,
        display_name,
        color
    )
    values (
        v_project.id,
        p_user_id,
        p_display_name,
        '#ef4444'
    )
    returning * into v_member;

    -- 3. 回傳建立結果
    return jsonb_build_object(
        'project', to_jsonb(v_project),
        'member', to_jsonb(v_member)
    );
end;
$$;

-- 禁止一般使用者直接呼叫此 RPC
revoke all on function public.create_project_with_member(
    uuid, text, text, text, integer, date, text[], text
) from public, anon, authenticated;

-- 只有後端 service role 可以呼叫
grant execute on function public.create_project_with_member(
    uuid, text, text, text, integer, date, text[], text
) to service_role;