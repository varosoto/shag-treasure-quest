import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Submission, Task } from "@/lib/types";
import { ShagLogo } from "@/components/brand";

export const Route = createFileRoute("/team/$teamId")({
  component: TeamDetail,
});

function TeamDetail() {
  const { teamId } = Route.useParams();
  const [teamName, setTeamName] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: team }, { data: t }, { data: s }] = await Promise.all([
        supabase.from("teams").select("name").eq("id", teamId).maybeSingle(),
        supabase.from("tasks").select("*").order("order_num"),
        supabase.from("submissions").select("*").eq("team_id", teamId).is("deleted_at", null),
      ]);
      setTeamName(team?.name ?? "Unknown team");
      setTasks((t ?? []) as Task[]);
      setSubs((s ?? []) as Submission[]);
      setLoading(false);
    })();
  }, [teamId]);

  const subByTask = new Map(subs.map((s) => [s.task_id, s]));
  const total = subs.reduce((sum, s) => sum + (s.awarded_points ?? 0), 0);

  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="bg-ink text-cream px-5 py-6">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link to="/leaderboard" className="font-mono text-xs uppercase text-cream/70">
            ← Leaderboard
          </Link>
        </div>
        <div className="max-w-md mx-auto mt-4">
          <h1 className="font-serif text-4xl">{teamName}</h1>
          <p className="font-mono text-xs uppercase text-gold/80 mt-1">
            {total} pts · {subs.length} / {tasks.length} tasks
          </p>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-6 space-y-3">
        {loading && <p className="text-center text-ink/50 py-6">Loading…</p>}
        {tasks.map((task) => {
          const s = subByTask.get(task.id);
          return (
            <div
              key={task.id}
              className={`rounded-2xl border border-ink/10 p-4 ${
                s ? "bg-white" : "bg-mist/40 opacity-60"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{task.icon}</span>
                <h3 className="font-serif text-lg flex-1">{task.title}</h3>
                {s ? (
                  <span className="font-mono text-xs bg-gold/20 px-2 py-0.5 rounded">
                    {s.awarded_points} pts
                  </span>
                ) : (
                  <span className="font-mono text-[10px] uppercase text-ink/40">Not done</span>
                )}
              </div>
              {s?.photo_url && (
                <img
                  src={s.photo_url}
                  alt=""
                  className="w-full rounded-lg mb-2 max-h-80 object-cover"
                />
              )}
              {s?.notes && <p className="text-sm text-ink/80 whitespace-pre-wrap">{s.notes}</p>}
              {s && (
                <p className="font-mono text-[10px] uppercase text-ink/40 mt-2">
                  {new Date(s.submitted_at).toLocaleString()}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
