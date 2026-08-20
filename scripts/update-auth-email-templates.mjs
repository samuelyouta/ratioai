#!/usr/bin/env node
/**
 * Push RatioAi-branded Auth email templates to the hosted Supabase project.
 *
 * Requires SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_REF = process.env.SUPABASE_PROJECT_ID || "myyjjtclthflfgxkgubr";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!TOKEN) {
  console.error("SUPABASE_ACCESS_TOKEN is required.");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const magicLink = readFileSync(join(root, "supabase/templates/magic_link.html"), "utf8");
const confirmation = readFileSync(join(root, "supabase/templates/confirmation.html"), "utf8");

const payload = {
  mailer_subjects_magic_link: "Your RatioAi signup link",
  mailer_templates_magic_link_content: magicLink,
  mailer_subjects_confirmation: "Confirm your RatioAi signup",
  mailer_templates_confirmation_content: confirmation,
};

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

if (!res.ok) {
  const body = await res.text();
  console.error(`Failed to update auth email templates (${res.status}): ${body}`);
  process.exit(1);
}

console.log("Updated Supabase Auth email templates:");
console.log("  Magic Link subject → Your RatioAi signup link");
console.log("  Confirm signup subject → Confirm your RatioAi signup");
