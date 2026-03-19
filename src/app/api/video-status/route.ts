import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const videoId = req.nextUrl.searchParams.get("videoId");

    if (!videoId) {
      return NextResponse.json(
        { error: "No videoId provided." },
        { status: 400 }
      );
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

    return NextResponse.json({ status, videoUrl, thumbnailUrl });
  } catch (err) {
    console.error("[video-status] Error:", err);
    return NextResponse.json(
      { error: "Failed to check video status." },
      { status: 500 }
    );
  }
}
