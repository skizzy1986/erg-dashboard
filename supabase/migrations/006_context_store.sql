-- 006_context_store.sql
-- Context store: one Supabase-resident source of truth that both tools read
-- (Coach chat via MCP, Code via DB). Applied live as migration
-- `context_store_coach_log_and_anchors`.
--
-- Two tables, distinct jobs:
--   coach_log — append-only diary + decision record (never edited in place;
--               reversals write a NEW row with `supersedes` -> the old row).
--   anchors   — current calibration + phase state; exactly one live row per key
--               (superseded_at IS NULL) so "current value per key" is a one-row read.
--
-- Structural seed rows (rowing_cp, bike_ftp, current_phase, current_block,
-- doctrine_sha) are inserted separately with an explicit user_id — auth.uid()
-- does not resolve through the MCP connector — and are NOT part of this schema file.

-- coach_log: append-only diary + decision record
create table if not exists public.coach_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null default auth.uid(),
  date        date not null default current_date,
  entry_type  text not null check (entry_type in ('diary','decision','observation')),
  body        text not null,
  author      text not null check (author in ('coach','scott')),
  tags        text[] not null default '{}',
  supersedes  uuid references public.coach_log(id),
  created_at  timestamptz not null default now()
);
alter table public.coach_log enable row level security;
drop policy if exists coach_log_owner on public.coach_log;
create policy coach_log_owner on public.coach_log
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists coach_log_user_date  on public.coach_log (user_id, date desc);
create index if not exists coach_log_supersedes on public.coach_log (supersedes);

-- anchors: current calibration + phase state (one live row per key)
create table if not exists public.anchors (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null default auth.uid(),
  key           text not null,
  value         text not null,
  unit          text,
  status        text check (status in ('provisional','unvalidated','confirmed')),
  source        text,
  valid_from    date not null default current_date,
  superseded_at timestamptz,
  note          text,
  created_at    timestamptz not null default now()
);
alter table public.anchors enable row level security;
drop policy if exists anchors_owner on public.anchors;
create policy anchors_owner on public.anchors
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- guarantees "current value per key" is a single-row read:
create unique index if not exists anchors_one_live_per_key
  on public.anchors (user_id, key) where superseded_at is null;
