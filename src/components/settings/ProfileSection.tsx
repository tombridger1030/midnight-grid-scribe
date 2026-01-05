/**
 * ProfileSection Component
 * User profile information management
 */

import React, { useState, useEffect } from 'react';
import { User, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { userStorage } from '@/lib/userStorage';
import { SettingsSection } from './SettingsSection';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const ProfileSection: React.FC = () => {
  const { user, profile, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data from profile
  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        displayName: profile.display_name || '',
      });
    }
  }, [profile]);

  // Track changes
  useEffect(() => {
    const changed =
      formData.username !== (profile?.username || '') ||
      formData.displayName !== (profile?.display_name || '');
    setHasChanges(changed);
  }, [formData, profile]);

  const handleSave = async () => {
    if (!formData.username?.trim()) {
      toast.error('Username is required');
      return;
    }

    if (!formData.displayName?.trim()) {
      toast.error('Display name is required');
      return;
    }

    setSaving(true);

    try {
      const success = await userStorage.saveUserProfile(
        formData.username.trim(),
        formData.displayName.trim()
      );

      if (!success) {
        throw new Error('Failed to save profile changes');
      }

      // Update AuthContext state
      await updateProfile({
        username: formData.username.trim(),
        display_name: formData.displayName.trim(),
      });

      toast.success('Profile updated successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Profile save error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection title="Profile" icon={User}>
      <div className="space-y-4">
        {/* Username */}
        <div className="space-y-1.5">
          <label
            htmlFor="username"
            className="block text-sm text-content-secondary"
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            value={formData.username}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, username: e.target.value }))
            }
            placeholder="Enter username"
            className={cn(
              'w-full px-3 py-2 rounded-md text-sm',
              'bg-surface border border-line',
              'text-content-primary placeholder:text-content-muted',
              'focus:outline-none focus:border-terminal-accent',
              'transition-colors duration-200'
            )}
          />
        </div>

        {/* Display Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="displayName"
            className="block text-sm text-content-secondary"
          >
            Display Name
          </label>
          <input
            id="displayName"
            type="text"
            value={formData.displayName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, displayName: e.target.value }))
            }
            placeholder="Enter display name"
            className={cn(
              'w-full px-3 py-2 rounded-md text-sm',
              'bg-surface border border-line',
              'text-content-primary placeholder:text-content-muted',
              'focus:outline-none focus:border-terminal-accent',
              'transition-colors duration-200'
            )}
          />
        </div>

        {/* Email (readonly) */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-sm text-content-secondary"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={user?.email || ''}
            disabled
            className={cn(
              'w-full px-3 py-2 rounded-md text-sm',
              'bg-surface-tertiary border border-line/50',
              'text-content-muted cursor-not-allowed'
            )}
          />
        </div>

        {/* Save Button */}
        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium',
              'transition-all duration-200',
              hasChanges
                ? 'bg-terminal-accent text-black hover:bg-terminal-accent/90'
                : 'bg-surface-tertiary text-content-muted cursor-not-allowed'
            )}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </SettingsSection>
  );
};

export default ProfileSection;
