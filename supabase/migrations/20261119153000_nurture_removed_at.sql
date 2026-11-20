-- removed_at is set when the person deletes their account.
-- The last email uses it to choose a reinstall note instead of a normal follow-up.
alter table public.nurture_contacts
  add column if not exists last_opened_at timestamptz,
  add column if not exists removed_at timestamptz;
