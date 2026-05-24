import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setStoredTeam } from "@/lib/team";

export const Route = createFileRoute("/start-team")({
  component: StartTeam,
});

function StartTeam() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}$/.test(passcode)) {
      setError("Passcode must be 4 digits.");
      return;
    }
    setBusy(true);
    const { data, error: dbErr } = await supabase
      .from("teams")
      .insert({ name: name.trim(), passcode })
      .select()
      .single();
    setBusy(false);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    setStoredTeam({ id: data.id, name: data.name });
    navigate({ to: "/hunt" });
  }

  return (
    <FormShell title="Start a new team" subtitle="Pick a team name and a 4-digit passcode.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Team name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={50}
            className="w-full rounded-lg border border-ink/20 bg-white p-3"
          />
        </Field>
        <Field label="4-digit passcode">
          <input
            value={passcode}
            onChange={(e) => setPasscode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            required
            className="w-full rounded-lg border border-ink/20 bg-white p-3 font-mono text-2xl tracking-[0.5em] text-center"
          />
        </Field>
        {error && <div className="text-sm text-rust">{error}</div>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-teal text-white font-mono uppercase text-xs tracking-widest py-4 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create team"}
        </button>
      </form>
    </FormShell>
  );
}

export function FormShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-ink text-cream px-6 py-6">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link to="/" className="font-mono text-xs text-cream/70 uppercase">
            ← Back
          </Link>
        </div>
      </div>
      <div className="max-w-md mx-auto px-6 py-8">
        <h1 className="font-serif text-3xl mb-1">{title}</h1>
        <p className="text-ink/60 text-sm mb-6">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-mono text-xs uppercase tracking-wider text-ink/70 mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
