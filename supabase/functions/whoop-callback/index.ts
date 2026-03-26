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
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    if (!code) return errorResponse("Missing authorization code", 400);

    const clientId = Deno.env.get("WHOOP_CLIENT_ID");
    const clientSecret = Deno.env.get("WHOOP_CLIENT_SECRET");
    const redirectUri = Deno.env.get("WHOOP_REDIRECT_URI");

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

    // Store tokens in Vault (create or update)
    // Try update first, create if not exists
    const { error: accessErr } = await supabase.rpc("update_vault_secret", {
      secret_name: "whoop_access_token",
      new_secret: tokens.access_token,
    });
    if (accessErr) {
      // Secret doesn't exist yet -- create it via SQL
      await supabase.rpc("create_vault_secret", {
        secret_name: "whoop_access_token",
        secret_value: tokens.access_token,
      });
    }

    const { error: refreshErr } = await supabase.rpc("update_vault_secret", {
      secret_name: "whoop_refresh_token",
      new_secret: tokens.refresh_token,
    });
    if (refreshErr) {
      await supabase.rpc("create_vault_secret", {
        secret_name: "whoop_refresh_token",
        secret_value: tokens.refresh_token,
      });
    }

    // Update sync table
    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000,
    ).toISOString();
    await supabase.from("mission_control_sync").upsert(
      {
        user_id: userId,
        whoop_connected: true,
        whoop_token_expires_at: expiresAt,
      },
      { onConflict: "user_id" },
    );

    // Redirect back to settings page
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${Deno.env.get("ALLOWED_ORIGIN") || ""}/settings?whoop=connected`,
      },
    });
  } catch (err) {
    console.error(
      "Whoop callback error:",
      err instanceof Error ? err.message : String(err),
    );
    return errorResponse("Whoop connection failed");
  }
});
