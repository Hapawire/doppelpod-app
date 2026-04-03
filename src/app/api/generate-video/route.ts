import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { checkFeatureAccess } from "@/lib/api-gate";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await checkFeatureAccess(supabase, user.id, "video");
    if (!access.allowed) {
      return NextResponse.json({ error: access.error, gated: true }, { status: 403 });
    }

    const formData = await req.formData();
    const script = formData.get("script") as string | null;
    const avatarPhoto = formData.get("avatar") as File | null;

    if (!script || !script.trim()) {
      return NextResponse.json({ error: "No script provided." }, { status: 400 });
    }

    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: "Video generation not configured. Add HEYGEN_API_KEY to .env.local.",
        fallback: true,
      }, { status: 503 });
    }

    // Upload photo asset synchronously if provided
    let imageKey: string | undefined;
    let hasPhoto = false;

    if (avatarPhoto && avatarPhoto.size > 0) {
      console.log("[generate-video] Uploading photo asset...");
      const photoBuffer = Buffer.from(await avatarPhoto.arrayBuffer());
      const assetRes = await fetch("https://upload.heygen.com/v1/asset", {
        method: "POST",
        headers: { "X-Api-Key": apiKey, "Content-Type": avatarPhoto.type },
        body: photoBuffer,
      });

      if (assetRes.ok) {
        const assetData = await assetRes.json();
        const assetUrl: string | undefined = assetData.data?.url;
        imageKey = assetData.data?.id
          ?? assetData.data?.asset_id
          ?? (assetUrl ? assetUrl.split("/").slice(-2, -1)[0] : undefined);
        if (imageKey) hasPhoto = true;
        console.log("[generate-video] Photo uploaded, image_key:", imageKey);
      } else {
        const errBody = await assetRes.text().catch(() => "");
        console.warn("[generate-video] Photo upload failed:", assetRes.status, errBody);
        // Fall through to default avatar
      }
    }

    // Generate ElevenLabs audio if configured
    let audioUrl: string | undefined;
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    const elevenLabsVoiceId = process.env.ELEVENLABS_VOICE_ID || "TX3LPaxmHKxFdv7VOQHJ";

    if (elevenLabsKey) {
      try {
        const ttsRes = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "xi-api-key": elevenLabsKey },
            body: JSON.stringify({
              text: script.slice(0, 1000),
              voice_settings: { stability: 0.5, similarity_boost: 0.75 },
            }),
          }
        );
        if (ttsRes.ok) {
          const audioBuffer = await ttsRes.arrayBuffer();
          const uploadRes = await fetch("https://upload.heygen.com/v1/asset", {
            method: "POST",
            headers: { "X-Api-Key": apiKey, "Content-Type": "audio/mpeg" },
            body: audioBuffer,
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            audioUrl = uploadData.data?.url;
            console.log("[generate-video] Audio uploaded:", audioUrl);
          } else {
            console.warn("[generate-video] Audio upload failed:", uploadRes.status);
          }
        } else {
          console.warn("[generate-video] ElevenLabs TTS failed:", ttsRes.status);
        }
      } catch (e) {
        console.warn("[generate-video] ElevenLabs audio failed:", e);
      }
    }

    // Queue job
    const initialStatus = hasPhoto ? "creating_avatar" : "generating_video";
    const { data: job, error: insertError } = await supabase
      .from("video_jobs")
      .insert({
        user_id: user.id,
        status: initialStatus,
        has_photo: hasPhoto,
        heygen_image_key: imageKey ?? null,
        script: script.slice(0, 2000),
        audio_url: audioUrl ?? null,
        retry_count: 0,
      })
      .select("id")
      .single();

    if (insertError || !job) {
      console.error("[generate-video] Job insert failed:", insertError?.message);
      return NextResponse.json({ error: "Failed to queue video job." }, { status: 500 });
    }

    console.log("[generate-video] Job queued:", job.id, "status:", initialStatus);
    return NextResponse.json({ jobId: job.id });
  } catch (err) {
    console.error("[generate-video] Error:", err);
    return NextResponse.json({ error: "Failed to queue video." }, { status: 500 });
  }
}
