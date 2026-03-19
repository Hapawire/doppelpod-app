import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
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

    // If user uploaded a photo, create an instant avatar first
    let avatarId: string | undefined;
    if (avatarPhoto && avatarPhoto.size > 0) {
      console.log("[generate-video] Creating instant avatar from uploaded photo...");
      const photoBuffer = Buffer.from(await avatarPhoto.arrayBuffer());
      const photoFormData = new FormData();
      photoFormData.append(
        "image",
        new Blob([photoBuffer], { type: avatarPhoto.type }),
        avatarPhoto.name
      );

      const avatarRes = await fetch(
        "https://api.heygen.com/v1/photo_avatar.create",
        {
          method: "POST",
          headers: { "X-Api-Key": apiKey },
          body: photoFormData,
        }
      );

      if (avatarRes.ok) {
        const avatarData = await avatarRes.json();
        avatarId = avatarData.data?.photo_avatar_id;
        console.log("[generate-video] Created avatar:", avatarId);
      } else {
        console.warn(
          "[generate-video] Avatar creation failed, using default. Status:",
          avatarRes.status
        );
      }
    }

    // Use ElevenLabs voice if configured, otherwise HeyGen default
    const elevenLabsVoiceId = process.env.ELEVENLABS_VOICE_ID || "TX3LPaxmHKxFdv7VOQHJ";

    // Create video generation task
    console.log("[generate-video] Creating video task...");
    const videoPayload: Record<string, unknown> = {
      video_inputs: [
        {
          character: avatarId
            ? { type: "photo_avatar", photo_avatar_id: avatarId }
            : {
                type: "avatar",
                avatar_id: "Daisy-inskirt-20220818",
                avatar_style: "normal",
              },
          voice: {
            type: "elevenlabs",
            voice_id: elevenLabsVoiceId,
            input_text: script.slice(0, 1500),
          },
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
    return NextResponse.json({ videoId });
  } catch (err) {
    console.error("[generate-video] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate video." },
      { status: 500 }
    );
  }
}
