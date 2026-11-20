const APP_STORE_URL = "https://apps.apple.com/app/id6787262904";
const SUPPORT_EMAIL = "support@ratioai.site";

const HIGHLIGHTS = [
  ["📸", "Snap"],
  ["🧠", "AI macros"],
  ["📈", "Your goal"],
];

export function nurtureMessage(opts: {
  kicker: string;
  headline: string;
  paragraphs: string[];
  button: string;
  unsubscribeUrl: string;
}): string {
  const cards = HIGHLIGHTS.map(
    ([emoji, label]) =>
      `<td style="width:33.33%;padding:4px;">
        <div style="background:#1a1a1e;border:1px solid #2e2e34;border-radius:14px;padding:12px 6px;text-align:center;">
          <div style="font-size:20px;line-height:1;">${emoji}</div>
          <div style="margin-top:6px;font-size:11px;font-weight:700;letter-spacing:.04em;color:#f4f4f5;">${label}</div>
        </div>
      </td>`,
  ).join("");

  const body = opts.paragraphs
    .map(
      (paragraph) =>
        `<p style="font-size:15px;line-height:1.7;margin:0 0 14px;color:#d4d4d8;">${paragraph}</p>`,
    )
    .join("");

  return `<div style="margin:0;background:#09090b;padding:28px 12px;">
  <div style="max-width:520px;margin:0 auto;background:#121214;border:1px solid #2a2a2e;border-radius:24px;padding:32px 24px;font-family:'Helvetica Neue',Arial,sans-serif;color:#fafafa;">
    <p style="margin:0 0 18px;font-size:12px;font-weight:800;letter-spacing:.16em;color:#c6ef4a;">${opts.kicker}</p>
    <h1 style="font-size:28px;font-weight:800;line-height:1.15;margin:0 0 18px;color:#fafafa;">${opts.headline}</h1>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;"><tr>${cards}</tr></table>
    ${body}
    <div style="text-align:center;margin:26px 0 4px;">
      <a href="${APP_STORE_URL}" style="display:inline-block;background:#c6ef4a;color:#111;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:800;font-size:15px;">${opts.button}</a>
    </div>
    <div style="margin-top:28px;padding-top:16px;border-top:1px solid #2a2a2e;text-align:center;">
      <p style="font-size:13px;color:#a1a1aa;margin:0;">— The RatioAi Team</p>
      <p style="font-size:12px;color:#a1a1aa;margin:8px 0 0;">Questions: <a href="mailto:${SUPPORT_EMAIL}" style="color:#c6ef4a;">${SUPPORT_EMAIL}</a></p>
      <p style="margin:16px 0 0;">
        <a href="${opts.unsubscribeUrl}" style="display:inline-block;border:1px solid #3f3f46;color:#e4e4e7;padding:10px 18px;border-radius:999px;text-decoration:none;font-size:13px;font-weight:700;">Unsubscribe</a>
      </p>
    </div>
  </div>
</div>`;
}
