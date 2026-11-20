import { createClient } from "npm:@supabase/supabase-js@2";
import { nurtureMessage } from "../_shared/nurtureEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_EMAIL = "RatioAi <support@ratioai.site>";

type NurtureCopy = {
  kicker: string;
  subject: string;
  headline: string;
  paragraphs: string[];
  button: string;
};

const emails: Array<{
  step: number;
  delayDays: number;
  active: NurtureCopy;
  removed?: NurtureCopy;
}> = [
  {
    step: 2,
    delayDays: 2,
    active: {
      kicker: "WHY IT MATTERS 🔥",
      subject: "🔥 The meal you skip is the one that counts",
      headline: "Tracking keeps the day honest.",
      paragraphs: [
        "Most people miss a goal because the meals in between never got counted. Not because of one plate.",
        "Breakfast, the snack, dinner. Snap each one and the day turns into something you can see: protein, carbs, fat, calories. 📊",
        "That picture is what makes the next choice obvious. RatioAi is built for the plate in front of you.",
      ],
      button: "Snap today's meal →",
    },
  },
  {
    step: 3,
    delayDays: 4,
    active: {
      kicker: "KEEP IT EASY ✅",
      subject: "✅ You don't need a perfect day",
      headline: "Log the meal you actually ate.",
      paragraphs: [
        "The streak that lasts is not the pretty one. It's the one where you logged the meal anyway.",
        "Snap it before you clear the plate. If lunch got away, log dinner. 🍽️ RatioAi reads the portion from the photo so you can get on with your day.",
        "A week of real plates teaches you more than one careful Sunday.",
      ],
      button: "Log the next plate →",
    },
  },
  {
    step: 4,
    delayDays: 5,
    active: {
      kicker: "YOUR NEXT WIN 🥗",
      subject: "🥗 Your meals are starting to tell a story",
      headline: "Keep feeding the streak.",
      paragraphs: [
        "A few logged plates are enough to see the pattern: the meals that fill you up, and the ones that quietly blow the day.",
        "Stay with it this week. Snap what you eat, glance at the macros, and let the goal get easier to hit. 💪",
        "You already have RatioAi. The next photo is the whole assignment.",
      ],
      button: "Log today's plate →",
    },
    removed: {
      kicker: "COME BACK 👋",
      subject: "👋 RatioAi is one tap away",
      headline: "Your account is gone, but the start is easy.",
      paragraphs: [
        "You deleted RatioAi. The address is still here, so this is the last nudge.",
        "Reinstall the app, sign in again, and photograph the next thing you eat. One plate is a fresh start. 📸",
        "The goal does not expire because a few days went quiet.",
      ],
      button: "Reinstall RatioAi →",
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const results = { sent: 0, errors: 0, details: [] as string[] };

  try {
    for (const emailConfig of emails) {
      const { data: users, error } = await supabase
        .from("nurture_contacts")
        .select("id, email, nurture_sent_at, removed_at")
        .eq("nurture_step", emailConfig.step - 1)
        .eq("unsubscribed", false)
        .not("nurture_sent_at", "is", null)
        .limit(50);

      if (error) {
        results.details.push(`Error fetching step ${emailConfig.step}: ${error.message}`);
        continue;
      }
      if (!users || users.length === 0) continue;

      const now = new Date();
      const readyUsers = users.filter((u) => {
        const sentAt = new Date(u.nurture_sent_at);
        const diffDays = (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= emailConfig.delayDays;
      });

      for (const user of readyUsers) {
        try {
          const copy = user.removed_at && emailConfig.removed
            ? emailConfig.removed
            : emailConfig.active;
          const html = nurtureMessage({
            kicker: copy.kicker,
            headline: copy.headline,
            paragraphs: copy.paragraphs,
            button: copy.button,
            unsubscribeUrl: `${supabaseUrl}/functions/v1/unsubscribe?id=${user.id}`,
          });
          const res = await fetch(RESEND_API_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: [user.email],
              subject: copy.subject,
              html,
            }),
          });

          if (res.ok) {
            await supabase
              .from("nurture_contacts")
              .update({ nurture_step: emailConfig.step, nurture_sent_at: now.toISOString() })
              .eq("id", user.id)
              .eq("nurture_step", emailConfig.step - 1);
            results.sent++;
          } else {
            const errBody = await res.text();
            results.errors++;
            results.details.push(`Failed for ${user.email}: ${errBody}`);
          }
        } catch (e) {
          results.errors++;
          results.details.push(`Error sending to ${user.email}: ${e.message}`);
        }
      }
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
