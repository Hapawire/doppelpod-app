export function buildVideoReadyEmail(videoUrl: string, dashboardUrl: string) {
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#f0f0f0;background:#0a0a0a;">
  <div style="margin-bottom:32px;">
    <span style="font-size:24px;font-weight:700;background:linear-gradient(135deg,#9333ea,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">DoppelPod</span>
  </div>

  <p style="font-size:16px;line-height:1.6;color:#e2e2e2;">Your video is ready.</p>

  <p style="font-size:16px;line-height:1.6;color:#e2e2e2;">
    Your AI twin video has finished generating. Head to your dashboard to watch and download it.
  </p>

  <div style="text-align:center;margin:32px 0;display:flex;gap:12px;justify-content:center;">
    <a href="${dashboardUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#9333ea,#ec4899);color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">View on Dashboard</a>
    <a href="${videoUrl}" style="display:inline-block;padding:14px 36px;background:rgba(255,255,255,0.06);color:#e2e2e2;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;border:1px solid rgba(255,255,255,0.1);">Download</a>
  </div>

  <div style="margin-top:48px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:#666;">
    <p style="margin:0;">DoppelPod by Hapawire LLC</p>
  </div>
</div>`;

  return {
    subject: "Your DoppelPod video is ready",
    html,
  };
}
