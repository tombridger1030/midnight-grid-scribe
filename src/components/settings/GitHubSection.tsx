/**
 * GitHubSection Component
 * GitHub integration settings and connection testing
 */

import React, { useState, useEffect } from 'react';
import { Github, Save, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { userStorage } from '@/lib/userStorage';
import { SettingsSection } from './SettingsSection';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const GitHubSection: React.FC = () => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [formData, setFormData] = useState({
    apiToken: '',
    username: '',
  });

  // Load GitHub settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      
      try {
        const settings = await userStorage.getGithubSettings();
        if (settings) {
          setFormData({
            apiToken: settings.api_token || '',
            username: settings.username || '',
          });
          setIsConnected(!!settings.api_token);
        }
      } catch (error) {
        console.error('Failed to load GitHub settings:', error);
      }
    };

    loadSettings();
  }, [user]);

  const handleTestConnection = async () => {
    if (!formData.apiToken) {
      toast.error('Please enter a GitHub API token');
      return;
    }

    setTesting(true);

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${formData.apiToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Connected as ${data.login}`);
        setIsConnected(true);

        // Auto-fill username if not set
        if (!formData.username) {
          setFormData((prev) => ({ ...prev, username: data.login }));
        }
      } else {
        toast.error('Invalid GitHub token');
        setIsConnected(false);
      }
    } catch (error) {
      console.error('GitHub connection test failed:', error);
      toast.error('Failed to connect to GitHub');
      setIsConnected(false);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    // Validate token format
    if (
      formData.apiToken &&
      !formData.apiToken.startsWith('ghp_') &&
      !formData.apiToken.startsWith('github_pat_')
    ) {
      toast.warning('GitHub token should start with "ghp_" or "github_pat_"');
    }

    setSaving(true);

    try {
      const success = await userStorage.saveGithubSettings(
        formData.apiToken,
        formData.username
      );

      if (success) {
        const message = formData.apiToken
          ? `GitHub settings saved${formData.username ? ` for ${formData.username}` : ''}`
          : 'GitHub settings cleared';
        toast.success(message);
        setIsConnected(!!formData.apiToken);
      } else {
        throw new Error('Failed to save GitHub settings');
      }
    } catch (error) {
      console.error('GitHub save error:', error);
      toast.error('Failed to save GitHub settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection title="GitHub Integration" icon={Github}>
      <div className="space-y-4">
        {/* Connection Status */}
        {isConnected && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-neon-green/10 border border-neon-green/20">
            <CheckCircle2 size={16} className="text-neon-green" />
            <span className="text-sm text-neon-green">
              Connected{formData.username ? ` as ${formData.username}` : ''}
            </span>
          </div>
        )}

        {/* API Token */}
        <div className="space-y-1.5">
          <label
            htmlFor="githubToken"
            className="block text-sm text-content-secondary"
          >
            Personal Access Token
          </label>
          <input
            id="githubToken"
            type="password"
            value={formData.apiToken}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, apiToken: e.target.value }))
            }
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            className={cn(
              'w-full px-3 py-2 rounded-md text-sm font-mono',
              'bg-surface border border-line',
              'text-content-primary placeholder:text-content-muted',
              'focus:outline-none focus:border-terminal-accent',
              'transition-colors duration-200'
            )}
          />
          <p className="text-xs text-content-muted">
            Create a token at{' '}
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-terminal-accent hover:underline inline-flex items-center gap-1"
            >
              github.com/settings/tokens
              <ExternalLink size={10} />
            </a>
            {' '}with <code className="px-1 py-0.5 bg-surface-tertiary rounded text-xs">repo</code> scope
          </p>
        </div>

        {/* Username */}
        <div className="space-y-1.5">
          <label
            htmlFor="githubUsername"
            className="block text-sm text-content-secondary"
          >
            GitHub Username
          </label>
          <input
            id="githubUsername"
            type="text"
            value={formData.username}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, username: e.target.value }))
            }
            placeholder="your-github-username"
            className={cn(
              'w-full px-3 py-2 rounded-md text-sm',
              'bg-surface border border-line',
              'text-content-primary placeholder:text-content-muted',
              'focus:outline-none focus:border-terminal-accent',
              'transition-colors duration-200'
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleTestConnection}
            disabled={testing || !formData.apiToken}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium',
              'border border-line',
              'transition-all duration-200',
              formData.apiToken
                ? 'text-content-primary hover:bg-surface-hover hover:border-terminal-accent/50'
                : 'text-content-muted cursor-not-allowed'
            )}
          >
            {testing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Github size={16} />
            )}
            {testing ? 'Testing...' : 'Test Connection'}
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium',
              'bg-terminal-accent text-black',
              'hover:bg-terminal-accent/90',
              'transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* Info Box */}
        <div className="mt-4 p-3 rounded-md bg-surface-tertiary border border-line/50">
          <h4 className="text-sm font-medium text-content-primary mb-2">
            What can you do with GitHub integration?
          </h4>
          <ul className="text-xs text-content-muted space-y-1">
            <li>- Track commits and pull requests automatically</li>
            <li>- Sync repository activity to your dashboard</li>
            <li>- View contribution metrics and coding patterns</li>
            <li>- Automatically update KPIs based on GitHub activity</li>
          </ul>
        </div>
      </div>
    </SettingsSection>
  );
};

export default GitHubSection;
