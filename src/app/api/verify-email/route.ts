import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/dashboard?verify=invalid", req.url));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.redirect(new URL("/dashboard?verify=error", req.url));
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Find profile with this token
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("verification_token", token)
    .single();

  if (!profile) {
    return NextResponse.redirect(new URL("/dashboard?verify=invalid", req.url));
  }

  // Mark as verified, clear token
  await supabase
    .from("profiles")
    .update({ email_confirmed: true, verification_token: null })
    .eq("id", profile.id);

  return NextResponse.redirect(new URL("/dashboard?verify=success", req.url));
}
