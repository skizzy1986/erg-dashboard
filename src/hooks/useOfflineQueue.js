import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const QUEUE_KEY = "erg_pending_sessions";

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueue(items) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export function enqueueSession(session) {
  const q = readQueue();
  q.push({ ...session, _queuedAt: Date.now() });
  writeQueue(q);
}

async function drainQueue() {
  const q = readQueue();
  if (q.length === 0) return;
  const failed = [];
  for (const session of q) {
    const { _queuedAt, ...row } = session;
    const { error } = await supabase.from("sessions").insert(row);
    if (error) failed.push(session);
  }
  writeQueue(failed);
  return q.length - failed.length;
}

export function useOfflineQueue() {
  const [pending, setPending] = useState(readQueue().length);

  useEffect(() => {
    const sync = async () => {
      if (navigator.onLine) {
        const synced = await drainQueue();
        if (synced > 0) setPending(readQueue().length);
      }
    };
    window.addEventListener("online", sync);
    sync();
    return () => window.removeEventListener("online", sync);
  }, []);

  function addToQueue(session) {
    enqueueSession(session);
    setPending(readQueue().length);
  }

  return { pending, addToQueue };
}
