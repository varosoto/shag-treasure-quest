import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RealtimeTeam = { id: string; name: string; created_at: string };

export function useRealtimeTeams() {
  const [teams, setTeams] = useState<RealtimeTeam[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.from("teams").select("id,name,created_at");
      if (!alive) return;
      setTeams((data ?? []) as RealtimeTeam[]);
    })();

    const channel = supabase
      .channel("teams:all")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams" },
        (payload) => {
          setTeams((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as RealtimeTeam;
              if (prev.some((t) => t.id === row.id)) return prev;
              return [...prev, row];
            }
            if (payload.eventType === "UPDATE") {
              const row = payload.new as RealtimeTeam;
              const idx = prev.findIndex((t) => t.id === row.id);
              if (idx === -1) return [...prev, row];
              const next = prev.slice();
              next[idx] = row;
              return next;
            }
            if (payload.eventType === "DELETE") {
              const oldRow = payload.old as { id: string };
              return prev.filter((t) => t.id !== oldRow.id);
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
  }, []);

  return { teams, connected };
}
