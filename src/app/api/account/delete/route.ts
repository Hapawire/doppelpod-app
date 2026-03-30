import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: prof } = await supabase
      .from("profiles")
      .select("email_confirmed")
      .eq("id", user.id)
      .single();
    if (!prof?.email_confirmed) {
      return NextResponse.json(
        { error: "Please confirm your email before deleting your account." },
        { status: 403 }
      );
    }

    // Delete user data from app tables first
    await supabase.from("generations").delete().eq("user_id", user.id);
    await supabase.from("usage_tracking").delete().eq("user_id", user.id);
    await supabase.from("profiles").delete().eq("id", user.id);

    // Delete from auth.users using service role (required for admin delete)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey
      );
      await adminClient.auth.admin.deleteUser(user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[account/delete] Error:", err);
    return NextResponse.json(
      { error: "Failed to delete account." },
      { status: 500 }
    );
  }
}
