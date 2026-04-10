import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const videoId = req.nextUrl.searchParams.get("videoId");

    if (!videoId) {
      return NextResponse.json(
        { error: "No videoId provided." },
        { status: 400 }
      );
    }

    // Ownership check — verify this video belongs to the requesting user
    const { data: job } = await supabase
      .from("video_jobs")
      .select("id")
      .eq("heygen_video_id", videoId)
      .eq("user_id", user.id)
      .single();

    if (!job) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "HEYGEN_API_KEY not configured." },
        { status: 503 }
      );
    }

    const res = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
      {
        headers: { "X-Api-Key": apiKey },
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("[video-status] HeyGen error:", res.status, errText);
      return NextResponse.json(
        { error: `HeyGen status error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const status = data.data?.status; // "processing" | "completed" | "failed"
    const videoUrl = data.data?.video_url;
    const thumbnailUrl = data.data?.thumbnail_url;
    const errorDetail = data.data?.error;

    if (status === "failed") {
      console.error("[video-status] Video failed:", JSON.stringify(data.data));
    }

    return NextResponse.json({ status, videoUrl, thumbnailUrl, error: errorDetail });
  } catch (err) {
    console.error("[video-status] Error:", err);
    return NextResponse.json(
      { error: "Failed to check video status." },
      { status: 500 }
    );
  }
}
