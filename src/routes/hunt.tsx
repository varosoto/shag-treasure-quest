import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearStoredTeam, getStoredTeam } from "@/lib/team";
import type { Submission, Task } from "@/lib/types";
import { TaskCard } from "@/components/TaskCard";
import { ShagLogo, EventTitle } from "@/components/brand";
import { useRealtimeSubmissions } from "@/hooks/useRealtimeSubmissions";

export const Route = createFileRoute("/hunt")({
  component: Hunt,
});

function Hunt() {
  const navigate = useNavigate();
  const [team, setTeam] = useState(() => getStoredTeam());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWin, setShowWin] = useState(false);
  const [startTs] = useState(() => Date.now());

  const { submissions } = useRealtimeSubmissions({ teamId: team?.id });

  const subs = useMemo(() => {
    const map: Record<string, Submission> = {};
    submissions.forEach((s) => {
      map[s.task_id] = s;
    });
    return map;
  }, [submissions]);

  useEffect(() => {
    if (!team) {
      navigate({ to: "/" });
      return;
    }
    (async () => {
      const { data: t } = await supabase.from("tasks").select("*").order("order_num");
      setTasks((t ?? []) as Task[]);
      setLoading(false);
    })();
  }, [team, navigate]);

  const stops = useMemo(() => tasks.filter((t) => t.type === "stop"), [tasks]);
  const challenges = useMemo(() => tasks.filter((t) => t.type === "challenge"), [tasks]);
  const done = Object.keys(subs).length;
  const total = tasks.length || 14;
  const points = Object.values(subs).reduce((sum, s) => sum + (s.awarded_points ?? 0), 0);
  const pct = (done / total) * 100;

  useEffect(() => {
    if (done === total && total > 0 && !showWin) setShowWin(true);
  }, [done, total, showWin]);

  function handleSaved(_s: Submission) {
    // Realtime subscription will pick up the change; no local state needed.
  }



  if (!team) return null;

  return (
    <div className="min-h-screen bg-cream pb-20">
      {/* Header */}
      <header
        className="bg-ink text-cream px-5 pt-10 pb-8 relative"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(212,168,71,0.04) 0 1px, transparent 1px 60px), repeating-linear-gradient(0deg, rgba(212,168,71,0.04) 0 1px, transparent 1px 60px)",
        }}
      >
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6">
            <ShagLogo onDark />
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase text-cream/60">
              <Link to="/leaderboard" className="underline">
                Leaderboard
              </Link>
              <button
                onClick={() => {
                  clearStoredTeam();
                  setTeam(null);
                  navigate({ to: "/" });
                }}
              >
                Logout
              </button>
            </div>
          </div>
          <span className="inline-block font-mono text-[10px] uppercase tracking-widest text-gold border border-gold/40 rounded-full px-2.5 py-0.5 mb-4">
            🌊 Seaholm District
          </span>
          <EventTitle size="md" />
          <p className="text-cream/70 text-[10px] mt-4 font-mono uppercase tracking-[0.2em]">
            14 Challenges · Where Hair Matters · Austin, TX
          </p>
          <p className="text-cream/70 text-xs mt-2 font-mono uppercase tracking-wider">
            Team · {team.name}
          </p>
        </div>
      </header>

      {/* Sticky progress */}
      <div className="sticky top-0 z-20 bg-mist border-b border-teal/20 px-5 py-3 shadow-sm">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-ink/70 mb-1.5">
            <span>Progress</span>
            <span className="text-ink font-medium">
              {points} pts · {done} / {total} done
            </span>
          </div>
          <div className="h-2 rounded-full bg-white overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, var(--color-teal), var(--color-gold))",
              }}
            />
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-5 py-6 space-y-4">
        <div className="rounded-r-lg border-l-4 border-gold bg-cream p-4">
          <div className="font-mono text-xs uppercase tracking-widest text-rust mb-2">
            The Only Two Rules
          </div>
          <ol className="text-sm text-ink/80 leading-relaxed list-decimal pl-5 space-y-1">
            <li>No AI-generated images. Real photos only.</li>
            <li>Every photo needs at least 2 team members in frame — take a selfie or ask a stranger. Solo photos don't count.</li>
          </ol>
        </div>

        <div className="rounded-2xl bg-white border border-ink/10 p-4 text-sm text-ink/80 leading-relaxed">

          Welcome to Seaholm — Austin's old power plant district turned modern playground. Work
          through all 10 stops and 4 hair dares. Submit a photo + a short story at each task.
        </div>

        {loading && <div className="text-center text-ink/50 py-8">Loading…</div>}

        {stops.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            team={team}
            submission={subs[task.id] ?? null}
            onSaved={handleSaved}
          />
        ))}

        <div className="flex items-center gap-3 my-8">
          <div className="h-px flex-1 bg-rust/30" />
          <span className="font-mono text-xs uppercase tracking-[0.35em] text-rust">
            ✂️ H A I R  D A R E S
          </span>
          <div className="h-px flex-1 bg-rust/30" />
        </div>

        {challenges.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            team={team}
            submission={subs[task.id] ?? null}
            onSaved={handleSaved}
          />
        ))}

        <footer className="pt-8 pb-2 text-center">
          <Link to="/admin" className="font-mono text-xs text-ink/40 hover:text-ink/60">
            Admin
          </Link>
        </footer>
      </main>

      {showWin && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-cream rounded-2xl p-8 max-w-sm w-full text-center">
            <div className="text-6xl mb-3">🏆</div>
            <h2 className="font-serif text-3xl mb-2">Hunt complete!</h2>
            <p className="text-ink/70 mb-4">Team {team.name}</p>
            <div className="flex justify-center mb-4">
              <ShagLogo />
            </div>
            <div className="text-4xl font-serif text-teal mb-1">{points} pts</div>
            <p className="font-mono text-xs uppercase text-ink/50 mb-3">
              {Math.round((Date.now() - startTs) / 60000)} min elapsed
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60 mb-6">
              Presented by Shag — where hair matters.
            </p>
            <button
              onClick={() => setShowWin(false)}
              className="w-full rounded-lg bg-teal text-white font-mono uppercase text-xs tracking-widest py-3"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
