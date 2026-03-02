import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_URL = "https://api.resend.com/emails";

const FROM_EMAIL = "RatioAi <onboarding@ratioai.app>";

const emails = [
  {
    step: 1,
    delayDays: 0, // welcome - already sent via send-welcome-email
    subject: "Welcome to the RatioAi waitlist! 🎉",
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 28px; font-weight: 800; margin: 0 0 8px;">Welcome to RatioAi</h1>
          <p style="color: #888; font-size: 14px; margin: 0;">You're officially on the list.</p>
        </div>
        <p style="font-size: 15px; line-height: 1.7;">Hey there! 👋</p>
        <p style="font-size: 15px; line-height: 1.7;">Thanks for joining the RatioAi waitlist. We're building something special — an AI-powered nutrition tracker that makes calorie counting as easy as snapping a photo.</p>
        <p style="font-size: 15px; line-height: 1.7;">You'll be among the first to try it when we launch. Stay tuned for updates!</p>
         <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee;">
           <p style="font-size: 13px; color: #999; margin: 0;">— The RatioAi Team</p>
           <p style="font-size: 11px; color: #bbb; margin: 12px 0 0;"><a href="{{UNSUBSCRIBE_URL}}" style="color: #bbb; text-decoration: underline;">Unsubscribe</a></p>
         </div>
       </div>
     `,
   },
   {
     step: 2,
    delayDays: 2,
    subject: "Why we're building RatioAi 🧠",
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 28px; font-weight: 800; margin: 0 0 8px;">The Problem We're Solving</h1>
        </div>
        <p style="font-size: 15px; line-height: 1.7;">Let's be honest — tracking what you eat is a pain.</p>
        <p style="font-size: 15px; line-height: 1.7;">Searching databases, guessing portion sizes, manually logging every ingredient... Most people give up within a week.</p>
        <p style="font-size: 15px; line-height: 1.7;"><strong>RatioAi changes that.</strong> Just snap a photo of your meal and our AI instantly breaks down the calories, protein, carbs, and fats — verified against USDA data.</p>
        <p style="font-size: 15px; line-height: 1.7;">No more guessing. No more tedious logging. Just eat, snap, and know.</p>
        <div style="background: #f8f8f8; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="font-size: 14px; line-height: 1.6; margin: 0; color: #555;">
            📸 <strong>Snap & Track</strong> — Photo-based meal logging<br>
            🧠 <strong>AI Analysis</strong> — Instant macro breakdown<br>
            📈 <strong>Smart Insights</strong> — Personalized goals that adapt
          </p>
        </div>
        <p style="font-size: 15px; line-height: 1.7;">We can't wait to get this into your hands.</p>
         <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee;">
           <p style="font-size: 13px; color: #999; margin: 0;">— The RatioAi Team</p>
           <p style="font-size: 11px; color: #bbb; margin: 12px 0 0;"><a href="{{UNSUBSCRIBE_URL}}" style="color: #bbb; text-decoration: underline;">Unsubscribe</a></p>
         </div>
      </div>
    `,
  },
  {
    step: 3,
    delayDays: 5,
    subject: "Help us spread the word? 🚀",
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 28px; font-weight: 800; margin: 0 0 8px;">Know Someone Who'd Love This?</h1>
        </div>
        <p style="font-size: 15px; line-height: 1.7;">You've been on the RatioAi waitlist for a few days now, and we're getting closer to launch! 🎉</p>
        <p style="font-size: 15px; line-height: 1.7;">If you know anyone who:</p>
        <ul style="font-size: 15px; line-height: 1.9; padding-left: 20px;">
          <li>Wants to eat healthier without the hassle</li>
          <li>Is tired of manual calorie counting</li>
          <li>Loves trying new AI-powered tools</li>
        </ul>
        <p style="font-size: 15px; line-height: 1.7;">...send them our way! Every person who joins helps us build a better product for everyone.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="https://ratioai.lovable.app" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">Share RatioAi →</a>
        </div>
        <p style="font-size: 15px; line-height: 1.7;">Thanks for being an early supporter. It means the world to us. 💚</p>
         <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee;">
           <p style="font-size: 13px; color: #999; margin: 0;">— The RatioAi Team</p>
           <p style="font-size: 11px; color: #bbb; margin: 12px 0 0;"><a href="{{UNSUBSCRIBE_URL}}" style="color: #bbb; text-decoration: underline;">Unsubscribe</a></p>
         </div>
      </div>
    `,
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const results = { sent: 0, errors: 0, details: [] as string[] };

  try {
    // Process steps 2 and 3 (step 1 is sent immediately on signup)
    for (const emailConfig of emails.filter((e) => e.step >= 2)) {
      // Find users ready for this step
      const { data: users, error } = await supabase
        .from("waitlist")
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

      // Filter by delay
      const now = new Date();
      const readyUsers = users.filter((u) => {
        const sentAt = new Date(u.nurture_sent_at);
        const diffDays = (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= emailConfig.delayDays;
      });

      for (const user of readyUsers) {
        try {
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
              html: emailConfig.html.replace(
                /\{\{UNSUBSCRIBE_URL\}\}/g,
                `${supabaseUrl}/functions/v1/unsubscribe?id=${user.id}`
              ),
            }),
          });

          if (res.ok) {
            await supabase
              .from("waitlist")
              .update({ nurture_step: emailConfig.step, nurture_sent_at: now.toISOString() })
              .eq("id", user.id);
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
