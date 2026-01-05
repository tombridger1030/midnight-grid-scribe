/**
 * Settings Page
 * 
 * Clean, minimal dark settings page with collapsible sections.
 * Replaces the old Profile.tsx page.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import {
  ProfileSection,
  SecuritySection,
  NavigationSection,
  GitHubSection,
  AdminSection,
} from '@/components/settings';

const Settings: React.FC = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-terminal-accent/60"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto px-6 py-8"
    >
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-xl font-mono text-terminal-accent">Settings</h1>
        <p className="text-sm text-content-muted mt-1">
          Manage your account and integrations
        </p>
      </header>

      {/* Sections */}
      <div className="space-y-4">
        <ProfileSection />
        <SecuritySection />
        <NavigationSection />
        <GitHubSection />
        {profile?.is_admin && <AdminSection />}
      </div>
    </motion.div>
  );
};

export default Settings;
