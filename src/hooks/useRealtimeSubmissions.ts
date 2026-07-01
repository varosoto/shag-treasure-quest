import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Submission } from "@/lib/types";

type Options = {
  teamId?: string;
};

export function useRealtimeSubmissions({ teamId }: Options = {}) {
  const [rows, setRows] = useState<Submission[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadInitial() {
      let q = supabase
        .from("submissions")
        .select("*")
        .is("deleted_at", null)
        .order("submitted_at", { ascending: false });
      if (teamId) q = q.eq("team_id", teamId);
      const { data } = await q;
      if (!alive) return;
      setRows((data ?? []) as Submission[]);
    }
    loadInitial();

    const channelName = teamId
      ? `submissions:team:${teamId}`
      : "submissions:all";
    const filter = teamId ? `team_id=eq.${teamId}` : undefined;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions", ...(filter ? { filter } : {}) },
        (payload) => {
          setRows((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as Submission & { deleted_at?: string | null };
              if (row.deleted_at) return prev;
              if (prev.some((r) => r.id === row.id)) return prev;
              return [row as Submission, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              const row = payload.new as Submission & { deleted_at?: string | null };
              if (row.deleted_at) return prev.filter((r) => r.id !== row.id);
              const idx = prev.findIndex((r) => r.id === row.id);
              if (idx === -1) return [row as Submission, ...prev];
              const next = prev.slice();
              next[idx] = row as Submission;
              return next;
            }
            if (payload.eventType === "DELETE") {
              const oldRow = payload.old as { id: string };
              return prev.filter((r) => r.id !== oldRow.id);
            }
            return prev;
          });
        },
      )
      .subscribe((status) => {
        if (!alive) return;
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  return { submissions: rows, connected };
}
