import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/leaderboard")({
  component: Leaderboard,
});

type Row = { id: string; name: string; points: number; done: number };

function Leaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: teams }, { data: subs }] = await Promise.all([
      supabase.from("teams").select("id,name"),
      supabase.from("submissions").select("team_id,awarded_points").is("deleted_at", null),
    ]);
    const map = new Map<string, { points: number; done: number }>();
    (subs ?? []).forEach((s) => {
      const cur = map.get(s.team_id) ?? { points: 0, done: 0 };
      cur.points += s.awarded_points ?? 0;
      cur.done += 1;
      map.set(s.team_id, cur);
    });
    const out: Row[] = (teams ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      points: map.get(t.id)?.points ?? 0,
      done: map.get(t.id)?.done ?? 0,
    }));
    out.sort((a, b) => b.points - a.points);
    setRows(out);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const i = setInterval(load, 15000);
    return () => clearInterval(i);
  }, []);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="bg-ink text-cream px-5 py-6">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link to="/hunt" className="font-mono text-xs uppercase text-cream/70">
            ← Back to Hunt
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-wider text-gold/80">
            Auto-refresh · 15s
          </span>
        </div>
        <div className="max-w-md mx-auto mt-4">
          <h1 className="font-serif text-4xl">Leaderboard</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-6 space-y-3">
        {loading && <p className="text-center text-ink/50 py-6">Loading…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-center text-ink/50 py-6">No teams yet.</p>
        )}
        {rows.map((r, i) => (
          <Link
            key={r.id}
            to="/team/$teamId"
            params={{ teamId: r.id }}
            className="flex items-center gap-4 bg-white border border-ink/10 rounded-2xl p-4"
          >
            <div className="text-2xl w-8 text-center font-mono">
              {i < 3 ? medals[i] : `#${i + 1}`}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-serif text-lg truncate">{r.name}</div>
              <div className="font-mono text-[10px] uppercase text-ink/50 mt-0.5">
                {r.done} / 14 tasks
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-mist overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${(r.done / 14) * 100}%`,
                    background: "linear-gradient(90deg, var(--color-teal), var(--color-gold))",
                  }}
                />
              </div>
            </div>
            <div className="text-right">
              <div className="font-serif text-2xl text-teal">{r.points}</div>
              <div className="font-mono text-[10px] uppercase text-ink/50">pts</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
