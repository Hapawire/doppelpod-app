import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildVideoReadyEmail } from "@/lib/video-ready-email";
import { incrementUsage } from "@/lib/api-gate";

const AVATAR_TIMEOUT_MS  = 90 * 60 * 1000; // 90 minutes for avatar training phase
const VIDEO_TIMEOUT_MS   = 10 * 60 * 1000; // 10 minutes for video render phase
const GLOBAL_TIMEOUT_MS  = 3 * 60 * 60 * 1000; // 3-hour hard cap — force-fail any job older than this
const MAX_RETRIES = 3;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron] CRON_SECRET is not set — refusing to run");
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const heygenKey  = process.env.HEYGEN_API_KEY;
  const resendKey  = process.env.RESEND_API_KEY;
  const baseUrl    = process.env.NEXT_PUBLIC_SITE_URL || "https://www.doppelpod.io";

  if (!supabaseUrl || !supabaseKey || !heygenKey) {
    return NextResponse.json({ error: "Missing configuration" }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const resend   = resendKey ? new Resend(resendKey) : null;

  // Fetch active jobs (FIFO, limit 20 to avoid thundering herd)
  const { data: jobs, error } = await supabase
    .from("video_jobs")
    .select("*")
    .not("status", "in", '("completed","failed")')
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) {
    console.error("[process-video-jobs] Query failed:", error.message);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  let advanced = 0;
  let failed   = 0;

  for (const job of jobs || []) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await processJob(job, supabase as any, heygenKey, resend, baseUrl);
      if (result === "advanced") advanced++;
      if (result === "failed")   failed++;
    } catch (err) {
      console.error(`[process-video-jobs] Unhandled error for job ${job.id}:`, err);
    }
  }

  return NextResponse.json({ processed: jobs?.length || 0, advanced, failed });
}

