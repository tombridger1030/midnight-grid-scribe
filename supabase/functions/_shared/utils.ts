import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function createServiceClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

export function errorResponse(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

export async function getVaultSecret(
  supabase: ReturnType<typeof createServiceClient>,
  name: string,
): Promise<string | null> {
  // Uses custom SQL function created in migration (can't query vault schema via JS client)
  const { data, error } = await supabase.rpc("get_vault_secret", {
    secret_name: name,
  });
  if (error || !data) return null;
  return data as string;
}

export function getMissionControlUserId(): string {
  const userId = Deno.env.get("MISSION_CONTROL_USER_ID");
  if (!userId) throw new Error("MISSION_CONTROL_USER_ID not set");
  return userId;
}
