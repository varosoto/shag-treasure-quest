import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
const RATIOS: Record<Ratio, { w: number; h: number }> = {
  "1:1": { w: 1080, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
  "9:16": { w: 1080, h: 1920 },
};

const CREAM = "#faf6f0";
const INK = "#1c1c1a";
const GOLD = "#d4a847";
const DEFAULT_COLOR = "#7a2e3e";

function isImage(url: string | null) {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return /\.(jpe?g|png|gif|webp|heic|heif|avif)$/.test(clean);
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "team";
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastColor(bg: string) {
  return luminance(bg) > 0.45 ? INK : CREAM;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load " + url));
    img.src = url;
  });
}

function drawShagWordmark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fill: string,
  scale: number,
) {
  // Text-drawn wordmark "shag" — matches Shag's editorial italic serif style.
  ctx.save();
  ctx.fillStyle = fill;
  ctx.font = `italic 700 ${Math.round(64 * scale)}px "Playfair Display", Georgia, serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText("shag", x, y);
  // small underline dot flourish
  ctx.beginPath();
  ctx.arc(x + ctx.measureText("shag").width + 10 * scale, y + 22 * scale, 4 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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
  const { w, h } = RATIOS[ratio];
  const bandH = Math.round(h * (ratio === "9:16" ? 0.24 : ratio === "1:1" ? 0.28 : 400 / 1350));
  const photoH = h - bandH - 6; // 6px gold divider
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);

  // Photo area — object-fit cover
  try {
    const img = await loadImage(photoUrl);
    const scale = Math.max(w / img.width, photoH / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = (w - dw) / 2;
    const dy = (photoH - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  } catch {
    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, w, photoH);
    ctx.fillStyle = CREAM;
    ctx.font = `italic 42px "Playfair Display", serif`;
    ctx.textAlign = "center";
    ctx.fillText("photo unavailable", w / 2, photoH / 2);
  }

  // Gold divider bar
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, photoH, w, 6);

  // Color band
  const bandY = photoH + 6;
  ctx.fillStyle = teamColor;
  ctx.fillRect(0, bandY, w, bandH);

  const fg = contrastColor(teamColor);
  const isDark = fg === CREAM;
  const scale = w / 1080;
  const padX = 60 * scale;
  const padY = 50 * scale;

  // Top-left: Shag wordmark, with pill if band is dark
  if (isDark) {
    // pill
    const pillW = 200 * scale;
    const pillH = 80 * scale;
    ctx.fillStyle = CREAM;
    const rx = 40 * scale;
    const px = padX;
    const py = bandY + padY - 14 * scale;
    ctx.beginPath();
    ctx.moveTo(px + rx, py);
    ctx.arcTo(px + pillW, py, px + pillW, py + pillH, rx);
    ctx.arcTo(px + pillW, py + pillH, px, py + pillH, rx);
    ctx.arcTo(px, py + pillH, px, py, rx);
    ctx.arcTo(px, py, px + pillW, py, rx);
    ctx.closePath();
    ctx.fill();
    drawShagWordmark(ctx, padX + 30 * scale, py + pillH / 2, INK, scale);
  } else {
    drawShagWordmark(ctx, padX, bandY + padY + 24 * scale, INK, scale);
  }

  // Top-right: co-brand tagline
  ctx.fillStyle = fg;
  ctx.font = `600 ${Math.round(20 * scale)}px "DM Mono", "Courier New", monospace`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const tagY = bandY + padY + 24 * scale;
  ctx.fillText("S H A G  ×  S E A H O L M", w - padX, tagY - 14 * scale);
  ctx.font = `${Math.round(16 * scale)}px "DM Mono", "Courier New", monospace`;
  ctx.globalAlpha = 0.75;
  ctx.fillText("SCAVENGER HUNT", w - padX, tagY + 14 * scale);
  ctx.globalAlpha = 1;

  // Bottom-left: team name
  ctx.fillStyle = fg;
  ctx.font = `italic 400 ${Math.round(72 * scale)}px "Playfair Display", Georgia, serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const nameY = bandY + bandH - padY;
  // Truncate long names
  let display = teamName;
  const maxW = w - padX * 2 - 200 * scale;
  while (ctx.measureText(display).width > maxW && display.length > 3) {
    display = display.slice(0, -1);
  }
  if (display !== teamName) display = display.trimEnd() + "…";
  ctx.fillText(display, padX, nameY);

  // Bottom-right: challenge label
  ctx.font = `600 ${Math.round(18 * scale)}px "DM Mono", "Courier New", monospace`;
  ctx.textAlign = "right";
  ctx.globalAlpha = 0.75;
  ctx.fillText(
    `CHALLENGE ${String(challengeNum).padStart(2, "0")}`,
    w - padX,
    nameY - 8 * scale,
  );
  ctx.globalAlpha = 1;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/png",
    );
  });
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
  const [fontsReady, setFontsReady] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.fonts.ready.then(() => setFontsReady(true));
  }, []);

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  // Continuous challenge numbers over visible tasks
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
        try {
          const blob = await renderFrame({
            photoUrl: row.photo_url,
            teamName: team.name,
            teamColor: team.color ?? DEFAULT_COLOR,
            challengeNum: num,
            ratio,
          });
          const fname = `${slugify(team.name)}_challenge-${String(num).padStart(2, "0")}_${row.id.slice(0, 4)}.png`;
          zip.file(fname, blob);
        } catch (e) {
          console.error("Failed to render", row.id, e);
        }
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shag-seaholm-photos-${ratio.replace(":", "x")}.zip`;
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

        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-ink/50 mb-2">Aspect ratio</div>
            <RadioGroup value={ratio} onValueChange={(v) => setRatio(v as Ratio)} className="flex gap-4">
              {(Object.keys(RATIOS) as Ratio[]).map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value={r} id={`ratio-${r}`} />
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
              disabled={zipBusy || !filtered.length || !fontsReady}
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
            {videoCount} video submission{videoCount === 1 ? "" : "s"} excluded from export — download them manually from Storage.
          </p>
        )}
        {!fontsReady && (
          <p className="text-xs text-ink/50">Loading fonts before rendering…</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((row) => {
          const team = teamMap.get(row.team_id);
          const task = taskMap.get(row.task_id);
          if (!team || !task || !row.photo_url) return null;
          const num = challengeNumMap.get(row.task_id) ?? task.order_num;
          return (
            <PreviewCard
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

function PreviewCard({
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
    return () => {
      canceledRef.current = true;
    };
  }, [render, fontsReady]);

  useEffect(() => {
    return () => {
      if (dataUrl) URL.revokeObjectURL(dataUrl);
    };
  }, [dataUrl]);

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
    <div className="bg-white border border-ink/10 rounded-xl overflow-hidden flex flex-col">
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
      <div className="p-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-serif truncate">{teamName}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-ink/50">
            Ch {String(challengeNum).padStart(2, "0")} · {new Date(submittedAt).toLocaleDateString()}
          </div>
        </div>
        <Button size="sm" variant="outline" disabled={!blob} onClick={download}>
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
