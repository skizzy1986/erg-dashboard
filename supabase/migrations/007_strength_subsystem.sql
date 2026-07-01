-- 007_strength_subsystem.sql
-- Backfill: the strength subsystem was built live via Cowork/MCP (migrations
-- wo004_strength_templates, strength_logger_schema, strength_logger_views_and_rollup,
-- strength_templates_and_assignments, exercise_media_phase1, exercise_prefs, …) but
-- was never mirrored into this repo's migrations/ folder. This file reproduces the
-- live DDL faithfully (sourced from pg_catalog: pg_get_constraintdef / pg_indexes /
-- pg_get_functiondef / pg_get_triggerdef / pg_policies) so a fresh rebuild matches
-- production. Schema only — no data seed.
--
-- Idempotent: CREATE TABLE / INDEX IF NOT EXISTS, DROP … IF EXISTS before CREATE for
-- policies/triggers, CREATE OR REPLACE for functions/views. Safe to re-run.
--
-- Tables: templates, template_exercises, strength_workouts, strength_sets,
--         workout_assignments, exercise_media, exercise_prefs.

-- ── Tables ──────────────────────────────────────────────────────────────────
-- Non-circular FKs are declared inline (Postgres auto-names them <table>_<col>_fkey,
-- matching production). The strength_workouts ↔ workout_assignments cycle is closed
-- by ALTER statements at the end.

create table if not exists public.templates (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid(),
  name         text not null,
  session_type text not null default 'Lower Strength'::text,
  description  text,
  origin       text not null default 'custom'::text,
  is_archived  boolean not null default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  constraint templates_origin_check check (origin = any (array['coach'::text, 'custom'::text]))
);

create table if not exists public.template_exercises (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid(),
  template_id      uuid not null references public.templates(id) on delete cascade,
  exercise_id      text references public.exercises(id),
  exercise_name    text not null,
  position         integer not null default 1,
  target_sets      integer,
  target_reps      text,
  target_weight_kg numeric,
  target_rpe       numeric,
  rest_seconds     integer,
  notes            text,
  created_at       timestamptz default now(),
  set_plan         jsonb,
  is_timed         boolean not null default false,
  target_seconds   integer
);

create table if not exists public.strength_workouts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid(),
  workout_date  date not null default current_date,
  session_type  text not null default 'Lower Strength'::text,
  label         text not null default 'Strength session'::text,
  notes         text,
  srpe          integer,
  status        text not null default 'in_progress'::text,
  started_at    timestamptz default now(),
  completed_at  timestamptz,
  session_id    bigint references public.sessions(id) on delete set null,
  created_at    timestamptz default now(),
  template_id   uuid references public.templates(id) on delete set null,
  assignment_id uuid,   -- FK added after workout_assignments exists (cycle)
  origin        text not null default 'custom'::text
);

create table if not exists public.workout_assignments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid(),
  template_id   uuid not null references public.templates(id) on delete cascade,
  assigned_date date not null default current_date,
  status        text not null default 'pending'::text,
  workout_id    uuid,   -- FK added after strength_workouts exists (cycle)
  coach_note    text,
  created_at    timestamptz default now(),
  constraint workout_assignments_status_check
    check (status = any (array['pending'::text, 'in_progress'::text, 'completed'::text, 'skipped'::text]))
);

create table if not exists public.strength_sets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid(),
  workout_id    uuid not null references public.strength_workouts(id) on delete cascade,
  exercise_id   text references public.exercises(id),
  exercise_name text not null,
  set_index     integer not null default 1,
  weight_kg     numeric,
  reps          integer,
  rpe           numeric,
  is_warmup     boolean not null default false,
  completed     boolean not null default true,
  created_at    timestamptz default now(),
  hold_seconds  integer
);

create table if not exists public.exercise_media (
  exercise_id      text primary key references public.exercises(id) on delete cascade,
  video_front_url  text,
  video_side_url   text,
  poster_front_url text,
  poster_side_url  text,
  model_3d_key     text,
  media_tier       text not null default 'fallback'::text,
  updated_at       timestamptz not null default now(),
  constraint exercise_media_media_tier_check
    check (media_tier = any (array['fallback'::text, 'video'::text, 'model3d'::text]))
);

