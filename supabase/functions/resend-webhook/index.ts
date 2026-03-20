import { createClient } from "npm:@supabase/supabase-js@2";
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.text();
    const payload = JSON.parse(body);

    // Verify webhook signature if signing secret is configured
    const RESEND_WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET");
    if (RESEND_WEBHOOK_SECRET) {
      const svixId = req.headers.get("svix-id");
      const svixTimestamp = req.headers.get("svix-timestamp");
      const svixSignature = req.headers.get("svix-signature");

      if (!svixId || !svixTimestamp || !svixSignature) {
        console.error("Missing Svix headers");
        return new Response(JSON.stringify({ error: "Missing webhook signature headers" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify timestamp is within 5 minutes
      const timestampSeconds = parseInt(svixTimestamp);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - timestampSeconds) > 300) {
        console.error("Webhook timestamp too old");
        return new Response(JSON.stringify({ error: "Webhook timestamp expired" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const eventType = payload.type;
    const eventData = payload.data;

    console.log(`Received Resend webhook: ${eventType}`, JSON.stringify(eventData));

    switch (eventType) {
      case "email.delivered": {
        console.log(`Email delivered to: ${eventData.to?.join(", ")}`);
        break;
      }

      case "email.bounced": {
        const bouncedEmails = eventData.to || [];
        console.warn(`Email bounced for: ${bouncedEmails.join(", ")}`);

        // Mark bounced emails as unsubscribed in waitlist
        for (const email of bouncedEmails) {
          const { error } = await supabase
            .from("waitlist")
            .update({ unsubscribed: true })
            .eq("email", email.toLowerCase());

          if (error) {
            console.error(`Failed to update bounced email ${email}:`, error.message);
          } else {
            console.log(`Marked ${email} as unsubscribed due to bounce`);
          }
        }
        break;
      }

      case "email.complained": {
        const complainedEmails = eventData.to || [];
        console.warn(`Spam complaint from: ${complainedEmails.join(", ")}`);

        // Mark complained emails as unsubscribed
        for (const email of complainedEmails) {
          const { error } = await supabase
            .from("waitlist")
            .update({ unsubscribed: true })
            .eq("email", email.toLowerCase());

          if (error) {
            console.error(`Failed to update complained email ${email}:`, error.message);
          } else {
            console.log(`Marked ${email} as unsubscribed due to complaint`);
          }
        }
        break;
      }

      case "email.delivery_delayed": {
        console.warn(`Delivery delayed for: ${eventData.to?.join(", ")}`);
        break;
      }

      case "email.opened": {
        console.log(`Email opened by: ${eventData.to?.join(", ")}`);
        break;
      }

      case "email.clicked": {
        console.log(`Link clicked by: ${eventData.to?.join(", ")}`);
        break;
      }

      default: {
        console.log(`Unhandled event type: ${eventType}`);
      }
    }

    return new Response(JSON.stringify({ received: true, type: eventType }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
