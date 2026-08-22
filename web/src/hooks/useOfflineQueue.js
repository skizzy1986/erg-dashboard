import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { supabase } from '../supabaseClient';
import { toLogDate } from '../utils/dateFormat.js';
import { invalidateSessionQueries } from '../utils/invalidateSessionQueries.js';

const QUEUE_KEY = 'erg_pending_sessions';

// Rows queued by older builds carry column names that do not exist on
// `sessions` (`watts`, `distance`) and ISO/numeric shapes the table rejects, so
// every drain failed forever. Normalising on read means a stale queue heals
// itself the first time it is drained, without a migration.
export function normalizeQueuedSession(row) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };

  if ('watts' in out) {
    if (!('avg_watts' in out)) out.avg_watts = out.watts;
    delete out.watts;
  }
  if ('distance' in out) {
    if (!('distance_m' in out)) out.distance_m = out.distance;
    delete out.distance;
  }
  if (out.date) out.date = toLogDate(out.date);
  if (typeof out.duration === 'number') out.duration = String(out.duration);

  return out;
}

function readQueue() {
  try {
    const raw = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(raw) ? raw.map(normalizeQueuedSession) : [];
  } catch {
    return [];
  }
}

// Postgres unique_violation on sessions' UNIQUE(date, label): the row is
// already in the table, so a retry can never succeed — treat it as delivered.
function isDuplicate(error) {
  return error?.code === '23505' || /duplicate key/i.test(error?.message || '');
}

function writeQueue(items) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export function enqueueSession(session) {
  const q = readQueue();
  q.push({ ...session, _queuedAt: Date.now() });
  writeQueue(q);
}

// Both the `online` listener and the mount-time sync can fire in the same tick;
// without this guard each row is inserted twice.
let draining = false;

async function drainQueue() {
  if (draining) return 0;
  draining = true;
  try {
    const q = readQueue();
    if (q.length === 0) return 0;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const failed = [];
    for (const session of q) {
      const { _queuedAt, ...rest } = session;
      const row = { ...rest, user_id: rest.user_id ?? user?.id };
      const { error } = await supabase.from('sessions').insert(row);
      if (error && !isDuplicate(error)) failed.push(session);
    }
    writeQueue(failed);
    return q.length - failed.length;
  } finally {
    draining = false;
  }
}

export function useOfflineQueue() {
  const [pending, setPending] = useState(readQueue().length);
  const queryClient = useQueryClient();

  useEffect(() => {
    const sync = async (connected) => {
      if (connected) {
        const synced = await drainQueue();
        if (synced > 0) {
          setPending(readQueue().length);
          // Once after the loop, not per row: N×3 refetch triggers would race
          // the inserts still in flight.
          invalidateSessionQueries(queryClient);
        }
      }
    };

    if (Capacitor.isNativePlatform()) {
      let networkHandle;
      Network.addListener('networkStatusChange', ({ connected }) =>
        sync(connected)
      ).then((h) => {
        networkHandle = h;
      });
      Network.getStatus().then(({ connected }) => sync(connected));
      return () => {
        networkHandle?.remove();
      };
    } else {
      const webSync = () => sync(navigator.onLine);
      window.addEventListener('online', webSync);
      webSync();
      return () => window.removeEventListener('online', webSync);
    }
  }, [queryClient]);

  function addToQueue(session) {
    enqueueSession(session);
    setPending(readQueue().length);
  }

  return { pending, addToQueue };
}
