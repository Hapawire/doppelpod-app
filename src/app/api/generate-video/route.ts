import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { checkFeatureAccess } from "@/lib/api-gate";
import { getVoiceProvider } from "@/lib/voice-provider";

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
    const savedAvatarId = formData.get("savedAvatarId") as string | null;

    if (!script || !script.trim()) {
      return NextResponse.json({ error: "No script provided." }, { status: 400 });
    }

    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: "Video generation is temporarily unavailable. Please try again later.",
        fallback: true,
      }, { status: 503 });
    }

    // If using saved avatar, look it up server-side from the user's own profile
    // — never trust the client-supplied value directly
    let verifiedAvatarId: string | null = null;
    if (savedAvatarId) {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("heygen_avatar_id")
        .eq("id", user.id)
        .single();
      verifiedAvatarId = profileRow?.heygen_avatar_id ?? null;
      if (!verifiedAvatarId) {
        return NextResponse.json({ error: "No saved avatar found. Please upload a photo." }, { status: 400 });
      }
    }

    // Shared TTS helper — uses active provider, falls back gracefully
    const generateAudioUrl = async (): Promise<string | undefined> => {
      try {
        const provider = getVoiceProvider();
        // Use the user's cloned voice if available, otherwise use preset
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("elevenlabs_voice_id, fish_voice_id")
          .eq("id", user.id)
          .single();
        const clonedVoiceId = (profileRow?.[provider.profileColumn] ?? null) as string | null;
        const voiceId = clonedVoiceId || process.env.ELEVENLABS_VOICE_ID || "TX3LPaxmHKxFdv7VOQHJ";

        console.log(`[generate-video] TTS via ${provider.name}, voice: ${voiceId}`);
        const audioBuffer = await provider.generateSpeech({ text: script.slice(0, 1000), voiceId });

        // V3 asset upload is multipart/form-data to api.heygen.com (was a raw-binary
        // POST to upload.heygen.com/v1/asset in V2) — response is also flat now,
        // no more { data: { url } } wrapper.
        const audioForm = new FormData();
        audioForm.append("file", new Blob([audioBuffer], { type: "audio/mpeg" }), "speech.mp3");
        const uploadRes = await fetch("https://api.heygen.com/v3/assets", {
          method: "POST",
          headers: { "x-api-key": apiKey },
          body: audioForm,
        });
        if (uploadRes.ok) {
          return (await uploadRes.json()).url;
        }
        console.warn("[generate-video] HeyGen audio upload failed:", uploadRes.status);
      } catch (e) {
        console.warn("[generate-video] TTS audio failed:", e);
      }
      return undefined;
    };

    if (verifiedAvatarId) {
      console.log("[generate-video] Using saved avatar:", verifiedAvatarId);

      const audioUrl = await generateAudioUrl();

      const { data: job, error: insertError } = await supabase
        .from("video_jobs")
        .insert({
          user_id: user.id,
          status: "generating_video",
          has_photo: true,
          heygen_avatar_id: verifiedAvatarId,
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

      console.log("[generate-video] Saved-avatar job queued:", job.id);
      return NextResponse.json({ jobId: job.id });
    }

    // Upload photo asset synchronously if a new photo was provided
    let imageKey: string | undefined;
    let hasPhoto = false;

    if (avatarPhoto && avatarPhoto.size > 0) {
      console.log("[generate-video] Uploading photo asset...");
      const photoBuffer = Buffer.from(await avatarPhoto.arrayBuffer());
      const photoForm = new FormData();
      photoForm.append("file", new Blob([photoBuffer], { type: avatarPhoto.type }), avatarPhoto.name || "photo.jpg");
      const assetRes = await fetch("https://api.heygen.com/v3/assets", {
        method: "POST",
        headers: { "x-api-key": apiKey },
        body: photoForm,
      });

      if (assetRes.ok) {
        // V3 response is flat: { asset_id, url, mime_type, size_bytes } — no data wrapper.
        // We pass this asset_id straight into v3/avatars { file: { type: "asset_id", asset_id } }
        // when creating the photo avatar, so the DB column keeps its old name but now
        // holds a v3 asset_id rather than a v2 image_key.
        const assetData = await assetRes.json();
        imageKey = assetData.asset_id;
        if (imageKey) hasPhoto = true;
        console.log("[generate-video] Photo uploaded, asset_id:", imageKey);
      } else {
        const errBody = await assetRes.text().catch(() => "");
        console.warn("[generate-video] Photo upload failed:", assetRes.status, errBody);
        // Fall through to default avatar
      }
    }

    // Generate TTS audio via active provider
    const audioUrl = await generateAudioUrl();
    if (audioUrl) console.log("[generate-video] Audio uploaded:", audioUrl);

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
