/* eslint-disable @typescript-eslint/no-explicit-any */
// Remove old std import and use built-in Deno.serve
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

async function verifyHmacToken(token: string, secret: string): Promise<{ valid: boolean; userId?: string }> {
  const parts = token.split(":");
  if (parts.length !== 3) return { valid: false };

  const [userId, expiresAtStr, signature] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);

  if (isNaN(expiresAt) || expiresAt < Date.now()) return { valid: false };

  const payload = `${userId}:${expiresAtStr}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const sigBytes = new Uint8Array(signature.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const valid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(payload));

  return { valid, userId: valid ? userId : undefined };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    let redirectTo = url.searchParams.get("redirect") || "/";

    // Validate redirect URL to prevent open redirect attacks
    const allowedRedirectHosts = ['ea-app.com', 'localhost', 'app.fetihb.nl', 'fetihb.nl'];
    if (redirectTo && redirectTo !== '/') {
      try {
        const redirectUrl = new URL(redirectTo);
        if (!allowedRedirectHosts.some(h =>
          redirectUrl.hostname === h ||
          redirectUrl.hostname.endsWith('.lovable.app') ||
          redirectUrl.hostname.endsWith('.lovableproject.com')
        )) {
          redirectTo = '/';
        }
      } catch {
        if (!redirectTo.startsWith('/')) {
          redirectTo = '/';
        }
      }
    }

    if (!token) {
      return new Response("<h1>Invalid link</h1>", {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { valid, userId } = await verifyHmacToken(token, secret);

    if (!valid || !userId) {
      return new Response("<h1>Invalid or expired link</h1>", {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      secret
    );

    // Confirm the email
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (updateError) {
      console.error("Update user error:", updateError);
      return new Response("<h1>Verification failed</h1>", {
        status: 500,
        headers: { "Content-Type": "text/html" },
      });
    }

    console.log("Email verified successfully");

    // Redirect to the app
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectTo,
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Verify email error:", error);
    return new Response("<h1>Verification failed</h1>", {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
});
