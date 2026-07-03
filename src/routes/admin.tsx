import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminVerifyPasscode,
  adminUpdateSubmission,
  adminDeleteSubmission,
  adminResetTeam,
  adminDeleteTeam,
  adminCreateTeam,
  adminRenameTeam,
  adminSetTaskHidden,
  adminListAll,
  adminUpdateTeamColor,
} from "@/lib/admin.functions";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { useRealtimeSubmissions } from "@/hooks/useRealtimeSubmissions";
import { ShagLogo } from "@/components/brand";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ExportPhotosTab } from "@/components/ExportPhotosTab";


export const Route = createFileRoute("/admin")({ component: AdminPage });

const ADMIN_KEY = "seaholm.admin";
const PASS_KEY = "seaholm.admin.pass";

type TeamRow = { id: string; name: string; passcode: string | null; color: string | null; created_at: string };

type TaskRow = {
  id: string;
  title: string;
  type: string;
  order_num: number;
  base_points: number;
  max_bonus_points: number | null;
  hidden: boolean;
};
type SubRow = {
  id: string;
  team_id: string;
  task_id: string;
  photo_url: string | null;
  notes: string | null;
  bonus_claimed: boolean | null;
  awarded_points: number | null;
  submitted_at: string;
};

function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pass, setPass] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(ADMIN_KEY) === "1") {
      setUnlocked(true);
      setPass(sessionStorage.getItem(PASS_KEY) ?? "");
    }
  }, []);
  if (!unlocked) {
    return <PasscodeGate onUnlock={(p) => { setPass(p); setUnlocked(true); }} />;
  }
  return (
    <Dashboard
      passcode={pass}
      onLogout={() => {
        sessionStorage.removeItem(ADMIN_KEY);
        sessionStorage.removeItem(PASS_KEY);
        setUnlocked(false);
        setPass("");
      }}
    />
  );
}

function PasscodeGate({ onUnlock }: { onUnlock: (p: string) => void }) {
  const verify = useServerFn(adminVerifyPasscode);
  const [value, setValue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const { ok } = await verify({ data: { passcode: value } });
      if (!ok) { setErr("Incorrect passcode"); return; }
      sessionStorage.setItem(ADMIN_KEY, "1");
      sessionStorage.setItem(PASS_KEY, value);
      onUnlock(value);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally { setBusy(false); }
  }
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-ink/10 rounded-2xl p-8 space-y-5">
        <div className="text-center">
          <div className="font-mono text-[10px] uppercase tracking-widest text-rust">Admin</div>
          <h1 className="font-serif text-3xl mt-2">Seaholm Control</h1>
        </div>
        <Input
          type="password"
          autoFocus
          placeholder="Passcode"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {err && <p className="text-sm text-rust text-center">{err}</p>}
        <Button type="submit" disabled={busy || !value} className="w-full bg-teal hover:bg-teal/90">
          {busy ? "Checking…" : "Unlock"}
        </Button>
        <Link to="/" className="block text-center font-mono text-xs text-ink/40 hover:text-ink/60">
          ← Back
        </Link>
      </form>
    </div>
  );
}

