-- Addresses for the post-download email sequence.
-- Kept when the account is deleted (user_id is cleared) so a person who
-- removes the app can still receive the follow-ups. Unsubscribe stops them.
create table public.nurture_contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  nurture_step integer not null default 0,
  nurture_sent_at timestamptz,
  unsubscribed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.nurture_contacts enable row level security;

create index nurture_contacts_due
  on public.nurture_contacts (nurture_step, nurture_sent_at)
  where unsubscribed = false;
