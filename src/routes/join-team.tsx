import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setStoredTeam } from "@/lib/team";
import { FormShell } from "./start-team";

export const Route = createFileRoute("/join-team")({
  component: JoinTeam,
});

function JoinTeam() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { data, error: dbErr } = await supabase
      .from("teams")
      .select("id,name,passcode")
      .eq("name", name.trim())
      .maybeSingle();
    setBusy(false);
    if (dbErr) return setError(dbErr.message);
    if (!data) return setError("Team not found.");
    if (data.passcode !== passcode) return setError("Wrong passcode.");
    setStoredTeam({ id: data.id, name: data.name });
    navigate({ to: "/hunt" });
  }

  return (
    <FormShell title="Join existing team" subtitle="Enter your team's name and 4-digit passcode.">
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="block font-mono text-xs uppercase tracking-wider text-ink/70 mb-1.5">
            Team name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-ink/20 bg-white p-3"
          />
        </label>
        <label className="block">
          <span className="block font-mono text-xs uppercase tracking-wider text-ink/70 mb-1.5">
            Passcode
          </span>
          <input
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
          disabled={busy}
          className="w-full rounded-xl bg-teal text-white font-mono uppercase text-xs tracking-widest py-4 disabled:opacity-50"
        >
          {busy ? "Joining…" : "Join team"}
        </button>
      </form>
    </FormShell>
  );
}
