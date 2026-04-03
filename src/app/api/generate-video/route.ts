import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { checkFeatureAccess, incrementUsage } from "@/lib/api-gate";

let lastUserId: string | null = null; // Track for usage increment after success

export async function POST(req: NextRequest) {
  try {
    // Tier gate
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const access = await checkFeatureAccess(supabase, user.id, "video");
      if (!access.allowed) {
        return NextResponse.json({ error: access.error, gated: true }, { status: 403 });
      }
      lastUserId = user.id;
    }

    const formData = await req.formData();
    const script = formData.get("script") as string | null;
    const avatarPhoto = formData.get("avatar") as File | null;

    if (!script || !script.trim()) {
      return NextResponse.json(
        { error: "No script provided." },
        { status: 400 }
      );
    }

    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Video generation not configured. Add HEYGEN_API_KEY to .env.local to enable real avatar videos.",
          fallback: true,
        },
        { status: 503 }
      );
    }

    // If user uploaded a photo, upload it as an asset and use as talking_photo
    let talkingPhotoUrl: string | undefined;
    if (avatarPhoto && avatarPhoto.size > 0) {
      console.log("[generate-video] Uploading photo as asset for talking_photo...");
      const photoBuffer = Buffer.from(await avatarPhoto.arrayBuffer());

      const uploadRes = await fetch("https://upload.heygen.com/v1/asset", {
        method: "POST",
        headers: {
          "X-Api-Key": apiKey,
          "Content-Type": avatarPhoto.type || "image/jpeg",
        },
        body: photoBuffer,
      });

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        talkingPhotoUrl = uploadData.data?.url;
        console.log("[generate-video] Photo uploaded, talking_photo url:", talkingPhotoUrl);
      } else {
        const errBody = await uploadRes.text().catch(() => "");
        console.warn("[generate-video] Photo upload failed, using default. Status:", uploadRes.status, errBody);
      }
    }

    // Generate audio via ElevenLabs if configured, then pass to HeyGen as audio input
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    const elevenLabsVoiceId = process.env.ELEVENLABS_VOICE_ID || "TX3LPaxmHKxFdv7VOQHJ";
    let audioUrl: string | undefined;

    if (elevenLabsKey) {
      console.log("[generate-video] Generating ElevenLabs audio for HeyGen...");
      try {
        const ttsRes = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "xi-api-key": elevenLabsKey,
            },
            body: JSON.stringify({
              text: script.slice(0, 1000),
              voice_settings: { stability: 0.5, similarity_boost: 0.75 },
            }),
          }
        );
        if (ttsRes.ok) {
          const audioBuffer = await ttsRes.arrayBuffer();
          // Upload audio to HeyGen (raw binary, not FormData)
          const uploadRes = await fetch(
            "https://upload.heygen.com/v1/asset",
            {
              method: "POST",
              headers: {
                "X-Api-Key": apiKey,
                "Content-Type": "audio/mpeg",
              },
              body: audioBuffer,
            }
          );
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            audioUrl = uploadData.data?.url;
            console.log("[generate-video] Audio uploaded to HeyGen:", audioUrl);
          } else {
            const errBody = await uploadRes.text().catch(() => "");
            console.warn("[generate-video] Audio upload to HeyGen failed:", uploadRes.status, errBody);
          }
        } else {
          console.warn("[generate-video] ElevenLabs TTS failed:", ttsRes.status);
        }
      } catch (e) {
        console.warn("[generate-video] ElevenLabs audio generation failed:", e);
      }
    }

    // Build voice config: use uploaded audio if available, otherwise HeyGen's built-in TTS
    const voiceConfig = audioUrl
      ? { type: "audio", audio_url: audioUrl }
      : { type: "text", input_text: script.slice(0, 1500), voice_id: "2d5b0e6cf36f460aa7fc47e3eee4ba54" };

    // Create video generation task
    console.log("[generate-video] Creating video task...");
    const videoPayload: Record<string, unknown> = {
      video_inputs: [
        {
          character: talkingPhotoUrl
            ? { type: "talking_photo", talking_photo_id: talkingPhotoUrl }
            : {
                type: "avatar",
                avatar_id: "Daisy-inskirt-20220818",
                avatar_style: "normal",
              },
          voice: voiceConfig,
        },
      ],
      dimension: { width: 720, height: 1280 },
      aspect_ratio: "9:16",
    };

    const videoRes = await fetch("https://api.heygen.com/v2/video/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify(videoPayload),
    });

    if (!videoRes.ok) {
      const errText = await videoRes.text();
      console.error("[generate-video] HeyGen error:", videoRes.status, errText);
      return NextResponse.json(
        { error: `HeyGen API error: ${videoRes.status}` },
        { status: videoRes.status }
      );
    }

    const videoData = await videoRes.json();
    const videoId = videoData.data?.video_id;

    if (!videoId) {
      return NextResponse.json(
        { error: "No video ID returned from HeyGen" },
        { status: 500 }
      );
    }

    console.log("[generate-video] Video task created:", videoId);

    // Increment video usage count
    if (lastUserId) {
      await incrementUsage(supabase, lastUserId, "video").catch((e) =>
        console.warn("[generate-video] Usage increment failed:", e)
      );
    }

    return NextResponse.json({ videoId });
  } catch (err) {
    console.error("[generate-video] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate video." },
      { status: 500 }
    );
  }
}
