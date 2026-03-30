import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { posts, mode } = await req.json();

    if (!posts || typeof posts !== "string" || !posts.trim()) {
      return NextResponse.json(
        { error: "Please provide some posts to analyze." },
        { status: 400 }
      );
    }

    // Block authenticated but unconfirmed users
    try {
      const supabaseCheck = await createServerSupabaseClient();
      const { data: { user: authUser } } = await supabaseCheck.auth.getUser();
      if (authUser) {
        const { data: prof } = await supabaseCheck
          .from("profiles")
          .select("email_confirmed")
          .eq("id", authUser.id)
          .single();
        if (prof && !prof.email_confirmed) {
          return NextResponse.json(
            { error: "Please confirm your email before generating posts. Check your inbox for a confirmation link." },
            { status: 403 }
          );
        }
      }
    } catch {
      // If auth check fails, continue (allows unauthenticated demo usage)
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.log("[generate-twin] No ANTHROPIC_API_KEY set — using mock fallback");
      return NextResponse.json({ text: null, fallback: true });
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 256,
      system: `You are a ghostwriter. Your job is to write new social media posts that are indistinguishable from the original author. You do this by carefully studying their writing patterns — NOT by guessing or injecting a generic internet voice.

Before writing, silently analyze:
- Vocabulary level and word choices (formal, casual, technical, plain)
- Sentence length and structure (short punchy fragments? long flowing thoughts?)
- Punctuation habits (periods, ellipses, dashes, exclamation marks, or none?)
- Capitalization style (proper, all lowercase, ALL CAPS for emphasis?)
- Emoji usage (none, occasional, heavy?) — only use emojis if the author clearly does
- Tone (earnest, sarcastic, dry, enthusiastic, matter-of-fact?)
- How they open and close posts
- Any distinctive quirks or phrases

Then write exactly like them. If they write formally, write formally. If they never use emojis, don't add any. Match their ACTUAL style, not what you think social media should sound like.

You may subtly punch up the content — sharpen a point, tighten a sentence, make a hook land harder — but the result must still sound like the author wrote it on a good day, not like someone else rewrote it.

STRICT RULES:
- Match the LENGTH of the original. A one-liner stays a one-liner.
- NEVER invent details, examples, or claims not in the original.
- NEVER water down strong language into generic hype words.
- If the original is raw and blunt, keep it raw and blunt.
- Less is more. When in doubt, keep it short.`,
      messages: [
        {
          role: "user",
          content: `Here is a post written by the author:

${posts}

Rewrite this post in the author's voice but punched up — sharper, more engaging, better hooks. Stay on the SAME topic unless the author explicitly asks to change it. Keep the same length. Do not invent new details or claims. Preserve their exact tone, vocabulary, and profanity level. Output only the rewritten post.`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    console.log("[generate-twin] Claude response generated successfully");

    // Save generation for authenticated users
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user && text) {
        await supabase.from("generations").insert({
          user_id: user.id,
          input_text: posts,
          output_text: text,
        });
      }
    } catch (saveErr) {
      console.warn("[generate-twin] Failed to save generation:", saveErr);
    }

    return NextResponse.json({ text, fallback: false });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[generate-twin] Error:", errorMessage);
    return NextResponse.json(
      { error: `Claude API error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
