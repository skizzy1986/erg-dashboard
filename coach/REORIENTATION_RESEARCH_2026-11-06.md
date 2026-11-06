# SplitIQ reorientation — Stage 1 research maps (2026-11-06)

> Appendix to [`REORIENTATION_EPIC_2026-11-06.md`](REORIENTATION_EPIC_2026-11-06.md). Produced by the
> `/orchestrate` Research stage on 2026-11-06, `main` at `22ce0cb`, by three read-only Codebase
> Onboarding Engineer agents (A: coach removal, B: prescription-cull coupling, C: data / docs / CI /
> licensing / backlog) plus the orchestrator's live Supabase reads and a baseline test run. No code
> was changed. **Line numbers are as of `22ce0cb` and will rot** — re-grep before acting on one.
>
> **Privacy.** Personal health data is described by shape (field names, row counts, categories) and
> never by value. Keep it that way in anything derived from this file.

---

# A. LLM-coach removal surface


All findings verified (line read) unless marked inferred. No build run. Issue bodies not readable; §9 from titles + coach/BACKLOG_AUDIT_2026-11-05.md.

## 0. The two "coach" things, classified

(1) In-app LLM coach (goes): web/src/hooks/useCoach.js (353), web/src/views/CoachView.jsx (332), supabase/functions/coach-chat/index.ts (183), supabase/migrations/002_coach_messages.sql, the `coach` entries in App.jsx, MobileApp.jsx, constants/destinations.js, localStorage key `coach_model_pref` (useCoach.js:103,150).

(2) Coach rail / context store (stays): sessions.coach_note, sessions.coach_flag, sessions.source='coach'; coach_log + anchors (006_context_store.sql:23, author in ('coach','scott')); templates.origin='coach' (007_strength_subsystem.sql:31; UI StrengthLogger.jsx:305,324,463,1559); strength_workouts.origin='coach'.

sessions.coach_note read by hooks/useSessionLog.js:58, components/LogEntry.jsx:13,329-341, views/mobile/MobileToday.jsx:273-282 — all (2). coach_note in App.test.jsx fixtures 21-81, LogEntry.test.jsx:17 — (2). 012_strava_integration.sql:224-287, strava-import/test.ts:165, strava-import/README.md:36,95 mark column never overwritten by Strava — (2). coach_flag has no web/src consumer. PlanView.jsx:37 "prescriptions from Coach" — (2) and on prescription cull list. utils/trainingLoad.js:27,132,139-143 and recoveryAnalytics.js:56 — comments only naming Coach/useCoach. utils/analysis.js:5, constants/coaching.js, constants/program.js:6, utils/formatting.js:5, OverviewView.jsx:33 — prose/module names, prescription cull not LLM coach. useErgSessions.js:41 comment lists useCoach as consumer of COMPLETED_STATUSES. vitals-sync/index.ts:16-18 and strava-sync/index.ts:16 comments "same list as coach-chat". doctrine-sha-guard.yml:5,6,44,46 — (2). zone-bands.yml:8 and check-zone-bands.mjs:13 cite coach/CODE_TO_COACH_HANDOVER.md — (2). .github/ISSUE_TEMPLATE/bug.yml:40 lists "Coach" as example affected view — (1).

## 1. Frontend

useCoach.js exports: todayISO (:27), buildTrainingContext (:31), useCoach (:97). Non-test importer: only views/CoachView.jsx:2. buildTrainingContext/todayISO imported only by useCoach.test.js:27, useCoachWiring.test.js:63. useCoach.todayISO duplicates utils/eventWindow.js:104 todayISO (different fn). useCoach.js imports useTSSHistory, useVitals, useSessions (:4-6), calcTrainingLoad, tsbBand (:7), COMPLETED_STATUSES, PLANNED_STATUS (:8-11), toISODate, toLogDate, parseDurationMinutes, captureError — all have other consumers; no reverse seam.

Seam the other way: tsbBand and TSB_BANDS[].signal (utils/trainingLoad.js:144-171) exist to reproduce "useCoach's existing three-way mapping" (:139). Only production reader of tsbBand(...).signal is useCoach.js:49. OverviewView.jsx:142,838,938 has its own .signal from autoregulate. signal pinned by utils/__tests__/tsbBand.test.js:43-46. Comments trainingLoad.js:27,132-143, tsbBand.test.js:40,57, trainingLoad.test.js:44 describe useCoach.

useCoach data surface: query key ['coach_messages'] (:109), setQueryData :162,187,268,300,334; supabase coach_messages select :112, insert :177,259,291, delete :324; raw fetch `${VITE_SUPABASE_URL}/functions/v1/coach-chat` :211; captureError source:'useCoach' :181,263,295,309,330,336.

CoachView.jsx imports only useCoach (:2); default export; window.confirm('Clear all coaching history?') :144.

Desktop App.jsx: lazy import :22; nav tuple ['coach','Coach'] :363 (one of 14, flat array); render :490-491; NO per-tab boundary — one ErrorBoundary class (:57-80) wraps all tabs (:395-498).

Mobile: constants/destinations.js:20 { id:'coach', label:'Coach', icon:'🤖' } — fifth of "five destinations", header comment :10. components/mobile/BottomTabBar.jsx:28 renders DESTINATIONS.map. hooks/useHashRoute.js:5-14 validates via isDestination. views/mobile/MobileApp.jsx:8,75 imports CoachView STATICALLY (not lazy on mobile); final else :76 falls to MobileRecovery. DESIGN_BRIEF.md:179 "Only ErgLiveView and CoachView are shared".

Tests: hooks/__tests__/useCoach.test.js (227, whole file); useCoachWiring.test.js (510, whole file, posts to /functions/v1/coach-chat :139); views/__tests__/CoachView.test.jsx (180, whole); __tests__/App.test.jsx vi.mock CoachView :110-111, NAV row ['COACH','CoachView-stub'] :231 drives loop ~:240; views/mobile/__tests__/MobileApp.test.jsx vi.mock :26, tab loop :58, #/coach deep-link :65-68, titles say "five destinations"; hooks/__tests__/useHashRoute.test.js 'coach' :21, navigate('coach') :75-76; e2e/smoke.spec.js:28 'coach' in TABS (label = key uppercased :35); e2e/visual.spec.js:15-16 comment only.

## 2. Edge function

coach-chat/index.ts: single file, no deno.json, no test.ts (verified). Imports only captureFunctionError from ../_shared/sentry.ts (:9). Needs ANTHROPIC_API_KEY (:3-4), calls https://api.anthropic.com/v1/messages (~:141). MODEL_MAP claude-haiku-4-5-20251001, claude-sonnet-4-6 (:36-39). CORS_HEADERS hand-maintained :24-32 (authorization, x-client-info, apikey, content-type, sentry-trace, baggage) — the #301 fix. COACH_SYSTEM_PROMPT (:41) hardcodes the athlete's name, age and city.

_shared: sentry.ts used by ALL functions; cronGuard.ts strava-import only; jwtSubject.ts strava-connect + strava-sync. No _shared module is coach-chat-only. No supabase/config.toml in repo. Four functions carry same preflight list (strava-connect :26, strava-sync :23, vitals-sync :22, coach-chat). vitals-sync/index.ts:18 "See coach-chat/index.ts" would dangle.

## 3. CSP / hosts

web/vercel.json:29 connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.ingest.de.sentry.io — no coach/Anthropic host (Anthropic call is server-side). utils/sentry.js:15-21 tracePropagationTargets generic. web/.env.example no coach/Anthropic key. ANTHROPIC_API_KEY appears only as Supabase secret (coach-chat header) and GitHub secret .github/workflows/claude.yml:47 (claude-code-action, unrelated).

## 4. Database: 002_coach_messages.sql

Columns id uuid pk, user_id uuid refs auth.users not null default auth.uid(), role text check ('user','assistant'), content text not null, model text, created_at timestamptz default now(). RLS enabled, one FOR ALL policy coach_messages_owner (auth.uid()=user_id USING + WITH CHECK). Index coach_messages_user_created (user_id, created_at DESC). Only FK outbound to auth.users. No other table/function/policy references coach_messages (grep supabase, docs, .claude, coach, CLAUDE.md, README.md — not live DB). Rollback convention NNN_name_rollback.sql exists for 008-012; 002 has none; next migration 013 (inferred). backup_snapshots cron code NOT in repo; coverage of coach_messages unknown. Drop is destructive: Scott approval + backup row. Live row count unknown.

## 5. CI / tooling

