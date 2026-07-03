import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dollyLines, scoreLine } from "@/lib/dolly";

const BUCKET = "submission-photos";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function verifyTeam(teamId: string) {
  const sb = await admin();
  const { data, error } = await sb
    .from("teams")
    .select("id,name")
    .eq("id", teamId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Unknown team");
  return { id: data.id, name: data.name };
}

const TEAM_PALETTE = [
  "#7a2e3e", "#d4a847", "#1a6b72", "#c1440e", "#4a6741",
  "#8b4a6b", "#2f5f8f", "#c96f4a", "#4a8b8b", "#8b7355",
];

export const createTeam = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ name: z.string().trim().min(1).max(50) }).parse(data),
  )
  .handler(async ({ data }) => {
    const sb = await admin();
    const { count } = await sb.from("teams").select("id", { count: "exact", head: true });
    const color = TEAM_PALETTE[(count ?? 0) % TEAM_PALETTE.length];
    const { data: row, error } = await sb
      .from("teams")
      .insert({ name: data.name, color })
      .select("id,name")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, name: row.name };
  });


export const joinTeam = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ name: z.string().trim().min(1).max(50) }).parse(data),
  )
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: row, error } = await sb
      .from("teams")
      .select("id,name")
      .eq("name", data.name)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Team not found");
    return { id: row.id, name: row.name };
  });

export const requestPhotoUpload = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        teamId: z.string().uuid(),
        taskId: z.string().min(1).max(80),
        ext: z.string().regex(/^[a-zA-Z0-9]{1,8}$/),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await verifyTeam(data.teamId);
    const sb = await admin();
    const path = `${data.teamId}/${data.taskId}-${Date.now()}.${data.ext}`;
    const { data: signed, error } = await sb.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
    return { path, token: signed.token, signedUrl: signed.signedUrl, publicUrl: pub.publicUrl };
  });

export const saveSubmission = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        teamId: z.string().uuid(),
        taskId: z.string().min(1).max(80),
        photoUrl: z.string().url().nullable().optional(),
        notes: z.string().max(4000).nullable().optional(),
        bonusClaimed: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await verifyTeam(data.teamId);
    const sb = await admin();
    const { data: task, error: taskErr } = await sb
      .from("tasks")
      .select("base_points,max_bonus_points")
      .eq("id", data.taskId)
      .maybeSingle();
    if (taskErr) throw new Error(taskErr.message);
    if (!task) throw new Error("Unknown task");
    const awarded =
      task.base_points + (data.bonusClaimed ? task.max_bonus_points ?? 0 : 0);
    const { data: row, error } = await sb
      .from("submissions")
      .upsert(
        {
          team_id: data.teamId,
          task_id: data.taskId,
          photo_url: data.photoUrl ?? null,
          notes: data.notes ?? null,
          bonus_claimed: !!data.bonusClaimed,
          awarded_points: awarded,
        },
        { onConflict: "team_id,task_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const saveDolly = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        teamId: z.string().uuid(),
        taskId: z.string().min(1).max(80),
        answers: z.array(z.string().max(500)).length(dollyLines.length),
        photoUrl: z.string().url().nullable().optional(),
        bonusClaimed: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await verifyTeam(data.teamId);
    const sb = await admin();
    const results = data.answers.map((a, i) => scoreLine(a, dollyLines[i].answer));
    const correct = results.filter(Boolean).length;
    const base = Math.round((correct / dollyLines.length) * 100);
    const { data: task } = await sb
      .from("tasks")
      .select("max_bonus_points")
      .eq("id", data.taskId)
      .maybeSingle();
    const bonus = data.bonusClaimed ? task?.max_bonus_points ?? 0 : 0;
    const awarded = base + bonus;
    const { data: sub, error } = await sb
      .from("submissions")
      .upsert(
        {
          team_id: data.teamId,
          task_id: data.taskId,
          notes: `Dolly score: ${correct}/${dollyLines.length}`,
          awarded_points: awarded,
          bonus_claimed: !!data.bonusClaimed,
          photo_url: data.photoUrl ?? null,
        },
        { onConflict: "team_id,task_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    await sb.from("dolly_answers").delete().eq("submission_id", sub.id);
    await sb.from("dolly_answers").insert(
      data.answers.map((a, i) => ({
        submission_id: sub.id,
        line_num: i + 1,
        answer_text: a,
        is_correct: results[i],
      })),
    );
    return { submission: sub, results, correct };
  });

