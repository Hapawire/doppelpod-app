import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { checkFeatureAccess, incrementUsage } from "@/lib/api-gate";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Tier gate
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    let coworkVoiceChat = false;
    if (user) {
      const access = await checkFeatureAccess(supabase, user.id, "cowork");
      if (!access.allowed) {
        return NextResponse.json({ error: access.error, gated: true }, { status: 403 });
      }
      coworkVoiceChat = access.coworkVoiceChat ?? false;

      // Rate limit: 60 cowork messages per hour per user
      const rl = checkRateLimit(`cowork:${user.id}`, 60, 60 * 60 * 1000);
      if (!rl.allowed) {
        return NextResponse.json(
          { error: "Too many requests. Please wait before sending more messages." },
          { status: 429 }
        );
      }

      // Increment usage
      await incrementUsage(supabase, user.id, "cowork").catch(() => {});
    }

    const { messages, script, creatorStyle } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided." },
        { status: 400 }
      );
    }

    // Validate each message: role must be "user" or "assistant", content must be a non-empty string
    for (const m of messages) {
      if (m.role !== "user" && m.role !== "assistant") {
        return NextResponse.json({ error: "Invalid message role." }, { status: 400 });
      }
      if (typeof m.content !== "string" || !m.content.trim()) {
        return NextResponse.json({ error: "Invalid message content." }, { status: 400 });
      }
      if (m.content.length > 10000) {
        return NextResponse.json({ error: "Message too long." }, { status: 400 });
      }
    }

    // Sanitise user-supplied inputs injected into system prompt — cap length to limit injection surface
    const safeCreatorStyle = typeof creatorStyle === "string" ? creatorStyle.slice(0, 500) : "";
    const safeScript = typeof script === "string" ? script.slice(0, 5000) : "";

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Claude Cowork is not available on your current plan. Upgrade to Elite to unlock.", fallback: true },
        { status: 503 }
      );
    }

    const client = new Anthropic({ apiKey });

    const systemPrompt = `You are Claude Cowork — a creative writing partner for social media creators. You help refine scripts, posts, and hooks to maximize engagement.

Your role:
- Collaborate on the creator's script in real-time
- Suggest stronger hooks, CTAs, and emotional triggers
- Match the creator's voice and style
- Keep suggestions punchy, platform-native, and high-converting
- When asked, rewrite sections or propose alternatives
- Be concise — creators are busy

${safeCreatorStyle ? `<creator_style>${safeCreatorStyle}</creator_style>` : ""}
${safeScript ? `<current_script>${safeScript}</current_script>` : ""}

Respond in a conversational, energetic tone. Use short paragraphs. Bold key suggestions with **asterisks**.`;

    const anthropicMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ text, coworkVoiceChat });
  } catch (err) {
    console.error("[cowork] Error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
