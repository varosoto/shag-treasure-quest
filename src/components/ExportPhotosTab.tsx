import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, Loader2 } from "lucide-react";

type TeamRow = { id: string; name: string; color: string | null };
type TaskRow = { id: string; title: string; order_num: number; hidden: boolean };
type SubRow = {
  id: string;
  team_id: string;
  task_id: string;
  photo_url: string | null;
  bonus_claimed: boolean | null;
  submitted_at: string;
};

type Ratio = "1:1" | "4:5" | "9:16";
const RATIOS: Record<Ratio, { w: number; h: number; bandH: number }> = {
  "1:1": { w: 1080, h: 1080, bandH: 108 },
  "4:5": { w: 1080, h: 1350, bandH: 136 },
  "9:16": { w: 1080, h: 1920, bandH: 200 },
};

const CREAM = "#faf6f0";
const INK = "#1c1c1a";
const DEFAULT_COLOR = "#7a2e3e";
const LOGO_URL = "/shag-logo.png";

function isImage(url: string | null) {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return /\.(jpe?g|png|gif|webp|heic|heif|avif)$/.test(clean);
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "team";
}

async function loadImage(url: string, sameOrigin = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!sameOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load " + url));
    img.src = url;
  });
}

// Cache the logo across renders
let _logoPromise: Promise<HTMLImageElement | null> | null = null;
function getLogo(): Promise<HTMLImageElement | null> {
  if (!_logoPromise) {
    _logoPromise = loadImage(LOGO_URL, true).catch(() => null);
  }
  return _logoPromise;
}

async function renderFrame({
  photoUrl,
  teamName,
  teamColor,
  challengeNum,
  ratio,
}: {
  photoUrl: string;
  teamName: string;
  teamColor: string;
  challengeNum: number;
  ratio: Ratio;
}): Promise<Blob> {
  const { w, h, bandH } = RATIOS[ratio];
  const accentH = 4;
  const photoH = h - bandH - accentH;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Cream background base
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, w, h);

  // Photo — object-fit cover
  try {
    const img = await loadImage(photoUrl);
    const scale = Math.max(w / img.width, photoH / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (w - dw) / 2, (photoH - dh) / 2, dw, dh);
  } catch {
    ctx.fillStyle = "#eee";
    ctx.fillRect(0, 0, w, photoH);
    ctx.fillStyle = "#888";
    ctx.font = `italic 42px "Playfair Display", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("photo unavailable", w / 2, photoH / 2);
  }

  // Thin accent line in team color
  ctx.fillStyle = teamColor;
  ctx.fillRect(0, photoH, w, accentH);

  // Bottom cream band
  const bandY = photoH + accentH;
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, bandY, w, bandH);

  const scale = w / 1080;
  const padX = 32 * scale;
  const midY = bandY + bandH / 2;

  // LEFT: Shag logo (48px tall at 1080 width) or text fallback
  const logo = await getLogo();
  const logoH = 48 * scale;
  if (logo) {
    const ratioLogo = logo.width / logo.height;
    const logoW = logoH * ratioLogo;
    ctx.drawImage(logo, padX, midY - logoH / 2, logoW, logoH);
  } else {
    ctx.fillStyle = INK;
    ctx.font = `italic 700 ${Math.round(38 * scale)}px "Playfair Display", Georgia, serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = `${4 * scale}px`;
    ctx.fillText("S H A G", padX, midY);
    ctx.letterSpacing = "0px";
  }

  // CENTER: team name + challenge label
  ctx.fillStyle = INK;
  ctx.font = `italic 400 ${Math.round(32 * scale)}px "Playfair Display", Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  // Truncate name if too wide
  let display = teamName;
  const maxNameW = w * 0.55;
  while (ctx.measureText(display).width > maxNameW && display.length > 3) {
    display = display.slice(0, -1);
  }
  if (display !== teamName) display = display.trimEnd() + "…";
  ctx.fillText(display, w / 2, midY - 4 * scale);

  ctx.font = `600 ${Math.round(10 * scale)}px "DM Mono", "Courier New", monospace`;
  ctx.fillStyle = INK;
  ctx.globalAlpha = 0.5;
  ctx.textBaseline = "top";
  const chLabel = `CHALLENGE ${String(challengeNum).padStart(2, "0")}`;
  ctx.letterSpacing = `${2 * scale}px`;
  ctx.fillText(chLabel, w / 2, midY + 14 * scale);
  ctx.letterSpacing = "0px";
  ctx.globalAlpha = 1;

  // RIGHT: co-brand tagline stack
  ctx.fillStyle = INK;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 ${Math.round(11 * scale)}px "DM Mono", "Courier New", monospace`;
  ctx.letterSpacing = `${2 * scale}px`;
  ctx.globalAlpha = 0.6;
  ctx.fillText("S H A G  ×  S E A H O L M", w - padX, midY - 2 * scale);
  ctx.globalAlpha = 0.4;
  ctx.font = `${Math.round(10 * scale)}px "DM Mono", "Courier New", monospace`;
  ctx.textBaseline = "top";
  ctx.fillText("SCAVENGER HUNT", w - padX, midY + 10 * scale);
  ctx.letterSpacing = "0px";
  ctx.globalAlpha = 1;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}

