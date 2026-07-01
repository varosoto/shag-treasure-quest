import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getStoredTeam, setStoredTeam } from "@/lib/team";
import { useRealtimeTeams } from "@/hooks/useRealtimeTeams";
import { joinTeam } from "@/lib/hunt.functions";
import { ShagLogo, EventTitle } from "@/components/brand";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const { teams } = useRealtimeTeams();
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (getStoredTeam()) navigate({ to: "/hunt" });
  }, [navigate]);

  const sorted = [...teams].sort((a, b) => a.name.localeCompare(b.name));

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
                  onClick={() => setSelected({ id: t.id, name: t.name })}
                  className="w-full text-left bg-cream border border-ink/10 rounded-2xl p-4 hover:shadow-md hover:border-teal/40 transition"
                >
                  <div className="font-serif text-xl leading-tight">{t.name}</div>
                  <div className="font-mono text-xs uppercase tracking-widest text-ink/50 mt-1">
                    Tap to join
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 text-sm text-ink/70 leading-relaxed">
          Gather your crew, pick a passcode, and hit the streets of Seaholm. Snap
          photos at each stop, complete the hairstylist dares, and race to the top
          of the leaderboard.
        </p>
      </div>

      <JoinDialog
        team={selected}
        onClose={() => setSelected(null)}
        onJoined={() => navigate({ to: "/hunt" })}
      />
    </div>
  );
}

function JoinDialog({
  team,
  onClose,
  onJoined,
}: {
  team: { id: string; name: string } | null;
  onClose: () => void;
  onJoined: () => void;
}) {
  const join = useServerFn(joinTeam);
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (team) {
      setPasscode("");
      setError(null);
    }
  }, [team]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!team) return;
    setBusy(true);
    setError(null);
    try {
      const t = await join({ data: { name: team.name, passcode } });
      setStoredTeam(t);
      onJoined();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!team} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            Join {team?.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="block font-mono text-xs uppercase tracking-wider text-ink/70 mb-1.5">
              Passcode
            </span>
            <input
              autoFocus
              value={passcode}
              onChange={(e) => setPasscode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              required
              className="w-full rounded-lg border border-ink/20 bg-white p-3 font-mono text-2xl tracking-[0.5em] text-center"
            />
          </label>
          {error && <div className="text-sm text-rust">{error}</div>}
          <button
            type="submit"
            disabled={busy || passcode.length !== 4}
            className="w-full rounded-xl bg-teal text-white font-mono uppercase text-xs tracking-widest py-4 disabled:opacity-50"
          >
            {busy ? "Joining…" : "Join team"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
