import {
  createServiceClient,
  corsHeaders,
  errorResponse,
  jsonResponse,
  getMissionControlUserId,
} from "../_shared/utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    // Supabase Edge Functions may not pass query params via req.url correctly.
    // Try multiple methods to extract the authorization code.
    const url = new URL(req.url);
    let code = url.searchParams.get("code");

    // Fallback: check raw URL string for code param
    if (!code) {
      const rawMatch = req.url.match(/[?&]code=([^&]+)/);
      if (rawMatch) code = decodeURIComponent(rawMatch[1]);
    }

    // Fallback: check request body (some OAuth providers POST the code)
    if (!code && req.method === "POST") {
      try {
        const body = await req.text();
        const bodyParams = new URLSearchParams(body);
        code = bodyParams.get("code");
      } catch {
        /* ignore */
      }
    }

    // Fallback: check x-forwarded-uri or referer headers
    if (!code) {
      const forwarded =
        req.headers.get("x-forwarded-uri") ||
        req.headers.get("x-original-url") ||
        "";
      const fwdMatch = forwarded.match(/[?&]code=([^&]+)/);
      if (fwdMatch) code = decodeURIComponent(fwdMatch[1]);
    }

    if (!code) {
      console.error(
        "No code found. req.url:",
        req.url,
        "headers:",
        JSON.stringify(Object.fromEntries(req.headers)),
      );
      return errorResponse("Missing authorization code. URL: " + req.url, 400);
    }

    const clientId = Deno.env.get("WHOOP_CLIENT_ID");
    const clientSecret = Deno.env.get("WHOOP_CLIENT_SECRET");
    // Accept redirect_uri from query param (frontend passes it) or fall back to env
    const redirectUri =
      url.searchParams.get("redirect_uri") ||
      Deno.env.get("WHOOP_REDIRECT_URI");

    if (!clientId || !clientSecret || !redirectUri) {
      return errorResponse("Whoop OAuth not configured", 500);
    }

    // Exchange code for tokens
    const tokenRes = await fetch(
      "https://api.prod.whoop.com/oauth/oauth2/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        }),
      },
    );

    if (!tokenRes.ok) {
      console.error(`Whoop token exchange failed: status ${tokenRes.status}`);
      return errorResponse("Token exchange failed", 401);
    }

    const tokens = await tokenRes.json();
    const supabase = createServiceClient();
    const userId = getMissionControlUserId();

    // Store tokens in sync table
    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000,
    ).toISOString();
    await supabase.from("mission_control_sync").upsert(
      {
        user_id: userId,
        whoop_connected: true,
        whoop_access_token: tokens.access_token,
        whoop_refresh_token: tokens.refresh_token,
        whoop_token_expires_at: expiresAt,
      },
      { onConflict: "user_id" },
    );

    return jsonResponse({ success: true, connected: true });
  } catch (err) {
    console.error(
      "Whoop callback error:",
      err instanceof Error ? err.message : String(err),
    );
    return errorResponse("Whoop connection failed");
  }
});
