-- Aware OS — one shared graph. No modules.
create extension if not exists vector;
create extension if not exists pg_trgm;

-- ————— roles & profiles —————
create type app_role as enum ('founder', 'core', 'member');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null default '',
  role app_role not null default 'member',
  title text not null default '',
  created_at timestamptz not null default now()
);

create table invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role app_role not null default 'member',
  invited_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

-- helper: current user's role (security definer so RLS policies can call it)
create or replace function my_role()
returns app_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function can_see_sensitive()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(my_role() in ('founder', 'core'), false)
$$;

-- ————— typed entities —————
create type actor_type as enum ('human', 'aware', 'system');

create table people (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('teammate','candidate','investor','advisor','vendor','contact','ai')),
  name text not null,
  email text default '',
  org text default '',
  title text default '',
  status text not null default 'active',
  body text not null default '',
  sensitive boolean not null default false,
  profile_id uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workstreams (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('product','research','fundraise','ops')),
  name text not null,
  status text not null default 'active' check (status in ('active','planned','paused','shipped','done')),
  priority int not null default 2, -- 0 highest
  summary text not null default '',
  body text not null default '',
  url text default '',
  repo text default '',
  owner uuid references people (id),
  sensitive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  status text not null default 'todo' check (status in ('todo','doing','blocked','done','cancelled')),
  priority int not null default 2,
  assignee uuid references people (id),
  workstream_id uuid references workstreams (id) on delete set null,
  due_date date,
  sensitive boolean not null default false,
  created_by_type actor_type not null default 'human',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table experiments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hypothesis text not null default '',
  config jsonb not null default '{}',
  dataset text not null default '',
  compute text not null default '',
  status text not null default 'planned' check (status in ('planned','running','complete','failed','abandoned')),
  metrics jsonb not null default '{}',
  result text not null default '',
  verdict text not null default '',
  workstream_id uuid references workstreams (id) on delete set null,
  sensitive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table decisions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  context text not null default '',
  options text not null default '',
  choice text not null default '',
  rationale text not null default '',
  status text not null default 'decided' check (status in ('open','decided','superseded','overridden')),
  decided_by_type actor_type not null default 'human',
  decided_by_name text not null default '',
  workstream_id uuid references workstreams (id) on delete set null,
  sensitive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table docs (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'note' check (kind in ('memo','spec','meeting','brief','weekly_review','onboarding','investor_update','asset','manual','note')),
  title text not null,
  body text not null default '',
  workstream_id uuid references workstreams (id) on delete set null,
  sensitive boolean not null default false,
  created_by_type actor_type not null default 'human',
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fts tsvector generated always as (to_tsvector('english', title || ' ' || body)) stored
);
create index docs_fts on docs using gin (fts);

create table finance_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('balance','budget','expense','commitment','invoice','revenue')),
  name text not null,
  amount numeric not null default 0,
  currency text not null default 'USD',
  period text not null default 'once' check (period in ('once','monthly','annual')),
  status text not null default 'active' check (status in ('active','planned','closed')),
  workstream_id uuid references workstreams (id) on delete set null,
  sensitive boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ————— universal layers —————
create table links (
  id uuid primary key default gen_random_uuid(),
  from_type text not null,
  from_id uuid not null,
  to_type text not null,
  to_id uuid not null,
  relation text not null default 'related',
  created_at timestamptz not null default now(),
  unique (from_type, from_id, to_type, to_id, relation)
);
create index links_from on links (from_type, from_id);
create index links_to on links (to_type, to_id);

