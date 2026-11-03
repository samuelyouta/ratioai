/**
 * Daily cap on AI photo scans, enforced server-side so it can't be bypassed by
 * clearing app storage. Counts live in Supabase (see the daily_scan_usage migration).
 *
 * Needs on Vercel: SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.
 * If either is missing, or Supabase is unreachable, scans are allowed rather than blocked
 * (the app also keeps its own per-device count as a second line of defence).
 */

const DAILY_SCAN_LIMIT = 40;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const REQUEST_TIMEOUT_MS = 4000;

function config() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const anonKey = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ""
  ).trim();
  if (!url || !serviceKey) return null;
  return { url, serviceKey, anonKey: anonKey || serviceKey };
}

async function timedFetch(url, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function header(req, name) {
  const value = req.headers && req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/** The app sends the user's own calendar day; accept it only if it is a plausible day right now. */
function resolveDay(req, now = new Date()) {
  const claimed = String(header(req, "x-scan-day") || "");
  const utc = now.toISOString().slice(0, 10);
  if (!DAY_RE.test(claimed)) return utc;
  const diffDays = Math.abs(Date.parse(`${claimed}T00:00:00Z`) - Date.parse(`${utc}T00:00:00Z`)) / 86400000;
  return diffDays <= 1 ? claimed : utc;
}

function bearer(req) {
  const auth = String(header(req, "authorization") || "");
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  return match ? match[1].trim() : "";
}

async function userIdFromToken(cfg, token) {
  if (!token) return null;
  try {
    const res = await timedFetch(`${cfg.url}/auth/v1/user`, {
      headers: { apikey: cfg.anonKey, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user && typeof user.id === "string" ? user.id : null;
  } catch {
    return null;
  }
}

function clientIp(req) {
  const forwarded = String(header(req, "x-forwarded-for") || "");
  return forwarded.split(",")[0].trim() || (req.socket && req.socket.remoteAddress) || "unknown";
}

async function rpc(cfg, name, args) {
  const res = await timedFetch(`${cfg.url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: cfg.serviceKey,
      Authorization: `Bearer ${cfg.serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`${name} failed (${res.status})`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Takes one scan from today's allowance.
 * Resolves to { allowed, used, limit, refund() }; refund() hands the scan back if the AI call fails.
 */
async function reserveScan(req) {
  const open = { allowed: true, used: 0, limit: DAILY_SCAN_LIMIT, refund: async () => {} };
  const cfg = config();
  if (!cfg) return open;

  try {
    const userId = await userIdFromToken(cfg, bearer(req));
    const key = userId ? `user:${userId}` : `ip:${clientIp(req)}`;
    const day = resolveDay(req);

    const rows = await rpc(cfg, "consume_daily_scan", { p_key: key, p_day: day, p_limit: DAILY_SCAN_LIMIT });
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) return open;

    return {
      allowed: row.allowed === true,
      used: Number(row.used) || 0,
      limit: DAILY_SCAN_LIMIT,
      refund: async () => {
        try {
          await rpc(cfg, "refund_daily_scan", { p_key: key, p_day: day });
        } catch (e) {
          console.warn("refund scan failed", e);
        }
      },
    };
  } catch (e) {
    console.warn("scan limit check failed, allowing scan", e);
    return open;
  }
}

module.exports = { DAILY_SCAN_LIMIT, reserveScan, resolveDay };
