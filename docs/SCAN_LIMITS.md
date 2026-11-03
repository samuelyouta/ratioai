# Daily scan limit (40 per day)

Every signed-in user can run 40 AI photo scans per calendar day. Search & Edit and Describe Meal are not limited.

## Setup (one time)

1. Run `supabase/migrations/20261102120000_daily_scan_usage.sql` in the Supabase SQL editor (it is also appended to `supabase/pending-setup.sql`).
2. In Vercel, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (server only, never a `VITE_` variable). `SUPABASE_ANON_KEY` is optional; the publishable key is used if it is missing.
3. Redeploy.

Until steps 1-2 are done the server does not count scans. The app still counts per device (`ratioai.scans`), which stops normal use but can be reset by clearing app data.

## Behaviour

- Counts are keyed by the verified user id (falls back to IP for anonymous calls).
- The day is the user's own calendar day, sent in `x-scan-day`; the server only accepts a day within one day of UTC.
- A failed AI call hands its scan back.
- If Supabase is unreachable the scan is allowed rather than blocked.
- Change the limit in `src/lib/scanQuota.ts`, `api/_lib/scanLimit.js` (constant), and the `consume_daily_scan` call.
