import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  is_admin: boolean;
  user_preferences: {
    show_content_tab: boolean;
    enabled_modules: string[];
    default_view: string;
    theme_settings: {
      terminal_style: string;
      animation_enabled: boolean;
      sound_enabled: boolean;
    };
  };
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isImpersonating: boolean;
  originalProfile: UserProfile | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    username: string,
    displayName?: string,
  ) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
  impersonateUser: (userId: string) => Promise<{ error: any }>;
  stopImpersonation: () => Promise<{ error: any }>;
  getAllUsers: () => Promise<{ data: UserProfile[] | null; error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(
    null,
  );

  // Load user profile - prioritize localStorage for user changes
  const loadUserProfile = async (
    userId: string,
  ): Promise<UserProfile | null> => {
    // PRIORITY 1: Check if we have saved profile data in localStorage (user changes)
    const savedProfile = localStorage.getItem(`profile_${userId}`);

    if (savedProfile) {
      try {
        const parsedProfile = JSON.parse(savedProfile);

        // Backfill is_admin when missing in localStorage profile
        if (typeof parsedProfile.is_admin === "undefined") {
          try {
            const { data: adminData } = await supabase
              .from("user_profiles")
              .select("is_admin")
              .eq("id", userId)
              .maybeSingle();

            const isAdmin =
              (adminData && adminData.is_admin === true) ||
              userId === "0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b";
            const patchedProfile = { ...parsedProfile, is_admin: !!isAdmin };
            localStorage.setItem(
              `profile_${userId}`,
              JSON.stringify(patchedProfile),
            );
            return patchedProfile;
          } catch (_err) {
            const isAdmin = userId === "0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b";
            const patchedProfile = { ...parsedProfile, is_admin: isAdmin };
            localStorage.setItem(
              `profile_${userId}`,
              JSON.stringify(patchedProfile),
            );
            return patchedProfile;
          }
        }

        // Don't check database if we have usable localStorage data
        return parsedProfile;
      } catch (error) {
        console.error(
          "❌ Failed to parse saved profile from localStorage:",
          error,
        );
        // Clear corrupted localStorage data
        localStorage.removeItem(`profile_${userId}`);
      }
    }

    // PRIORITY 2: Only try database if no localStorage data exists
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (data && !error) {
        // Ensure is_admin exists (fallback to known admin id)
        const enriched = {
          ...data,
          is_admin:
            typeof (data as any).is_admin === "boolean"
              ? (data as any).is_admin
              : userId === "0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b",
        };
        // Save to localStorage for future use, but don't override existing user changes
        localStorage.setItem(`profile_${userId}`, JSON.stringify(enriched));
        return enriched as UserProfile;
      } else {
      }
    } catch (error) {
      console.error("❌ Database query failed:", error);
    }

    // PRIORITY 3: Create default profile only if neither localStorage nor database have data

    // Special handling for specific known users
    let username, displayName;
    if (userId === "0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b") {
      username = "tombridger";
      displayName = "Tom Bridger";
    } else if (userId === "f273e18b-b8d1-4f7b-970b-340d561008c4") {
      username = "test";
      displayName = "Test User";
    } else {
      username = `user_${userId.slice(0, 8)}`;
      displayName = `User ${userId.slice(0, 8)}`;
    }

    const profile: UserProfile = {
      id: userId,
      username,
      display_name: displayName,
      is_admin: userId === "0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b", // tombridger is admin
      user_preferences: {
        show_content_tab: true,
        enabled_modules: [
          "dashboard",
          "kpis",
          "visualizer",
          "roadmap",
          "cash",
          "content",
        ],
        default_view: "dashboard",
        theme_settings: {
          terminal_style: "cyberpunk",
          animation_enabled: true,
          sound_enabled: false,
        },
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save the default profile to localStorage
    localStorage.setItem(`profile_${userId}`, JSON.stringify(profile));
    return profile;
  };

  // Create user profile manually if trigger didn't work
  const createUserProfile = async (
    userId: string,
    email: string,
    username: string,
    displayName: string,
  ): Promise<UserProfile | null> => {
    try {
      const profileData = {
        id: userId,
        username,
        display_name: displayName,
        is_admin: userId === "0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b", // tombridger is admin
        user_preferences: {
          show_content_tab: true,
          enabled_modules: [
            "dashboard",
            "kpis",
            "visualizer",
            "roadmap",
            "cash",
            "content",
          ],
          default_view: "dashboard",
          theme_settings: {
            terminal_style: "cyberpunk",
            animation_enabled: true,
            sound_enabled: false,
          },
        },
      };
      const { data, error } = await supabase
        .from("user_profiles")
        .insert([profileData])
        .select()
        .single();

      if (error) {
        console.error("❌ Failed to create user profile:", error);
        return null;
      }

      // Also create default KPIs
      const defaultKpis = [
        {
          kpi_id: "strengthSessions",
          name: "Strength Sessions",
          target: 3,
          min_target: 2,
          unit: "sessions",
          category: "fitness",
          color: "#FF073A",
          sort_order: 1,
        },
        {
          kpi_id: "bjjSessions",
          name: "BJJ Sessions",
          target: 3,
          min_target: null,
          unit: "sessions",
          category: "fitness",
          color: "#53B4FF",
          sort_order: 2,
        },
        {
          kpi_id: "deepWorkHours",
          name: "Deep Work Hours",
          target: 100,
          min_target: 80,
          unit: "hours",
          category: "discipline",
          color: "#5FE3B3",
          sort_order: 3,
        },
        {
          kpi_id: "recoverySessions",
          name: "Recovery Sessions",
          target: 2,
          min_target: null,
          unit: "sessions",
          category: "fitness",
          color: "#FFD700",
          sort_order: 4,
        },
      ];

      const kpisWithUserId = defaultKpis.map((kpi) => ({
        ...kpi,
        user_id: userId,
        is_active: true,
      }));

      const { error: kpiError } = await supabase
        .from("user_kpis")
        .insert(kpisWithUserId);

      if (kpiError) {
        console.error("❌ Failed to create default KPIs:", kpiError);
        // Don't fail the whole process if KPIs fail
      } else {
      }

      return data as UserProfile;
    } catch (error) {
      console.error("❌ Error creating user profile:", error);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Set user ID immediately for initial session too
        import("@/lib/userStorage").then(({ userStorage }) => {
          userStorage.setUserId(session.user.id);
        });

        loadUserProfile(session.user.id).then(setProfile);

        // Migrate KPI targets from localStorage to database (one-time)
        import("@/lib/kpiTargetMigration").then(
          ({ migrateKpiTargetsToDatabase }) => {
            migrateKpiTargetsToDatabase(session.user.id);
          },
        );
      }

      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // IMMEDIATELY set user ID in userStorage to prevent race conditions
        const { userStorage } = await import("@/lib/userStorage");
        userStorage.setUserId(session.user.id);
        let userProfile = await loadUserProfile(session.user.id);
        setProfile(userProfile);

        // Migrate KPI targets from localStorage to database (one-time)
        const { migrateKpiTargetsToDatabase } =
          await import("@/lib/kpiTargetMigration");
        migrateKpiTargetsToDatabase(session.user.id);
      } else {
        // Clear user ID when signing out
        const { userStorage } = await import("@/lib/userStorage");
        userStorage.setUserId(null);

        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  // Sign up with email, password, and username
  const signUp = async (
    email: string,
    password: string,
    username: string,
    displayName?: string,
  ) => {
    console.log("🚀 Starting signup process:", {
      email,
      username,
      displayName,
    });

    // TEMPORARILY BYPASS username check since table doesn't exist
    console.log("⏩ Skipping username check - no user_profiles table yet");

    // // Check if username is already taken
    // try {
    //   console.log('📋 Checking username availability...');
    //   const { data: existingProfile, error: checkError } = await supabase
    //     .from('user_profiles')
    //     .select('id')
    //     .eq('username', username)
    //     .maybeSingle();

    //   if (checkError && checkError.code !== 'PGRST116') {
    //     // PGRST116 is "not found" which is fine
    //     console.error('❌ Error checking username:', checkError);
    //     return { error: { message: 'Failed to verify username availability' } };
    //   }

    //   if (existingProfile) {
    //     console.log('❌ Username already taken:', username);
    //     return { error: { message: 'Username already taken' } };
    //   }

    //   console.log('✅ Username available:', username);
    // } catch (error) {
    //   console.error('❌ Username check failed:', error);
    //   // Continue with signup - the database constraints will catch duplicates
    // }

    console.log("📝 Creating Supabase user account...");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName || username,
        },
      },
    });

    if (error) {
      console.error("❌ Supabase signup failed:", error);

      // Handle specific error cases
      if (error.message?.includes("User already registered")) {
        return {
          error: {
            message:
              "This email is already registered. Please sign in instead, or use a different email address.",
          },
        };
      }
    } else {
      console.log("✅ Supabase user created:", {
        userId: data.user?.id,
        email: data.user?.email,
        metadata: data.user?.user_metadata,
        emailConfirmed: data.user?.email_confirmed_at,
        session: data.session
          ? "Session created"
          : "No session (email confirmation required)",
      });

      // Check if email confirmation is required
      if (!data.session && !data.user?.email_confirmed_at) {
        console.log(
          "📧 Email confirmation required. User needs to check their email.",
        );
        return {
          error: {
            message:
              "Please check your email and click the confirmation link to complete registration.",
          },
        };
      }
    }

    return { error };
  };

  // Sign out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  // Update user profile
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: { message: "No authenticated user" } };
    }

    console.log("🔄 Updating profile with:", updates);
    console.log("🆔 User ID:", user.id);

    let error = null;

    // First, always update localStorage immediately (user changes take priority)
    try {
      const currentProfile = localStorage.getItem(`profile_${user.id}`);
      console.log(
        "📖 Current localStorage profile before update:",
        currentProfile ? JSON.parse(currentProfile) : "null",
      );

      const profileData = currentProfile ? JSON.parse(currentProfile) : profile;
      console.log("🔄 Base profile data for merge:", profileData);
      console.log("🆕 Updates to apply:", updates);

      const updatedProfile = {
        ...profileData,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      console.log("🎯 Final updated profile:", updatedProfile);

      localStorage.setItem(
        `profile_${user.id}`,
        JSON.stringify(updatedProfile),
      );
      console.log(
        "✅ Profile saved to localStorage with key:",
        `profile_${user.id}`,
      );

      // Immediately verify the save worked
      const verificationData = localStorage.getItem(`profile_${user.id}`);
      const verifiedProfile = verificationData
        ? JSON.parse(verificationData)
        : null;
      console.log("🔍 Verification - data actually saved:", verifiedProfile);

      if (
        verifiedProfile?.username !== updates.username ||
        verifiedProfile?.display_name !== updates.display_name
      ) {
        console.error(
          "❌ VERIFICATION FAILED - saved data does not match updates!",
        );
        console.error("Expected:", updates);
        console.error("Actually saved:", {
          username: verifiedProfile?.username,
          display_name: verifiedProfile?.display_name,
        });
      } else {
        console.log("✅ Verification passed - data saved correctly");
      }
    } catch (localStorageErr) {
      console.error("❌ Failed to save to localStorage:", localStorageErr);
      error = { message: "Failed to save profile changes" };
    }

    // Then try to update the database (but don't fail if this doesn't work)
    try {
      const { error: dbError } = await supabase
        .from("user_profiles")
        .update(updates)
        .eq("id", user.id);

      if (dbError) {
        console.warn(
          "⚠️ Database update failed (but localStorage save succeeded):",
          dbError,
        );
      } else {
        console.log("✅ Profile updated successfully in database");
      }
    } catch (err) {
      console.warn(
        "❌ Database update failed (but localStorage save succeeded):",
        err,
      );
    }

    // Always update local profile state if we have a profile
    if (profile) {
      const updatedProfile = {
        ...profile,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      setProfile(updatedProfile);
      console.log("✅ Local profile state updated");
    }

    return { error };
  };

  // Get all users (admin only)
  const getAllUsers = async () => {
    if (!profile?.is_admin) {
      return {
        data: null,
        error: { message: "Not authorized: Admin access required" },
      };
    }

    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .order("username");

      return { data, error };
    } catch (err) {
      console.error("❌ Error fetching users:", err);
      return { data: null, error: { message: "Failed to fetch users" } };
    }
  };

  // Impersonate another user (admin only)
  const impersonateUser = async (targetUserId: string) => {
    if (!profile?.is_admin) {
      return { error: { message: "Not authorized: Admin access required" } };
    }

    if (isImpersonating) {
      return { error: { message: "Already impersonating another user" } };
    }

    try {
      console.log("🎭 Starting impersonation of user:", targetUserId);

      // Load the target user's profile
      const targetProfile = await loadUserProfile(targetUserId);
      if (!targetProfile) {
        return { error: { message: "Target user profile not found" } };
      }

      // Store original profile for restoration
      setOriginalProfile(profile);
      setIsImpersonating(true);

      // Switch to target user's profile
      setProfile(targetProfile);

      console.log("✅ Impersonation started:", {
        original: profile.username,
        target: targetProfile.username,
      });

      return { error: null };
    } catch (err) {
      console.error("❌ Error during impersonation:", err);
      return { error: { message: "Failed to impersonate user" } };
    }
  };

  // Stop impersonation and return to original user
  const stopImpersonation = async () => {
    if (!isImpersonating || !originalProfile) {
      return { error: { message: "Not currently impersonating" } };
    }

    try {
      console.log(
        "🔄 Stopping impersonation, returning to:",
        originalProfile.username,
      );

      // Restore original profile
      setProfile(originalProfile);
      setOriginalProfile(null);
      setIsImpersonating(false);

      console.log("✅ Impersonation stopped");
      return { error: null };
    } catch (err) {
      console.error("❌ Error stopping impersonation:", err);
      return { error: { message: "Failed to stop impersonation" } };
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    isImpersonating,
    originalProfile,
    signIn,
    signUp,
    signOut,
    updateProfile,
    impersonateUser,
    stopImpersonation,
    getAllUsers,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
