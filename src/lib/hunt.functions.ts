import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dollyLines, scoreLine } from "@/lib/dolly";

const BUCKET = "submission-photos";
const PASSCODE_RE = /^\d{4}$/;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function verifyTeam(teamId: string, passcode: string) {
  const sb = await admin();
  const { data, error } = await sb
    .from("teams")
    .select("id,name,passcode")
    .eq("id", teamId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.passcode !== passcode) throw new Error("Invalid team credentials");
  return { id: data.id, name: data.name };
}

export const createTeam = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        name: z.string().trim().min(1).max(50),
        passcode: z.string().regex(PASSCODE_RE),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: row, error } = await sb
      .from("teams")
      .insert({ name: data.name, passcode: data.passcode })
      .select("id,name")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, name: row.name, passcode: data.passcode };
  });

export const joinTeam = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        name: z.string().trim().min(1).max(50),
        passcode: z.string().regex(PASSCODE_RE),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: row, error } = await sb
      .from("teams")
      .select("id,name,passcode")
      .eq("name", data.name)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Team not found");
    if (row.passcode !== data.passcode) throw new Error("Wrong passcode");
    return { id: row.id, name: row.name, passcode: data.passcode };
  });

export const requestPhotoUpload = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        teamId: z.string().uuid(),
        passcode: z.string().regex(PASSCODE_RE),
        taskId: z.string().min(1).max(80),
        ext: z.string().regex(/^[a-zA-Z0-9]{1,8}$/),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await verifyTeam(data.teamId, data.passcode);
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
        passcode: z.string().regex(PASSCODE_RE),
        taskId: z.string().min(1).max(80),
        photoUrl: z.string().url().nullable().optional(),
        notes: z.string().max(4000).nullable().optional(),
        bonusClaimed: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await verifyTeam(data.teamId, data.passcode);
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
        passcode: z.string().regex(PASSCODE_RE),
        taskId: z.string().min(1).max(80),
        answers: z.array(z.string().max(500)).length(dollyLines.length),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await verifyTeam(data.teamId, data.passcode);
    const sb = await admin();
    const results = data.answers.map((a, i) => scoreLine(a, dollyLines[i].answer));
    const correct = results.filter(Boolean).length;
    const awarded = Math.round((correct / dollyLines.length) * 100);
    const { data: sub, error } = await sb
      .from("submissions")
      .upsert(
        {
          team_id: data.teamId,
          task_id: data.taskId,
          notes: `Dolly score: ${correct}/${dollyLines.length}`,
          awarded_points: awarded,
          bonus_claimed: false,
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
