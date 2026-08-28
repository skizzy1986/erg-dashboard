-- 012_strava_integration.sql
-- Additive + reversible. Everything the Strava import (#54) needs that is not
-- already on public.sessions: the token store, the OAuth single-use state
-- store, the per-user sync cursor, and the two SECURITY DEFINER RPCs that are
-- the ONLY sanctioned way to write a Strava link onto a session.
--
-- Depends on 011 (public.sessions.strava_activity_id + the partial unique
-- index). Apply 011 first; roll 012 back first.
--
-- Three design decisions below are security properties, not preferences, and
-- each is called out where it appears:
--   * strava_tokens and strava_oauth_state have RLS ENABLED *and* FORCED and
--     carry no policies at all, so the only way in is a BYPASSRLS role
--     (service_role, which the edge functions use). A policy added later is a
--     regression, not a feature.
--   * strava_sync_state is the one table the browser may read, and only read.
--   * both RPCs are revoked from PUBLIC/anon/authenticated and granted only to
--     service_role. `revoke ... from public` is the load-bearing half: PUBLIC
--     is the pseudo-role the default EXECUTE grant on a new function flows
--     through, so revoking from anon and authenticated alone leaves the
--     function callable by both.

-- ---------------------------------------------------------------------------
-- strava_tokens — the OAuth credential store. One row per connected user.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.strava_tokens (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id    bigint NOT NULL,
  access_token  text NOT NULL,
  refresh_token text NOT NULL,
  expires_at    timestamptz NOT NULL,
  scope         text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.strava_tokens ENABLE ROW LEVEL SECURITY;
-- FORCE as well as ENABLE: without it the table owner (postgres) is exempt, so
-- anything running as the owner — a SECURITY DEFINER function someone adds
-- later, a dashboard query — would read the raw tokens. service_role has
-- BYPASSRLS and is unaffected, which is what the edge functions rely on.
ALTER TABLE public.strava_tokens FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.strava_tokens FROM public, anon, authenticated;

COMMENT ON TABLE public.strava_tokens IS
  'Strava OAuth credentials. DELIBERATELY POLICY-LESS: RLS is enabled AND '
  'forced and there is no policy of any kind, so no browser role can reach a '
  'row by any path. Only BYPASSRLS roles (service_role, used by the edge '
  'functions) can read or write it. ADDING A POLICY HERE IS A SECURITY '
  'REGRESSION — it would hand a bearer token that grants full read access to '
  'Scott''s entire Strava history to anything holding a session JWT, including '
  'any XSS on the dashboard. The browser never needs these values: it reads '
  'connection state from public.strava_sync_state instead. refresh_token is '
  'rotated by Strava on every refresh; see supabase/functions/strava-import/'
  'tokens.ts for the compare-and-swap that keeps a rotation from being lost.';

-- ---------------------------------------------------------------------------
-- strava_oauth_state — single-use CSRF state for the authorize round trip.
-- ---------------------------------------------------------------------------
-- Only the SHA-256 of the state is stored. The row is the sole thing providing
-- single-use semantics and the sole binding from a state value to a user, so
-- the state itself can be (and is) a plain opaque 32-byte random token with no
-- HMAC and nothing embedded in it.
CREATE TABLE IF NOT EXISTS public.strava_oauth_state (
  state_hash  text PRIMARY KEY,
  user_id     uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  redeemed_at timestamptz
);

ALTER TABLE public.strava_oauth_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strava_oauth_state FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.strava_oauth_state FROM public, anon, authenticated;

CREATE INDEX IF NOT EXISTS strava_oauth_state_created_at_idx
  ON public.strava_oauth_state (created_at);

COMMENT ON TABLE public.strava_oauth_state IS
  'Single-use CSRF state for the Strava authorize round trip, keyed by '
  'sha256(state) so a leaked row does not yield a usable state value. '
  'DELIBERATELY POLICY-LESS (RLS enabled and forced, no policies) — a browser '
  'role that could read this table could enumerate live states and complete '
  'another user''s connect. Redemption is one atomic UPDATE ... WHERE '
  'redeemed_at IS NULL RETURNING user_id; never check-then-set. Rows older '
  'than an hour are pruned at the top of every connect.';

-- ---------------------------------------------------------------------------
-- strava_sync_state — per-user cursor, counters and last-run outcome.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.strava_sync_state (
  user_id                uuid PRIMARY KEY,
  connected              boolean NOT NULL DEFAULT false,
  athlete_id             bigint,
  scope                  text,
  connected_at           timestamptz,
  disconnected_at        timestamptz,
  backfill_from          date NOT NULL,
  backfill_complete      boolean NOT NULL DEFAULT false,
  backfill_cursor_before bigint,
  incremental_after      bigint,
  last_run_at            timestamptz,
  last_run_mode          text,
  last_run_status        text,
  last_error_code        text,
  imported_total         int NOT NULL DEFAULT 0,
  adopted_total          int NOT NULL DEFAULT 0,
  skipped_total          int NOT NULL DEFAULT 0,
  failed_total           int NOT NULL DEFAULT 0,
  ambiguous_activity_ids bigint[] NOT NULL DEFAULT '{}',
  rate_limit_resets_at   timestamptz,
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strava_sync_state_last_run_status_known
    CHECK (last_run_status IS NULL OR last_run_status IN
      ('ok', 'partial', 'noop', 'rate_limited', 'auth_failed', 'error')),
  -- There is NO free-text error column on this table, and that is the point.
  -- String(e) from a failed token exchange routinely carries the whole response
  -- body, which for Strava's /oauth/token includes the access and refresh
  -- tokens. Storing it here would put credentials in a table the browser can
  -- read. Free-text detail goes to Sentry; the row gets a bounded code.
  CONSTRAINT strava_sync_state_last_error_code_known
    CHECK (last_error_code IS NULL OR last_error_code IN
      ('token_exchange_failed', 'refresh_failed', 'auth_failed', 'rate_limited',
       'upstream_5xx', 'insufficient_scope', 'db_write_failed', 'unknown'))
);

ALTER TABLE public.strava_sync_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.strava_sync_state FROM public, anon, authenticated;
GRANT SELECT ON public.strava_sync_state TO authenticated;

-- SELECT only, and only your own row. There is deliberately no INSERT/UPDATE/
-- DELETE policy: every mutation is made by the edge functions as service_role.
-- A browser that could write here could reset backfill_cursor_before and make
-- the importer re-walk (and, with 011's unique index, harmlessly re-update)
-- ten weeks of history on every run, or set connected=false and silently stop
-- the sync.
DROP POLICY IF EXISTS strava_sync_state_owner_select ON public.strava_sync_state;
CREATE POLICY strava_sync_state_owner_select ON public.strava_sync_state
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.strava_sync_state IS
  'Per-user Strava sync cursor, counters and last-run outcome. Readable by its '
  'owner (SELECT policy) so the UI can show connection state and the last run; '
  'writable only by service_role. last_error_code is a bounded enum on purpose '
  '— see the CHECK comment. ambiguous_activity_ids holds activities the '
  'adoption pass refused to guess on; they need a human decision, and a run '
  'that appends to this array still ends ''ok''.';

COMMENT ON COLUMN public.strava_sync_state.backfill_cursor_before IS
  'Strava `before` epoch-seconds cursor, walking BACKWARDS through history. '
  'Persisted before the next page is fetched, so an interrupted run resumes '
  'where it stopped instead of losing the page.';

-- ---------------------------------------------------------------------------
-- upsert_strava_session — insert-or-refresh a session from a Strava activity.
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER because the callers are edge functions holding service_role,
-- and because concentrating the write here is what lets the column allow-list
-- below be enforced in one place instead of trusted to every call site.
--
-- `SET search_path = ''` with every reference schema-qualified, same reasoning
-- as 008: the body cannot be hijacked by a caller's search_path. pg_catalog is
-- searched implicitly even on an empty path, so coalesce/case/now need no
-- prefix.
CREATE OR REPLACE FUNCTION public.upsert_strava_session(
  p_user_id     uuid,
  p_activity_id bigint,
  p_date        text,
  p_type        text,
  p_label       text,
  p_duration    text,
  p_distance_m  int,
  p_avg_watts   int,
  p_avg_hr      int
)
RETURNS TABLE (session_id bigint, action text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH ins AS (
    INSERT INTO public.sessions AS s (
      user_id, strava_activity_id, date, type, label, duration,
      distance_m, avg_watts, avg_hr, status, source
    )
    VALUES (
      p_user_id, p_activity_id, p_date, p_type, p_label, p_duration,
      p_distance_m, p_avg_watts, p_avg_hr, 'completed', 'strava'
    )
    -- The predicate is required: the arbiter is the PARTIAL unique index from
    -- 011, and inference only matches an index whose predicate is implied by
    -- the one written here.
    ON CONFLICT (user_id, strava_activity_id) WHERE strava_activity_id IS NOT NULL
    DO UPDATE SET
      duration   = excluded.duration,
      distance_m = excluded.distance_m,
      -- coalesce, not a bare assignment: a re-import from a summary payload
      -- that happens to lack power must not wipe a figure already recorded.
      avg_watts  = coalesce(excluded.avg_watts, s.avg_watts),
      avg_hr     = coalesce(excluded.avg_hr,    s.avg_hr)
    -- THE SET LIST ABOVE IS THE WHOLE CONTRACT. It must never grow to include
    -- date, label, type, status, source, srpe, coach_note, prs, exercises,
    -- coach_flag or benchmark_key. Two properties depend on that omission and
    -- nothing else enforces them:
    --   1. Re-import is idempotent even when the computed label differs (a
    --      renamed activity, or a change to buildLabel). Updating `label`
    --      would make every deploy of a new label format rewrite history —
    --      and could collide with sessions_date_label_key.
    --   2. coach_note survives by construction. Scott's coaching notes are the
    --      one thing in this table that cannot be re-derived from anywhere,
    --      and an importer that could overwrite them is one bad deploy away
    --      from destroying them silently.
    -- `id` and `date_iso` are never named: id is an identity column and
    -- date_iso is GENERATED ALWAYS, so naming either is rejected outright.
    RETURNING s.id AS sid, (s.xmax = 0) AS was_inserted
  )
  SELECT ins.sid::bigint,
         (CASE WHEN ins.was_inserted THEN 'inserted' ELSE 'updated' END)::text
  FROM ins;
END;
$$;

COMMENT ON FUNCTION public.upsert_strava_session(uuid,bigint,text,text,text,text,int,int,int) IS
  'Insert a Strava activity as a session, or refresh the four volatile metrics '
  'on the session already linked to it. Returns (session_id, action) where '
  'action is ''inserted'' or ''updated'' (xmax = 0 distinguishes them). The DO '
  'UPDATE SET list is deliberately minimal — see the inline comment; widening '
  'it breaks re-import idempotence and puts coach_note at risk. Note that a '
  'label colliding with an existing row on the same date raises 23505 on '
  'sessions_date_label_key rather than being absorbed here: ON CONFLICT infers '
  'a single arbiter index, and that arbiter is the strava_activity_id one. '
  'Callers treat that as a per-activity failure and continue.';

-- ---------------------------------------------------------------------------
-- adopt_strava_session — link an EXISTING session to a Strava activity.
-- ---------------------------------------------------------------------------
-- The single most consequential function in #54. Roughly twenty sessions
-- already in the table are the same training as a Strava activity, filed by
-- hand or by Coach under source portal/coach/coach_plan/claude_csv/concept2.
-- Importing those again would double ten weeks of CTL/ATL/TSB. This links the
-- existing row instead of creating a second one.
CREATE OR REPLACE FUNCTION public.adopt_strava_session(
  p_user_id          uuid,
  p_session_id       bigint,
  p_activity_id      bigint,
  p_avg_watts        int,
  p_has_device_watts boolean,
  p_avg_hr           int
)
RETURNS TABLE (session_id bigint, action text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id bigint;
BEGIN
  -- EXACTLY THREE COLUMNS. Not duration, not distance_m, not label, not date,
  -- not source, and absolutely not coach_note. The existing row is the record
  -- of what Scott decided the session was; adoption only adds the machine
  -- facts he could not have known — the activity id, and device-measured power
  -- and heart rate. Power is written only when Strava says it came from a
  -- meter (p_has_device_watts), never from Strava's pace-derived estimate.
  UPDATE public.sessions s SET
    strava_activity_id = p_activity_id,
    avg_watts = CASE WHEN p_has_device_watts THEN p_avg_watts ELSE s.avg_watts END,
    avg_hr    = coalesce(p_avg_hr, s.avg_hr)
  -- `strava_activity_id IS NULL` is the race guard, not a filter: two
  -- concurrent runs both choosing this candidate means the second one updates
  -- zero rows and reports it, rather than silently re-pointing a session at a
  -- different activity.
  WHERE s.id = p_session_id
    AND s.user_id = p_user_id
    AND s.strava_activity_id IS NULL
  RETURNING s.id INTO v_id;

  IF v_id IS NULL THEN
    session_id := p_session_id;
    action     := 'adopt_lost_race';
  ELSE
    session_id := v_id;
    action     := 'adopted';
  END IF;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.adopt_strava_session(uuid,bigint,bigint,int,boolean,int) IS
  'Link an existing session to a Strava activity without rewriting what Scott '
  'logged. Touches exactly three columns: strava_activity_id, avg_watts (only '
  'when p_has_device_watts) and avg_hr (coalesce). Returns action ''adopted'', '
  'or ''adopt_lost_race'' when the row was already claimed — zero rows updated '
  'is a reportable outcome, never a silent success.';

-- ---------------------------------------------------------------------------
-- Grants. See the header: revoking from PUBLIC is the half that matters.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.upsert_strava_session(uuid,bigint,text,text,text,text,int,int,int)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_strava_session(uuid,bigint,text,text,text,text,int,int,int)
  TO service_role;

REVOKE ALL ON FUNCTION public.adopt_strava_session(uuid,bigint,bigint,int,boolean,int)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adopt_strava_session(uuid,bigint,bigint,int,boolean,int)
  TO service_role;

-- ---------------------------------------------------------------------------
-- Assertions. A regression here is silent and catastrophic — a SECURITY
-- DEFINER function reachable by `anon` writes sessions for any user_id the
-- caller names. Fail the migration loudly instead.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ASSERT NOT has_function_privilege('anon',
    'public.upsert_strava_session(uuid,bigint,text,text,text,text,int,int,int)', 'execute'),
    'anon can execute upsert_strava_session';
  ASSERT NOT has_function_privilege('authenticated',
    'public.upsert_strava_session(uuid,bigint,text,text,text,text,int,int,int)', 'execute'),
    'authenticated can execute upsert_strava_session';
  ASSERT NOT has_function_privilege('anon',
    'public.adopt_strava_session(uuid,bigint,bigint,int,boolean,int)', 'execute'),
    'anon can execute adopt_strava_session';
  ASSERT NOT has_function_privilege('authenticated',
    'public.adopt_strava_session(uuid,bigint,bigint,int,boolean,int)', 'execute'),
    'authenticated can execute adopt_strava_session';
  ASSERT has_function_privilege('service_role',
    'public.upsert_strava_session(uuid,bigint,text,text,text,text,int,int,int)', 'execute'),
    'service_role cannot execute upsert_strava_session';
  ASSERT has_function_privilege('service_role',
    'public.adopt_strava_session(uuid,bigint,bigint,int,boolean,int)', 'execute'),
    'service_role cannot execute adopt_strava_session';

  ASSERT NOT has_table_privilege('authenticated', 'public.strava_tokens', 'select'),
    'authenticated can select strava_tokens';
  ASSERT NOT has_table_privilege('anon', 'public.strava_tokens', 'select'),
    'anon can select strava_tokens';
  ASSERT NOT has_table_privilege('authenticated', 'public.strava_oauth_state', 'select'),
    'authenticated can select strava_oauth_state';
  ASSERT NOT has_table_privilege('authenticated', 'public.strava_sync_state', 'update'),
    'authenticated can update strava_sync_state';
  ASSERT has_table_privilege('authenticated', 'public.strava_sync_state', 'select'),
    'authenticated cannot select strava_sync_state';
END $$;
