import { createClient } from "npm:@supabase/supabase-js@2";
import { nurtureMessage } from "../_shared/nurtureEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_EMAIL = "RatioAi <support@ratioai.site>";

const emails = [
  {
    step: 2,
    delayDays: 2,
    subject: "The meal you skip logging is the one that counts",
    headline: "Tracking is how the day stays honest.",
    paragraphs: [
      "Most people do not miss a goal because of one meal. They miss it because the meals in between never got counted.",
      "A photo of breakfast, the snack, and dinner turns a vague day into something you can see: protein, carbs, fat, and calories. That picture is what makes the next choice obvious.",
      "RatioAi is built for the plate in front of you, not for a perfect log.",
    ],
    button: "Snap today's meal",
  },
  {
    step: 3,
    delayDays: 4,
    subject: "You do not need a perfect day",
    headline: "Log the meal you actually ate.",
    paragraphs: [
      "The streak that lasts is not the one with perfect meals. It is the one where you logged the meal anyway.",
      "Snap it before you clear the plate. If lunch got away from you, log dinner. RatioAi estimates the portion from the photo so you can get back to the rest of your day.",
      "A week of real plates teaches you more than one careful Sunday.",
    ],
    button: "Log the next plate",
  },
  {
    step: 4,
    delayDays: 5,
    subject: "Deleted RatioAi? Your account is still here",
    headline: "Come back for the next meal.",
    paragraphs: [
      "If the app is gone from your phone, you can put it back in a minute. This address is still saved, so you do not start from zero.",
      "Reinstall RatioAi, sign in, and photograph the next thing you eat. One plate is a fresh start. The goal does not expire because a few days went quiet.",
    ],
    button: "Reinstall RatioAi",
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
        .select("id, email, nurture_sent_at")
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
          const html = nurtureMessage({
            headline: emailConfig.headline,
            paragraphs: emailConfig.paragraphs,
            button: emailConfig.button,
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
              subject: emailConfig.subject,
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