create table activity (
  id bigint generated always as identity primary key,
  actor_type actor_type not null default 'human',
  actor_name text not null default '',
  verb text not null,
  target_type text not null default '',
  target_id uuid,
  target_label text not null default '',
  detail text not null default '',
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index activity_created on activity (created_at desc);
create index activity_target on activity (target_type, target_id);

create table comments (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  author_type actor_type not null default 'human',
  author_name text not null default '',
  author_id uuid references profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);
create index comments_target on comments (target_type, target_id);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  severity text not null default 'info' check (severity in ('info','warn','critical')),
  kind text not null default 'alert' check (kind in ('alert','risk')),
  title text not null,
  body text not null default '',
  status text not null default 'open' check (status in ('open','ack','resolved')),
  target_type text default '',
  target_id uuid,
  owner uuid references people (id),
  created_by_type actor_type not null default 'aware',
  sensitive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table approvals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null default '',
  action jsonb not null default '{}', -- { tool, args } executed on approval
  status text not null default 'pending' check (status in ('pending','approved','rejected','executed','failed')),
  requested_by_type actor_type not null default 'aware',
  decided_by uuid references profiles (id),
  result text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ai_memory (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'fact' check (kind in ('fact','preference','insight','context')),
  content text not null,
  weight int not null default 1,
  source text not null default '',
  embedding vector(1536),
  created_at timestamptz not null default now(),
  fts tsvector generated always as (to_tsvector('english', content)) stored
);
create index ai_memory_fts on ai_memory using gin (fts);

create table ai_state (
  id int primary key default 1 check (id = 1),
  focus text not null default '',
  open_questions text not null default '',
  last_tick timestamptz,
  last_daily timestamptz,
  last_weekly timestamptz,
  updated_at timestamptz not null default now()
);

-- ————— updated_at maintenance —————
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['people','workstreams','tasks','experiments','decisions','docs','finance_items','alerts','approvals']
  loop
    execute format('create trigger %I_touch before update on %I for each row execute function touch_updated_at()', t, t);
  end loop;
end $$;

-- ————— row-level security —————
-- Scope model: authenticated users see everything not flagged sensitive;
-- founder/core see all. finance is sensitive by default. Service role bypasses
-- RLS and is used only by AWARE's server-side heartbeat and trusted routes.

alter table profiles enable row level security;
create policy profiles_read on profiles for select to authenticated using (true);
create policy profiles_update_own on profiles for update to authenticated
  using (id = auth.uid() or my_role() = 'founder');

alter table invites enable row level security;
create policy invites_founder on invites for all to authenticated
  using (my_role() = 'founder') with check (my_role() = 'founder');

do $$
declare t text;
begin
  foreach t in array array['people','workstreams','tasks','experiments','decisions','docs','alerts']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I_read on %I for select to authenticated using ((not sensitive) or can_see_sensitive())', t, t);
    execute format('create policy %I_insert on %I for insert to authenticated with check (true)', t, t);
    execute format('create policy %I_update on %I for update to authenticated using ((not sensitive) or can_see_sensitive())', t, t);
    execute format('create policy %I_delete on %I for delete to authenticated using (my_role() = ''founder'')', t, t);
  end loop;
end $$;

alter table finance_items enable row level security;
create policy finance_read on finance_items for select to authenticated using (can_see_sensitive());
create policy finance_write on finance_items for insert to authenticated with check (can_see_sensitive());
create policy finance_update on finance_items for update to authenticated using (can_see_sensitive());
create policy finance_delete on finance_items for delete to authenticated using (my_role() = 'founder');

alter table links enable row level security;
create policy links_read on links for select to authenticated using (true);
create policy links_write on links for insert to authenticated with check (true);
create policy links_delete on links for delete to authenticated using (true);

alter table activity enable row level security;
create policy activity_read on activity for select to authenticated using (true);
create policy activity_write on activity for insert to authenticated with check (true);

alter table comments enable row level security;
create policy comments_read on comments for select to authenticated using (true);
create policy comments_write on comments for insert to authenticated with check (true);
create policy comments_delete on comments for delete to authenticated
  using (author_id = auth.uid() or my_role() = 'founder');

alter table approvals enable row level security;
create policy approvals_read on approvals for select to authenticated using (can_see_sensitive());
create policy approvals_update on approvals for update to authenticated using (my_role() = 'founder');
create policy approvals_insert on approvals for insert to authenticated with check (true);

alter table ai_memory enable row level security;
create policy memory_read on ai_memory for select to authenticated using (true);
create policy memory_write on ai_memory for insert to authenticated with check (true);

alter table ai_state enable row level security;
create policy state_read on ai_state for select to authenticated using (true);
