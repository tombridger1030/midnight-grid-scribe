/**
 * CyberpunkLogin Component
 *
 * Clean, fast login/signup form matching the main app aesthetic.
 * No theatrical animations - instant form display, immediate redirect.
 */

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { colors } from "@/styles/design-tokens";

interface CyberpunkLoginProps {
  onSuccess?: () => void;
}

const CyberpunkLogin: React.FC<CyberpunkLoginProps> = () => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    displayName: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let result;

      if (mode === "signup") {
        // Validation
        if (formData.password !== formData.confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (formData.password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
        if (!formData.username.trim()) {
          throw new Error("Username is required");
        }
        if (formData.username.length < 3) {
          throw new Error("Username must be at least 3 characters");
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
          throw new Error(
            "Username can only contain letters, numbers, _ and -",
          );
        }

        result = await signUp(
          formData.email,
          formData.password,
          formData.username.trim(),
          formData.displayName.trim() || formData.username.trim(),
        );
      } else {
        if (!formData.email || !formData.password) {
          throw new Error("Email and password are required");
        }

        result = await signIn(formData.email, formData.password);
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Success - auth state change will trigger redirect automatically
    } catch (err: any) {
      const errorMessage = err.message || "Authentication failed";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "signin" ? "signup" : "signin"));
    setFormData({
      email: "",
      password: "",
      username: "",
      displayName: "",
      confirmPassword: "",
    });
    setError("");
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ backgroundColor: colors.background.primary }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md mx-4"
      >
        {/* Login Card */}
        <div
          className="rounded-lg p-8"
          style={{
            backgroundColor: colors.background.secondary,
            border: `1px solid ${colors.border.DEFAULT}`,
          }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1
              className="text-2xl font-bold tracking-wide mb-2"
              style={{ color: colors.primary.DEFAULT }}
            >
              NOCTISIUM
            </h1>
            <p className="text-sm" style={{ color: colors.text.muted }}>
              {mode === "signin"
                ? "Sign in to continue"
                : "Create your account"}
            </p>
          </div>

          {/* Mode Toggle */}
          <div
            className="flex rounded-lg p-1 mb-6"
            style={{ backgroundColor: colors.background.tertiary }}
          >
            <button
              type="button"
              onClick={() => mode !== "signin" && toggleMode()}
              className="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all"
              style={{
                backgroundColor:
                  mode === "signin"
                    ? colors.background.elevated
                    : "transparent",
                color:
                  mode === "signin"
                    ? colors.primary.DEFAULT
                    : colors.text.muted,
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => mode !== "signup" && toggleMode()}
              className="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all"
              style={{
                backgroundColor:
                  mode === "signup"
                    ? colors.background.elevated
                    : "transparent",
                color:
                  mode === "signup"
                    ? colors.primary.DEFAULT
                    : colors.text.muted,
              }}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                className="block text-xs font-medium mb-1.5 uppercase tracking-wide"
                style={{ color: colors.text.secondary }}
              >
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 rounded-md text-sm outline-none transition-all"
                style={{
                  backgroundColor: colors.background.tertiary,
                  border: `1px solid ${colors.border.accent}`,
                  color: colors.text.primary,
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = colors.primary.DEFAULT)
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = colors.border.accent)
                }
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                required
              />
            </div>

            {/* Username (signup only) */}
            {mode === "signup" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label
                  className="block text-xs font-medium mb-1.5 uppercase tracking-wide"
                  style={{ color: colors.text.secondary }}
                >
                  Username
                </label>
                <input
                  type="text"
                  placeholder="yourname"
                  className="w-full px-3 py-2.5 rounded-md text-sm outline-none transition-all"
                  style={{
                    backgroundColor: colors.background.tertiary,
                    border: `1px solid ${colors.border.accent}`,
                    color: colors.text.primary,
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = colors.primary.DEFAULT)
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = colors.border.accent)
                  }
                  value={formData.username}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  required
                />
              </motion.div>
            )}

            {/* Display Name (signup only) */}
            {mode === "signup" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label
                  className="block text-xs font-medium mb-1.5 uppercase tracking-wide"
                  style={{ color: colors.text.secondary }}
                >
                  Display Name{" "}
                  <span style={{ color: colors.text.muted }}>(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Your Name"
                  className="w-full px-3 py-2.5 rounded-md text-sm outline-none transition-all"
                  style={{
                    backgroundColor: colors.background.tertiary,
                    border: `1px solid ${colors.border.accent}`,
                    color: colors.text.primary,
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = colors.primary.DEFAULT)
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = colors.border.accent)
                  }
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      displayName: e.target.value,
                    }))
                  }
                />
              </motion.div>
            )}

            {/* Password */}
            <div>
              <label
                className="block text-xs font-medium mb-1.5 uppercase tracking-wide"
                style={{ color: colors.text.secondary }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  className="w-full px-3 py-2.5 pr-10 rounded-md text-sm outline-none transition-all"
                  style={{
                    backgroundColor: colors.background.tertiary,
                    border: `1px solid ${colors.border.accent}`,
                    color: colors.text.primary,
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = colors.primary.DEFAULT)
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = colors.border.accent)
                  }
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: colors.text.muted }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = colors.text.primary)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = colors.text.muted)
                  }
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password (signup only) */}
            {mode === "signup" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label
                  className="block text-xs font-medium mb-1.5 uppercase tracking-wide"
                  style={{ color: colors.text.secondary }}
                >
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  className="w-full px-3 py-2.5 rounded-md text-sm outline-none transition-all"
                  style={{
                    backgroundColor: colors.background.tertiary,
                    border: `1px solid ${colors.border.accent}`,
                    color: colors.text.primary,
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = colors.primary.DEFAULT)
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = colors.border.accent)
                  }
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  required
                />
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-md"
                style={{
                  backgroundColor: `${colors.danger.DEFAULT}15`,
                  border: `1px solid ${colors.danger.DEFAULT}30`,
                }}
              >
                <AlertCircle
                  size={16}
                  style={{ color: colors.danger.DEFAULT }}
                />
                <span
                  className="text-sm"
                  style={{ color: colors.danger.DEFAULT }}
                >
                  {error}
                </span>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: colors.primary.DEFAULT,
                color: colors.background.primary,
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.boxShadow = `0 0 20px ${colors.primary.glow}`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{mode === "signin" ? "Sign In" : "Create Account"}</span>
              )}
            </button>
          </form>

          {/* Footer */}
          <div
            className="mt-6 pt-6 text-center text-xs"
            style={{
              borderTop: `1px solid ${colors.border.DEFAULT}`,
              color: colors.text.muted,
            }}
          >
            Noctisium
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CyberpunkLogin;