.github/workflows/ci-functions.yml only Deno workflow; path-filtered supabase/functions/** (:30-31); runs deno on vitals-import/test.ts (:59), vitals-import-api/test.ts (:61), strava-import/test.ts (:65). Does not test coach-chat or vitals-sync. #312 premise verified. NO workflow deploys any function (audit :155 "CI does not deploy it") — coach-chat deployed via Supabase MCP; live function separate from repo; audit :93 says deployed v13 byte-identical. Deleting coach-chat/** triggers ci-functions but no test covers it; steward SKILL.md:52,113 records the trap. check-bundle-size.mjs / entry-graph.mjs no coach ref. Android CI / PWA no coach ref (not exhaustive).

## 6. Bundle and coverage

Desktop: CoachView lazy (App.jsx:22) → normal dashboard chunk in TOTAL not ENTRY (inferred). Mobile: MobileApp.jsx:8 static import → CoachView in MobileApp's chunk; ENTRY membership not verified. No committed bundle report; web/dist absent; effect on TOTAL unknown. Coverage: vite.config.js:196 include ['src/**'], all:true (:195); exclusions :211-222 StrengthLogger.jsx, main.jsx, constants/**, test-setup.js, squat/assets/**, anatomy/scene/**, fixtures → useCoach.js and CoachView.jsx ARE in denominator. Global thresholds :240+ lines 89 (ratchet comment cites measured 93.6/89.7/85.1 2026-11-05). Per-file 'src/hooks/useCoach.js': { lines:80, functions:80, branches:70 } at vite.config.js:290 — stale ref if deleted; no CoachView per-file entry. Effect on global % unknown (not run).

## 7. Docs and skills that would become false

CLAUDE.md :81 coach-chat among edge functions; :175 coach_messages table row; :324 "silently killed the Coach tab (#301)"; :604-616 whole in-app Anthropic path paragraph. Also "14 tables", "all four functions", "fourteen desktop tabs" counts (inferred).
README.md :25 "an AI coach with full training context"; :43 feature row "AI Coach"; :46 tab list "..., Coach"; :63 "AI | Anthropic API (streaming)"; :87 coach_messages in schema tree; :91 coach-chat; :123 ANTHROPIC_API_KEY setup; :172 views/ (CoachView, ErgLiveView…).
.claude/skills/architecture.md:61 "CoachView.jsx ✓ extracted AI coach tab". steward/SKILL.md:52,:113 (coach-chat no CI verification; :52 "Provisional — drop when coverage lands"). erg-context.md:10 "Personal coaching dashboard" framing only. orchestrate/SKILL.md no hit.
coach/BACKLOG_AUDIT_2026-11-05.md:25,120,155; coach/CODE_TO_COACH_HANDOVER.md:30 ("coach_messages in-app path is legacy/experimental" — historical).
docs/CLOUD_ENVIRONMENT.md:111 "Schema reads and coach data" — (2). docs/onboarding/** no hit.
web/.design-sync/: DESIGN_BRIEF.md:81 (coach | useCoach | Tool), :179, :226 (IA row 5 "Coach: Why am I doing this? | coach (Ask) + Playbook"), :234-242 (Playbook inside Coach), :352 ("Why?" → Coach). .design-sync/CLAUDE.md:42 five destinations. HANDOFF.md :9, :214, :317-330 (Coach artboard: chat is "the fallback sheet, not the front door"), :453-474, :498. PROJECT-CONTEXT.md:112. conventions.md:270,328,338,343. config.json:34 (BottomTabBar doc string lists 'coach'). designs/coach.html, docs/BottomTabBar.md. Authority HANDOFF > DESIGN_BRIEF > conventions; check:design-sync guards config.json — whether it asserts destination list NOT verified.
.github/ISSUE_TEMPLATE/bug.yml:40.

## 8. Sentry

_shared/sentry.ts no coach string. coach-chat FN='coach-chat' (:11) tag. Cron monitor on vitals-import; no in-repo alert rules. Live erg-dashboard-functions may hold historical coach-chat issues (not queried). Frontend events source:'useCoach'.

## 9. Open issues (titles + audit only)

#312 changes meaning — only vitals-sync remains; not moot. #210 survives, scope shrinks (inferred). #209 splits — in-app Coach prompt half moot; UI-reads-anchors half (derive current from anchors, delete current:true literals and ANNUAL_ARC) tied to prescription layer; "Coach" may mean chat-session Coach — ambiguous. #217 unknown which Coach — needs body.

## Risks / gotchas

1. Mobile IA coupling: removing coach from DESTINATIONS changes "five destinations" shape assumed by BottomTabBar, useHashRoute, MobileApp, design-sync docs; MobileApp.jsx:76 else → MobileRecovery; no BottomTabBar test.
2. TSB_BANDS.signal is Coach-only in production (useCoach.js:49); pinned by non-coach-named tests.
3. Live function stays deployed until deleted via Supabase; CI never deploys/undeploys.
4. Per-file coverage threshold useCoach.js (vite.config.js:290) must go with the file; missing-key behaviour unverified.
5. e2e/smoke.spec.js:28 expects coach nav button.
6. Visual baselines: nav-bar screenshot may change (not checked).
7. Existing coach_messages rows + backup copies hold chat history (count unknown).
8. Four functions share hand-rolled CORS pattern; vitals-sync/strava-sync comments point at coach-chat.

## Open questions for Spec

1. Five destinations → four, or repurpose fifth (Playbook/reference shelf per DESIGN_BRIEF §2.2)? Design-sync normative consequence.
2. Keep or drop signal field + GREEN/AMBER/RED mapping?
3. Live coach_messages row count + backup coverage (Supabase MCP)?
4. Live coach-chat v13 explicit undeploy — who authorises (Scott via Supabase MCP)?
5. What does check:design-sync assert about destination list?
6. Is ANTHROPIC_API_KEY an Edge Function secret to remove (separate from claude.yml GitHub secret)?
7. Do #209 / #217 mean app coach or chat-session coach? Need bodies.

---

# B. Prescription-cull coupling map


Surprises: no barrel/index.js in constants/, no dynamic import() of these files. Extra importers outside src/: web/.design-sync/entry.jsx:23 re-exports derivePaceZones; web/scripts/check-zone-bands.mjs:29 dynamic-imports trainingConfig.js; .github/workflows/zone-bands.yml:51 path-filters trainingConfig.js; check-colour-literals.mjs:71,76,80 #666 allowlist for trainingConfig.js + ErgView + ProgramYear. Noise: squat/constants/phases.js own PHASES; logs.js mentions SEASON/EVENT_LADDER in prose only. ErgLiveView.jsx:14 defines its own local SRPE_GUIDE {v,label} (duplicate, not importer). utils/analysis.js outside cull table but coupled (§1.9, §3).

## 1. Export inventory
### 1.1 constants/schedule.js (718; imports only THEME)
ROSTER_REGIMES(:13) array[3]{from,awayDays,homeDays}|{from,mode} fitted · ROSTER_OVERRIDES(:24) {} general container · MICROCYCLE(:26) {home,fifo} each {label,sub,color,days[7]} am/pm/notes/fuel/meal prose fitted · SEASON(:250) {current,label,span,finale,arc,goal,next,principle} fitted · SEASON_2(:262) fitted · EVENT_LADDER(:338) array[9]{date(prose),name,kind,key?,phase,serves} fitted content feeding a generic DB-linked machine (§2.3) · VOLUME_PROGRESSION(:418) fitted · PHASES(:452) array[3]{id,name,duration,current,status,principle,science,test,weekly} fitted · PHASE_CONTEXT(:698) fitted; duplicates anchors.current_phase conceptually.
### 1.2 utils/schedule.js (228)
ROSTER_ANCHOR(:39) = ROSTER_REGIMES[0].from fitted, no non-test importer, test schedule.test.js:29 · getRosterMode(date)(:41) reads ROSTER_REGIMES/ROSTER_OVERRIDES — algorithm general, data fitted · SESSION_OVERRIDES(:61) 2 dated prescription objects — fitted, lives in utils · resolveDay(:91) prescription-coupled · logEntriesForDate(date,sessions)(:113) PURE/GENERAL (unpadded M/D/YY key filter) · dayStatus(date,todayMidnight,sessions)(:124) PURE/GENERAL done/today/missed/upcoming · getToday(cycleMode)(:137) coupled · getUpcomingSessions(now,sessions)(:169) coupled; hardcodes ERG_HOUR=6, STRENGTH_HOUR=16, isStrength regex · daySessions(day)(:208) PURE/GENERAL on {am,pm,amNote…}.
Callers: getRosterMode CalendarView:69,74, OverviewView:78 · resolveDay CalendarView:76 · dayStatus CalendarView:77 · logEntriesForDate CalendarView:81, OverviewView:153 · getToday OverviewView:78 · getUpcomingSessions OverviewView:92 · daySessions CalendarView:137, OverviewView:152, ProgramMicrocycle:84. No seed-history constant imported anywhere.
### 1.3 constants/program.js (412; imports only THEME)
ERGZONE_FORMAT(:14) fitted · INTENSITY_EVOLUTION(:30) fitted · BUILD1_SESSIONS(:41) array[4] fitted · VOLUME_EXTRAS(:102) fitted · TECHNIQUE_WORK(:142) array[4]{name,freq,color,how,why} mostly general (inferred) · MOVEMENT_SCREEN(:176) array[4]{test,look,flag} general · MOBILITY_WARMUP(:199) array[4] strings general · TECHNOGYM_CONVERSION(:223) fitted · ATHLETE_BACKGROUND(:240) {headline,cycling,strength,implications} fitted PERSONAL · RACE_TARGET(:263) fitted · ORGS(:271) array[5]{tier,name,site,color,note} general reference · EVENT_PATHWAY(:310) array[5] fitted · ANNUAL_ARC(:348) array[7]{block,months,weeks,current,focus,test} fitted.
### 1.4 constants/coaching.js (153)
ADAPTIVE_RULES(:7) array[12]{id R1..R12,domain,tier,rule,action,origin} fitted (Intensity, sRPE trend, Recovery gate, Sleep, Life-stress, Roster, Niggle) · RULE_EVOLUTION(:121) array[3] fitted · DAILY_ROUTINE(:143) fitted, ZERO importers.
### 1.5 constants/trainingConfig.js (320; imports wattsToPace500 from utils/pace.js, THEME)
SRPE_GUIDE(:7) array[5]{range,label,anchor,zone,color} general · CALIBRATION_STATUS(:49) array[12]{metric,tier,conf,color,basis,upgrade} only load-model row has key — fitted, personal readings embedded · deriveCalibrationStatus({cp,cpAvailable,cpStatus})(:156) general mechanism over fitted rows · CRITICAL_POWER(:170) {wPrime:null,northStar,status} no CP number (test pins) · POWER_DURATION(:178) array[5] fitted · FTP_TEST(:221) general protocol prose · HR_ZONES(:231) array[5] absolute-bpm strings fitted (from EST_MHR) · EST_MHR(:279) scalar 170 fitted · SRPE_SCALE(:281) string general · HR130_POWER(:284) array[5]{date 'M/D',watts,type,setupArtifact?} fitted · derivePaceZones(cp)(:306) GENERAL.
derivePaceZones depends on (:295-320): module-private ZONE_POWER_PCT (:295-302, 6 rows, lo/hi fractions of CP); HR_ZONES only for colour lookup (Recovery zone has no row → literal '#666' ~:311 → check:colours allowlist); wattsToPace500 (utils/pace.js:1); THEME indirectly. NOT EST_MHR/CRITICAL_POWER/CALIBRATION_STATUS. Everything else in the file independent of it except the HR_ZONES colour lookup. utils/pace.js:19 classifyZone(watts,cp) repeats 0.55/0.7/0.8/0.9/1.05 breakpoints (second implementation); useErgSessions.js:23 uses it.
### 1.6 constants/nutrition.js (201)
MACRO_TARGETS(:2) fitted · MF_PROGRAM(:26) fitted · DEFICIT_PROGRAM(:36) fitted · FUELLING(:117) partly general · NUTRITION_PRINCIPLES(:155) general prose · NUTRITION_TARGETS(:182) fitted.
### 1.7 constants/logs.js (485)
bloodsLog(:7) EMPTY · mobilityLog(:13) array[3] fitted · DECISION_LOG(:43) array[30] fitted (prose names roster/athlete) · HYPOTHESES(:217) array[9] fitted · RULE_FIRING_HISTORY(:273) array[5] fitted keyed to ADAPTIVE_RULES ids · nutritionLog(:282) array[6] fitted, dayType keys NUTRITION_TARGETS · bpLog(:350) array[3] fitted health · CONFIDENCE_MIGRATION(:378) array[6] fitted · LIPID_REF(:412) general population reference · HORMONE_REF(:444) generic marker list; COMMENT BLOCK ABOVE holds personal medical history · NIGGLES(:466) array[2] fitted.
### 1.8 constants/mobility.js (152)
MOBILITY_ROUTINES(:9) array[3]{id,name,icon,color,when,why,blocks[6|7|7],note} ids foam/prep/yoga; header ties to a rehab area; 21 lines mention hamstring/rehab; structure generic, why/note rehab-specific · MOBILITY_STREAK_NOTE(:151) fitted.
### 1.9 Adjacent (outside cull table)
utils/analysis.js imported only by OverviewView:22-26: evaluateRules(recovery,recentSrpe,tsb,baselines)(:12) flags R3/R4/R5, hardcoded sleep<7 (~:31), sRPE>=7, TSB<-25; checkConsistency(:49); autoregulate(tsb,readiness,fired)(:65) GREEN/AMBER/RED + guidance text referring to "the plan". R-ids link by string to ADAPTIVE_RULES/RULE_FIRING_HISTORY. utils/formatting.js assessMacro/macroColor only OverviewView:1158-1249; bpCategory only RecoveryView:443 (all tested). ErgView.jsx inline fitted: ergTrend(:34, used :397), HR130_PROJECTION(:184), analyzeBarometer(:126) hardcodes '2026/' (~:130-132). OverviewView.jsx inline "SEQUENCING RULES" array ~:1370-1423. App.jsx:99-136 hardcoded strengthTrend e1RM series (§7).

## 2. Consumption map
(a) survives w/ generic source; (b) empty/meaningless without constant; (c) mixed w/ seam.
OverviewView.jsx (1423): (c). Imports :13-33. Today strip :76-393 mixed — getToday/getRosterMode(:78), evaluateRules(:85), autoregulate(:91), getUpcomingSessions(:92), daySessions(:152), logEntriesForDate(:153), PHASE_CONTEXT(:129-130); "recently completed"(:303) + readiness generic; today-session boxes/countdowns need MICROCYCLE (b). Phase context :395-500 PHASE_CONTEXT (b). Stats :501-559 props only (a). Adaptive Decision Engine :560-786 ADAPTIVE_RULES(:603,685,688), RULE_EVOLUTION(:766), evaluateRules(:568), checkConsistency(:574) (b). Today's Prescription :787-951 evaluateRules(:795), autoregulate(:801), deriveTargets(HR130_POWER)(:802) (b). Training Load chart :952-1127 loadData, tsbBand(:1109), LoadTooltip, useAnchors label (:974,:1122) (a) — THE LOAD-MODEL SURFACE. Nutrition Status :1128-1369 nutritionLog(:1153), NUTRITION_TARGETS(:1157), assessMacro/macroColor (b). Sequencing rules :1370-end inline (b). Seam: load chart + stats + readiness/vitals.
CalendarView.jsx (351): (c). Day strip :62-100,:137 getRosterMode/resolveDay/daySessions (b) vs dayStatus/logEntriesForDate pure over loggedSessions/cancelledSessions props (a). Header banner :123 MICROCYCLE label(:95) + PHASE_CONTEXT.phaseLabel. Ladder :100-103, ~:255-262 useBenchmarkStatuses()(:32) renders EVENT_LADDER via hook default; linking via useBenchmarkSessions/useLinkBenchmarkSession.
ProgramView.jsx (1958): (b) as a file, internal seam; entirely static (only useState :33). Sub-nav :37-66 phases/week(→ProgramMicrocycle :69)/year(→ProgramYear :72). PHASES :74-119,:344; ERGZONE_FORMAT :395,405,489; BUILD1_SESSIONS :407; INTENSITY_EVOLUTION :539-606; VOLUME_EXTRAS :639-641; HR_ZONES(:745)+EST_MHR(:742) :714-823; Strength guidelines :824-1058 REP_SCHEMES(:856), LOWER_DIFFERENTIATION(:961), STRENGTH_PRINCIPLES(:1017) from constants/exercises.js (STRENGTH_TEMPLATES :44, PREHAB_NOTE :114 for StrengthView); TECHNIQUE_WORK :1095; SRPE_SCALE :1252; MOVEMENT_SCREEN(:1299), MOBILITY_WARMUP(:1348); Nutrition :1363-end MACRO_TARGETS(:1422), MF_PROGRAM(:1544), DEFICIT_PROGRAM(:1666-1809), NUTRITION_PRINCIPLES(:1833), FUELLING(:1870-1937). General content (MOVEMENT_SCREEN, MOBILITY_WARMUP, NUTRITION_PRINCIPLES, SRPE_SCALE, strength guidelines) sits beside fitted.
program/ProgramMicrocycle.jsx (189): (b). MICROCYCLE(:31), TECHNOGYM_CONVERSION(:151-158), daySessions(:84).
program/ProgramYear.jsx (950): (b). SEASON :38,183-242; SEASON_2 :499-593; EVENT_LADDER :255,281; VOLUME_PROGRESSION :377-468; RACE_TARGET :48-62; ATHLETE_BACKGROUND :680-743; EVENT_PATHWAY :771; ANNUAL_ARC :86; ORGS :868. No other files in views/program/.
JournalView.jsx (346): (b). No props/state. DECISION_LOG(:57), HYPOTHESES(:120,130), RULE_FIRING_HISTORY(:219), CONFIDENCE_MIGRATION(:288).
RecoveryView.jsx (807): (c), clean seam by section. Generic on useVitals: readiness composite :63-158, current metrics :159-252, RHR trend :253-336, data-status note :377-396. Fitted inline prose: single-night sleep narrative :337-376. BP :397-529 bpLog(:439), bpCategory(:443), inline medication/GP prose ~:423-436, :523-525. Bloods :530-613 bloodsLog(:573 empty), LIPID_REF(:575), GP-test text. Hormone :614-712 HORMONE_REF(:656), referral prose. Niggles :713-end NIGGLES(:731,744).
MobilityView.jsx (326): (b) with generic structure. MOBILITY_ROUTINES(:61), MOBILITY_STREAK_NOTE(:247), mobilityLog(:250), local mobOpen state. No DB read.
LogView.jsx (127): (a). Only SRPE_GUIDE (:3,:54).
ErgView.jsx (1271): (c). Imports :15-22. derivePaceZones(cp)(:229) → PaceTrendChart(:338), zone colours(:266) — generic from useAnchors. HR130_POWER :237,:181-189, ~:497-784 (b). FTP_TEST :914-947; CRITICAL_POWER :997-1003; POWER_DURATION :1048; deriveCalibrationStatus :230, table ~:1111-1239 — mostly fitted. Sections 1,2,4,5 (:273-370, :785-884, :1239-end) generic over useErgSessions. Also tsbBand(:243), useAnchors(:228), local ergTrend(:397 fitted seed).
hooks/useBenchmarkStatuses.js: (a). ladder = EVENT_LADDER default arg (:2,:9); parameterised via utils/benchmarkStatus.js (resolveLadderStatuses, compareBenchmarkSeverity) + utils/eventWindow.js (parseEventWindow). eventWindow.js:19 BENCHMARK_TERMS=['cp']. DB side sessions.benchmark_key (009) joins EVENT_LADDER[].key; entries without key (competitions) not linkable.
StrengthLogger.jsx imports none (only THEME, LAYER, utils/strengthDraft.js).
Mobile views import NO cull constant directly or via desktop view. Only desktop views mounted on mobile: CoachView (MobileApp.jsx:8,75), ErgLiveView (MobileTrain.jsx:2). MobileToday.jsx:109-110 reads anchors.current_phase/current_block. Mobile "prescription" = sessions status='planned' row (MobileToday ~:105). AuthGate.jsx:249,291 picks isMobile ? MobileApp : App. PlanView.jsx + useSessionLog.js read planned sessions from DB, no constants.

## 3. Load model inputs
utils/trainingLoad.js: sessionLoad(session,{cp,ftp})(:38) — srpe path hours×srpe×10; power fallback hours×(watts/threshold)²×100 (cp erg / ftp bike). calcTrainingLoad(tssData,endDate)(:56) CTL_K=exp(-1/42), ATL_K=exp(-1/7) fixed. TSB_BANDS(:144) +10/-10/-30 fixed. CP/FTP source: useTSSHistory.js:9,40 → useAnchors(); same hook feeds useErgSessions.js:30, MobileAnalytics, MobileToday, OverviewView. hooks/useAnchors.js:15-47 reads anchors where superseded_at IS NULL; exposes cp, ftp, cpStatus, cpAvailable; uses only rowing_cp, bike_ftp (:32-33); no hardcoded fallback. Anchor keys read by code: rowing_cp, bike_ftp, current_phase, current_block (no drag_factor/HRmax/bodyweight anchor in code). Bodyweight from vitals.bodyweight_kg (useVitals.js:26). CP not duplicated as a number in constants (trainingConfig.test.js:14,22 pins). computeReadiness(latest,baselines,tsb) (recoveryAnalytics.js:49) only readiness fn, wired useVitals.js:43; baselines computePersonalBaselines (trimmed mean last 28 rows, ≥14 samples); fallbacks :3-5 RHR_DEFAULT/HRV_DEFAULT/SLEEP_TARGET commented "population fallbacks" (population vs personal INFERRED); coefficients ×4 RHR, ×1.5 HRV, ×8 sleep, TSB<-20 ×0.8.
Leaks into kept model/adjacent: (1) deriveTargets(hr130Series) trainingLoad.js:112 hardcoded 150 default + 0.96/1.02/0.83/0.9 multipliers on HR130_POWER; only caller OverviewView.jsx:802. (2) RHR_DEFAULT/HRV_DEFAULT/SLEEP_TARGET; analysis.js imports first two, hardcodes 7 sleep. (3) overlapping TSB thresholds -10, -20 (readiness), -25 (evaluateRules/autoregulate), -30 (TSB_BANDS). (4) TSB_BANDS labels + signal consumed by useCoach.js:49. (5) hardPush srpe>=7 (useErgSessions.js:23) duplicates evaluateRules 7. (6) HR_ZONES colour-only in derivePaceZones. (7) PHASE_CONTEXT (static) vs anchors.current_phase (DB) two sources for one concept.

## 4. Tests
constants/__tests__/trainingConfig.test.js 14 it/3 describe (no static CP/PACE_ZONES, deriveCalibrationStatus, derivePaceZones at 190 & 205) · utils/__tests__/schedule.test.js 44/12 (getRosterMode regimes/overrides HARDCODED Jun-Sep 2026 dates, ROSTER_ANCHOR, resolveDay, dayStatus, getToday, getUpcomingSessions, daySessions) · analysis.test.js 18/4 · eventWindow.test.js 24/5 (parses every live EVENT_LADDER date :13-35) · benchmarkStatus.test.js 50/10 (imports EVENT_LADDER :8) · hooks/__tests__/useBenchmarkStatuses.test.js 8/2 (EVENT_LADDER.length :80,:156) · views/__tests__/OverviewView.test.jsx 10/1 (mocks useVitals/useAnchors; readiness, CP label, load unavailable; rest smoke) · CalendarView.test.jsx 16/2 (imports EVENT_LADDER; mocks benchmark hooks) · CalendarView.dayStrip.test.jsx 11/2 (pins clock 23 Jun–9 Jul; relies on real roster data) · CalendarView.benchmark.test.jsx 9/2 (:65 matches heading 'SEASON 1 LADDER') · ProgramView.test.jsx 3/1 · program/__tests__/ProgramYear.test.jsx 3/1 (season target, event pathway, "all nine ladder entries") · ProgramMicrocycle.test.jsx 2/1 · JournalView.test.jsx 5/1 (renders every constant section) · RecoveryView.test.jsx 12/1 (imports LIPID_REF/HORMONE_REF/NIGGLES :18, renders each niggle) · MobilityView.test.jsx 2/1 · LogView.test.jsx 2/1 · ErgView.test.jsx 14/2 (:221 comments POWER_DURATION) · components/__tests__/PaceTrendChart.test.jsx 9/1 (derivePaceZones(205) fixture :8) · recoveryAnalytics.test.js 26/5 · trainingLoad.test.js 48/13 (incl deriveTargets inferred) · useAnchors.test.js 4/1 · formatting.test.js covers assessMacro/macroColor/bpCategory. No tests for constants program/coaching/nutrition/logs/mobility as such.
Coverage: include src/** (:196) all:true; exclude src/constants/** (:215), StrengthLogger.jsx, main.jsx → cull constants outside denominator. Global ~:240 lines 89 / functions 85 / branches 80 (measured comments 93.6/89.7/85.1). INCLUDED in ratchet: utils/schedule.js, utils/analysis.js, all views above, views/program/*, hooks/useBenchmarkStatuses.js. Per-file 80/80/70: OverviewView.jsx(:336), CalendarView.jsx(:341), MobilityView.jsx(:331), StrengthView.jsx(:326), utils/eventWindow.js, utils/benchmarkStatus.js, hooks/useBenchmarkStatuses.js. No per-file gate: utils/schedule.js, analysis.js, ProgramView, JournalView, RecoveryView. Shrinking untested ProgramView.jsx would raise global % (inferred).

## 5. check:zones
web/scripts/check-zone-bands.mjs (npm run check:zones, package.json:18); imports ONLY derivePaceZones from src/constants/trainingConfig.js (:29 dynamic); scans git ls-files '*.md' (315 files); regex UT2 + three lo-hi + W, requires AT and UT1 and a preceding ~/≈ CP (:53-90). Ratios from ZONE_POWER_PCT. Verified today: 4 bands all match — CLAUDE.md:267, coach/CODE_TO_COACH_HANDOVER.md:17, web/.design-sync/CLAUDE.md:57, web/.design-sync/PROJECT-CONTEXT.md:34. conventions.md:421 has zone numbers but no trailing W (not matched). zone-bands.yml on **/*.md, trainingConfig.js, utils/pace.js, script, workflow. Moving derivePaceZones requires editing script(:29), workflow filter(:51), .design-sync/entry.jsx:23. #666 pinned by check:colours (:71).

