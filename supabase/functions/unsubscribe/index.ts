import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return new Response("<h1>Invalid unsubscribe link</h1>", {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { error } = await supabase
    .from("waitlist")
    .update({ unsubscribed: true })
    .eq("id", id);

  if (error) {
    return new Response("<h1>Something went wrong. Please try again.</h1>", {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }

  return new Response(
    `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed</title></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8f8f8;">
  <div style="text-align:center;max-width:400px;padding:40px;">
    <h1 style="font-size:24px;font-weight:700;margin:0 0 12px;">You've been unsubscribed</h1>
    <p style="color:#666;font-size:15px;line-height:1.6;">You won't receive any more emails from RatioAi. We're sorry to see you go!</p>
  </div>
</body>
</html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
});
