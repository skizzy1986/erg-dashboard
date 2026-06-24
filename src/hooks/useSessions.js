import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "../supabaseClient.js";
import { normType } from "../utils/formatting.js";

const SESSION_QUERY_KEY = ["sessions"];

function mapRow(r) {
  const raw = (r.type || "").toLowerCase();
  return {
    date: r.date, type: normType(r.type, r.label), label: r.label,
    duration: r.duration, srpe: r.srpe, prs: r.prs,
    exercises: r.exercises || undefined,
    coachNote: r.coach_note || undefined,
    status: r.status || null,
    distance_m: r.distance_m, avg_watts: r.avg_watts, avg_hr: r.avg_hr,
    _isErg: raw === "erg",
    _isCycling: raw === "cycling" || raw === "bike" || raw === "ride",
    _fromDb: true, _id: r.id,
  };
}

async function fetchSessions() {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).filter(r => r.type !== "Test").map(mapRow);
}

export function useSessions() {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSessions,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRefreshSessions() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY }),
    [queryClient]
  );
}
