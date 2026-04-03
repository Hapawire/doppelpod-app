export function buildActionRequiredEmail(hostedInvoiceUrl: string) {
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#f0f0f0;background:#0a0a0a;">
  <div style="margin-bottom:32px;">
    <span style="font-size:24px;font-weight:700;background:linear-gradient(135deg,#9333ea,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">DoppelPod</span>
  </div>

  <p style="font-size:16px;line-height:1.6;color:#e2e2e2;">Hey,</p>

  <p style="font-size:16px;line-height:1.6;color:#e2e2e2;">
    Your bank requires additional verification to process your DoppelPod payment. This usually takes less than a minute.
  </p>

  <div style="text-align:center;margin:32px 0;">
    <a href="${hostedInvoiceUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#9333ea,#ec4899);color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">Complete Payment</a>
  </div>

  <p style="font-size:13px;line-height:1.6;color:#888;">
    Your bank may ask you to confirm the charge via your banking app or a text message. Once confirmed, your subscription continues as normal.
  </p>

  <div style="margin-top:48px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:#666;">
    <p style="margin:0;">DoppelPod by Hapawire LLC</p>
  </div>
</div>`;

  return {
    subject: "Action required: Complete your DoppelPod payment",
    html,
  };
}
