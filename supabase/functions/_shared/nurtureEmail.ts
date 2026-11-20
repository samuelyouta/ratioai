const APP_STORE_URL = "https://apps.apple.com/app/id6787262904";
const SUPPORT_EMAIL = "support@ratioai.site";

export function nurtureMessage(opts: {
  headline: string;
  paragraphs: string[];
  button: string;
  unsubscribeUrl: string;
}): string {
  const body = opts.paragraphs
    .map(
      (paragraph) =>
        `<p style="font-size:15px;line-height:1.7;margin:0 0 16px;">${paragraph}</p>`,
    )
    .join("");

  return `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:520px;margin:0 auto;padding:40px 24px;color:#1a1a1a;">
  <h1 style="font-size:28px;font-weight:800;line-height:1.2;margin:0 0 20px;">${opts.headline}</h1>
  ${body}
  <div style="text-align:center;margin:28px 0 8px;">
    <a href="${APP_STORE_URL}" style="display:inline-block;background:#111;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:700;font-size:15px;">${opts.button}</a>
  </div>
  <div style="margin-top:36px;padding-top:20px;border-top:1px solid #eee;">
    <p style="font-size:13px;color:#999;margin:0;">— The RatioAi Team</p>
    <p style="font-size:12px;color:#999;margin:10px 0 0;">Questions: <a href="mailto:${SUPPORT_EMAIL}" style="color:#999;">${SUPPORT_EMAIL}</a></p>
    <p style="font-size:11px;color:#bbb;margin:12px 0 0;"><a href="${opts.unsubscribeUrl}" style="color:#bbb;text-decoration:underline;">Unsubscribe</a></p>
  </div>
</div>`;
}
