export function buildTrialReminderEmail(daysLeft: number, promoCode: string, pricingUrl: string) {
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#f0f0f0;background:#0a0a0a;">
  <div style="margin-bottom:32px;">
    <span style="font-size:24px;font-weight:700;background:linear-gradient(135deg,#9333ea,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">DoppelPod</span>
  </div>

  <p style="font-size:16px;line-height:1.6;color:#e2e2e2;">Hey,</p>

  <p style="font-size:16px;line-height:1.6;color:#e2e2e2;">
    Your DoppelPod Elite trial ends in <strong style="color:#c084fc;">${daysLeft} day${daysLeft !== 1 ? "s" : ""}</strong>.
  </p>

  <p style="font-size:16px;line-height:1.6;color:#e2e2e2;">
    You've had full access to voice cloning, video avatars, Claude Cowork, and priority rendering. To keep everything unlocked, subscribe now and get <strong style="color:#22c55e;">25% off your first month</strong>.
  </p>

  <div style="margin:24px 0;padding:16px 20px;border-radius:12px;border:1px solid rgba(34,197,94,0.3);background:rgba(34,197,94,0.08);text-align:center;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#22c55e;">Your promo code</p>
    <p style="margin:0;font-size:24px;font-weight:700;color:#22c55e;letter-spacing:2px;">${promoCode}</p>
  </div>

  <div style="text-align:center;margin:32px 0;">
    <a href="${pricingUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#9333ea,#ec4899);color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">Choose a Plan</a>
  </div>

  <p style="font-size:13px;line-height:1.6;color:#888;">
    After your trial ends, you'll lose access to voice cloning, video avatars, Claude Cowork, and data export. Your account and past generations will be saved.
  </p>

  <div style="margin-top:48px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:#666;">
    <p style="margin:0;">DoppelPod by Hapawire LLC</p>
  </div>
</div>`;

  return {
    subject: `Your DoppelPod trial ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""} — here's 25% off`,
    html,
  };
}
