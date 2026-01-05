/**
 * AdminSection Component
 * User impersonation for admins
 */

import React, { useState, useEffect } from 'react';
import { Shield, Play, X, Loader2, RefreshCw, Users } from 'lucide-react';
import { useAuth, UserProfile } from '@/contexts/AuthContext';
import { SettingsSection } from './SettingsSection';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const AdminSection: React.FC = () => {
  const {
    profile,
    isImpersonating,
    originalProfile,
    impersonateUser,
    stopImpersonation,
    getAllUsers,
  } = useAuth();

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [manualUserId, setManualUserId] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [impersonationLoading, setImpersonationLoading] = useState(false);

  // Load users on mount
  useEffect(() => {
    if (profile?.is_admin) {
      loadUsers();
    }
  }, [profile?.is_admin]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await getAllUsers();
      if (error) {
        toast.error(error.message || 'Failed to load users');
        return;
      }
      setAllUsers(data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleImpersonate = async (userId?: string) => {
    const targetId = userId || selectedUserId;
    if (!targetId) {
      toast.error('Please select a user to impersonate');
      return;
    }

    setImpersonationLoading(true);
    try {
      const { error } = await impersonateUser(targetId);
      if (error) {
        toast.error(error.message || 'Failed to start impersonation');
        return;
      }
      toast.success('Impersonation started');
    } catch (error) {
      console.error('Failed to impersonate:', error);
      toast.error('Failed to impersonate user');
    } finally {
      setImpersonationLoading(false);
    }
  };

  const handleStopImpersonation = async () => {
    setImpersonationLoading(true);
    try {
      const { error } = await stopImpersonation();
      if (error) {
        toast.error(error.message || 'Failed to stop impersonation');
        return;
      }
      toast.success('Returned to your account');
    } catch (error) {
      console.error('Failed to stop impersonation:', error);
      toast.error('Failed to stop impersonation');
    } finally {
      setImpersonationLoading(false);
    }
  };

  return (
    <>
      {/* Impersonation Status Banner */}
      {isImpersonating && (
        <SettingsSection title="Active Impersonation" icon={Shield} variant="warning">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-content-primary">
                  <span className="text-content-muted">Original:</span>{' '}
                  {originalProfile?.display_name || originalProfile?.username}
                </p>
                <p className="text-sm text-content-primary">
                  <span className="text-content-muted">Viewing as:</span>{' '}
                  {profile?.display_name || profile?.username}
                </p>
              </div>
              <button
                onClick={handleStopImpersonation}
                disabled={impersonationLoading}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium',
                  'bg-red-500/20 text-red-400 border border-red-500/30',
                  'hover:bg-red-500/30',
                  'transition-all duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {impersonationLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <X size={16} />
                )}
                Stop
              </button>
            </div>
            <p className="text-xs text-content-muted">
              You are viewing the application as another user. All data shown belongs to them.
            </p>
          </div>
        </SettingsSection>
      )}

      {/* Impersonation Controls */}
      <SettingsSection title="User Impersonation" icon={Users}>
        <div className="space-y-4">
          {/* User Dropdown */}
          <div className="space-y-1.5">
            <label
              htmlFor="userSelect"
              className="block text-sm text-content-secondary"
            >
              Select User
            </label>
            <select
              id="userSelect"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={loadingUsers || isImpersonating}
              className={cn(
                'w-full px-3 py-2 rounded-md text-sm',
                'bg-surface border border-line',
                'text-content-primary',
                'focus:outline-none focus:border-terminal-accent',
                'transition-colors duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <option value="">Choose a user...</option>
              {allUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.display_name || user.username} ({user.username})
                  {user.is_admin ? ' - Admin' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleImpersonate()}
              disabled={!selectedUserId || impersonationLoading || isImpersonating}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium',
                'transition-all duration-200',
                selectedUserId && !isImpersonating
                  ? 'bg-terminal-accent text-black hover:bg-terminal-accent/90'
                  : 'bg-surface-tertiary text-content-muted cursor-not-allowed'
              )}
            >
              {impersonationLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Play size={16} />
              )}
              Start
            </button>

            <button
              onClick={loadUsers}
              disabled={loadingUsers}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium',
                'border border-line',
                'text-content-primary hover:bg-surface-hover',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {loadingUsers ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Refresh
            </button>
          </div>

          {/* Manual UUID Input */}
          <div className="pt-2 border-t border-line/50">
            <label
              htmlFor="manualUserId"
              className="block text-sm text-content-secondary mb-1.5"
            >
              Or enter User ID directly
            </label>
            <div className="flex gap-2">
              <input
                id="manualUserId"
                type="text"
                value={manualUserId}
                onChange={(e) => setManualUserId(e.target.value)}
                disabled={isImpersonating}
                placeholder="00000000-0000-0000-0000-000000000000"
                className={cn(
                  'flex-1 px-3 py-2 rounded-md text-sm font-mono',
                  'bg-surface border border-line',
                  'text-content-primary placeholder:text-content-muted',
                  'focus:outline-none focus:border-terminal-accent',
                  'transition-colors duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              />
              <button
                onClick={() => {
                  if (manualUserId.trim()) {
                    handleImpersonate(manualUserId.trim());
                  }
                }}
                disabled={!manualUserId.trim() || impersonationLoading || isImpersonating}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium',
                  'transition-all duration-200',
                  manualUserId.trim() && !isImpersonating
                    ? 'bg-terminal-accent text-black hover:bg-terminal-accent/90'
                    : 'bg-surface-tertiary text-content-muted cursor-not-allowed'
                )}
              >
                Go
              </button>
            </div>
            <p className="text-xs text-content-muted mt-1">
              Use this if the user isn't in the dropdown list.
            </p>
          </div>

          {/* User List */}
          {allUsers.length > 0 && (
            <div className="pt-2 border-t border-line/50">
              <h4 className="text-sm text-content-secondary mb-2">
                System Users ({allUsers.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {allUsers.map((user) => (
                  <div
                    key={user.id}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-md',
                      'bg-surface border border-line/50',
                      'text-sm'
                    )}
                  >
                    <span className="text-content-primary truncate">
                      {user.display_name || user.username}
                    </span>
                    <span className="text-xs text-content-muted">
                      {user.is_admin ? 'Admin' : 'User'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SettingsSection>
    </>
  );
};

export default AdminSection;
