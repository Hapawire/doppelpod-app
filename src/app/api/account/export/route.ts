import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.email_confirmed_at) {
      return NextResponse.json(
        { error: "Please confirm your email before exporting data." },
        { status: 403 }
      );
    }

    // Fetch all user data
    const [profileRes, generationsRes, usageRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("generations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("usage_tracking")
        .select("*")
        .eq("user_id", user.id),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      account: {
        email: user.email,
        created_at: user.created_at,
      },
      profile: profileRes.data || null,
      generations: generationsRes.data || [],
      usage: usageRes.data || [],
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="doppelpod-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    console.error("[account/export] Error:", err);
    return NextResponse.json(
      { error: "Failed to export data." },
      { status: 500 }
    );
  }
}
