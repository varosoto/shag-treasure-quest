import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export const Route = createFileRoute("/print-flyer")({
  component: PrintFlyer,
  head: () => ({
    meta: [
      { title: "Print Flyer — Seaholm Scavenger Hunt" },
      { name: "description", content: "Printable poster with QR code for joining the Seaholm Scavenger Hunt." },
    ],
  }),
});

function PrintFlyer() {
  const [joinUrl, setJoinUrl] = useState("https://seaholm.hunt/join-team");
  const [today, setToday] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setJoinUrl(`${window.location.origin}/join-team`);
    setToday(
      new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    );
  }, []);

  return (
    <div className="flyer-root min-h-screen bg-ink text-cream relative flex items-center justify-center p-10 print:p-6">
      <style>{`
        @media print {
          @page { size: letter; margin: 0.4in; }
          html, body { background: #1c1c1a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .flyer-root { min-height: auto !important; padding: 0 !important; page-break-inside: avoid; break-inside: avoid; }
        }
        .editable:focus { outline: none; border-style: dashed; border-color: rgba(212,168,71,0.7); }
        .editable:hover { border-style: dashed; border-color: rgba(212,168,71,0.4); }
      `}</style>

      <button
        onClick={() => window.print()}
        className="no-print absolute top-6 right-6 bg-gold text-ink font-mono uppercase text-xs tracking-widest px-4 py-2 rounded-lg shadow-lg"
      >
        🖨 Print
      </button>

      <div className="max-w-3xl w-full text-center space-y-8">
        <div className="inline-block font-mono text-[10px] uppercase tracking-widest text-gold border border-gold/40 rounded-full px-3 py-1">
          🌊 Austin, Texas · Seaholm District
        </div>

        <h1 className="font-serif text-6xl leading-[0.95]">
          The <em className="text-gold">Seaholm</em> Scavenger Hunt
        </h1>
        <p className="font-sans text-lg text-cream/80">
          Austin, TX · Seaholm District
        </p>

        <div className="flex justify-center">
          <div className="bg-cream rounded-2xl p-10 inline-block">
            <QRCodeSVG
              value={joinUrl}
              size={400}
              bgColor="#faf6f0"
              fgColor="#1c1c1a"
              level="M"
            />
          </div>
        </div>

        <ol className="font-mono text-sm uppercase tracking-widest text-cream/90 space-y-2">
          <li>1 · Scan the code with your phone camera</li>
          <li>2 · Tap "Join existing team" and enter your team name + passcode</li>
          <li>3 · Race your friends through 10 stops + 4 hair dares</li>
        </ol>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
          <div
            contentEditable
            suppressContentEditableWarning
            className="editable font-mono text-sm text-gold border border-transparent rounded px-3 py-1 min-w-[160px]"
          >
            {today}
          </div>
          <div className="font-mono text-xs text-cream/40 uppercase tracking-widest">·</div>
          <div
            contentEditable
            suppressContentEditableWarning
            className="editable font-mono text-sm text-gold border border-transparent rounded px-3 py-1 min-w-[160px]"
          >
            Team Outing
          </div>
        </div>
      </div>
    </div>
  );
}
