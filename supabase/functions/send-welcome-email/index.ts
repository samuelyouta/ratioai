import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_EMAIL = "RatioAi <onboarding@ratioai.app>";

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

  try {
    const { email, id } = await req.json();

    if (!email || !id) {
      return new Response(
        JSON.stringify({ error: "email and id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send welcome email
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
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
              <p style="font-size: 11px; color: #bbb; margin: 12px 0 0;"><a href="${Deno.env.get("SUPABASE_URL")}/functions/v1/unsubscribe?id=${id}" style="color: #bbb; text-decoration: underline;">Unsubscribe</a></p>
            </div>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Resend error:", errBody);
      return new Response(
        JSON.stringify({ error: `Failed to send email: ${errBody}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update nurture step
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase
      .from("waitlist")
      .update({ nurture_step: 1, nurture_sent_at: new Date().toISOString() })
      .eq("id", id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
