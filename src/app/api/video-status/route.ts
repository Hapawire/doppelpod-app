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
        { error: "Video status is temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    const res = await fetch(
      `https://api.heygen.com/v3/videos/${videoId}`,
      {
        headers: { "x-api-key": apiKey },
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
    const status = data.data?.status; // "pending" | "processing" | "completed" | "failed"
    const videoUrl = data.data?.video_url;
    const thumbnailUrl = data.data?.thumbnail_url;
    // V3 uses failure_message/failure_code instead of a generic "error" field.
    const errorDetail = data.data?.failure_message || data.data?.failure_code;

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
