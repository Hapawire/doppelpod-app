import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { checkFeatureAccess } from "@/lib/api-gate";
import { getVoiceProvider } from "@/lib/voice-provider";

export async function POST(req: NextRequest) {
  try {
    // Tier gate
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const access = await checkFeatureAccess(supabase, user.id, "voice");
      if (!access.allowed) {
        return NextResponse.json({ error: access.error, gated: true }, { status: 403 });
      }
    }

    const { text, stability: rawStability } = await req.json();
    // Clamp stability 0–1, default 0.5
    const stability =
      typeof rawStability === "number"
        ? Math.max(0, Math.min(1, rawStability))
        : 0.5;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "No text provided." }, { status: 400 });
    }

    const provider = getVoiceProvider();

    // Use the user's cloned voice if available, otherwise fall back to preset
    let voiceId: string = process.env.ELEVENLABS_VOICE_ID || "cgSgspJ2msm6clMCkdW9";
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("elevenlabs_voice_id, fish_voice_id")
        .eq("id", user.id)
        .single();
      const clonedId = (profile?.[provider.profileColumn] ?? null) as string | null;
      if (clonedId) voiceId = clonedId;
    }

    console.log(`[text-to-speech] Generating via ${provider.name}, voice: ${voiceId}`);

    const audioBuffer = await provider.generateSpeech({ text, voiceId, stability });

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.byteLength),
      },
    });
  } catch (err) {
    console.error("[text-to-speech] Error:", err);
    return NextResponse.json({ error: "Failed to generate speech." }, { status: 500 });
  }
}
