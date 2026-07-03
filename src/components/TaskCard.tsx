import { useState } from "react";
import type { Submission, Task } from "@/lib/types";
import type { StoredTeam } from "@/lib/team";
import { SubmissionForm } from "./SubmissionForm";

const iconBgByStop: Record<number, string> = {
  1: "#ffe5d0", 2: "#d4ecd4", 3: "#d0e2ff", 4: "#e8dcc8",
  5: "#dcdcdc", 6: "#f5d0d8", 7: "#ffd6d0", 8: "#e0d4f0",
  9: "#fff0c8", 10: "#cfe8e8",
};

type Props = {
  task: Task;
  team: StoredTeam;
  submission: Submission | null;
  displayNum?: number;
  onSaved: (s: Submission) => void;
};

export function TaskCard({ task, team, submission, displayNum, onSaved }: Props) {
  const isChallenge = task.type === "challenge";
  const submitted = !!submission;
  const [open, setOpen] = useState(!submitted);
  const [showHint, setShowHint] = useState(false);
  const num = displayNum ?? task.order_num;

  const borderClr = submitted
    ? "border-teal"
    : isChallenge
    ? "border-[#f5c6b0]"
    : "border-[#e0ebe9]";
  const bgClr = submitted ? "bg-[#f0f8f7]" : "bg-white";
  const iconBg = isChallenge ? "#f5c6b0" : iconBgByStop[num] ?? "#e0ebe9";

  const displayTitle = submitted
    ? `Challenge ${num} · ${task.title}`
    : `Challenge ${num}`;
  const showSubtitle = isChallenge && task.subtitle;

  return (
    <div className={`rounded-2xl border-[1.5px] ${borderClr} ${bgClr} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <span className="font-mono text-xs text-ink/50 w-6">{String(task.order_num).padStart(2, "0")}</span>
        <span
          className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: iconBg }}
        >
          {task.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-serif text-lg leading-tight">{displayTitle}</h3>
            <span className="font-mono text-[10px] uppercase bg-gold/20 text-ink px-1.5 py-0.5 rounded">
              {task.base_points}
              {task.max_bonus_points ? `+${task.max_bonus_points}` : ""} pts
            </span>
            {submitted && (
              <span className="font-mono text-[10px] uppercase bg-teal text-white px-1.5 py-0.5 rounded">
                Found
              </span>
            )}
          </div>
          {showSubtitle && (
            <p className="font-mono text-[11px] uppercase text-ink/50 mt-0.5 truncate">{task.subtitle}</p>
          )}
        </div>

        <span className={`text-ink/40 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {task.clue && (
            <div className="rounded-lg bg-sand border-l-4 border-gold p-3 text-sm italic text-ink/80">
              {task.clue}
            </div>
          )}

          <p className="text-sm text-ink/90 leading-relaxed">{task.task_description}</p>

          {task.hint && (
            <div>
              <button
                type="button"
                onClick={() => setShowHint((s) => !s)}
                className="font-mono text-xs uppercase tracking-wider border-2 border-dashed border-fog px-3 py-1.5 rounded-md text-ink/70"
              >
                {showHint ? "Hide hint" : "Need a hint?"}
              </button>
              {showHint && (
                <p className="mt-2 text-sm text-ink/70 bg-mist/50 rounded-lg p-3">{task.hint}</p>
              )}
            </div>
          )}

          {isChallenge && task.bonus_description && (
            <div className="rounded-lg bg-[#fde8db] border-l-4 border-rust p-3 text-sm">
              <span className="font-mono text-[10px] uppercase tracking-wider text-rust mr-1">
                Hair Dare Bonus →
              </span>
              {task.bonus_description}
            </div>
          )}

          <SubmissionForm task={task} team={team} existing={submission} onSaved={onSaved} />

        </div>
      )}
    </div>
  );
}