function Dashboard({ passcode, onLogout }: { passcode: string; onLogout: () => void }) {
  const listAll = useServerFn(adminListAll);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await listAll({ data: { passcode } });
      setTeams(res.teams as TeamRow[]);
      setTasks(res.tasks as TaskRow[]);
      setSubs(res.submissions as SubRow[]);
    } finally { setLoading(false); }
  }, [listAll, passcode]);

  useEffect(() => { refresh(); }, [refresh]);

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-ink text-cream px-5 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <ShagLogo onDark />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-gold">Admin</div>
              <h1 className="font-serif text-2xl md:text-3xl mt-0.5 tracking-[0.05em]">Shag × Seaholm Control</h1>
            </div>
          </div>
          <div className="flex items-center gap-4 font-mono text-xs uppercase">
            <Link to="/hunt" className="text-cream/70 hover:text-cream">Hunt</Link>
            <Link to="/leaderboard" className="text-cream/70 hover:text-cream">Leaderboard</Link>
            <button onClick={onLogout} className="text-cream/70 hover:text-cream">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6">
        {loading ? (
          <p className="text-center text-ink/50 py-10">Loading…</p>
        ) : (
          <Tabs defaultValue="submissions">
            <TabsList className="bg-mist">
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="export">Export Photos</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="submissions">
              <SubmissionsTab
                passcode={passcode}
                subs={subs}
                teams={teams}
                tasks={tasks}
                teamMap={teamMap}
                taskMap={taskMap}
                onChange={refresh}
              />
            </TabsContent>
            <TabsContent value="teams">
              <TeamsTab
                passcode={passcode}
                teams={teams}
                tasks={tasks}
                subs={subs}
                onChange={refresh}
              />
            </TabsContent>
            <TabsContent value="tasks">
              <TasksTab passcode={passcode} tasks={tasks} onChange={refresh} />
            </TabsContent>
            <TabsContent value="export">
              <ExportPhotosTab teams={teams} tasks={tasks} subs={subs} />
            </TabsContent>
            <TabsContent value="activity">
              <ActivityTab passcode={passcode} teamMap={teamMap} taskMap={taskMap} />
            </TabsContent>
          </Tabs>

        )}
      </main>
    </div>
  );
}

type SortKey = "team" | "task" | "bonus" | "points" | "submitted_at";