create table if not exists public.exercise_prefs (
  user_id      uuid not null default auth.uid(),
  exercise_id  text not null references public.exercises(id) on delete cascade,
  rest_seconds integer,
  updated_at   timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

-- ── Close the strength_workouts ↔ workout_assignments cycle ─────────────────
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'strength_workouts_assignment_id_fkey') then
    alter table public.strength_workouts
      add constraint strength_workouts_assignment_id_fkey
      foreign key (assignment_id) references public.workout_assignments(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'workout_assignments_workout_id_fkey') then
    alter table public.workout_assignments
      add constraint workout_assignments_workout_id_fkey
      foreign key (workout_id) references public.strength_workouts(id) on delete set null;
  end if;
end $$;

-- ── Secondary indexes ───────────────────────────────────────────────────────
create index if not exists idx_template_exercises_template   on public.template_exercises (template_id, "position");
create index if not exists sw_user_date_idx                  on public.strength_workouts (user_id, workout_date desc);
create index if not exists ss_user_ex_idx                    on public.strength_sets (user_id, exercise_id);
create index if not exists ss_workout_idx                    on public.strength_sets (workout_id);
create index if not exists idx_workout_assignments_user_date on public.workout_assignments (user_id, assigned_date);

-- ── Row-level security ──────────────────────────────────────────────────────
alter table public.templates           enable row level security;
alter table public.template_exercises  enable row level security;
alter table public.strength_workouts   enable row level security;
alter table public.strength_sets       enable row level security;
alter table public.workout_assignments enable row level security;
alter table public.exercise_media      enable row level security;
alter table public.exercise_prefs      enable row level security;

drop policy if exists templates_all on public.templates;
create policy templates_all on public.templates
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists template_exercises_all on public.template_exercises;
create policy template_exercises_all on public.template_exercises
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists sw_all on public.strength_workouts;
create policy sw_all on public.strength_workouts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists ss_all on public.strength_sets;
create policy ss_all on public.strength_sets
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists workout_assignments_all on public.workout_assignments;
create policy workout_assignments_all on public.workout_assignments
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- exercise_media is shared reference content: any signed-in user may read.
drop policy if exists exercise_media_read on public.exercise_media;
create policy exercise_media_read on public.exercise_media
  for select to authenticated using (true);

drop policy if exists exercise_prefs_rw on public.exercise_prefs;
create policy exercise_prefs_rw on public.exercise_prefs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── updated_at touch helpers ────────────────────────────────────────────────
create or replace function public.fn_touch_updated_at()
  returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create or replace function public.touch_exercise_media()
  returns trigger language plpgsql set search_path to '' as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_templates_touch on public.templates;
create trigger trg_templates_touch before update on public.templates
  for each row execute function public.fn_touch_updated_at();

drop trigger if exists trg_touch_exercise_media on public.exercise_media;
create trigger trg_touch_exercise_media before update on public.exercise_media
  for each row execute function public.touch_exercise_media();

-- ── e1RM / volume metrics view (drives the rollup) ──────────────────────────
create or replace view public.strength_set_metrics as
  select s.id, s.user_id, s.workout_id, s.exercise_id, s.exercise_name, s.set_index,
         s.weight_kg, s.reps, s.rpe, s.is_warmup, s.completed, s.created_at,
         w.workout_date, w.session_type, w.status as workout_status,
         case when s.weight_kg is not null and s.reps is not null
              then round(s.weight_kg * s.reps::numeric, 1) end as volume_kg,
         case when s.weight_kg is not null and s.reps is not null and s.reps > 0
              then round(s.weight_kg * (1::numeric + s.reps::numeric / 30::numeric), 1) end as e1rm_kg
  from public.strength_sets s
  join public.strength_workouts w on w.id = s.workout_id
  where s.is_warmup = false;

-- ── Calendar rollup: a completed strength_workout upserts a sessions row ─────
create or replace function public.fn_sync_strength_session(w_id uuid)
  returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  w            public.strength_workouts%rowtype;
  v_date_txt   text;
  v_duration   text;
  v_exercises  jsonb;
  v_prs        int;
  v_secs       numeric;
  v_sid        bigint;
