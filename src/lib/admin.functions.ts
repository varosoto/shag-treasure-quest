import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const DEFAULT_PASSCODE = "seaholm2026";

function expectedPasscode() {
  return process.env.ADMIN_PASSCODE || DEFAULT_PASSCODE;
}

function verify(passcode: string) {
  if (passcode !== expectedPasscode()) throw new Error("Invalid admin passcode");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const adminVerifyPasscode = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ passcode: z.string().min(1).max(100) }).parse(data))
  .handler(async ({ data }) => {
    return { ok: data.passcode === expectedPasscode() };
  });

export const adminUpdateSubmission = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        passcode: z.string().min(1).max(100),
        submissionId: z.string().uuid(),
        awardedPoints: z.number().int().min(0).max(10000).optional(),
        bonusClaimed: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    verify(data.passcode);
    const sb = await admin();
    const patch: { awarded_points?: number; bonus_claimed?: boolean } = {};
    if (data.awardedPoints !== undefined) patch.awarded_points = data.awardedPoints;
    if (data.bonusClaimed !== undefined) patch.bonus_claimed = data.bonusClaimed;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await sb.from("submissions").update(patch).eq("id", data.submissionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteSubmission = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ passcode: z.string().min(1).max(100), submissionId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    verify(data.passcode);
    const sb = await admin();
    const { error } = await sb
      .from("submissions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.submissionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminResetTeam = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ passcode: z.string().min(1).max(100), teamId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    verify(data.passcode);
    const sb = await admin();
    const { error } = await sb.from("submissions").delete().eq("team_id", data.teamId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteTeam = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ passcode: z.string().min(1).max(100), teamId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    verify(data.passcode);
    const sb = await admin();
    const { data: subs, error: subsErr } = await sb
      .from("submissions")
      .select("id")
      .eq("team_id", data.teamId);
    if (subsErr) throw new Error(subsErr.message);
    const subIds = (subs ?? []).map((s) => s.id);
    if (subIds.length > 0) {
      const { error: daErr } = await sb.from("dolly_answers").delete().in("submission_id", subIds);
      if (daErr) throw new Error(daErr.message);
      const { error: sErr } = await sb.from("submissions").delete().eq("team_id", data.teamId);
      if (sErr) throw new Error(sErr.message);
    }
    const { error } = await sb.from("teams").delete().eq("id", data.teamId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const TEAM_PALETTE = [
  "#7a2e3e", "#d4a847", "#1a6b72", "#c1440e", "#4a6741",
  "#8b4a6b", "#2f5f8f", "#c96f4a", "#4a8b8b", "#8b7355",
];

export const adminCreateTeam = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        passcode: z.string().min(1).max(100),
        name: z.string().trim().min(1).max(50),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    verify(data.passcode);
    const sb = await admin();
    const { count } = await sb.from("teams").select("id", { count: "exact", head: true });
    const color = TEAM_PALETTE[(count ?? 0) % TEAM_PALETTE.length];
    const { data: row, error } = await sb
      .from("teams")
      .insert({ name: data.name, color })
      .select("id,name,color")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminUpdateTeamColor = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        passcode: z.string().min(1).max(100),
        teamId: z.string().uuid(),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    verify(data.passcode);
    const sb = await admin();
    const { error } = await sb.from("teams").update({ color: data.color }).eq("id", data.teamId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const adminRenameTeam = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        passcode: z.string().min(1).max(100),
        teamId: z.string().uuid(),
        name: z.string().trim().min(1).max(50),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    verify(data.passcode);
    const sb = await admin();
    const { data: row, error } = await sb
      .from("teams")
      .update({ name: data.name })
      .eq("id", data.teamId)
      .select("id,name")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminListAll = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ passcode: z.string().min(1).max(100) }).parse(data))
  .handler(async ({ data }) => {
    verify(data.passcode);
    const sb = await admin();
    const [teamsRes, tasksRes, subsRes] = await Promise.all([
      sb.from("teams").select("id,name,passcode,color,created_at").order("created_at"),
      sb.from("tasks").select("id,title,type,order_num,base_points,max_bonus_points,hidden").order("order_num"),

      sb
        .from("submissions")
        .select("*")
        .is("deleted_at", null)
        .order("submitted_at", { ascending: false }),
    ]);
    if (teamsRes.error) throw new Error(teamsRes.error.message);
    if (tasksRes.error) throw new Error(tasksRes.error.message);
    if (subsRes.error) throw new Error(subsRes.error.message);
    return {
      teams: teamsRes.data ?? [],
      tasks: tasksRes.data ?? [],
      submissions: subsRes.data ?? [],
    };
  });

export const adminSetTaskHidden = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        passcode: z.string().min(1).max(100),
        taskId: z.string().min(1).max(100),
        hidden: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    verify(data.passcode);
    const sb = await admin();
    const { error } = await sb.from("tasks").update({ hidden: data.hidden }).eq("id", data.taskId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
