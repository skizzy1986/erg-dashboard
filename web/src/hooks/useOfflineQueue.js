import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { supabase } from '../supabaseClient';

const QUEUE_KEY = 'erg_pending_sessions';

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

const QUEUE_MAX = 50;

function writeQueue(items) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('[useOfflineQueue] write failed:', e);
    throw e;
  }
}

export function enqueueSession(session) {
  const q = readQueue();
  if (q.length >= QUEUE_MAX) {
    console.warn('[useOfflineQueue] queue at cap; dropping oldest session');
    q.shift();
  }
  q.push({ ...session, _queuedAt: Date.now() });
  writeQueue(q);
}

async function drainQueue() {
  const q = readQueue();
  if (q.length === 0) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const failed = [];
  for (const session of q) {
    const { _queuedAt, ...rest } = session;
    const row = { ...rest, user_id: rest.user_id ?? user?.id };
    const { error } = await supabase.from('sessions').insert(row);
    if (error) failed.push(session);
  }
  writeQueue(failed);
  return q.length - failed.length;
}

export function useOfflineQueue() {
  const [pending, setPending] = useState(readQueue().length);

  useEffect(() => {
    const sync = async (connected) => {
      if (connected) {
        const synced = await drainQueue();
        if (synced > 0) setPending(readQueue().length);
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
  }, []);

  function addToQueue(session) {
    enqueueSession(session);
    setPending(readQueue().length);
  }

  return { pending, addToQueue };
}
