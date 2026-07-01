import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { getStoredTeam } from "@/lib/team";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState<string>("https://seaholm.hunt");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
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

      <div className="max-w-4xl mx-auto px-6 -mt-10">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="flex-1 space-y-3">
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

          <div className="flex-1 md:max-w-[260px]">
            <div className="bg-cream rounded-2xl border border-gold/40 p-6 flex flex-col items-center">
              <div className="bg-cream p-2 rounded-lg">
                <QRCodeSVG
                  value={origin}
                  size={200}
                  bgColor="#faf6f0"
                  fgColor="#1c1c1a"
                  level="M"
                />
              </div>
              <div className="mt-4 font-mono text-xs uppercase tracking-widest text-ink/60 text-center">
                Scan to join the hunt
              </div>
              <a
                href="/print-flyer"
                target="_blank"
                rel="noreferrer"
                className="mt-3 font-mono text-[10px] uppercase tracking-widest text-teal underline underline-offset-4"
              >
                Print flyer →
              </a>
            </div>
          </div>
        </div>
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
