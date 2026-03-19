import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  try {
    const { messages, script, creatorStyle } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided." },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Claude Cowork requires an API key. Upgrade to Elite to unlock.", fallback: true },
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

${creatorStyle ? `Creator's style notes: ${creatorStyle}` : ""}
${script ? `Current working script:\n---\n${script}\n---` : ""}

Respond in a conversational, energetic tone. Use short paragraphs. Bold key suggestions with **asterisks**.`;

    const anthropicMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const response = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[cowork] Error:", msg);
    return NextResponse.json(
      { error: `Cowork error: ${msg}` },
      { status: 500 }
    );
  }
}
