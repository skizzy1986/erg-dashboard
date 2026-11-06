-- 013_drop_coach_messages.sql
-- DESTRUCTIVE: not additive, and not reversible for data. Drops the in-app
-- coach chat table. 013_drop_coach_messages_rollback.sql restores the
-- structure; nothing restores the rows, and no backup holds them. Scott waived
-- the snapshot precondition on 2026-11-06; the rollback header has the detail.
--
-- Nothing reads or writes it. The client went in #414, which was in production
-- before this ran. coach-chat was a stateless proxy that never touched the
-- table, and is undeployed and deleted in #415. public.backup_snapshot() never
-- named it, so the nightly backup is unaffected.
--
-- DROP TABLE takes its index, check, foreign key, RLS flag and policy with it.
-- No CASCADE and no IF EXISTS, deliberately: an unexpected dependant (a view,
-- an inbound foreign key) or an already-missing table should stop this with an
-- error, not be silently absorbed.

DROP TABLE public.coach_messages;
