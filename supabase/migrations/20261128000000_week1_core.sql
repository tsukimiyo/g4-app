-- Week 1 Core 資料表 + RLS。owner：C
-- 規格：docs/implementation-plan.md「Week 1 共用規格 → 3. Week 1 資料表」
-- 與原始規格的差異見 docs/spec-changes.md（meeting_date 可為 null、report_every_days 範圍檢查、Realtime）
--
-- ⚠️ 已經套用到 Supabase 的 migration 不要再修改。要改資料表就新增一個新的 migration 檔：
--    pnpm supabase migration new <描述>

create extension if not exists pgcrypto;

-- ============================================================
-- 資料表
-- ============================================================

create table projects (
  id uuid primary key default gen_random_uuid(),
  course text not null,
  team_name text not null,
  title text not null,
  member_count int not null check (member_count between 2 and 10),
  final_deadline date not null,
  ta_emails text[] not null default '{}',
  weekly_report_dow int not null default 4 check (weekly_report_dow between 0 and 6), -- 0 = 週日，4 = 週四
  weekly_report_time time not null default '21:00',
  countdown_hours int not null default 12,
  created_by uuid not null references auth.users,
  created_at timestamptz not null default now()
);

create table members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  user_id uuid not null references auth.users,
  display_name text not null,
  color text not null,                               -- 依加入順序從固定色盤取
  joined_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table invites (
  code text primary key,                             -- 8 碼，例如 7K2Q-HCI
  project_id uuid not null references projects on delete cascade,
  expires_at timestamptz not null
);

create table transcript_imports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  title text,
  meeting_date date,                                 -- 逐字稿第一行沒寫時為 null，由發言者對應頁補上；extract 前必須有值
  message_count int not null,
  status text not null check (status in ('parsed','mapped','extracting','done','failed')),
  error text,
  created_by uuid not null references members,
  created_at timestamptz not null default now()
);

create table transcript_messages (
  import_id uuid not null references transcript_imports on delete cascade,
  idx int not null,
  time text,                                         -- "HH:MM"（parser 已補零）
  speaker_raw text not null,
  member_id uuid references members,
  text text not null,
  primary key (import_id, idx)
);

create table speaker_aliases (
  project_id uuid not null references projects on delete cascade,
  alias text not null,                               -- 逐字稿裡的名字
  member_id uuid references members,                 -- null = 非組員，忽略
  primary key (project_id, alias)
);

create table division_drafts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  version int not null,
  source text not null check (source in ('txt','manual')),
  import_id uuid references transcript_imports,
  status text not null check (status in ('draft','pending','active','superseded')),
  tasks jsonb not null default '[]',                 -- DraftTask[]（lib/schemas/division.ts）
  open_questions jsonb not null default '[]',
  llm_raw jsonb,
  created_by uuid not null references members,
  updated_at timestamptz not null default now(),
  unique (project_id, version)
);

create table division_confirmations (
  draft_id uuid not null references division_drafts on delete cascade,
  member_id uuid not null references members,
  result text not null check (result in ('confirmed','change_requested')),
  comment text,
  created_at timestamptz not null default now(),
  primary key (draft_id, member_id)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  draft_id uuid not null references division_drafts, -- 最後一次更新這個任務的草稿版本
  title text not null,
  deadline date not null,
  progress int not null default 0 check (progress in (0,10,25,50,75,90,100)),
  report_every_days int not null default 7 check (report_every_days between 1 and 14),
  report_time time not null default '21:00',        -- 讀出來是 "21:00:00"，前端用 toHm() 轉換
  evidence int[] not null default '{}',
  created_at timestamptz not null default now()
);

create table task_assignees (
  task_id uuid not null references tasks on delete cascade,
  member_id uuid not null references members,
  part text,
  joined_via text not null default 'initial'
    check (joined_via in ('initial','help','coord','ta')),
  primary key (task_id, member_id)
);

create index on members (user_id);
create index on division_drafts (project_id, status);
create index on tasks (project_id);

-- ============================================================
-- RLS：只有該專題的組員能 select；所有寫入都走 API（伺服器端用 secret key）
-- 所以這裡只建 select policy，沒有 insert / update / delete policy = 前端一律不能寫
-- ============================================================

create or replace function public.is_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from members m
    where m.project_id = p_project_id and m.user_id = auth.uid()
  );
$$;

alter table projects               enable row level security;
alter table members                enable row level security;
alter table invites                enable row level security;
alter table transcript_imports     enable row level security;
alter table transcript_messages    enable row level security;
alter table speaker_aliases        enable row level security;
alter table division_drafts        enable row level security;
alter table division_confirmations enable row level security;
alter table tasks                  enable row level security;
alter table task_assignees         enable row level security;

create policy "members read" on projects           for select using (is_member(id));
create policy "members read" on members            for select using (is_member(project_id));
create policy "members read" on invites            for select using (is_member(project_id));
create policy "members read" on transcript_imports for select using (is_member(project_id));
create policy "members read" on speaker_aliases    for select using (is_member(project_id));
create policy "members read" on division_drafts    for select using (is_member(project_id));
create policy "members read" on tasks              for select using (is_member(project_id));

create policy "members read" on transcript_messages for select using (
  exists (select 1 from transcript_imports i where i.id = import_id and is_member(i.project_id))
);
create policy "members read" on division_confirmations for select using (
  exists (select 1 from division_drafts d where d.id = draft_id and is_member(d.project_id))
);
create policy "members read" on task_assignees for select using (
  exists (select 1 from tasks t where t.id = task_id and is_member(t.project_id))
);

-- ============================================================
-- Realtime（確認人數、首頁分工表即時更新；12/2 之後前端才會訂閱）
-- ============================================================
alter publication supabase_realtime add table division_confirmations;
alter publication supabase_realtime add table division_drafts;
alter publication supabase_realtime add table tasks;

-- ============================================================
-- TODO(C)：activate_draft(p_draft_id uuid)
-- 全員確認時由 POST /api/drafts/[did]/confirm 以 rpc 呼叫，在同一個 transaction 內：
--   1. 依 division_drafts.tasks 寫入 tasks / task_assignees
--      （taskId 不為 null → update 原本那列；為 null → insert 新列，並把新 id 寫回 jsonb）
--   2. 這份草稿 status = 'active'；同專題其他 active 草稿 → 'superseded'
--   3. 刪除該 import 中不屬於任何任務 evidence 的 transcript_messages（隱私：只留依據訊息）
-- 請另開一個 migration 檔撰寫。
-- ============================================================
