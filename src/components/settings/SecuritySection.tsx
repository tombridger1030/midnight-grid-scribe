/**
 * SecuritySection Component
 * Password change functionality
 */

import React, { useState } from 'react';
import { Shield, Loader2, KeyRound } from 'lucide-react';
import { SettingsSection } from './SettingsSection';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const SecuritySection: React.FC = () => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChangePassword = async () => {
    // Validation
    if (!formData.currentPassword) {
      toast.error('Current password is required');
      return;
    }

    if (!formData.newPassword) {
      toast.error('New password is required');
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSaving(true);

    try {
      // TODO: Implement actual password change via Supabase
      // const { error } = await supabase.auth.updateUser({ password: formData.newPassword });
      
      toast.info('Password change is not yet implemented');
      
      // Clear form on success
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const hasInput = formData.currentPassword || formData.newPassword || formData.confirmPassword;

  return (
    <SettingsSection title="Security" icon={Shield}>
      <div className="space-y-4">
        {/* Current Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="currentPassword"
            className="block text-sm text-content-secondary"
          >
            Current Password
          </label>
          <input
            id="currentPassword"
            type="password"
            value={formData.currentPassword}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, currentPassword: e.target.value }))
            }
            placeholder="Enter current password"
            className={cn(
              'w-full px-3 py-2 rounded-md text-sm',
              'bg-surface border border-line',
              'text-content-primary placeholder:text-content-muted',
              'focus:outline-none focus:border-terminal-accent',
              'transition-colors duration-200'
            )}
          />
        </div>

        {/* New Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="newPassword"
            className="block text-sm text-content-secondary"
          >
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            value={formData.newPassword}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, newPassword: e.target.value }))
            }
            placeholder="Enter new password"
            className={cn(
              'w-full px-3 py-2 rounded-md text-sm',
              'bg-surface border border-line',
              'text-content-primary placeholder:text-content-muted',
              'focus:outline-none focus:border-terminal-accent',
              'transition-colors duration-200'
            )}
          />
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="confirmPassword"
            className="block text-sm text-content-secondary"
          >
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
            }
            placeholder="Confirm new password"
            className={cn(
              'w-full px-3 py-2 rounded-md text-sm',
              'bg-surface border border-line',
              'text-content-primary placeholder:text-content-muted',
              'focus:outline-none focus:border-terminal-accent',
              'transition-colors duration-200'
            )}
          />
        </div>

        {/* Change Password Button */}
        <div className="pt-2">
          <button
            onClick={handleChangePassword}
            disabled={saving || !hasInput}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium',
              'transition-all duration-200',
              hasInput
                ? 'bg-terminal-accent text-black hover:bg-terminal-accent/90'
                : 'bg-surface-tertiary text-content-muted cursor-not-allowed'
            )}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <KeyRound size={16} />
            )}
            {saving ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>
    </SettingsSection>
  );
};

export default SecuritySection;
