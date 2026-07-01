import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getStoredTeam } from "@/lib/team";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    if (getStoredTeam()) navigate({ to: "/hunt" });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-ink text-cream px-6 pt-16 pb-20">
        <div className="max-w-md mx-auto">
          <div className="inline-block font-mono text-[10px] uppercase tracking-widest text-gold border border-gold/40 rounded-full px-3 py-1 mb-6">
            🌊 Austin, Texas · Seaholm District
          </div>
          <h1 className="font-serif text-5xl leading-[0.95] mb-3">
            The <em className="text-gold">Seaholm</em> Scavenger Hunt
          </h1>
          <p className="text-cream/70 text-sm leading-relaxed">
            10 stops · 4 hairstylist challenges · Keep Austin Styled 💇
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-10 space-y-3">
        <Link
          to="/start-team"
          className="block w-full text-center bg-teal text-white font-mono uppercase text-xs tracking-widest py-4 rounded-xl shadow-lg"
        >
          ✨ Start a new team
        </Link>
        <Link
          to="/join-team"
          className="block w-full text-center bg-white border-[1.5px] border-ink/15 font-mono uppercase text-xs tracking-widest py-4 rounded-xl"
        >
          🔑 Join existing team
        </Link>
      </div>

      <div className="max-w-md mx-auto px-6 mt-12 pb-16 text-sm text-ink/70 leading-relaxed">
        <p>
          Gather your crew, pick a passcode, and hit the streets of Seaholm. Snap photos at each
          stop, complete the hairstylist dares, and race to the top of the leaderboard.
        </p>
      </div>
    </div>
  );
}