function SubmissionsTab({
  passcode, subs, teams, tasks, teamMap, taskMap, onChange,
}: {
  passcode: string;
  subs: SubRow[];
  teams: TeamRow[];
  tasks: TaskRow[];
  teamMap: Map<string, TeamRow>;
  taskMap: Map<string, TaskRow>;
  onChange: () => void;
}) {
  const update = useServerFn(adminUpdateSubmission);
  const del = useServerFn(adminDeleteSubmission);

  const [teamFilter, setTeamFilter] = useState("all");
  const [taskFilter, setTaskFilter] = useState("all");
  const [bonusFilter, setBonusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("submitted_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [photo, setPhoto] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubRow | null>(null);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  }

  const filtered = useMemo(() => {
    let rows = subs;
    if (teamFilter !== "all") rows = rows.filter((r) => r.team_id === teamFilter);
    if (taskFilter !== "all") rows = rows.filter((r) => r.task_id === taskFilter);
    if (bonusFilter !== "all")
      rows = rows.filter((r) => !!r.bonus_claimed === (bonusFilter === "yes"));
    const sorted = [...rows].sort((a, b) => {
      let av: string | number = "", bv: string | number = "";
      switch (sortKey) {
        case "team": av = teamMap.get(a.team_id)?.name ?? ""; bv = teamMap.get(b.team_id)?.name ?? ""; break;
        case "task": av = taskMap.get(a.task_id)?.title ?? ""; bv = taskMap.get(b.task_id)?.title ?? ""; break;
        case "bonus": av = a.bonus_claimed ? 1 : 0; bv = b.bonus_claimed ? 1 : 0; break;
        case "points": av = a.awarded_points ?? 0; bv = b.awarded_points ?? 0; break;
        case "submitted_at": av = a.submitted_at; bv = b.submitted_at; break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [subs, teamFilter, taskFilter, bonusFilter, sortKey, sortDir, teamMap, taskMap]);

  async function onBonusChange(row: SubRow, val: boolean) {
    await update({ data: { passcode, submissionId: row.id, bonusClaimed: val } });
    onChange();
  }
  async function onPointsBlur(row: SubRow, val: string) {
    const n = Number(val);
    if (Number.isNaN(n)) return;
    if (n === (row.awarded_points ?? 0)) return;
    await update({ data: { passcode, submissionId: row.id, awardedPoints: n } });
    onChange();
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    await del({ data: { passcode, submissionId: deleteTarget.id } });
    setDeleteTarget(null);
    onChange();
  }

  const SortHeader = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <TableHead>
      <button
        onClick={() => toggleSort(k)}
        className="font-mono text-[10px] uppercase tracking-widest text-ink/60 hover:text-ink"
      >
        {children} {sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : ""}
      </button>
    </TableHead>
  );

  return (
    <div className="space-y-4 mt-4">
      <div className="rounded-r-lg border-l-4 border-gold bg-cream p-4">
        <div className="font-mono text-xs uppercase tracking-widest text-rust mb-2">
          The Only Two Rules
        </div>
        <ol className="text-sm text-ink/80 leading-relaxed list-decimal pl-5 space-y-1">
          <li>No AI-generated images. Real photos only.</li>
          <li>Every photo needs at least 2 team members in frame — take a selfie or ask a stranger. Solo photos don't count.</li>
        </ol>
      </div>

      <div className="flex flex-wrap items-end gap-3 bg-white border border-ink/10 rounded-xl p-4">
        <FilterSelect label="Team" value={teamFilter} onChange={setTeamFilter}
          options={[{ v: "all", l: "All teams" }, ...teams.map((t) => ({ v: t.id, l: t.name }))]} />
        <FilterSelect label="Task" value={taskFilter} onChange={setTaskFilter}
          options={[{ v: "all", l: "All tasks" }, ...tasks.map((t) => ({ v: t.id, l: t.hidden ? `${t.title} (hidden)` : t.title }))]} />
        <FilterSelect label="Bonus" value={bonusFilter} onChange={setBonusFilter}
          options={[{ v: "all", l: "All" }, { v: "yes", l: "Yes" }, { v: "no", l: "No" }]} />
        <div className="ml-auto font-mono text-xs text-ink/50">{filtered.length} shown</div>
      </div>

      <div className="bg-white border border-ink/10 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader k="team">Team</SortHeader>
              <SortHeader k="task">Task</SortHeader>
              <TableHead>Photo</TableHead>
              <TableHead>Comments</TableHead>
              <SortHeader k="bonus">Bonus</SortHeader>
              <SortHeader k="points">Points</SortHeader>
              <SortHeader k="submitted_at">Submitted</SortHeader>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{teamMap.get(row.team_id)?.name ?? "—"}</TableCell>
                <TableCell>{taskMap.get(row.task_id)?.title ?? row.task_id}</TableCell>
                <TableCell>
                  {row.photo_url ? (
                    <button onClick={() => setPhoto(row.photo_url)}>
                      <img src={row.photo_url} alt="" className="h-12 w-12 object-cover rounded" />
                    </button>
                  ) : (<span className="text-ink/30 text-xs">—</span>)}
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm text-ink/70">{row.notes || "—"}</TableCell>
                <TableCell>
                  <Switch checked={!!row.bonus_claimed} onCheckedChange={(v) => onBonusChange(row, v)} />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    defaultValue={row.awarded_points ?? 0}
                    className="h-8 w-20"
                    onBlur={(e) => onPointsBlur(row, e.target.value)}
                  />
                </TableCell>
                <TableCell className="font-mono text-[11px] text-ink/60 whitespace-nowrap">
                  {new Date(row.submitted_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(row)}>
                    <Trash2 className="text-rust" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-ink/40 py-8">No submissions</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!photo} onOpenChange={(o) => !o && setPhoto(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Submission photo</DialogTitle></DialogHeader>
          {photo && <img src={photo} alt="" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete submission?</DialogTitle></DialogHeader>
          <p className="text-sm text-ink/70">
            This soft-deletes the submission — it will no longer appear on the hunt page,
            leaderboard, or team gallery.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-widest text-ink/50">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function TeamsTab({
  passcode, teams, tasks, subs, onChange,
}: {
  passcode: string; teams: TeamRow[]; tasks: TaskRow[]; subs: SubRow[]; onChange: () => void;
}) {
  const totalTasks = tasks.filter((t) => !t.hidden).length;
  const reset = useServerFn(adminResetTeam);
  const create = useServerFn(adminCreateTeam);
  const delTeam = useServerFn(adminDeleteTeam);
  const rename = useServerFn(adminRenameTeam);
  const updateColor = useServerFn(adminUpdateTeamColor);
  const [resetTarget, setResetTarget] = useState<TeamRow | null>(null);
  const [confirmStage, setConfirmStage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<TeamRow | null>(null);
  const [deleteStage, setDeleteStage] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const stats = useMemo(() => {
    const m = new Map<string, { points: number; done: number; last: string | null }>();
    subs.forEach((s) => {
      const cur = m.get(s.team_id) ?? { points: 0, done: 0, last: null };
      cur.points += s.awarded_points ?? 0;
      cur.done += 1;
      if (!cur.last || s.submitted_at > cur.last) cur.last = s.submitted_at;
      m.set(s.team_id, cur);
    });
    return m;
  }, [subs]);

  async function doReset() {
    if (!resetTarget) return;
    await reset({ data: { passcode, teamId: resetTarget.id } });
    setResetTarget(null);
    setConfirmStage(0);
    onChange();
  }
  async function doCreate() {
    setErr(null);
    try {
      await create({ data: { passcode, name } });
      setName(""); setCreateOpen(false);
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }
  async function doDelete() {
    if (!deleteTarget) return;
    await delTeam({ data: { passcode, teamId: deleteTarget.id } });
    setDeleteTarget(null);
    setDeleteStage(0);
    onChange();
  }
  async function doRename(teamId: string, newName: string) {
    await rename({ data: { passcode, teamId, name: newName } });
    onChange();
  }
  async function doSetColor(teamId: string, color: string) {
    await updateColor({ data: { passcode, teamId, color } });
    onChange();
  }


  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <div className="font-mono text-xs text-ink/50">{teams.length} teams</div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal hover:bg-teal/90">+ Create team</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create team manually</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Team name" value={name} onChange={(e) => setName(e.target.value)} />
              {err && <p className="text-sm text-rust">{err}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={doCreate} disabled={!name.trim()} className="bg-teal hover:bg-teal/90">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((t) => {
          const s = stats.get(t.id) ?? { points: 0, done: 0, last: null };
          return (
            <div key={t.id} className="bg-white border border-ink/10 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <TeamColorSwatch color={t.color} onChange={(c) => doSetColor(t.id, c)} />
                  <div className="min-w-0 flex-1">
                    <EditableTeamName team={t} onRename={doRename} />
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-serif text-2xl text-teal">{s.points}</div>
                  <div className="font-mono text-[10px] uppercase text-ink/50">pts</div>
                </div>
              </div>
              <div className="mt-3 font-mono text-xs text-ink/60">
                {s.done} / {totalTasks} tasks
              </div>
              <div className="mt-1 font-mono text-[10px] text-ink/40">
                Last: {s.last ? new Date(s.last).toLocaleString() : "—"}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button asChild variant="outline" size="sm">
                  <Link to="/team/$teamId" params={{ teamId: t.id }}>View</Link>
                </Button>
                <Button variant="ghost" size="sm" className="text-rust hover:text-rust"
                  onClick={() => { setResetTarget(t); setConfirmStage(1); }}>
                  Reset progress
                </Button>
                <Button variant="ghost" size="sm" className="text-rust hover:text-rust"
                  onClick={() => { setDeleteTarget(t); setDeleteStage(1); }}>
                  <Trash2 className="mr-1 h-4 w-4" /> Delete team
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!resetTarget} onOpenChange={(o) => { if (!o) { setResetTarget(null); setConfirmStage(0); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmStage === 1 ? `Reset ${resetTarget?.name}?` : `Really reset ${resetTarget?.name}?`}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-ink/70">
            {confirmStage === 1
              ? "This will delete every submission for this team. This cannot be undone."
              : "Final confirmation. All photos, notes, and points for this team will be permanently removed."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetTarget(null); setConfirmStage(0); }}>Cancel</Button>
            {confirmStage === 1 ? (
              <Button variant="destructive" onClick={() => setConfirmStage(2)}>Continue</Button>
            ) : (
              <Button variant="destructive" onClick={doReset}>Yes, delete all</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setDeleteStage(0); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deleteStage === 1 ? `Delete ${deleteTarget?.name}?` : `Really delete ${deleteTarget?.name}?`}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-ink/70">
            {deleteStage === 1
              ? "This will permanently remove the team and every submission, photo, and point it has earned."
              : "Final confirmation. The team and all of its data will be permanently deleted."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteStage(0); }}>Cancel</Button>
            {deleteStage === 1 ? (
              <Button variant="destructive" onClick={() => setDeleteStage(2)}>Continue</Button>
            ) : (
              <Button variant="destructive" onClick={doDelete}>Yes, delete team</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActivityTab({
  teamMap, taskMap,
}: {
  passcode: string;
  teamMap: Map<string, TeamRow>;
  taskMap: Map<string, TaskRow>;
}) {
  const { submissions, connected } = useRealtimeSubmissions();
  const rows = useMemo(() => submissions.slice(0, 50), [submissions]);

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs text-ink/50">{rows.length} events</div>
        <span
          className={`font-mono text-[10px] uppercase tracking-widest ${
            connected ? "text-teal" : "text-ink/40"
          }`}
        >
          {connected ? "🟢 Live" : "🟡 Reconnecting…"}
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-4 bg-white border border-ink/10 rounded-xl p-3">
          {r.photo_url ? (
            <img src={r.photo_url} alt="" className="h-14 w-14 rounded object-cover" />
          ) : (
            <div className="h-14 w-14 rounded bg-mist" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-serif text-lg truncate">{teamMap.get(r.team_id)?.name ?? "—"}</div>
            <div className="text-sm text-ink/70 truncate">{taskMap.get(r.task_id)?.title ?? r.task_id}</div>
          </div>
          <div className="text-right">
            <div className="font-serif text-teal">{r.awarded_points ?? 0} pts</div>
            <div className="font-mono text-[10px] text-ink/40">{timeAgo(r.submitted_at)}</div>
          </div>
        </div>
      ))}
      {rows.length === 0 && <p className="text-center text-ink/40 py-8">No activity yet.</p>}
    </div>
  );
}

function TasksTab({
  passcode, tasks, onChange,
}: {
  passcode: string; tasks: TaskRow[]; onChange: () => void;
}) {
  const setHidden = useServerFn(adminSetTaskHidden);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggle(t: TaskRow, hidden: boolean) {
    setBusyId(t.id);
    try {
      await setHidden({ data: { passcode, taskId: t.id, hidden } });
      await onChange();
    } finally {
      setBusyId(null);
    }
  }

  const visibleCount = tasks.filter((t) => !t.hidden).length;

  return (
    <div className="space-y-4 mt-4">
      <div className="font-mono text-xs text-ink/50">
        {visibleCount} visible · {tasks.length - visibleCount} hidden · {tasks.length} total
      </div>
      <div className="bg-white border border-ink/10 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Visible</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((t) => (
              <TableRow key={t.id} className={t.hidden ? "opacity-60" : ""}>
                <TableCell className="font-mono text-xs">{t.order_num}</TableCell>
                <TableCell className="font-mono text-xs text-ink/60">{t.id}</TableCell>
                <TableCell className="font-medium">
                  {t.title}
                  {t.hidden && (
                    <span className="ml-2 font-mono text-[10px] uppercase bg-rust/15 text-rust px-1.5 py-0.5 rounded">
                      hidden
                    </span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{t.type}</TableCell>
                <TableCell className="font-mono text-xs">
                  {t.base_points}
                  {t.max_bonus_points ? `+${t.max_bonus_points}` : ""}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={!t.hidden}
                    disabled={busyId === t.id}
                    onCheckedChange={(v) => toggle(t, !v)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}



function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function EditableTeamName({
  team,
  onRename,
}: {
  team: TeamRow;
  onRename: (teamId: string, newName: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(team.name);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setValue(team.name);
  }, [team.name]);

  async function commit() {
    const next = value.trim();
    if (!next || next === team.name) {
      setEditing(false);
      setValue(team.name);
      setErr(null);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await onRename(team.id, next);
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="font-serif text-xl text-left hover:underline decoration-dotted underline-offset-4"
        title="Click to rename"
      >
        {team.name}
      </button>
    );
  }

  return (
    <div className="space-y-1">
      <Input
        autoFocus
        value={value}
        disabled={busy}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            setValue(team.name);
            setEditing(false);
            setErr(null);
          }
        }}
        className="h-9 font-serif text-lg"
        maxLength={50}
      />
      {err && <p className="text-xs text-rust">{err}</p>}
    </div>
  );
}
