import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getStoredTeam, setStoredTeam } from "@/lib/team";
import { useRealtimeTeams } from "@/hooks/useRealtimeTeams";
import { joinTeam } from "@/lib/hunt.functions";
import { ShagLogo, EventTitle } from "@/components/brand";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const { teams } = useRealtimeTeams();
  const join = useServerFn(joinTeam);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; msg: string } | null>(null);

  useEffect(() => {
    if (getStoredTeam()) navigate({ to: "/hunt" });
  }, [navigate]);

  const sorted = [...teams].sort((a, b) => a.name.localeCompare(b.name));

  async function handleJoin(team: { id: string; name: string }) {
    setError(null);
    setJoiningId(team.id);
    try {
      const t = await join({ data: { name: team.name } });
      setStoredTeam(t);
      navigate({ to: "/hunt" });
    } catch (err) {
      setError({ id: team.id, msg: err instanceof Error ? err.message : String(err) });
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-ink text-cream px-6 pt-6 pb-20">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-8">
            <ShagLogo onDark />
            <Link
              to="/start-team"
              className="font-mono uppercase text-[10px] tracking-widest border border-gold/40 text-gold px-3 py-1.5 rounded-full hover:bg-gold/10"
            >
              + New team
            </Link>
          </div>
          <div className="inline-block font-mono text-[10px] uppercase tracking-widest text-gold border border-gold/40 rounded-full px-3 py-1 mb-6">
            🌊 Austin, Texas · Seaholm District
          </div>
          <EventTitle size="lg" />
          <p className="text-cream/70 text-xs mt-5 font-mono uppercase tracking-[0.2em]">
            14 Challenges · Where Hair Matters · Austin, TX
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-10 pb-16">
        <div className="text-center mb-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-ink/50">
            Presented by
          </div>
          <div className="mt-1 flex justify-center">
            <ShagLogo />
          </div>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-ink/50 mb-3 mt-6">
          Join a team
        </div>
        {sorted.length === 0 ? (
          <div className="bg-white border border-ink/10 rounded-2xl p-8 text-center text-sm text-ink/60">
            No teams yet — be the first! Tap "+ New team" up top to start.
          </div>
        ) : (
          <ul className="space-y-2">
            {sorted.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  disabled={joiningId !== null}
                  onClick={() => handleJoin({ id: t.id, name: t.name })}
                  className="w-full text-left bg-cream border border-ink/10 rounded-2xl p-4 hover:shadow-md hover:border-teal/40 transition disabled:opacity-60"
                >
                  <div className="font-serif text-xl leading-tight">{t.name}</div>
                  <div className="font-mono text-xs uppercase tracking-widest text-ink/50 mt-1">
                    {joiningId === t.id ? "Joining…" : "Tap to join"}
                  </div>
                  {error?.id === t.id && (
                    <div className="mt-2 text-xs text-rust">{error.msg}</div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 text-sm text-ink/70 leading-relaxed">
          Gather your crew and hit the streets of Seaholm. Snap photos at each
          challenge, complete the hair dares, and race to the top of the
          leaderboard. Old is new again — timeless Austin, styled by Shag.
        </p>
      </div>
    </div>
  );
}