async function processJob(
  job: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
  heygenKey: string,
  resend: Resend | null,
  baseUrl: string
): Promise<"advanced" | "failed" | "waiting"> {

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const update = async (fields: Record<string, unknown>) => {
    await db.from("video_jobs").update(fields).eq("id", job.id);
  };

  const fail = async (message: string) => {
    console.error(`[process-video-jobs] Job ${job.id} failed: ${message}`);
    await update({ status: "failed", error_message: message });
    return "failed" as const;
  };

  const retry = async (message: string) => {
    const retries = (job.retry_count as number) + 1;
    if (retries >= MAX_RETRIES) return fail(`Max retries exceeded. Last error: ${message}`);
    await update({ retry_count: retries });
    return "waiting" as const;
  };

  const now = Date.now();

  // Hard global timeout — catches jobs that have been stuck for any reason.
  // Use created_at so retries don't reset the clock (updated_at changes on every retry).
  const jobAge = now - new Date(job.created_at as string).getTime();
  if (jobAge > GLOBAL_TIMEOUT_MS) {
    return fail("Job exceeded maximum allowed time of 3 hours and was automatically cancelled.");
  }

  switch (job.status as string) {

    case "pending": {
      // Defensive: route should set status correctly, but handle just in case
      const nextStatus = job.has_photo ? "creating_avatar" : "generating_video";
      await update({ status: nextStatus });
      return "advanced";
    }

    case "creating_avatar": {
      console.log(`[process-video-jobs] Job ${job.id}: creating v3 photo avatar`);
      try {
        // V3 folds group-create + train into one call — POST /v3/avatars with
        // type:"photo" starts training asynchronously; no separate train call needed.
        const createRes = await fetch("https://api.heygen.com/v3/avatars", {
          method: "POST",
          headers: { "x-api-key": heygenKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "photo",
            name: `avatar_${(job.id as string).slice(0, 8)}`,
            file: { type: "asset_id", asset_id: job.heygen_image_key },
          }),
        });

        if (!createRes.ok) {
          const body = await createRes.text().catch(() => "");
          console.error(`[process-video-jobs] v3/avatars create failed ${createRes.status}:`, body);
          const userMsg = /face/i.test(body)
            ? "No face detected in your photo. Please upload a clear solo portrait with a visible face."
            : `HeyGen avatar create: ${createRes.status} ${body.slice(0, 200)}`;
          // 4xx = bad input, fail immediately. 5xx = transient, retry.
          return createRes.status < 500 ? fail(userMsg) : retry(userMsg);
        }

        const createData = await createRes.json();
        // The look-level id (lk_...) — this is what video generation needs as avatar_id,
        // not the group id. Reusing heygen_avatar_id column to store it.
        const lookId = createData?.data?.avatar_item?.id;
        if (!lookId) return fail(`No avatar_item.id in v3/avatars response: ${JSON.stringify(createData)}`);

        await update({ status: "awaiting_avatar", heygen_avatar_id: lookId });
        console.log(`[process-video-jobs] Job ${job.id}: avatar created, look_id=${lookId}, training in progress`);
        return "advanced";
      } catch (err) {
        return retry(`Avatar create network error: ${err}`);
      }
    }

    case "awaiting_avatar": {
      // Use created_at for timeout — updated_at resets on every retry call and would
      // prevent the timeout from ever triggering on a persistently-failing job.
      const elapsed = now - new Date(job.created_at as string).getTime();
      if (elapsed > AVATAR_TIMEOUT_MS) return fail("Photo avatar training timed out after 90 minutes.");

      const lookId = job.heygen_avatar_id as string | null;
      if (!lookId) {
        console.log(`[process-video-jobs] Job ${job.id}: awaiting_avatar with no look_id — restarting creating_avatar`);
        await update({ status: "creating_avatar", retry_count: 0 });
        return "advanced";
      }
      console.log(`[process-video-jobs] Job ${job.id}: polling look ${lookId}`);

      try {
        // V3 has a single training phase — poll the look itself, no separate
        // "group ready, now call train" step like V2 required.
        const res = await fetch(
          `https://api.heygen.com/v3/avatars/looks/${lookId}`,
          { headers: { "x-api-key": heygenKey } }
        );

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          console.warn(`[process-video-jobs] Look status poll failed ${res.status}:`, body);
          return "waiting";
        }

        const data = await res.json();
        const status = data?.data?.status as string;
        const heygenErr = data?.data?.error?.message || data?.data?.error?.code || "unknown";
        console.log(`[process-video-jobs] Job ${job.id}: look status=${status}`);

        if (status === "completed") {
          await update({ status: "generating_video" });
          return "advanced";
        } else if (status === "failed") {
          const userMsg = /face/i.test(heygenErr)
            ? "No face detected in your photo. Please upload a clear solo portrait with a visible face."
            : `Photo avatar training failed: ${heygenErr}`;
          return fail(userMsg);
        }
        // "processing" (normal) or "pending_consent" (shouldn't occur for photo
        // avatars — consent only applies to digital-twin/video-based avatars,
        // but treat defensively as still-waiting rather than failing).
        return "waiting";
      } catch (err) {
        console.warn(`[process-video-jobs] Training poll error:`, err);
        return "waiting";
      }
    }

    case "generating_video": {
      console.log(`[process-video-jobs] Job ${job.id}: generating video (v3)`);

      // V3 uses one flat "avatar" type for both a trained photo-avatar look and a
      // preset public avatar — no more talking_photo vs avatar distinction.
      const avatarId = job.has_photo && job.heygen_avatar_id
        ? (job.heygen_avatar_id as string)
        : "Daisy-inskirt-20220818";

      // A saved avatar reused directly (has_photo + heygen_avatar_id but no
      // heygen_image_key from this run) holds a pre-migration V2 group id, which
      // v3/videos will reject as an unknown avatar_id. Detect that case so we can
      // give a real fix instead of retrying an ID that can never succeed.
      const isSavedAvatarReuse = !!(job.has_photo && job.heygen_avatar_id && !job.heygen_image_key);

      const payload: Record<string, unknown> = {
        type: "avatar",
        avatar_id: avatarId,
        resolution: "720p",
        aspect_ratio: "9:16",
      };
      if (job.audio_url) {
        payload.audio_url = job.audio_url;
      } else {
        payload.script = (job.script as string).slice(0, 1500);
        payload.voice_id = "2d5b0e6cf36f460aa7fc47e3eee4ba54";
      }

      try {
        const res = await fetch("https://api.heygen.com/v3/videos", {
          method: "POST",
          headers: { "x-api-key": heygenKey, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          console.error(`[process-video-jobs] v3/videos generate failed ${res.status}:`, body);

          if (isSavedAvatarReuse && res.status >= 400 && res.status < 500) {
            return fail("Your saved avatar needs to be recreated after a HeyGen platform update. Please upload your photo again to keep using it.");
          }

          return retry(`HeyGen video generate: ${res.status} ${body.slice(0, 200)}`);
        }

        const data = await res.json();
        const videoId = data?.data?.video_id;
        if (!videoId) return fail("No video_id in generate response");

        await update({ status: "awaiting_video", heygen_video_id: videoId });
        return "advanced";
      } catch (err) {
        return retry(`Video generate network error: ${err}`);
      }
    }

    case "awaiting_video": {
      // Use updated_at here — unlike awaiting_avatar, this phase never calls retry(),
      // so updated_at is stable and represents when the job entered this phase.
      // The global 3-hour cap on created_at handles truly stuck jobs regardless.
      const elapsed = now - new Date(job.updated_at as string).getTime();
      if (elapsed > VIDEO_TIMEOUT_MS) return fail("Video generation timed out after 10 minutes.");

      const videoId = job.heygen_video_id as string;
      console.log(`[process-video-jobs] Job ${job.id}: polling video ${videoId}`);

      try {
        const res = await fetch(
          `https://api.heygen.com/v3/videos/${videoId}`,
          { headers: { "x-api-key": heygenKey } }
        );

        if (!res.ok) {
          console.warn(`[process-video-jobs] Video poll failed ${res.status}`);
          return "waiting";
        }

        const data = await res.json();
        const status = data?.data?.status as string;

        if (status === "completed") {
          const videoUrl = data?.data?.video_url as string;
          if (!videoUrl) return fail("No video_url in completed response");

          await update({ status: "completed", heygen_video_url: videoUrl, completed_at: new Date().toISOString() });

          // Save avatar ID to profile so user can reuse it
          if (job.heygen_avatar_id) {
            const { error: avatarSaveError } = await db
              .from("profiles")
              .update({ heygen_avatar_id: job.heygen_avatar_id as string })
              .eq("id", job.user_id as string);
            if (avatarSaveError) console.warn("[process-video-jobs] Avatar save to profile failed:", avatarSaveError.message);
          }

          // Increment usage
          await incrementUsage(db as Parameters<typeof incrementUsage>[0], job.user_id as string, "video").catch(
            (e: unknown) => console.warn("[process-video-jobs] Usage increment failed:", e)
          );

          // Send email notification
          if (resend && !job.email_sent) {
            const { data: profile } = await db
              .from("profiles")
              .select("email, comms_email")
              .eq("id", job.user_id)
              .single();

            if (profile?.email) {
              const sendTo = profile.comms_email ?? profile.email;
              try {
                const { subject, html } = buildVideoReadyEmail(videoUrl, `${baseUrl}/dashboard`);
                await resend.emails.send({
                  from: "DoppelPod <noreply@doppelpod.io>",
                  to: sendTo,
                  subject,
                  html,
                });
                await db.from("video_jobs").update({ email_sent: true }).eq("id", job.id);
                console.log(`[process-video-jobs] Email sent for job ${job.id}`);
              } catch (emailErr) {
                console.warn(`[process-video-jobs] Email failed for job ${job.id}:`, emailErr);
              }
            }
          }

          return "advanced";
        } else if (status === "failed") {
          const failureMsg = data?.data?.failure_message || data?.data?.failure_code || "unknown";
          return fail(`HeyGen video processing failed: ${failureMsg}`);
        }

        return "waiting";
      } catch (err) {
        console.warn(`[process-video-jobs] Video poll error:`, err);
        return "waiting";
      }
    }

    default:
      return "waiting";
  }
}
