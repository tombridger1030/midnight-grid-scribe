/**
 * WhoopSection Component
 * Whoop OAuth connection settings for health telemetry syncing
 */

import React, { useState, useEffect } from "react";
import { Activity, Loader2, CheckCircle2, XCircle, Unlink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { SettingsSection } from "./SettingsSection";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const WHOOP_SCOPES =
  "read:recovery read:sleep read:workout read:cycles read:body_measurement offline";
const WHOOP_CLIENT_ID = import.meta.env.VITE_WHOOP_CLIENT_ID || "";

export const WhoopSection: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Handle OAuth callback — exchange code for tokens via edge function
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code || !user) return;

    const exchangeToken = async () => {
      const redirectUri =
        sessionStorage.getItem("whoop_redirect_uri") ||
        `${window.location.origin}/settings`;
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/whoop-callback?code=${encodeURIComponent(code)}&state=${params.get("state") || ""}&redirect_uri=${encodeURIComponent(redirectUri)}`,
        );
        if (res.ok) {
          toast.success("Whoop connected successfully");
          setIsConnected(true);
        } else {
          const err = await res.json();
          toast.error(`Whoop connection failed: ${err.error}`);
        }
      } catch {
        toast.error("Failed to connect Whoop");
      }
      // Clean URL
      window.history.replaceState({}, "", "/settings");
      sessionStorage.removeItem("whoop_oauth_state");
      sessionStorage.removeItem("whoop_redirect_uri");
    };

    exchangeToken();
  }, [user]);

  // Check connection status from mission_control_sync table
  useEffect(() => {
    const checkConnection = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("mission_control_sync")
          .select("whoop_connected")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Failed to check Whoop connection:", error);
        } else {
          setIsConnected(!!data?.whoop_connected);
        }
      } catch (error) {
        console.error("Failed to check Whoop connection:", error);
      } finally {
        setLoading(false);
      }
    };

    checkConnection();
  }, [user]);

  const handleConnect = () => {
    if (!WHOOP_CLIENT_ID) {
      toast.error("Whoop client ID is not configured");
      return;
    }

    // Redirect back to our own settings page — Whoop will append ?code=...
    const redirectUri = `${window.location.origin}/settings`;
    const state = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    sessionStorage.setItem("whoop_oauth_state", state);
    sessionStorage.setItem("whoop_redirect_uri", redirectUri);
    const params = new URLSearchParams({
      client_id: WHOOP_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: WHOOP_SCOPES,
      state,
    });

    window.location.href = `${WHOOP_AUTH_URL}?${params.toString()}`;
  };

  const handleDisconnect = async () => {
    if (!user) return;

    setDisconnecting(true);

    try {
      const { error } = await supabase
        .from("mission_control_sync")
        .update({ whoop_connected: false })
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      setIsConnected(false);
      toast.success("Whoop disconnected");
    } catch (error) {
      console.error("Failed to disconnect Whoop:", error);
      toast.error("Failed to disconnect Whoop");
    } finally {
      setDisconnecting(false);
    }
  };

  const clientIdConfigured = !!WHOOP_CLIENT_ID;

  return (
    <SettingsSection title="Whoop" icon={Activity} defaultExpanded={false}>
      <div className="space-y-4">
        {/* Connection Status */}
        {loading ? (
          <div className="flex items-center gap-2 px-3 py-2">
            <Loader2 size={16} className="animate-spin text-content-muted" />
            <span className="text-sm text-content-muted">
              Checking connection...
            </span>
          </div>
        ) : isConnected ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-neon-green/10 border border-neon-green/20">
            <CheckCircle2 size={16} className="text-neon-green" />
            <span className="text-sm text-neon-green">Connected</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-surface-tertiary border border-line/50">
            <XCircle size={16} className="text-content-muted" />
            <span className="text-sm text-content-muted">Not connected</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium",
                "border border-red-500/30 text-red-400",
                "hover:bg-red-500/10",
                "transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {disconnecting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Unlink size={16} />
              )}
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={!clientIdConfigured}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium",
                "transition-all duration-200",
                clientIdConfigured
                  ? "bg-terminal-accent text-black hover:bg-terminal-accent/90"
                  : "bg-surface-tertiary text-content-muted cursor-not-allowed border border-line/50",
              )}
            >
              <Activity size={16} />
              Connect Whoop
            </button>
          )}
        </div>

        {/* Info when client ID is missing */}
        {!clientIdConfigured && !isConnected && (
          <p className="text-xs text-content-muted">
            Whoop OAuth client ID is not configured. Set{" "}
            <code className="px-1 py-0.5 bg-surface-tertiary rounded text-xs">
              VITE_WHOOP_CLIENT_ID
            </code>{" "}
            in your environment to enable connection.
          </p>
        )}

        {/* Info Box */}
        <div className="p-3 rounded-md bg-surface-tertiary border border-line/50">
          <h4 className="text-sm font-medium text-content-primary mb-2">
            What does Whoop integration do?
          </h4>
          <ul className="text-xs text-content-muted space-y-1">
            <li>- Sync recovery, sleep, and workout data automatically</li>
            <li>- Track strain and body metrics alongside your KPIs</li>
            <li>
              - Surface health-performance correlations in Mission Control
            </li>
          </ul>
        </div>
      </div>
    </SettingsSection>
  );
};

export default WhoopSection;
