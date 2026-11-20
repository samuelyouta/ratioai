import { createClient } from "npm:@supabase/supabase-js@2";
import { getUserFromRequest } from "../_shared/auth.ts";
import { nurtureMessage } from "../_shared/nurtureEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_EMAIL = "RatioAi <support@ratioai.site>";
const REVIEWER_EMAIL = "reviewer@ratioai.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const user = await getUserFromRequest(req);
  const email = user?.email?.trim().toLowerCase() ?? "";
  if (!user || !email) {
    return new Response(JSON.stringify({ skipped: "no-account-email" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (email === REVIEWER_EMAIL) {
    return new Response(JSON.stringify({ skipped: "reviewer" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!RESEND_API_KEY || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Email is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { error: upsertError } = await supabase.from("nurture_contacts").upsert(
    { email, user_id: user.id },
    { onConflict: "email", ignoreDuplicates: true },
  );
  if (upsertError) {
    console.error("nurture upsert failed", upsertError);
    return new Response(JSON.stringify({ error: "Could not save contact" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await supabase
    .from("nurture_contacts")
    .update({
      user_id: user.id,
      last_opened_at: new Date().toISOString(),
      removed_at: null,
    })
    .eq("email", email);

  const { data: claimed, error: claimError } = await supabase
    .from("nurture_contacts")
    .update({ nurture_step: 1, nurture_sent_at: new Date().toISOString() })
    .eq("email", email)
    .eq("nurture_step", 0)
    .eq("unsubscribed", false)
    .select("id")
    .maybeSingle();

  if (claimError) {
    console.error("nurture claim failed", claimError);
    return new Response(JSON.stringify({ error: "Could not start sequence" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!claimed) {
    return new Response(JSON.stringify({ skipped: "already-enrolled" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const html = nurtureMessage({
    kicker: "YOU'RE IN ✨",
    headline: "📸 Your next meal is the easy one.",
    paragraphs: [
      "RatioAi is on your phone. The hard part is already done.",
      "Point it at a plate and watch the calories, protein, carbs, and fat come back in a few seconds. No database search. No guessing the chicken.",
      "Log the next thing you eat. One photo is enough to feel the spark. 🔥",
    ],
    button: "Open RatioAi →",
    unsubscribeUrl: `${supabaseUrl}/functions/v1/unsubscribe?id=${claimed.id}`,
  });

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [email],
      subject: "📸 You're in. Snap your first meal",
      html,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("Resend error:", errBody);
    await supabase
      .from("nurture_contacts")
      .update({ nurture_step: 0, nurture_sent_at: null })
      .eq("id", claimed.id)
      .eq("nurture_step", 1);
    return new Response(JSON.stringify({ error: "Failed to send email" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
