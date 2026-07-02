import { useEffect, useMemo, useState } from "react";
import type { Submission, Task } from "@/lib/types";
import type { StoredTeam } from "@/lib/team";
import { dollyLines } from "@/lib/dolly";
import { useServerFn } from "@tanstack/react-start";
import {
  requestPhotoUpload,
  saveDolly,
  saveSubmission,
} from "@/lib/hunt.functions";

type Props = {
  task: Task;
  team: StoredTeam;
  existing: Submission | null;
  onSaved: (s: Submission) => void;
};

export function SubmissionForm({ task, team, existing, onSaved }: Props) {
  const isDolly = task.id === "challenge-dolly";
  const isChallenge = task.type === "challenge";
  const [editing, setEditing] = useState(!existing);
  const [file, setFile] = useState<File | null>(null);
  const preview = useMemo(() => {
    if (file) return URL.createObjectURL(file);
    return existing?.photo_url ?? null;
  }, [file, existing?.photo_url]);

  useEffect(() => {
    if (file && preview?.startsWith("blob:")) {
      return () => URL.revokeObjectURL(preview);
    }
  }, [file, preview]);

  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [bonus, setBonus] = useState(existing?.bonus_claimed ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reqUpload = useServerFn(requestPhotoUpload);
  const save = useServerFn(saveSubmission);

  if (existing && !editing && !isDolly) {
    return (
      <div className="mt-4 rounded-xl border border-teal/40 bg-[#f0f8f7] p-4">
        <div className="flex items-start gap-3">
          {existing.photo_url && (
            <img src={existing.photo_url} alt="" className="h-20 w-20 rounded-lg object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-mono text-xs uppercase tracking-wide text-teal">Submitted ✓ · {existing.awarded_points} pts</div>
            {existing.notes && <p className="mt-1 text-sm text-ink/80 whitespace-pre-wrap">{existing.notes}</p>}
            <button onClick={() => setEditing(true)} className="mt-2 text-xs underline text-teal">
              Edit submission
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isDolly) {
    return <DollyForm task={task} team={team} existing={existing} onSaved={onSaved} />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      let photoUrl = existing?.photo_url ?? null;
      if (file) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const req = await reqUpload({
          data: {
            teamId: team.id,
            taskId: task.id,
            ext: ext || "jpg",
          },
        });
        const upRes = await fetch(req.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!upRes.ok) throw new Error(`Upload failed (${upRes.status})`);
        photoUrl = req.publicUrl;
      }
      const row = await save({
        data: {
          teamId: team.id,
          taskId: task.id,
          photoUrl,
          notes,
          bonusClaimed: bonus,
        },
      });
      onSaved(row as Submission);
      setEditing(false);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const accentBtn = isChallenge ? "bg-rust" : "bg-teal";

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <div>
        <label className="block font-mono text-xs uppercase tracking-wide text-ink/70 mb-1.5">
          Photo / Video
        </label>
        <input
          type="file"
          accept="image/*,video/*"
          capture="environment"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-2 file:text-cream file:font-mono file:text-xs file:uppercase"
        />
        {preview && (
          <img src={preview} alt="" className="mt-2 h-32 w-full rounded-lg object-cover" />
        )}
      </div>
      <div>
        <label className="block font-mono text-xs uppercase tracking-wide text-ink/70 mb-1.5">
          Comments
        </label>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What happened? Who did you meet? Any bonus claims?"
          rows={3}
          className="w-full rounded-lg border border-ink/15 bg-white p-3 text-sm"
        />
      </div>
      {task.bonus_description && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={bonus}
            onChange={(e) => setBonus(e.target.checked)}
            className="mt-1"
          />
          <span>
            <strong className="text-gold">+{task.max_bonus_points} bonus:</strong>{" "}
            {task.bonus_description}
          </span>
        </label>
      )}
      {error && <div className="text-sm text-rust">{error}</div>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || (!file && !existing)}
          className={`flex-1 rounded-lg ${accentBtn} px-4 py-3 font-mono text-xs uppercase tracking-wider text-white disabled:opacity-50`}
        >
          {busy ? "Uploading…" : existing ? "Update Submission" : "Submit"}
        </button>
        {existing && (
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setFile(null);
            }}
            className="rounded-lg border border-ink/20 px-4 py-3 font-mono text-xs uppercase"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function DollyForm({ task, team, existing, onSaved }: Props) {
  const [answers, setAnswers] = useState<string[]>(() => Array(dollyLines.length).fill(""));
  const [results, setResults] = useState<boolean[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(!!existing);
  const [error, setError] = useState<string | null>(null);
  const save = useServerFn(saveDolly);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await save({
        data: {
          teamId: team.id,
          passcode: team.passcode,
          taskId: task.id,
          answers,
        },
      });
      setResults(res.results);
      onSaved(res.submission as Submission);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      {dollyLines.map((line, i) => {
        const ok = results?.[i];
        return (
          <div key={i} className="space-y-1.5">
            <p className="text-sm italic text-ink/70">"{line.before}"</p>
            <input
              type="text"
              value={answers[i]}
              onChange={(e) => {
                const next = [...answers];
                next[i] = e.target.value;
                setAnswers(next);
              }}
              placeholder={line.placeholder}
              disabled={submitted}
              className={`w-full rounded-lg border-2 bg-white p-2.5 text-sm ${
                ok === true ? "border-teal" : ok === false ? "border-rust" : "border-ink/15"
              }`}
            />
            {results && (
              <p className={`text-xs ${ok ? "text-teal" : "text-rust"}`}>
                {ok ? "✓ Correct" : `✗ Answer: ${line.display}`}
              </p>
            )}
          </div>
        );
      })}
      {error && <div className="text-sm text-rust">{error}</div>}
      {!submitted && (
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="w-full rounded-lg bg-rust px-4 py-3 font-mono text-xs uppercase tracking-wider text-white disabled:opacity-50"
        >
          {busy ? "Scoring…" : "Submit Lyrics"}
        </button>
      )}
      {submitted && existing && (
        <div className="rounded-lg bg-[#f0f8f7] p-3 font-mono text-xs uppercase text-teal">
          Saved ✓ · {existing.notes} · {existing.awarded_points} pts
        </div>
      )}
    </div>
  );
}
