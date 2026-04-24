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
      console.log(`[process-video-jobs] Job ${job.id}: creating avatar group`);
      try {
        // Step 1: Create avatar group from uploaded image
        const createRes = await fetch("https://api.heygen.com/v2/photo_avatar/avatar_group/create", {
          method: "POST",
          headers: { "X-Api-Key": heygenKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `avatar_${(job.id as string).slice(0, 8)}`,
            image_key: job.heygen_image_key,
          }),
        });

        if (!createRes.ok) {
          const body = await createRes.text().catch(() => "");
          console.error(`[process-video-jobs] Avatar group create failed ${createRes.status}:`, body);
          const userMsg = /face/i.test(body)
            ? "No face detected in your photo. Please upload a clear solo portrait with a visible face."
            : `HeyGen avatar_group/create: ${createRes.status} ${body.slice(0, 200)}`;
          // 4xx = bad input, fail immediately. 5xx = transient, retry.
          return createRes.status < 500 ? fail(userMsg) : retry(userMsg);
        }

        const createData = await createRes.json();
        const groupId = createData?.data?.group_id ?? createData?.data?.id;
        if (!groupId) return fail(`No group_id in avatar group create response: ${JSON.stringify(createData)}`);

        // Store group_id immediately — train is called later once group is ready
        await update({ status: "awaiting_avatar", heygen_avatar_id: groupId, heygen_generation_id: null });
        console.log(`[process-video-jobs] Job ${job.id}: group created, group_id=${groupId}, waiting for group to be ready before training`);
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

      const groupId = job.heygen_avatar_id as string | null;
      if (!groupId) {
        console.log(`[process-video-jobs] Job ${job.id}: awaiting_avatar with no group_id — restarting creating_avatar`);
        await update({ status: "creating_avatar", retry_count: 0, heygen_generation_id: null });
        return "advanced";
      }
      const trainCalled = !!(job.heygen_generation_id as string | null);
      console.log(`[process-video-jobs] Job ${job.id}: polling group ${groupId}, trainCalled=${trainCalled}`);

      try {
        const res = await fetch(
          `https://api.heygen.com/v2/photo_avatar/train/status/${groupId}`,
          { headers: { "X-Api-Key": heygenKey } }
        );

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          console.warn(`[process-video-jobs] Train status poll failed ${res.status}:`, body);
          return "waiting";
        }

        const data = await res.json();
        const status = data?.data?.status as string;
        // Extract error message from whichever field HeyGen uses
        const heygenErr = data?.data?.error_msg || data?.data?.message || data?.data?.error || "unknown";
        console.log(`[process-video-jobs] Job ${job.id}: train/status=${status}, trainCalled=${trainCalled}`);

        if (!trainCalled) {
          // Phase 1: "empty" = group ready, call train now. "pending" = still processing, wait.
          // "failed" here means group creation itself failed (e.g. no face detected in photo).
          if (status === "failed" || status === "error") {
            const userMsg = /face/i.test(heygenErr)
              ? "No face detected in your photo. Please upload a clear solo portrait with a visible face."
              : `Avatar setup failed: ${heygenErr}`;
            return fail(userMsg);
          }

          if (status === "empty" || status === "ready") {
            const trainRes = await fetch("https://api.heygen.com/v2/photo_avatar/train", {
              method: "POST",
              headers: { "X-Api-Key": heygenKey, "Content-Type": "application/json" },
              body: JSON.stringify({ group_id: groupId }),
            });
            const trainBody = await trainRes.text();
            console.log(`[process-video-jobs] Job ${job.id}: train response ${trainRes.status}:`, trainBody);

            if (!trainRes.ok) {
              // Check if the train rejection itself is a face-detection error
              const trainErrMsg = trainBody.slice(0, 400);
              const userMsg = /face/i.test(trainErrMsg)
                ? "No face detected in your photo. Please upload a clear solo portrait with a visible face."
                : `HeyGen train: ${trainRes.status} ${trainErrMsg}`;
              // Hard fail on 4xx (bad image), retry on 5xx (transient)
              return trainRes.status < 500 ? fail(userMsg) : retry(userMsg);
            }

            const flowId = JSON.parse(trainBody)?.data?.data?.flow_id ?? "started";
            await update({ heygen_generation_id: flowId });
            return "waiting";
          }
          // Still pending — group not ready yet
          return "waiting";
        } else {
          // Phase 2: train was called, waiting for training to complete
          if (status === "ready") {
            await update({ status: "generating_video" });
            return "advanced";
          } else if (status === "failed" || status === "error") {
            const userMsg = /face/i.test(heygenErr)
              ? "No face detected in your photo. Please upload a clear solo portrait with a visible face."
              : `Photo avatar training failed: ${heygenErr}`;
            return fail(userMsg);
          }
          return "waiting";
        }
      } catch (err) {
        console.warn(`[process-video-jobs] Training poll error:`, err);
        return "waiting";
      }
    }

    case "generating_video": {
      console.log(`[process-video-jobs] Job ${job.id}: generating video`);

      const character = job.has_photo && job.heygen_avatar_id
        ? { type: "talking_photo", talking_photo_id: job.heygen_avatar_id }
        : { type: "avatar", avatar_id: "Daisy-inskirt-20220818", avatar_style: "normal" };

      const voice = job.audio_url
        ? { type: "audio", audio_url: job.audio_url }
        : { type: "text", input_text: (job.script as string).slice(0, 1500), voice_id: "2d5b0e6cf36f460aa7fc47e3eee4ba54" };

      const payload = {
        video_inputs: [{ character, voice }],
        dimension: { width: 720, height: 1280 },
        aspect_ratio: "9:16",
      };

      try {
        const res = await fetch("https://api.heygen.com/v2/video/generate", {
          method: "POST",
          headers: { "X-Api-Key": heygenKey, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          console.error(`[process-video-jobs] Video generate failed ${res.status}:`, body);
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
          `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
          { headers: { "X-Api-Key": heygenKey } }
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
          return fail(`HeyGen video processing failed`);
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