## 6. App.jsx tab registry
Lazy imports :20-33; nav array ~:345-360 [id,label]; single ErrorBoundary :395-498.
overview→OverviewView(:28,~446) · calendar→CalendarView(:30,~427) · program→ProgramView(:29,~438) · plan→PlanView(:31,~418) · live→ErgLiveView(:21,~407) · erg→ErgView(:23,~460) · strength→StrengthView(:26,~467) · logger→StrengthLogger(:20,~404) · mobility→MobilityView(:27,~474) · recovery→RecoveryView(:25,~477) · log→LogView(:32,~480) · journal→JournalView(:24,~489) · coach→CoachView(:22,~491) · settings→SettingsView(:33,~494).
view = useState (:195, initial 'overview' or 'settings' after Strava callback); not persisted (no localStorage tab key, no desktop hash route). expanded state (:196) only for ProgramView. Tab removal touches nav array, one lazy import, one render branch (+expanded for Program). Mobile registry constants/destinations.js: today, train, progress, body, coach (~:15); useHashRoute; MobileApp.jsx:64-76 maps. No Program/Journal/Mobility/Overview on mobile. App.jsx:41-51 header comments name MICROCYCLE, SEASON, getRosterMode, ROSTER_ANCHOR; :53 "SEASON" prose.

