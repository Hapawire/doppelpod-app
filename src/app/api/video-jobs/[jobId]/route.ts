import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: job, error } = await supabase
    .from("video_jobs")
    .select("id, status, has_photo, heygen_video_url, error_message, created_at, completed_at")
    .eq("id", params.jobId)
    .eq("user_id", user.id)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}
