import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { DashboardClient } from "@/components/dashboard-client";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?login=true");
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch recent generations
  const { data: generations } = await supabase
    .from("generations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Fetch recent video jobs
  const { data: videoJobs } = await supabase
    .from("video_jobs")
    .select("id, status, has_photo, heygen_video_url, error_message, created_at, completed_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <DashboardClient
      user={{ id: user.id, email: user.email || "" }}
      profile={profile || { tier: "expired", voice_id: null }}
      initialGenerations={generations || []}
      initialVideoJobs={videoJobs || []}
    />
  );
}