## 7. Strength side
StrengthLogger.jsx imports no cull file (:11-19). views/StrengthView.jsx imports STRENGTH_TEMPLATES + PREHAB_NOTE from constants/exercises.js (:12); not program.js/coaching.js. #222 constant = strengthTrend App.jsx:99-136, object of 9 lifts each array of {date,e1rm}. Consumers: latestSquat (App.jsx:255) → OverviewView.jsx:522; strengthTrend → StrengthView.jsx:42-163 (App.jsx:468). StrengthLogger.jsx:176 own e1rm(w,r) Epley, best_e1rm_kg read :1532. hooks/useStrengthPRs.js:19 + MobileStrength.jsx:105 read DB best_e1rm_kg. One personal e1RM figure in prose constants/program.js:253 (ATHLETE_BACKGROUND.strength).

## Risks / gotchas
1. EVENT_LADDER is not just display: useBenchmarkStatuses default, eventWindow parses dates, key joins sessions.benchmark_key; three tests iterate the live ladder.
2. schedule.test.js + CalendarView.dayStrip.test.jsx pin real 2026 roster dates/ROSTER_REGIMES.
3. derivePaceZones has four reaching surfaces: ErgView.jsx:20,229; .design-sync/entry.jsx:23; check-zone-bands.mjs:29; zone-bands.yml:51.
4. R-ids couple analysis.js, coaching.js, logs.js by string.
5. OverviewView mixes kept load chart/readiness with fitted sections under one per-file 80/80/70 gate.
6. Hardcoded 2026 literals in ErgView.analyzeBarometer and schedule.test.js.
7. utils/schedule.js:61 SESSION_OVERRIDES is prescription data in utils (not under constants/** exclusion).
8. ErgLiveView.jsx:14 duplicates SRPE_GUIDE.
9. DAILY_ROUTINE, ROSTER_ANCHOR, CALIBRATION_STATUS, SEASON_2 (except ProgramYear) have no non-test importer — deletion silent.

## Open questions for Spec
1. Per-file threshold key for a deleted view — fails vitest or ignored?
2. EVENT_LADDER consumers (benchmark linking, sessions.benchmark_key) in or out of the cull? Content fitted, machine generic.
3. SRPE_GUIDE (trainingConfig) vs ErgLiveView local — which survives?
4. CALIBRATION_STATUS load-model row "basis" text — part of kept load model?
5. HR_ZONES colour-only use in derivePaceZones; where does Recovery-zone #666 fallback live afterwards?
6. Which of RHR_DEFAULT/HRV_DEFAULT/SLEEP_TARGET and deriveTargets' 150 are acceptable kept defaults?
7. analysis.js (evaluateRules/autoregulate) — "adaptive rules" row (cull) or kept readiness model?
8. App.jsx:99-136 strengthTrend (#222) — in this epic?
9. Where do bloodsLog-style rows go in health_markers? Nothing creates it yet.

---

# C. Data, docs, CI guards, licensing, backlog


## 1. Supabase patterns for a health-records table
1. Migration naming: NNN_snake_case.sql, no timestamp, no supabase/seed.sql; 000–012; two 011s (revoke_security_definer_execute, sessions_strava_activity_id). Rollbacks from 008 as NNN_name_rollback.sql, header "NOT auto-applied" (008_..._rollback.sql:1); rollback headers carry preconditions (012 rollback :1-22 is the model). 006:3 "Applied live as migration context_store_coach_log_and_anchors" → file mirrors a live apply_migration.
2. Single-owner RLS template 006_context_store.sql:17-35 (coach_log): user_id uuid references auth.users not null default auth.uid(); enable RLS; drop policy if exists; create policy coach_log_owner for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid()); index (user_id, date desc). Lowercase, create table if not exists, gen_random_uuid(), created_at timestamptz not null default now(), check(... in (...)) enums, tags text[] default '{}'. anchors adds partial unique index one live row per key (006:55-57). 007 same shape, policy names *_all (007:150-170); shared reference tables for select to authenticated using (true) (exercise_media_read 007:167-169). 001 older style: USING (auth.uid() = user_id), four per-verb policies (001:24-30).
3. Newest conventions 012_strava_integration.sql: uppercase; user_id REFERENCES auth.users(id) ON DELETE CASCADE, no auth.uid() default; policy-less tables ENABLE + FORCE ROW LEVEL SECURITY + REVOKE ALL FROM public, anon, authenticated (:41-45); owner-select-only REVOKE ALL, GRANT SELECT TO authenticated, FOR SELECT USING (user_id = auth.uid()) (:118-132); COMMENT ON TABLE security rationale; SECURITY DEFINER fns SET search_path = '' and revoked from public; closing DO $$ ASSERT has_table_privilege block (~:290-320); bounded-enum CHECK columns (:98-117).
4. No existing health tables/columns in migrations (grep health_*, medication, injur*, blood → only 004:85 'health_export' source string, vitals cols in 003/004). No health_markers. [Orchestrator note: LIVE DB has bp_readings — see live-supabase.md.]
5. supabase-patterns.md (147) is stale: :26-60 shows sessions.date as `date not null`, vitals.date unique (contradicts CLAUDE.md); :140 "single authenticated user (Scott)"; RLS snippet :142-146 lacks `to authenticated` and `with check`; documents only vitals-import.
6. Seed/data-import convention: none. exercises created 000:41-46 as id uuid, name, category, created_at — no equipment/primary_muscles; 007 references exercises(id) as text (007:38,88,101,115); StrengthLogger.jsx:1140-1142 selects id,name,equipment,primary_muscles,category. Live 873-row table NOT reproducible from migrations; no script/JSON/CSV/seed carries the rows (only coach/work-orders/WO-004:92,114,135 mention "the 873-library"). Precedent for row content: structural seed rows "inserted separately with an explicit user_id ... NOT part of this schema file" (006:12-14); Coach writes rows via MCP. web/scripts/extract-squat-data.mjs is the only data script (squat-only).

## 2. Personal data inventory (shape only)
logs.js (485; imported by JournalView, RecoveryView, OverviewView, MobilityView):
bloodsLog(:7) array[0] blood panel · mobilityLog(:13) array[3]{date,type,label,duration,note} activity log · DECISION_LOG(:43) array[30]{date,decision,why} · HYPOTHESES(:217) array[9]{h,status,evidence} · RULE_FIRING_HISTORY(:273) array[5]{date,fired[]} (coaching.js coupling) · nutritionLog(:282) array[6]{date,dayType,cal,protein,fat,carbs,burn} · bpLog(:350) array[3]{date,sys,dia,pulse,context,clean} · CONFIDENCE_MIGRATION(:378) array[6]{metric,state,note} (#177) · LIPID_REF(:412) array[4]{marker,unit,target,color} reference · HORMONE_REF(:444) array[5]{marker,note} reference · NIGGLES(:466) array[2]{area,status,color,detail,watch}.
nutrition.js (201; ProgramView, OverviewView): MACRO_TARGETS array[3]{macro,target,rule,color,note}; MF_PROGRAM array[7]{day,train,cal,p,c,f}; DEFICIT_PROGRAM {trigger,rate,days[7],guardrails[5],phase,note}; FUELLING {byType[4],hydration[5],protein}; NUTRITION_PRINCIPLES array[6][string,string]; NUTRITION_TARGETS {two-a-day|training|rest:{cal,protein,carbs,fat}} [lo,hi].
RecoveryView.jsx (807): imports bpLog, bloodsLog, LIPID_REF, HORMONE_REF, NIGGLES (:10-16), bpCategory (utils/formatting), useVitals. :23-396 readiness/metrics/RHR/sleep (useVitals-driven, not personal literals). :397-529 BP section reads bpLog; INLINE LITERALS :523-525 advisory prose re medication/weight loss. :530-613 Bloods/Cholesterol (bloodsLog, LIPID_REF; "results render when populated" :610). :614-712 Hormone panel (HORMONE_REF). :713-807 Niggles/Injury Watch (NIGGLES). Keyword hits :13,397,422,425,507,523-525,530,555,575,604,606,654,742.
mobility.js (152): MOBILITY_ROUTINES array[3] ids foam/prep/yoga (generic names); blocks[]{move,visual}, some rehab:true (:30,36,78,94,116,122); header :3 and notes :51,:99,:147 one-rehab-specific; MOBILITY_STREAK_NOTE :151. MobilityView.jsx renders rehab flag as REHAB badge (:176,:185), own rehab prose :38.
Other personal literals outside constants/: ProgramView.jsx :11 (imports DEFICIT_PROGRAM), :1188, :1217, :1652-1699 deficit block; OverviewView.jsx :1303 deficit-day text + nutritionLog/logs consumption; views/mobile/MobileRecovery.jsx :270-313 deficit computation; utils/schedule.js :82,84,86 override prose with day macro targets; StrengthView.jsx :271 prehab heading; App.jsx "Calibration phase" string; StrengthLogger.jsx :1077,1201,1231,1314 muscle-name keys (anatomical, not personal). hooks/, components/, utils/ (except schedule.js) no hits.
constants/ verdicts: coaching.js(153) personal (ADAPTIVE_RULES, RULE_EVOLUTION, DAILY_ROUTINE; only OverviewView) · destinations.js(25) config · exercises.js(138) mixed (STRENGTH_TEMPLATES, REP_SCHEMES, LOWER_DIFFERENTIATION, PREHAB_NOTE, STRENGTH_PRINCIPLES — one-athlete prescription; ProgramView, StrengthView) · logs.js personal/health · mobility.js mixed · nutrition.js personal · program.js(412) personal (ATHLETE_BACKGROUND, RACE_TARGET, EVENT_PATHWAY, ANNUAL_ARC, BUILD1_SESSIONS) + generic-looking ERGZONE_FORMAT, TECHNIQUE_WORK, MOVEMENT_SCREEN, TECHNOGYM_CONVERSION; ProgramView, ProgramMicrocycle, ProgramYear · schedule.js(718) personal (ROSTER_REGIMES, MICROCYCLE, SEASON, SEASON_2, EVENT_LADDER, PHASES, PHASE_CONTEXT); useBenchmarkStatuses, CalendarView, ProgramView, ProgramMicrocycle, ProgramYear, OverviewView, utils/schedule · sessionStatus.js(16) reference · theme/themeValues/tokens/type/ui config · trainingConfig.js(320) mixed: reference derivePaceZones(:306), SRPE_GUIDE(:7), SRPE_SCALE(:281); personal calibration CALIBRATION_STATUS(:49), deriveCalibrationStatus(:156), CRITICAL_POWER(:170), POWER_DURATION(:178), FTP_TEST(:221), HR_ZONES(:231), EST_MHR(:279), HR130_POWER(:284); consumed by ProgramView, LogView, ErgView, OverviewView.

## 3. Documents carrying the superseded framing (line counts via wc -l)
CLAUDE.md(710): 16 "personal coaching dashboard"; 19-20 Vision replace commercial apps; 81 coach-chat; 175 coach_messages; 222,237 current_phase/current_block; 253-274 Training Science Domain (273 "Microcycle … Home weeks = loading. FIFO = deload"); 275-286 Integration Roadmap (286 "TrainingPeaks/Ergzone — replaced by native plan engine"); 324 Coach tab #301; 533 "solo dashboard"; 596-619 Supabase (coaching data model) incl. Coach tab + buildTrainingContext (604-609); Coach-as-chat framing 157-252 (coach_log/anchors lanes — KEEP).
README.md(268): 4 replace Strava…; 36 Program tab "Microcycle schedule"; 87 coach_messages; 91 coach-chat; 123 ANTHROPIC_API_KEY; 172 CoachView; 253 TrainingPeaks/Ergzone replaced.
.claude/CLAUDE.md(54): :52 roster metaphor only — personal to Scott by design, NOT superseded.
.claude/AGENTS.md(97): 43 "solo dashboard".
.claude/skills/erg-context.md(102): 10-11 "Personal coaching dashboard … Solo user: Scott" — the spawn preamble.
.claude/skills/training-science.md(103): 17 race target; 76-79 Microcycle/Home/FIFO. DOCTRINE-PINNED.
.claude/skills/supabase-patterns.md(147): 140 single user; 61+ stale schema.
.claude/skills/architecture.md(104): 26-30 nutrition/logs/coaching export lists; 61 CoachView "AI coach tab"; 78 ProgramMicrocycle "2-week roster".
.claude/skills/daily/SKILL.md(76): 60 current_phase maintenance rule.
.claude/skills/steward/SKILL.md(184): 52,113 coach-chat/vitals-sync untested.
WORKFLOW.md(226), DESIGN.md(122): no framing hits (#311 check-count issue separate).
web/.design-sync/HANDOFF.md(500): 207,292,324,410-411,419,426-429,442,498 (RosterWave, roster "stays on Coach", rosterCheck, ROSTER, Microcycle split; 11 Coach mentions).
DESIGN_BRIEF.md(688): 179 shared views; 225 Body destination includes nutrition; 311-319,390-391,677 nutrition status.
conventions.md(563): 366-380 FIFO/rosterCheck/ROSTER.tolerancePct — design agent's prompt header, read by check:design-sync (contrast claims).
.design-sync/CLAUDE.md(106): 59 Microcycle. NOTES.md(312): 224 "all 13 tabs"; 220 recoveryAnalytics.test.js. config.json:34 BottomTabBar prop doc lists 'coach','recovery'. designs/coach.html(389), desktop-planning.html(403) design-owned (ownership.json:41).
docs/onboarding/* , docs/CLOUD_ENVIRONMENT.md, docs/STORAGE.md: no hits. docs/personal-claude-instructions.md(90): 38 personal biographical/employment detail; 75 roster metaphor.
coach/CODE_TO_COACH_HANDOVER.md(89): 15 pure-base; 30 coach_messages legacy (covered by check:zones). coach/PROJECT_MANAGEMENT_ANALYSIS.md(197): 133.
web/.env.example(27): no ANTHROPIC_API_KEY.
Regex-based; zero hits does not prove clean.
Doctrine coupling: doctrine-sha-guard.yml triggers on push to main, paths CLAUDE.md + .claude/skills/training-science.md only (:12-16), not on PRs; opens/comments issue "chore(doctrine): supersede doctrine_sha to latest main"; nightly Routine outside repo applies. → one tracking issue per merge to main touching those files.

## 4. CI guards
check:zones (check-zone-bands.mjs,132): every tracked *.md; finds UT2…UT1…AT three lo-hi ranges + W; derives from derivePaceZones(cp) in trainingConfig.js using last ~NNN W / ≈NNN W before the match. Bands without a CP fail; deleting prose does not fail. zone-bands.yml filters **/*.md, trainingConfig.js, utils/pace.js, the script. derivePaceZones MUST STAY: imported by check-zone-bands.mjs:33 and .design-sync/entry.jsx:23.
check:context7 (check-context7.mjs,179): fails if CLAUDE.md lacks literal `### Context7` (:73) or erg-context.md loses `## Library documentation — Context7 first` (:33) or tool names; every */SKILL.md must inherit/delegate/be EXEMPT (only steward); stale exemption fails (:142-146). Workflow filters .claude/skills/** and CLAUDE.md.
check:design-sync (check-design-sync-entry.mjs,307): componentSrcMap paths exist; entry.jsx barrel bundles (rolldown); contrast claims in conventions.md hold; every .design-sync file has owner in ownership.json. Barrel exports LogEntry, WorkoutItem, WorkoutTarget, LiveMetric, ErrorFallback, ErgTooltip, LoadTooltip, StrengthTooltip, BottomTabBar, THEME, C, ICON, derivePaceZones (+ one multi-line export :12 unread). References no cull file except trainingConfig.js. conventions.md rewrite gated by contrast check.
check:colours (check-colour-literals.mjs): ALLOWED = StrengthLogger.jsx (9 hexes), views/ErgLiveView.jsx, constants/trainingConfig.js (#666), views/ErgView.jsx, views/program/ProgramYear.jsx (#666). RecoveryView/CoachView NOT pinned. Stale entry FAILS (:221-231) → deleting ProgramYear.jsx requires dropping its entry in same PR; trainingConfig.js entry valid while #666 stays.
Bundle (check-bundle-size.mjs): entry 150, total 400, squat entry 117, squat total 30, squat 3D 145, squat data 2.3 MB, precache 2 MiB; boot root src/AuthGate.jsx; no dist/ in checkout, not tracked; CI caches main baseline. Removing views cannot trip a ceiling.
Coverage (vite.config.js ~184-373): global lines 89 / functions 85 / branches 80; all:true include src/**; exclude StrengthLogger.jsx, main.jsx, constants/**, test-setup.js, squat/assets/**, anatomy/scene/**, fixtures. constants/** excluded → deleting constants doesn't move coverage. Per-file 80/80/70 for: src/hooks/useCoach.js (:290), views/OverviewView.jsx, views/CalendarView.jsx, views/MobilityView.jsx, views/StrengthView.jsx. NOT verified: vitest behaviour when per-file threshold matches no file.
ci-web.yml: dorny/paths-filter on web/** gates jobs (skipped not missing); Lint runs lint, format:check, check:design-sync, check:colours, npm audit --omit=dev --audit-level=high; Test vitest run --coverage; Build npm run build + npm run size.
ci-functions.yml: supabase/functions/**; Deno tests only vitals-import, vitals-import-api, strava-import. ci-android.yml: web/android/**, capacitor.config.json, web/src/**, supabase/**, workflow; npm run build, strips squat-*; a cull PR triggers it.
e2e-web.yml, lighthouse.yml filter web/**. e2e/smoke.spec.js:18-28 tab ids incl program, recovery, journal, coach. e2e/visual.spec.js snapshots desktop-program, desktop-journal, desktop-calendar, desktop-overview; :15-16 names recovery and coach.
Hooks: .husky/pre-commit cd web && npx lint-staged (eslint --fix, prettier --write *.{js,jsx}); .husky/pre-push cd web && npx vitest run.
PR template: top line `Closes #<issue>`; headings `## What changed and why`, `## How to test manually`, `## Checklist` (CI green; tests cover or why not; npm run build passes locally; no console errors; visual change none or screenshot/baseline diff; property boundary hexes #183 / box metrics S6 / type S-1). pr-title-lint.yml exists (rule not read).

## 5. Licensing — all untouched
LICENSE(15) proprietary, cites PERMISSIONS.md, carves out NOTICE.md files. NOTICE.md(62): BodyParts3D CC BY-SA 2.1 JP (:9), OpenSim (:27), published reference values (:58); OPEN ITEM :42-46 SimTK "MIT Use Agreement" full text NOT read; :47-50 Uhlrich 2022 model route via opencap-core Apache-2.0 unconfirmed. PERMISSIONS.md(50) grant to "Paul" personal non-commercial. squat/assets/LICENSE.md(24) covers squat-anatomy.bin + squat-manifest.json. Cull list names none.

## 6. Backlog classification (titles + audit; inferred = title-only)
One-athlete (closes with cull), 6–8: #308, #306, #209 (coach half moot; "read live anchor" half may survive — inferred), #217 (only if Coach path was the point — inferred; in-app capture is general → rescope), #179 (HR130_POWER culled — inferred), #177 (CONFIDENCE_MIGRATION in logs.js — inferred), #233 (EVENT_LADDER/PHASES — inferred), #230 (same; benchmark_key is a general column — could be "changes meaning").
Changes meaning / rescope: #312 (coach half moot, vitals-sync half real), #311 (doc rewrite carries it; same lines), #209, #217, #260 & #264 (survive; status model — inferred), #222 (survives; StrengthView/exercises.js cull-adjacent; item 3 exercise_prs view independent), #265 (dayStatus coupled to schedule.js — inferred), #55/#56 (import "where useful"; #56 priority predates pivot).
General (survives): #382, #407, #216 (P0, needs owner migration approval), #79, #256, #258, #280, #182 (trim to T4/T6; partly one-athlete — inferred).
Unrelated infra: #408, #342, #327, #326, #210, #63.

## 7. exercises library link
No useExercises* hook; only client reads StrengthLogger.jsx:1140-1142 (.from('exercises').select('id,name,equipment,primary_muscles,category'), ilike name, contains primary_muscles) and exercise_prefs :205,:219. exercise_media no client reads. exercise_media (007:100-110): exercise_id text pk references exercises(id), video_front_url, video_side_url, poster_front_url, poster_side_url, model_3d_key text, media_tier check in ('fallback','video','model3d') — model_3d_key/model3d are the only schema hooks anticipating a 3D asset; nothing reads/documents them. No column/constant links an exercise to /squat. /squat linked from dashboard: NOWHERE (only utils/squatRoute.js, utils/squatTheme.js, RouteRoot.jsx :3-4,8,16). vercel.json /squat/** rewrites :7-77. ci-android.yml:102-105 "APK never routes to /squat". Audit: "Slice 2 (3D link in the dashboard)" carried nowhere.

## Risks / gotchas
1. Live exercises schema not reproducible from migrations (000 id uuid vs 007 text; no seed).
2. check:colours stale-entry failure on deleting ProgramYear.jsx.
3. CLAUDE.md / training-science.md pushes to main open/comment a doctrine-sha issue → one per merge.
4. check:zones on every tracked .md; bands need a CP quoted before them.
5. useCoach.js per-file coverage threshold; vitest missing-file behaviour unverified.
6. ci-functions + ci-android both trigger on supabase/** ; neither verifies coach-chat.
7. e2e smoke tab list and visual snapshots name culled tabs.
8. Git history keeps committed health data.
9. .design-sync HANDOFF.md/conventions.md normatively describe roster/Coach UI; designs/coach.html + desktop-planning.html design-owned; re-sync needs interactive /design-login.
10. logs.js couples beyond health: RULE_FIRING_HISTORY (coaching.js), CONFIDENCE_MIGRATION (#177), DECISION_LOG — not health markers.
11. supabase-patterns.md already stale independent of pivot.

## Open questions for Spec
- Which of DECISION_LOG, HYPOTHESES, RULE_FIRING_HISTORY, nutritionLog, CONFIDENCE_MIGRATION become health_markers rows vs deleted? mobilityLog and nutritionLog not named in cull table.
- New table style: 006 (default auth.uid(), for all) vs 012 (explicit user_id, FORCE, revokes, ASSERT)?
- Do exercises + 873 rows need a reproducible seed before library→anatomy link? exercise_media.model_3d_key is the only hook, unread.
- trainingConfig.js mixes kept and culled; #666 allowlist entry in same file.
- Which eight backlog issues? #217, #230, #233, #179 ambiguous from titles.
- Doc rewrite as one PR (one doctrine-sha issue) or several?

---

# D. Live Supabase reads (orchestrator)


## coach_messages
43 rows, 1 user, oldest 2026-06-27 17:25 UTC, newest 2026-08-28 17:07 UTC. backup_snapshots has 30 rows (daily full-DB JSON snapshots → the chat history is almost certainly in the snapshots, but the cron source is outside the repo and this is INFERRED).

## Tables (15 live vs "14 tables" in CLAUDE.md)
sessions 98 · exercises 873 · strength_workouts 18 · strength_sets 2 · templates 5 · template_exercises 27 · workout_assignments 1 · vitals 157 · exercise_media 0 · exercise_prefs 0 · backup_snapshots 30 · coach_messages 43 · coach_log 8 · anchors 17 · **bp_readings 0** — all RLS enabled.

**bp_readings is NOT in supabase/migrations/** (repo has 000–012; grep finds no bp_readings). Table comment: "Blood-pressure readings, one row per measurement. Personal health data: single-owner RLS, never seeded from git. clean = taken under standard conditions…". So the health-records-to-DB move has already been STARTED on the Coach/MCP lane (0 rows, no migration file). VISION.md names the target as `health_markers` rows; prod has `bp_readings`. The Spec must reconcile: capture bp_readings as a migration (reproducibility, same defect class as #222 item 3) and decide whether health_markers is a second table or a rename.

## Edge functions deployed (4 ACTIVE)
vitals-import v22 (verify_jwt false, import_map) · coach-chat v13 (verify_jwt TRUE, updated 2026-08-21 — matches audit "v13 byte-identical") · vitals-import-api v16 · vitals-sync v4.
**Repo has 8 function dirs** (coach-chat, strava-connect, strava-import, strava-oauth-callback, strava-sync, vitals-import, vitals-import-api, vitals-sync) — the four strava-* functions are NOT deployed. VISION says "Strava is already properly multi-user"; the code is, but it is not live. Out of this epic's scope but the Story should not assume Strava import is running. (#210 edge-function drift is exactly this.)

## Open question 3/4 from Research A — answered
Live row count 43; live coach-chat v13 ACTIVE with verify_jwt on. Undeploy is a Supabase MCP action (delete function) that CI cannot do; Scott authorises.

## bp_readings shape (live, 0 rows)
id uuid pk gen_random_uuid() · user_id uuid not null default auth.uid() · measured_at timestamptz not null · sys_mmhg smallint not null · dia_mmhg smallint not null · pulse_bpm smallint null · context text null · clean boolean not null default false · source text not null default 'manual' · created_at timestamptz not null default now().
RLS: one policy `bp_readings_owner` FOR ALL, USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid()) — the same single-owner shape as coach_messages/anchors. This is a per-measurement typed table, not a generic key/value `health_markers`. The Spec should treat it as the precedent: typed tables per marker class (bp_readings, …) vs one generic health_markers(kind, value, unit, measured_at) table is a design decision for Gate 2.

---

# E. Baseline test + coverage run (orchestrator)


Method: `npx vitest run --coverage --config <scratchpad>/vitest.probe.config.mjs` from web/. The probe config imports the real vite.config.js and adds ONE extra per-file threshold key for a file that does not exist (`src/hooks/__nonexistent_probe__.js`: 80/80/70). Repo untouched.

## Result
- 125 test files, 1591 tests, all passed. Duration 57.5 s.
- EXIT=0 with the probe key present → **Vitest 5.0.5 + @vitest/coverage-v8 5.0.3 silently ignore a per-file threshold glob that matches no file** (verified empirically; Context7 docs for coverage.thresholds[glob-pattern] do not state the behaviour either way). Consequence: deleting `src/hooks/useCoach.js` without removing its key at vite.config.js:290 will NOT fail CI. Remove the key in the same PR anyway (stale-entry hygiene, same discipline as check:colours).
- Global (All files): statements 92.78 · branches 85.14 · functions 89.59 · lines 93.57. Floors: lines 89 / functions 85 / branches 80 → headroom ≈ 4.6 / 4.6 / 5.1 points.

## Per-file rows for the cull set (statements | branches | functions | lines)
      useAnchors.js    |     100 |    94.44 |     100 |     100 | 25                
      useCoach.js      |   94.96 |     82.6 |   94.11 |   98.46 | 149-150           
      useHashRoute.js  |     100 |     87.5 |     100 |     100 | 31                
      eventWindow.js   |    98.3 |    97.59 |     100 |     100 | 140,199           
      schedule.js      |   98.87 |     94.2 |     100 |     100 | 100,180,183,197   
      trainingLoad.js  |     100 |    95.83 |     100 |     100 | 88,180            
      CalendarView.jsx |     100 |       90 |     100 |     100 | 44,95-131,220,335 
      CoachView.jsx    |   97.14 |    96.29 |     100 |     100 | 59-61             
      ErgView.jsx      |   89.42 |       75 |   88.57 |   91.01 | ...17-456,603,805 
      JournalView.jsx  |     100 |    85.71 |     100 |     100 | 134,140           
      LogView.jsx      |     100 |       50 |     100 |     100 | 114-118           
      MobilityView.jsx |     100 |    88.88 |     100 |     100 | 252-279           
      OverviewView.jsx |    98.5 |    76.92 |   95.65 |   98.33 | 633               
      PlanView.jsx     |    90.9 |       75 |   83.33 |    90.9 | 20                
      ProgramView.jsx  |   83.87 |    47.76 |   88.88 |   83.87 | 82,220-226        
      RecoveryView.jsx |     100 |     62.9 |     100 |     100 | ...01,211-213,573 
      StrengthView.jsx |   92.85 |    91.66 |    87.5 |   92.85 | 112               
      MobileApp.jsx    |   91.42 |     90.9 |    87.5 |   96.42 | 68                

## Reading the numbers
Most cull-zone views are at or near 100% lines (CoachView, CalendarView, JournalView, MobilityView, OverviewView, RecoveryView) — ABOVE the 93.57 average, so deleting them lowers the global line % slightly; ProgramView (83.87 lines / 47.76 branches) and ErgView (91 / 75) are below average, so trimming them raises it. The net move per slice is small against ~4.6 points of headroom, but it must be re-measured per PR (the ratchet comment is updated by hand at each ratchet).

---

# F. Open-issue bodies the agents could not read (orchestrator summaries)


## #209 (bug, P0) "the app asserts a training phase that ended — teach Coach and UI to read the live anchor"
Two halves. Half 1 UI: getRosterMode() FIFO anchor 23 Jun 2026 fragile; dayStatus() marks every untrained past day 'missed' (adherence measurement, forbidden by maintenance anchor); SESSION_OVERRIDES CP test 2026-07-01 stale; PHASES[0].current=true, VOLUME_PROGRESSION rendered as current. useAnchors.js already fetches current_phase/current_block/drag_factor but exposes only cp/ftp. Half 2: COACH_SYSTEM_PROMPT in coach-chat frozen at Base phase/CP 190/polarised — the in-app LLM coach. Proposed approach: useAnchors exposes phase/block + notes; new utils/planMode.js planModeFor(phase) → {showPrescription, showAdherence, allowProgression}, null → conservative; dayStatus 'upcoming' not 'missed'; Calendar/Program render phase note; new useCoachLog hook; extend buildTrainingContext. AC 1-4 and 9 are UI; AC 5-8 are the LLM coach. → Under VISION: Half 2 is moot (coach-chat removed). Half 1 is superseded by the prescription cull (the constants it would gate are being deleted), except the "UI reads anchors" principle, which is the keep-side. Live anchors: current_phase='maintenance' since 2026-08-20 (confirmed), "no programmed block, no progression targets, no adherence measurement"; current_block open-ended.

## #217 (enhancement, P2) "capture sRPE with the least possible friction — in-app queue or via Coach"
sRPE capture is the highest-leverage data change (Foster session-RPE; sessionLoad falls back to power model when sRPE missing; ~24% offset on n=2). Two routes: in-app unrated-session queue (COMPLETED_STATUSES with null srpe, newest first, 1–10 tap, sessions.srpe is INTEGER) and via Coach (buildTrainingContext carries unrated count). Constraint: never surface planned-not-done sessions, no completion %, no streaks. → Under VISION: in-app queue is GENERAL and survives (load model data quality); the "via Coach" route is moot. Rescope, do not close.

## #306 (P2, design) "add the roster contract and season plan to the load model"
Adds ROSTER {homeDays, awayDays, tolerancePct 25, expects {erg hold, str fall, bike null}}, rosterCheck(), seasonPlan() (phases, week spans, block CTL targets, current block from week number), targetTxt() to utils/trainingLoad.js, from the design drop splitiq-load.js:214-268. → Under VISION: this IS "roster regimes … the annual arc" / "a personal prescription engine" — one athlete's FIFO roster and season. Close as not planned (Scott to confirm). Note HANDOFF.md §5/§6 still specify it.

## #308 (P2, design) "desktop Planning — the season table, the home/FIFO discipline split and the nav rail (absorbs #307)"
New desktop screen: Season pane (phase table, CTL vs block target) + Microcycle pane (home/FIFO discipline split with rosterCheck verdicts) + Planning nav chip. Depends on #306. Specified in HANDOFF.md §4 and designs/desktop-planning.html. → Under VISION: prescription layer; close with #306 (Scott to confirm). HANDOFF.md §4 would then specify a screen the vision forbids — design-sync docs need the same cull.

## #182 (P2) "Sprint 5 — Benchmark Integrity" tracker
Trimmed 2026-11-05: T1-T3 shipped; T5/T7/T8 closed not planned. Remaining: T4 #177 (live-driven Confidence Migration panel in JournalView), T6 #179 (live-wire ergTrend / HR130_POWER / deriveTargets). Exit criterion open: "No screen contradicts live anchors.rowing_cp without explicit as-of framing". → Under VISION: #177 (Confidence Migration panel — JournalView, reads logs.js hypotheses?) and #179 (HR130_POWER, deriveTargets = personal calibration in trainingConfig.js) look one-athlete; the "no screen contradicts live anchor" principle is keep-side. Needs #177/#179 bodies.

## #177 (P2, child of #182) "live-driven Confidence Migration panel in JournalView (T4)"
CONFIDENCE_MIGRATION (logs.js:454) hardcoded array rendered verbatim at JournalView.jsx:284, stale since June; wants it driven by anchors (rowing_cp provisional etc.). → Under VISION: the panel is one athlete's calibration diary (logs.js is on the cull list → health_markers / cull). Likely closes with the cull. The keep-side principle ("no screen contradicts the live anchor") survives via useAnchors.

## #179 (P2, child of #182) "wire ergTrend / HR130_POWER / deriveTargets off live session data (T6)"
ergTrend hardcoded dated array at ErgView.jsx:29 (personal data literal in a VIEW); HR130_POWER (trainingConfig.js) hardcoded June array feeding deriveTargets() (analysis.js:59-75); useErgSessions() exists. AC: chart from live data; deriveTargets from live data and/or derivePaceZones(cp); "insufficient data" state. → Under VISION: this is EXACTLY the keep-side work — replace one athlete's hardcoded calibration with live, parameterised derivation. Rescope under the epic (trainingConfig.js cull row), do not close.

## #233 (P2) "Port the benchmark reschedule pass off keyword matching onto benchmark_key"
Benchmark ladder (EVENT_LADDER) reschedule pass still keyword-matches planned rows; needs migration on 009's unique index predicate + BenchmarkLinkControl for planned rows. → Under VISION: EVENT_LADDER / "event pathway" is on the cull list (program.js). If the ladder goes, this closes; if a generic benchmark concept stays (sessions.benchmark_key column exists in prod, migration 009), it survives rescoped. Scott decision: is "benchmark" a general concept (keep) or one athlete's event pathway (cull)?

## #230 (P2) "no end-to-end coverage of the benchmark link round-trip"
Integration test for click → mutate → onSettled → invalidate → refetch → badge flips, in CalendarView's suite. → Same dependency as #233: survives iff the benchmark-link surface survives.

## #222 (P2) "StrengthView cannot move to useStrengthPRs yet — no per-set data, e1RM history only in a hardcoded constant"
App.jsx hardcoded strengthTrend: 8 lifts' e1RM progression May–June, exists nowhere else (PERSONAL DATA LITERAL in App.jsx, not named in VISION's table). strength_sets has 2 rows; exercise_prs is a VIEW created outside migrations (reproducibility defect, item 3); PRIMARY_LIFTS name mismatch (Back Squat vs Barbell Squat). → Under VISION: strengthTrend is personal data in source → cull/relocate (DB or delete, Scott's call — it is history that exists nowhere else). Item 3 (capture exercise_prs view as a migration) is general and survives. Item 4 survives.
