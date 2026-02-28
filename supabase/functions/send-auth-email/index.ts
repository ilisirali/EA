/* eslint-disable @typescript-eslint/no-explicit-any */
// Remove old std import and use built-in Deno.serve
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

const FROM_EMAIL = "onboarding@resend.dev";

type Lang = "tr" | "en" | "nl" | "ar";

const emailStrings: Record<Lang, {
  resetSubject: string;
  resetTitle: string;
  resetText: string;
  resetButton: string;
  resetFooter: string;
  signupSubject: string;
  signupTitle: string;
  signupText: string;
  signupButton: string;
  signupFooter: string;
}> = {
  tr: {
    resetSubject: "Şifre Sıfırlama - EA APP",
    resetTitle: "Şifre Sıfırlama",
    resetText: "Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın. Bu bağlantı 1 saat geçerlidir.",
    resetButton: "Şifremi Sıfırla",
    resetFooter: "Bu talebi siz yapmadıysanız bu e-postayı güvenle yoksayabilirsiniz.",
    signupSubject: "E-posta Doğrulama - EA APP",
    signupTitle: "Hoş Geldiniz! 🎉",
    signupText: "Hesabınızı doğrulamak için aşağıdaki bağlantıya tıklayın.",
    signupButton: "E-postamı Doğrula",
    signupFooter: "Bu hesabı siz oluşturmadıysanız bu e-postayı güvenle yoksayabilirsiniz.",
  },
  en: {
    resetSubject: "Password Reset - EA APP",
    resetTitle: "Password Reset",
    resetText: "Click the link below to reset your password. This link is valid for 1 hour.",
    resetButton: "Reset My Password",
    resetFooter: "If you didn't request this, you can safely ignore this email.",
    signupSubject: "Email Verification - EA APP",
    signupTitle: "Welcome! 🎉",
    signupText: "Click the link below to verify your account.",
    signupButton: "Verify My Email",
    signupFooter: "If you didn't create this account, you can safely ignore this email.",
  },
  nl: {
    resetSubject: "Wachtwoord Resetten - EA APP",
    resetTitle: "Wachtwoord Resetten",
    resetText: "Klik op de onderstaande link om uw wachtwoord te resetten. Deze link is 1 uur geldig.",
    resetButton: "Wachtwoord Resetten",
    resetFooter: "Als u dit niet heeft aangevraagd, kunt u deze e-mail veilig negeren.",
    signupSubject: "E-mail Verificatie - EA APP",
    signupTitle: "Welkom! 🎉",
    signupText: "Klik op de onderstaande link om uw account te verifiëren.",
    signupButton: "E-mail Verifiëren",
    signupFooter: "Als u dit account niet heeft aangemaakt, kunt u deze e-mail veilig negeren.",
  },
  ar: {
    resetSubject: "إعادة تعيين كلمة المرور - EA APP",
    resetTitle: "إعادة تعيين كلمة المرور",
    resetText: "انقر على الرابط أدناه لإعادة تعيين كلمة المرور. هذا الرابط صالح لمدة ساعة واحدة.",
    resetButton: "إعادة تعيين كلمة المرور",
    resetFooter: "إذا لم تقم بهذا الطلب، يمكنك تجاهل هذا البريد الإلكتروني بأمان.",
    signupSubject: "تأكيد البريد الإلكتروني - EA APP",
    signupTitle: "!مرحباً 🎉",
    signupText: "انقر على الرابط أدناه للتحقق من حسابك.",
    signupButton: "تأكيد بريدي الإلكتروني",
    signupFooter: "إذا لم تقم بإنشاء هذا الحساب، يمكنك تجاهل هذا البريد الإلكتروني بأمان.",
  },
};

function getDir(lang: Lang) {
  return lang === "ar" ? "rtl" : "ltr";
}