begin
  select * into w from public.strength_workouts where id = w_id;
  if not found then return; end if;

  -- Not completed → remove any rollup row + unlink, then stop
  if w.status <> 'completed' then
    if w.session_id is not null then
      delete from public.sessions where id = w.session_id;
      update public.strength_workouts set session_id = null where id = w_id;
    end if;
    return;
  end if;

  v_date_txt := to_char(w.workout_date, 'FMMM') || '/' ||
                to_char(w.workout_date, 'FMDD') || '/' ||
                to_char(w.workout_date, 'YY');

  v_secs := extract(epoch from (coalesce(w.completed_at, now()) - coalesce(w.started_at, w.created_at)));
  if v_secs is null or v_secs <= 0 then
    v_duration := null;
  elsif v_secs >= 3600 then
    v_duration := floor(v_secs/3600) || 'h' || lpad(floor(mod(v_secs,3600)/60)::text,2,'0') || 'm';
  else
    v_duration := floor(v_secs/60) || 'm';
  end if;

  -- Per-exercise aggregates for this workout
  with agg as (
    select
      s.exercise_id,
      max(s.exercise_name)            as name,
      max(s.weight_kg)                as top_weight,
      sum(s.weight_kg * s.reps)       as volume,
      max(s.weight_kg * (1 + s.reps::numeric/30)) as e1rm,
      min(s.created_at)               as first_seen
    from public.strength_sets s
    where s.workout_id = w_id and s.is_warmup = false
      and s.weight_kg is not null and s.reps is not null
    group by s.exercise_id
  ),
  prior as (
    select m.exercise_id, max(m.e1rm_kg) as prev_best
    from public.strength_set_metrics m
    where m.user_id = w.user_id
      and m.workout_status = 'completed'
      and m.workout_id <> w_id
    group by m.exercise_id
  ),
  flagged as (
    select a.*, (a.e1rm > coalesce(p.prev_best, 0)) as is_pr
    from agg a left join prior p on p.exercise_id = a.exercise_id
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'name',   name,
      'weight', round(top_weight,1) || 'kg',
      'volume', to_char(round(volume,0), 'FM999G999G999') || 'kg',
      'e1rm',   round(e1rm,1) || 'kg',
      'pr',     is_pr
    ) order by first_seen), '[]'::jsonb),
    count(*) filter (where is_pr)
  into v_exercises, v_prs
  from flagged;

  -- Upsert the rollup session row (date,label) idempotent
  insert into public.sessions
    (date, type, label, duration, srpe, prs, exercises, status, user_id, source)
  values
    (v_date_txt, w.session_type, w.label, v_duration, w.srpe,
     coalesce(v_prs,0), v_exercises, 'actual', w.user_id, 'strength_logger')
  on conflict (date, label) do update set
    type      = excluded.type,
    duration  = excluded.duration,
    srpe      = excluded.srpe,
    prs       = excluded.prs,
    exercises = excluded.exercises,
    status    = 'actual',
    source    = 'strength_logger'
  returning id into v_sid;

  if w.session_id is distinct from v_sid then
    update public.strength_workouts set session_id = v_sid where id = w_id;
  end if;
end;
$function$;

create or replace function public.trg_strength_set_sync()
  returns trigger language plpgsql security definer set search_path to 'public' as $$
declare wid uuid;
begin
  wid := coalesce(new.workout_id, old.workout_id);
  perform public.fn_sync_strength_session(wid);
  return coalesce(new, old);
end; $$;

create or replace function public.trg_strength_workout_sync()
  returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if tg_op = 'DELETE' then
    if old.session_id is not null then
      delete from public.sessions where id = old.session_id;
    end if;
    return old;
  end if;
  perform public.fn_sync_strength_session(new.id);
  return new;
end; $$;

drop trigger if exists strength_set_sync on public.strength_sets;
create trigger strength_set_sync after insert or delete or update on public.strength_sets
  for each row execute function public.trg_strength_set_sync();

drop trigger if exists strength_workout_sync on public.strength_workouts;
create trigger strength_workout_sync after update of status on public.strength_workouts
  for each row when (old.status is distinct from new.status)
  execute function public.trg_strength_workout_sync();

drop trigger if exists strength_workout_del on public.strength_workouts;
create trigger strength_workout_del after delete on public.strength_workouts
  for each row execute function public.trg_strength_workout_sync();
