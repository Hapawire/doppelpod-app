import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildTrialReminderEmail } from "@/lib/trial-reminder-email";

export async function GET(req: NextRequest) {
  // Verify cron authorization
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  if (!supabaseUrl || !supabaseKey || !resendKey) {
    return NextResponse.json({ error: "Missing configuration" }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const resend = new Resend(resendKey);
  const promoCode = process.env.TRIAL_REMINDER_PROMO_CODE || "EARLYADOPTER25";
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.doppelpod.io";

  // Find trial users expiring within 2 days who haven't been reminded
  const now = new Date();
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, email, trial_end")
    .is("paid_tier", null)
    .eq("email_confirmed", true)
    .eq("trial_reminder_sent", false)
    .not("trial_end", "is", null)
    .gt("trial_end", now.toISOString())
    .lte("trial_end", twoDaysFromNow.toISOString());

  if (error) {
    console.error("[trial-reminders] Query failed:", error.message);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  let sent = 0;
  for (const user of users || []) {
    if (!user.email) continue;

    const daysLeft = Math.max(1, Math.ceil(
      (new Date(user.trial_end).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    ));

    try {
      const { subject, html } = buildTrialReminderEmail(daysLeft, promoCode, `${baseUrl}/#pricing`);
      await resend.emails.send({
        from: "DoppelPod <noreply@doppelpod.io>",
        to: user.email,
        subject,
        html,
      });

      await supabase
        .from("profiles")
        .update({ trial_reminder_sent: true })
        .eq("id", user.id);

      console.log(`[trial-reminders] Reminder sent to ${user.email} (${daysLeft} days left)`);
      sent++;
    } catch (err) {
      console.error(`[trial-reminders] Failed for ${user.email}:`, err);
    }
  }

  return NextResponse.json({ sent, total: users?.length || 0 });
}