function buildEmailHtml(lang: Lang, title: string, text: string, buttonLabel: string, buttonLink: string, footer: string) {
  const dir = getDir(lang);
  return `
<!DOCTYPE html>
<html dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;direction:${dir};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 32px; text-align: center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">EA APP</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="color:#18181b;margin:0 0 16px;font-size:20px;">${title}</h2>
              <p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 24px;">${text}</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${buttonLink}" 
                       style="display:inline-block;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:600;">
                      ${buttonLabel}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#a1a1aa;font-size:13px;line-height:1.5;margin:24px 0 0;border-top:1px solid #e4e4e7;padding-top:16px;">${footer}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Received request body:", JSON.stringify(body, null, 2));

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is missing");
      return new Response(
        JSON.stringify({ error: "Email service not configured (RESEND_API_KEY missing)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const resend = new Resend(RESEND_API_KEY);

    const { type, email, password, fullName, redirectTo, language } = body;

    const lang: Lang = (["tr", "en", "nl", "ar"].includes(language) ? language : "tr") as Lang;
    const strings = emailStrings[lang];

    // Validate required fields
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!type || !email || typeof email !== 'string' || !emailRegex.test(email) || email.length > 255) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid type/email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate redirectTo to prevent open redirect
    const allowedRedirectHosts = ['ea-app.com', 'localhost', 'app.fetihb.nl', 'fetihb.nl', 'eaaap.netlify.app']; // Keeping old for transition if needed
    if (redirectTo && typeof redirectTo === 'string') {
      try {
        const redirectUrl = new URL(redirectTo);
        if (!allowedRedirectHosts.some(h => redirectUrl.hostname === h)) {
          return new Response(
            JSON.stringify({ error: "Invalid redirect URL" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch {
        // If not a full URL, allow relative paths starting with /
        if (!redirectTo.startsWith('/')) {
          return new Response(
            JSON.stringify({ error: "Invalid redirect URL" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Validate fullName if provided
    if (fullName && (typeof fullName !== 'string' || fullName.length > 100)) {
      return new Response(
        JSON.stringify({ error: "Name must be under 100 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let subject: string;
    let html: string;

    if (type === "recovery") {
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: redirectTo || undefined },
      });

      if (error) {
        console.error("Generate link error:", error);
        // Return success even if user not found (enumeration protection)
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const actionLink = data?.properties?.action_link;
      if (!actionLink) {
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      subject = strings.resetSubject;
      html = buildEmailHtml(lang, strings.resetTitle, strings.resetText, strings.resetButton, actionLink, strings.resetFooter);

    } else if (type === "signup" || type === "signup_bypass") {
      const isBypass = type === "signup_bypass";

      // Check if user already exists
      const { data: { users: existingUsers } } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.find((u: any) => u.email === email);
      let userId = existingUser?.id;

      if (existingUser) {
        console.log('User already exists:', email);
        if (existingUser.email_confirmed_at) {
          console.log('User already confirmed, returning success');
          return new Response(
            JSON.stringify({ success: true, message: "User already exists and is confirmed" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (isBypass) {
          console.log('User exists but not confirmed. Auto-confirming via bypass.');
          await supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true });

          // Ensure profile exists
          const { data: profile } = await supabaseAdmin.from('profiles').select('id').eq('id', userId).maybeSingle();
          if (!profile) {
            console.log('Profile missing for existing user, creating it');
            await supabaseAdmin.from('profiles').insert({
              id: userId,
              email: email,
              full_name: fullName || ""
            });
            // Also ensure role
            await supabaseAdmin.from('user_roles').insert({
              user_id: userId,
              role: 'staff'
            }).catch(() => { }); // Ignore duplicate role errors
          }

          return new Response(
            JSON.stringify({ success: true, message: "User auto-confirmed and profile ensured" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log('User exists but not confirmed. Re-sending verification email.');
      } else {
        // Step 1: Create user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: isBypass, // Auto-confirm if bypass
          user_metadata: {
            full_name: fullName || "",
          },
        });

        if (createError) {
          console.error("Create user error:", createError);
          if (createError.message.includes('already registered')) {
            return new Response(
              JSON.stringify({ success: true, message: "User exists" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          throw new Error(`Failed to create user: ${createError.message}`);
        }
        userId = newUser.user.id;
        console.log('New user created successfully:', userId, 'Bypass:', isBypass);

        if (isBypass) {
          return new Response(
            JSON.stringify({ success: true, message: "User created and auto-confirmed" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Step 2: Generate HMAC-signed verification token (Only for non-bypass)
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
      const payload = `${userId}:${expiresAt}`;
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
      const signature = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
      const token = `${userId}:${expiresAt}:${signature}`;
      const verifyUrl = `${supabaseUrl}/functions/v1/verify-email?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirectTo || "/")}`;

      subject = strings.signupSubject;
      html = buildEmailHtml(lang, strings.signupTitle, strings.signupText, strings.signupButton, verifyUrl, strings.signupFooter);

    } else {
      return new Response(
        JSON.stringify({ error: "Invalid email type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: resendData, error: resendError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject,
      html,
    });

    if (resendError) {
      console.error("Resend API error:", JSON.stringify(resendError, null, 2));
      return new Response(
        JSON.stringify({
          error: "Email service reported an error",
          details: resendError,
          suggestion: "Please check if the sender domain is verified in Resend."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Resend response:", JSON.stringify(resendData, null, 2));
    console.log("Email sent successfully to:", email);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Send auth email error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
