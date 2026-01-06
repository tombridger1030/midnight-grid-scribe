// AI Proxy Edge Function
// Proxies requests to OpenAI and Anthropic APIs to avoid CORS issues

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { provider, ...body } = await req.json();

    if (provider === "openai") {
      // Proxy to OpenAI
      const apiKey = Deno.env.get("OPENAI_API_KEY");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "OpenAI API key not configured" }),
          {
            status: 500,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          },
        );
      }

      const openaiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
        },
      );

      const data = await openaiResponse.json();

      if (!openaiResponse.ok) {
        return new Response(JSON.stringify(data), {
          status: openaiResponse.status,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (provider === "anthropic") {
      // Proxy to Anthropic
      const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "Anthropic API key not configured" }),
          {
            status: 500,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          },
        );
      }

      const anthropicResponse = await fetch(
        "https://api.anthropic.com/v1/messages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: body.model || "claude-sonnet-4-20250514",
            max_tokens: body.max_tokens || 4096,
            system: body.system,
            messages: body.messages,
            // Pass through tools parameter for web search and other capabilities
            tools: body.tools || undefined,
            tool_choice: body.tool_choice || undefined,
          }),
        },
      );

      const data = await anthropicResponse.json();

      if (!anthropicResponse.ok) {
        return new Response(JSON.stringify(data), {
          status: anthropicResponse.status,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid provider" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