async function fetchRawBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch ${res.status}`);
  return await res.blob();
}

function extFromUrl(url: string, fallback = "jpg") {
  const clean = url.split("?")[0];
  const m = clean.match(/\.([a-zA-Z0-9]{2,5})$/);
  return m ? m[1].toLowerCase() : fallback;
}

export function ExportPhotosTab({
  teams,
  tasks,
  subs,
}: {
  teams: TeamRow[];
  tasks: TaskRow[];
  subs: SubRow[];
}) {
  const [teamFilter, setTeamFilter] = useState("all");
  const [taskFilter, setTaskFilter] = useState("all");
  const [bonusOnly, setBonusOnly] = useState(false);
  const [ratio, setRatio] = useState<Ratio>("4:5");
  const [branded, setBranded] = useState(true);
  const [fontsReady, setFontsReady] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.fonts.ready.then(() => setFontsReady(true));
  }, []);

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const challengeNumMap = useMemo(() => {
    const visible = tasks.filter((t) => !t.hidden).sort((a, b) => a.order_num - b.order_num);
    const m = new Map<string, number>();
    visible.forEach((t, i) => m.set(t.id, i + 1));
    return m;
  }, [tasks]);

  const filtered = useMemo(() => {
    let rows = subs.filter((s) => isImage(s.photo_url));
    if (teamFilter !== "all") rows = rows.filter((r) => r.team_id === teamFilter);
    if (taskFilter !== "all") rows = rows.filter((r) => r.task_id === taskFilter);
    if (bonusOnly) rows = rows.filter((r) => !!r.bonus_claimed);
    return rows;
  }, [subs, teamFilter, taskFilter, bonusOnly]);

  const videoCount = useMemo(
    () =>
      subs.filter((s) => {
        if (!s.photo_url) return false;
        const clean = s.photo_url.split("?")[0].toLowerCase();
        return /\.(mp4|mov|webm|m4v|avi)$/.test(clean);
      }).length,
    [subs],
  );

  async function downloadZip() {
    if (!filtered.length) return;
    setZipBusy(true);
    try {
      const zip = new JSZip();
      for (const row of filtered) {
        const team = teamMap.get(row.team_id);
        const task = taskMap.get(row.task_id);
        if (!team || !task || !row.photo_url) continue;
        const num = challengeNumMap.get(row.task_id) ?? task.order_num;
        const baseName = `${slugify(team.name)}_challenge-${String(num).padStart(2, "0")}_${row.id.slice(0, 4)}`;
        try {
          if (branded) {
            const blob = await renderFrame({
              photoUrl: row.photo_url,
              teamName: team.name,
              teamColor: team.color ?? DEFAULT_COLOR,
              challengeNum: num,
              ratio,
            });
            zip.file(`${baseName}.png`, blob);
          } else {
            const blob = await fetchRawBlob(row.photo_url);
            zip.file(`${baseName}.${extFromUrl(row.photo_url)}`, blob);
          }
        } catch (e) {
          console.error("Failed to package", row.id, e);
        }
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      const suffix = branded ? ratio.replace(":", "x") : "raw";
      a.download = `shag-seaholm-photos-${suffix}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setZipBusy(false);
    }
  }

  return (
    <div className="space-y-5 mt-4">
      <div className="bg-white border border-ink/10 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink/50">Team</span>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teams</SelectItem>
                {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink/50">Challenge</span>
            <Select value={taskFilter} onValueChange={setTaskFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All challenges</SelectItem>
                {tasks.filter((t) => !t.hidden).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {challengeNumMap.get(t.id) ?? t.order_num}. {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={bonusOnly}
                onCheckedChange={(v) => setBonusOnly(!!v)}
              />
              <span className="text-sm">Bonus-claimed only</span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-ink/5">
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch checked={branded} onCheckedChange={setBranded} />
            <span className="text-sm font-medium">Include branding</span>
          </label>
          <div className={branded ? "" : "opacity-40 pointer-events-none"}>
            <div className="font-mono text-[10px] uppercase tracking-widest text-ink/50 mb-2">Aspect ratio</div>
            <RadioGroup value={ratio} onValueChange={(v) => setRatio(v as Ratio)} className="flex gap-4">
              {(Object.keys(RATIOS) as Ratio[]).map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value={r} id={`ratio-${r}`} disabled={!branded} />
                  <Label htmlFor={`ratio-${r}`} className="font-mono text-xs">{r}</Label>
                </label>
              ))}
            </RadioGroup>
          </div>
          <div className="ml-auto flex flex-col gap-2 items-end">
            <div className="font-mono text-xs text-ink/50">
              {filtered.length} photo{filtered.length === 1 ? "" : "s"}
              {videoCount > 0 && ` · ${videoCount} video${videoCount === 1 ? "" : "s"} excluded`}
            </div>
            <Button
              onClick={downloadZip}
              disabled={zipBusy || !filtered.length || (branded && !fontsReady)}
              className="bg-wine hover:bg-wine/90"
            >
              {zipBusy ? (
                <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Building ZIP…</>
              ) : (
                <><Download className="mr-1 h-4 w-4" /> Download all as ZIP</>
              )}
            </Button>
          </div>
        </div>

        {videoCount > 0 && (
          <p className="text-xs text-ink/60">
            {videoCount} video submission{videoCount === 1 ? "" : "s"} excluded from export — download manually from Storage.
          </p>
        )}
        {branded && !fontsReady && (
          <p className="text-xs text-ink/50">Loading fonts before rendering…</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((row) => {
          const team = teamMap.get(row.team_id);
          const task = taskMap.get(row.task_id);
          if (!team || !task || !row.photo_url) return null;
          const num = challengeNumMap.get(row.task_id) ?? task.order_num;
          return branded ? (
            <FramedCard
              key={row.id}
              subId={row.id}
              photoUrl={row.photo_url}
              teamName={team.name}
              teamColor={team.color ?? DEFAULT_COLOR}
              challengeNum={num}
              ratio={ratio}
              submittedAt={row.submitted_at}
              fontsReady={fontsReady}
            />
          ) : (
            <RawCard
              key={row.id}
              subId={row.id}
              photoUrl={row.photo_url}
              teamName={team.name}
              challengeNum={num}
              submittedAt={row.submitted_at}
            />
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-ink/40 py-12 font-mono text-xs uppercase tracking-widest">
            No matching photos
          </div>
        )}
      </div>
    </div>
  );
}

function CardChrome({
  teamName,
  challengeNum,
  submittedAt,
  onDownload,
  disabled,
  children,
}: {
  teamName: string;
  challengeNum: number;
  submittedAt: string;
  onDownload: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-ink/10 rounded-xl overflow-hidden flex flex-col">
      {children}
      <div className="p-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-serif truncate">{teamName}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-ink/50">
            Ch {String(challengeNum).padStart(2, "0")} · {new Date(submittedAt).toLocaleDateString()}
          </div>
        </div>
        <Button size="sm" variant="outline" disabled={disabled} onClick={onDownload}>
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function FramedCard({
  subId,
  photoUrl,
  teamName,
  teamColor,
  challengeNum,
  ratio,
  submittedAt,
  fontsReady,
}: {
  subId: string;
  photoUrl: string;
  teamName: string;
  teamColor: string;
  challengeNum: number;
  ratio: Ratio;
  submittedAt: string;
  fontsReady: boolean;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const canceledRef = useRef(false);

  const render = useCallback(async () => {
    setErr(null);
    setDataUrl(null);
    try {
      const b = await renderFrame({ photoUrl, teamName, teamColor, challengeNum, ratio });
      if (canceledRef.current) return;
      setBlob(b);
      setDataUrl(URL.createObjectURL(b));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Render failed");
    }
  }, [photoUrl, teamName, teamColor, challengeNum, ratio]);

  useEffect(() => {
    if (!fontsReady) return;
    canceledRef.current = false;
    render();
    return () => { canceledRef.current = true; };
  }, [render, fontsReady]);

  useEffect(() => () => { if (dataUrl) URL.revokeObjectURL(dataUrl); }, [dataUrl]);

  function download() {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(teamName)}_challenge-${String(challengeNum).padStart(2, "0")}_${subId.slice(0, 4)}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const aspect = ratio === "1:1" ? "aspect-square" : ratio === "9:16" ? "aspect-[9/16]" : "aspect-[4/5]";

  return (
    <CardChrome
      teamName={teamName}
      challengeNum={challengeNum}
      submittedAt={submittedAt}
      onDownload={download}
      disabled={!blob}
    >
      <div className={`${aspect} bg-ink/5 relative`}>
        {dataUrl ? (
          <img src={dataUrl} alt="" className="w-full h-full object-cover" />
        ) : err ? (
          <div className="absolute inset-0 grid place-content-center p-4 text-center text-xs text-rust">
            {err}
            <button onClick={render} className="mt-2 underline">Retry</button>
          </div>
        ) : (
          <div className="absolute inset-0 grid place-content-center">
            <Loader2 className="h-6 w-6 animate-spin text-ink/40" />
          </div>
        )}
      </div>
    </CardChrome>
  );
}

function RawCard({
  subId,
  photoUrl,
  teamName,
  challengeNum,
  submittedAt,
}: {
  subId: string;
  photoUrl: string;
  teamName: string;
  challengeNum: number;
  submittedAt: string;
}) {
  async function download() {
    try {
      const blob = await fetchRawBlob(photoUrl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(teamName)}_challenge-${String(challengeNum).padStart(2, "0")}_${subId.slice(0, 4)}.${extFromUrl(photoUrl)}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // fallback: open in new tab
      window.open(photoUrl, "_blank");
    }
  }
  return (
    <CardChrome
      teamName={teamName}
      challengeNum={challengeNum}
      submittedAt={submittedAt}
      onDownload={download}
      disabled={false}
    >
      <div className="bg-ink/5">
        <img src={photoUrl} alt="" className="w-full h-auto block" />
      </div>
    </CardChrome>
  );
}
