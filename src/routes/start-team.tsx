import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createTeam } from "@/lib/hunt.functions";
import { setStoredTeam } from "@/lib/team";
import { ShagLogo } from "@/components/brand";

export const Route = createFileRoute("/start-team")({
  component: StartTeam,
});

function StartTeam() {
  const navigate = useNavigate();
  const create = useServerFn(createTeam);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const t = await create({ data: { name: name.trim() } });
      setStoredTeam(t);
      navigate({ to: "/hunt" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormShell title="Start a new team" subtitle="Pick a team name to get started.">
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
        {error && <div className="text-sm text-rust">{error}</div>}
        <button
          type="submit"
          disabled={busy || !name.trim()}
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
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <Link to="/" className="font-mono text-xs text-cream/70 uppercase">
            ← Back
          </Link>
          <ShagLogo onDark />
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
