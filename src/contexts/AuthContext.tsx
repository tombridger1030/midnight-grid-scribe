import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
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
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string, displayName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
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

  // Load user profile - prioritize localStorage for user changes
  const loadUserProfile = async (userId: string): Promise<UserProfile | null> => {
    console.log(`🔍 Loading profile for user: ${userId}`);

    // PRIORITY 1: Check if we have saved profile data in localStorage (user changes)
    const savedProfile = localStorage.getItem(`profile_${userId}`);
    console.log('🔑 Checking localStorage with key:', `profile_${userId}`);
    console.log('📦 Raw localStorage data:', savedProfile);
    
    if (savedProfile) {
      try {
        const parsedProfile = JSON.parse(savedProfile);
        console.log('✅ Found saved profile in localStorage (using saved changes):');
        console.log('👤 Username:', parsedProfile.username);
        console.log('🏷️ Display name:', parsedProfile.display_name);
        console.log('📅 Updated at:', parsedProfile.updated_at);
        console.log('🔍 Full profile:', parsedProfile);
        // Don't check database if we have localStorage data - user changes take priority
        return parsedProfile;
      } catch (error) {
        console.error('❌ Failed to parse saved profile from localStorage:', error);
        // Clear corrupted localStorage data
        localStorage.removeItem(`profile_${userId}`);
      }
    }

    // PRIORITY 2: Only try database if no localStorage data exists
    console.log('📡 No localStorage data found, checking database...');
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        console.log('✅ Profile loaded from database:', data);
        // Save to localStorage for future use, but don't override existing user changes
        localStorage.setItem(`profile_${userId}`, JSON.stringify(data));
        return data;
      } else {
        console.log('⚠️ Database profile not found or failed:', error);
      }
    } catch (error) {
      console.error('❌ Database query failed:', error);
    }

    // PRIORITY 3: Create default profile only if neither localStorage nor database have data
    console.log('⚡ Creating default profile (no data found anywhere)');

    // Special handling for specific known users
    let username, displayName;
    if (userId === '0b3c6a14-8d1e-4ca4-b44f-8b89980bc61b') {
      username = 'tombridger';
      displayName = 'Tom Bridger';
    } else if (userId === 'f273e18b-b8d1-4f7b-970b-340d561008c4') {
      username = 'test';
      displayName = 'Test User';
    } else {
      username = `user_${userId.slice(0, 8)}`;
      displayName = `User ${userId.slice(0, 8)}`;
    }

    const profile: UserProfile = {
      id: userId,
      username,
      display_name: displayName,
      user_preferences: {
        show_content_tab: true,
        enabled_modules: ["dashboard", "kpis", "visualizer", "roadmap", "cash", "content"],
        default_view: "dashboard",
        theme_settings: {
          terminal_style: "cyberpunk",
          animation_enabled: true,
          sound_enabled: false
        }
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save the default profile to localStorage
    localStorage.setItem(`profile_${userId}`, JSON.stringify(profile));
    console.log('✅ Created and saved default profile:', profile);
    return profile;
  };

  // Create user profile manually if trigger didn't work
  const createUserProfile = async (userId: string, email: string, username: string, displayName: string): Promise<UserProfile | null> => {
    console.log('🛠️ Creating user profile manually:', { userId, email, username, displayName });

    try {
      const profileData = {
        id: userId,
        username,
        display_name: displayName,
        user_preferences: {
          show_content_tab: true,
          enabled_modules: ["dashboard", "kpis", "visualizer", "roadmap", "cash", "content"],
          default_view: "dashboard",
          theme_settings: {
            terminal_style: "cyberpunk",
            animation_enabled: true,
            sound_enabled: false
          }
        }
      };

      console.log('📝 Inserting profile data:', profileData);
      const { data, error } = await supabase
        .from('user_profiles')
        .insert([profileData])
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to create user profile:', error);
        return null;
      }

      console.log('✅ User profile created successfully:', data);

      // Also create default KPIs
      console.log('📊 Creating default KPIs...');
      const defaultKpis = [
        { kpi_id: 'strengthSessions', name: 'Strength Sessions', target: 3, min_target: 2, unit: 'sessions', category: 'fitness', color: '#FF073A', sort_order: 1 },
        { kpi_id: 'bjjSessions', name: 'BJJ Sessions', target: 3, min_target: null, unit: 'sessions', category: 'fitness', color: '#53B4FF', sort_order: 2 },
        { kpi_id: 'deepWorkHours', name: 'Deep Work Hours', target: 100, min_target: 80, unit: 'hours', category: 'discipline', color: '#5FE3B3', sort_order: 3 },
        { kpi_id: 'recoverySessions', name: 'Recovery Sessions', target: 2, min_target: null, unit: 'sessions', category: 'fitness', color: '#FFD700', sort_order: 4 }
      ];

      const kpisWithUserId = defaultKpis.map(kpi => ({
        ...kpi,
        user_id: userId,
        is_active: true
      }));

      const { error: kpiError } = await supabase
        .from('user_kpis')
        .insert(kpisWithUserId);

      if (kpiError) {
        console.error('❌ Failed to create default KPIs:', kpiError);
        // Don't fail the whole process if KPIs fail
      } else {
        console.log('✅ Default KPIs created successfully');
      }

      return data as UserProfile;
    } catch (error) {
      console.error('❌ Error creating user profile:', error);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    console.log('🚀 Initializing AuthContext...');

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔍 Initial session check:', session ? {
        userId: session.user?.id,
        email: session.user?.email,
        emailConfirmed: session.user?.email_confirmed_at
      } : 'No session found');

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Set user ID immediately for initial session too
        import('@/lib/userStorage').then(({ userStorage }) => {
          userStorage.setUserId(session.user.id);
          console.log('🔧 Set initial userStorage userId:', session.user.id);
        });
        
        loadUserProfile(session.user.id).then(setProfile);
      }

      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', { event, userId: session?.user?.id, email: session?.user?.email });

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        console.log('👤 User session found, loading profile...', session.user.id);
        
        // IMMEDIATELY set user ID in userStorage to prevent race conditions
        const { userStorage } = await import('@/lib/userStorage');
        userStorage.setUserId(session.user.id);
        console.log('🔧 Set userStorage userId:', session.user.id);
        
        console.log('📱 About to call loadUserProfile for:', session.user.id);
        let userProfile = await loadUserProfile(session.user.id);
        console.log('📱 loadUserProfile returned:', userProfile);

        // Profile should always be created now with localStorage fallback
        if (!userProfile) {
          console.log('⚠️ Profile still null after loadUserProfile - this should not happen with localStorage fallback');
        }

        console.log('📄 Setting profile state:', userProfile ? 'Profile loaded' : 'No profile');
        setProfile(userProfile);
      } else {
        console.log('👤 No user session, clearing profile');
        
        // Clear user ID when signing out
        const { userStorage } = await import('@/lib/userStorage');
        userStorage.setUserId(null);
        console.log('🔧 Cleared userStorage userId');
        
        setProfile(null);
      }

      console.log('⏱️ Setting loading to false');
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
  const signUp = async (email: string, password: string, username: string, displayName?: string) => {
    console.log('🚀 Starting signup process:', { email, username, displayName });

    // TEMPORARILY BYPASS username check since table doesn't exist
    console.log('⏩ Skipping username check - no user_profiles table yet');

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

    console.log('📝 Creating Supabase user account...');
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
      console.error('❌ Supabase signup failed:', error);

      // Handle specific error cases
      if (error.message?.includes('User already registered')) {
        return {
          error: {
            message: 'This email is already registered. Please sign in instead, or use a different email address.'
          }
        };
      }
    } else {
      console.log('✅ Supabase user created:', {
        userId: data.user?.id,
        email: data.user?.email,
        metadata: data.user?.user_metadata,
        emailConfirmed: data.user?.email_confirmed_at,
        session: data.session ? 'Session created' : 'No session (email confirmation required)'
      });

      // Check if email confirmation is required
      if (!data.session && !data.user?.email_confirmed_at) {
        console.log('📧 Email confirmation required. User needs to check their email.');
        return {
          error: {
            message: 'Please check your email and click the confirmation link to complete registration.'
          }
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
      return { error: { message: 'No authenticated user' } };
    }

    console.log('🔄 Updating profile with:', updates);
    console.log('🆔 User ID:', user.id);

    let error = null;

    // First, always update localStorage immediately (user changes take priority)
    try {
      const currentProfile = localStorage.getItem(`profile_${user.id}`);
      console.log('📖 Current localStorage profile before update:', currentProfile ? JSON.parse(currentProfile) : 'null');
      
      const profileData = currentProfile ? JSON.parse(currentProfile) : profile;
      console.log('🔄 Base profile data for merge:', profileData);
      console.log('🆕 Updates to apply:', updates);
      
      const updatedProfile = { ...profileData, ...updates, updated_at: new Date().toISOString() };
      console.log('🎯 Final updated profile:', updatedProfile);
      
      localStorage.setItem(`profile_${user.id}`, JSON.stringify(updatedProfile));
      console.log('✅ Profile saved to localStorage with key:', `profile_${user.id}`);
      
      // Immediately verify the save worked
      const verificationData = localStorage.getItem(`profile_${user.id}`);
      const verifiedProfile = verificationData ? JSON.parse(verificationData) : null;
      console.log('🔍 Verification - data actually saved:', verifiedProfile);
      
      if (verifiedProfile?.username !== updates.username || verifiedProfile?.display_name !== updates.display_name) {
        console.error('❌ VERIFICATION FAILED - saved data does not match updates!');
        console.error('Expected:', updates);
        console.error('Actually saved:', { username: verifiedProfile?.username, display_name: verifiedProfile?.display_name });
      } else {
        console.log('✅ Verification passed - data saved correctly');
      }
      
    } catch (localStorageErr) {
      console.error('❌ Failed to save to localStorage:', localStorageErr);
      error = { message: 'Failed to save profile changes' };
    }

    // Then try to update the database (but don't fail if this doesn't work)
    try {
      const { error: dbError } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id);

      if (dbError) {
        console.warn('⚠️ Database update failed (but localStorage save succeeded):', dbError);
      } else {
        console.log('✅ Profile updated successfully in database');
      }
    } catch (err) {
      console.warn('❌ Database update failed (but localStorage save succeeded):', err);
    }

    // Always update local profile state if we have a profile
    if (profile) {
      const updatedProfile = { ...profile, ...updates, updated_at: new Date().toISOString() };
      setProfile(updatedProfile);
      console.log('✅ Local profile state updated');
    }

    return { error };
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};