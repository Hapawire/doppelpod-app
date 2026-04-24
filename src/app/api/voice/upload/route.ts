import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 10 uploads per hour per user
    const rl = checkRateLimit(`voice-upload:${user.id}`, 10, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many uploads. Please wait before uploading again." },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("audio") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No audio file provided." },
        { status: 400 }
      );
    }

    // Normalize MIME type — strip codec parameters (e.g. "audio/webm;codecs=opus" -> "audio/webm")
    // Browser MediaRecorder and some OS APIs append codec params that break exact-match checks.
    const baseMimeType = (file.type || "").split(";")[0].trim().toLowerCase();

    // Validate file type — check base MIME type (client-supplied, not trusted alone)
    const allowedTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/wave",
      "audio/x-wav",
      "audio/ogg",
      "audio/webm",
      "audio/mp4",
      "audio/m4a",
      "audio/x-m4a",
      "audio/aac",       // Safari MediaRecorder may report this
      "audio/x-aac",
      "video/mp4",       // QuickTime .m4a sometimes reports as video/mp4
    ];
    if (!allowedTypes.includes(baseMimeType)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an audio file (MP3, WAV, M4A, OGG, or WebM)." },
        { status: 400 }
      );
    }

    // Magic-number validation — read first 36 bytes to verify actual file signature.
    // (file.type is client-supplied and can be spoofed)
    // We read 36 bytes because QuickTime .m4a and Safari MediaRecorder MP4 output
    // may begin with a small "free" or "wide" box (8 bytes) before the "ftyp" box,
    // so checking only bytes [4:7] is not reliable.
    const headerBytes = new Uint8Array(await file.slice(0, 36).arrayBuffer());
    const isMp3 =
      (headerBytes[0] === 0xff && (headerBytes[1] & 0xe0) === 0xe0) || // MPEG sync
      (headerBytes[0] === 0x49 && headerBytes[1] === 0x44 && headerBytes[2] === 0x33); // ID3
    const isAac =
      (headerBytes[0] === 0xff && (headerBytes[1] & 0xf6) === 0xf0); // ADTS AAC sync
    const isWav =
      headerBytes[0] === 0x52 && headerBytes[1] === 0x49 &&
      headerBytes[2] === 0x46 && headerBytes[3] === 0x46; // RIFF
    const isOgg =
      headerBytes[0] === 0x4f && headerBytes[1] === 0x67 &&
      headerBytes[2] === 0x67 && headerBytes[3] === 0x53; // OggS
    const isWebM =
      headerBytes[0] === 0x1a && headerBytes[1] === 0x45 &&
      headerBytes[2] === 0xdf && headerBytes[3] === 0xa3; // EBML/WebM
    // MP4/M4A: scan first 36 bytes for "ftyp" (0x66 0x74 0x79 0x70).
    // QuickTime .m4a and Safari MediaRecorder often prepend a "free" or "wide"
    // box before "ftyp", so the marker may not be exactly at offset 4.
    const ftyp = [0x66, 0x74, 0x79, 0x70];
    const isMp4 = (() => {
      for (let i = 0; i <= headerBytes.length - 4; i++) {
        if (
          headerBytes[i]     === ftyp[0] &&
          headerBytes[i + 1] === ftyp[1] &&
          headerBytes[i + 2] === ftyp[2] &&
          headerBytes[i + 3] === ftyp[3]
        ) return true;
      }
      return false;
    })();
    if (!isMp3 && !isAac && !isWav && !isOgg && !isWebM && !isMp4) {
      return NextResponse.json(
        { error: "Invalid file. Please upload a valid audio file (MP3, WAV, M4A, OGG, or WebM)." },
        { status: 400 }
      );
    }

    // Max 25MB
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum 25MB." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() || "mp3";
    const filePath = `voice-samples/${user.id}/sample.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("voice-samples")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("[voice-upload] Storage error:", uploadError.message);
      return NextResponse.json(
        { error: "Failed to upload audio file." },
        { status: 500 }
      );
    }

    // Save voice reference in profile — use service role (user-auth client
    // can only update safe columns; voice_id is permitted but use admin for consistency)
    const admin = createAdminSupabaseClient();
    const { error: updateError } = await admin
      .from("profiles")
      .update({ voice_id: filePath, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (updateError) {
      console.error("[voice-upload] Profile update error:", updateError.message);
      return NextResponse.json(
        { error: "Failed to update profile." },
        { status: 500 }
      );
    }

    return NextResponse.json({ voiceId: filePath });
  } catch (err) {
    console.error("[voice-upload] Error:", err);
    return NextResponse.json(
      { error: "Failed to upload voice sample." },
      { status: 500 }
    );
  }
}
