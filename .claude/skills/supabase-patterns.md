---
name: supabase-patterns
description: >
  How this project uses Supabase — client setup, query patterns, Edge Functions,
  and RLS considerations. Read when adding a new Supabase query, writing a hook,
  creating a migration, or building a new Edge Function.
---

## Client Setup

```js
// src/supabaseClient.js — do not change this file
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

Credentials come from Vite env vars. Never hardcode them. In development,
they live in `.env.local` (gitignored). In Vercel, set as environment variables.

## Tables

### sessions
```sql
id          uuid primary key default gen_random_uuid()
created_at  timestamptz default now()
date        date not null
type        text           -- 'erg', 'strength', 'cycling', 'rest', 'mobility'
label       text           -- human-readable e.g. 'Z2 Aerobic', 'Upper Strength'
duration    integer        -- minutes
srpe        integer        -- 1–10
exercises   jsonb          -- array of { name, sets, reps, weight, notes }
watts       integer        -- erg only
hr          integer        -- average heart rate
distance    integer        -- metres, erg/cycling only
status      text           -- 'logged' | 'planned'
```

### vitals
```sql
id          uuid primary key default gen_random_uuid()
date        date not null unique
rhr         integer        -- resting heart rate (bpm)
hrv         integer        -- HRV score
sleep       numeric(3,1)   -- hours
bodyweight  numeric(5,1)   -- kg
source      text           -- 'garmin' | 'google_health' | 'manual'
```

## Query Patterns

### Fetch all sessions (used in useSessions hook)
```js
const { data, error } = await supabase
  .from('sessions')
  .select('*')
  .order('created_at', { ascending: false })
```

### Insert a new session (used in LogSessionForm)
```js
const { error } = await supabase
  .from('sessions')
  .insert({
    date,
    type,
    label,
    duration,
    srpe,
    exercises,
    status: 'logged'
  })
```

### Upsert vitals (used by vitals-import Edge Function)
```js
await supabase.rpc('upsert_vital', {
  p_user_id: userId,
  p_date: date,
  p_rhr: rhr,
  p_hrv: hrv,
  p_sleep: sleep,
  p_bodyweight: bodyweight,
  p_source: 'google_health'
})
```

## React Query Pattern (for new hooks)

When adding new Supabase queries, use React Query instead of raw useEffect:

```js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })
}

export function useAddSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (session) => {
      const { error } = await supabase.from('sessions').insert(session)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] })
  })
}
```

## Edge Functions

Location: `supabase/functions/<name>/index.ts`
Runtime: Deno (not Node.js)
Deploy: `supabase functions deploy <name>`

Current Edge Functions:
- `vitals-import` — pulls Google Health Export CSV, upserts to vitals table. Runs daily via cron.

New Edge Functions for integrations:
- `strava-sync` — Strava webhook receiver → insert into sessions
- `garmin-sync` — Garmin health snapshot → upsert into vitals

## RLS (Row Level Security)

Currently: RLS is enabled but all authenticated users can read/write their own rows.
The app uses a single authenticated user (Scott).

When adding new tables: enable RLS and add a policy:
```sql
create policy "Users can manage their own rows"
  on <table> for all
  using (auth.uid() = user_id);
```
