import React, { useState, useEffect } from 'react';
import { useAuth, UserProfile } from '@/contexts/AuthContext';
import { preferencesManager, UserPreferences } from '@/lib/userPreferences';
import { userStorage } from '@/lib/userStorage';
import TypewriterText from '@/components/TypewriterText';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User, Settings, Palette, BarChart3, Layout, Save, DollarSign, Github
} from 'lucide-react';
import { toast } from 'sonner';

const Profile: React.FC = () => {
  const { user, profile, updateProfile } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [profileForm, setProfileForm] = useState({
    username: '',
    displayName: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [githubSettings, setGithubSettings] = useState({
    apiToken: '',
    username: ''
  });

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Load preferences
        const userPrefs = await preferencesManager.getUserPreferences();
        setPreferences(userPrefs);

        // Set profile form
        setProfileForm({
          username: profile?.username || '',
          displayName: profile?.display_name || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });

        // Load GitHub settings from Supabase (with localStorage fallback)
        const githubSettings = await userStorage.getGithubSettings();
        if (githubSettings) {
          setGithubSettings({
            apiToken: githubSettings.api_token,
            username: githubSettings.username
          });
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
        toast.error('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user, profile]);

  // Save profile changes
  const handleSaveProfile = async () => {
    setSaving(true);
    
    try {
      const updates: Partial<UserProfile> = {};

      // Validate inputs
      if (!profileForm.username?.trim()) {
        throw new Error('Username is required');
      }

      if (!profileForm.displayName?.trim()) {
        throw new Error('Display name is required');
      }

      // Collect changes
      if (profileForm.username !== profile?.username) {
        updates.username = profileForm.username.trim();
      }

      if (profileForm.displayName !== profile?.display_name) {
        updates.display_name = profileForm.displayName.trim();
      }

      // Handle password change validation
      if (profileForm.newPassword || profileForm.confirmPassword) {
        if (profileForm.newPassword !== profileForm.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (profileForm.newPassword.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        // TODO: Implement password change
        toast.info('Password changes are not yet implemented');
        console.log('Password change not yet implemented');
      }

      if (Object.keys(updates).length > 0) {
        console.log('Saving profile changes:', updates);
        const { error } = await updateProfile(updates);
        
        if (error) {
          throw new Error(error.message || 'Failed to save profile changes');
        }

        toast.success(`Profile updated successfully! ${updates.username ? 'Username' : ''}${updates.username && updates.display_name ? ' and ' : ''}${updates.display_name ? 'Display name' : ''} saved.`);
      } else {
        toast.info('No changes to save');
      }

      // Clear password fields after successful save
      setProfileForm(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

    } catch (error: unknown) {
      console.error('Profile save error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save profile changes';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Update preferences
  const handleUpdatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!preferences) {
      toast.error('Preferences not loaded yet');
      return;
    }

    // Store original preferences for rollback
    const originalPreferences = { ...preferences };

    // Optimistically update the UI state first
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);

    try {
      await preferencesManager.updatePreferences(updates);
      
      // Dispatch custom event to notify other components of preference changes
      window.dispatchEvent(new CustomEvent('preferencesUpdated', { detail: updates }));
      
      // Only show success toast for major changes, not for every toggle
      const updateKeys = Object.keys(updates);
      if (updateKeys.some(key => ['enabled_modules', 'default_view'].includes(key))) {
        toast.success('Preferences updated successfully');
      }
      
      console.log('✅ Preferences updated:', updates);
    } catch (error) {
      // Revert the optimistic update on error
      setPreferences(originalPreferences);
      console.error('Failed to update preferences:', error);
      toast.error('Failed to update preferences - changes reverted');
    }
  };

  // Toggle module
  const handleToggleModule = async (moduleId: string, enabled: boolean) => {
    if (!preferences) return;

    const newModules = enabled
      ? [...preferences.enabled_modules, moduleId]
      : preferences.enabled_modules.filter(m => m !== moduleId);

    await handleUpdatePreferences({ enabled_modules: newModules });
  };

  // Save GitHub settings
  const handleSaveGithubSettings = async () => {
    setSaving(true);
    try {
      // Validate GitHub token format if provided
      if (githubSettings.apiToken && !githubSettings.apiToken.startsWith('ghp_') && !githubSettings.apiToken.startsWith('github_pat_')) {
        toast.warning('GitHub token should start with "ghp_" or "github_pat_"');
      }

      // Save to Supabase using dedicated GitHub settings method
      const success = await userStorage.saveGithubSettings(githubSettings.apiToken, githubSettings.username);

      if (success) {
        const message = githubSettings.apiToken
          ? `GitHub settings saved successfully${githubSettings.username ? ` for user ${githubSettings.username}` : ''}`
          : 'GitHub settings cleared successfully';

        toast.success(message);
      } else {
        throw new Error('Failed to save GitHub settings to database');
      }
    } catch (error: unknown) {
      console.error('GitHub settings save error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save GitHub settings';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Test GitHub connection
  const handleTestGithubConnection = async () => {
    if (!githubSettings.apiToken) {
      toast.error('Please enter a GitHub API token');
      return;
    }

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${githubSettings.apiToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Connected as ${data.login}`);

        // Auto-fill username if not set
        if (!githubSettings.username) {
          setGithubSettings(prev => ({ ...prev, username: data.login }));
        }
      } else {
        toast.error('Invalid GitHub token');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to GitHub';
      toast.error(errorMessage);
      console.error(error);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-terminal-accent">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <TypewriterText text="Profile & Settings" className="text-xl mb-2" />
        <p className="text-terminal-accent/70 text-sm">
          Manage your account settings and application preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="flex-1">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <User className="mr-2" size={20} />
              <h3 className="text-lg">Account Information</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={profileForm.username}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter username"
                />
              </div>

              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={profileForm.displayName}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Enter display name"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>

              <Button onClick={handleSaveProfile} disabled={saving}>
                <Save className="mr-2" size={16} />
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Settings className="mr-2" size={20} />
              <h3 className="text-lg">Change Password</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={profileForm.currentPassword}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={profileForm.newPassword}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, newPassword: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={profileForm.confirmPassword}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Layout className="mr-2" size={20} />
              <h3 className="text-lg">Module Settings</h3>
            </div>

            <div className="space-y-4">
              {preferencesManager.getAvailableModules().map(module => {
                const isChecked = preferences?.enabled_modules.includes(module.id) || false;
                
                return (
                  <div key={module.id} className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">{module.name}</Label>
                      <p className="text-xs text-muted-foreground">{module.description}</p>
                    </div>
                    <Switch
                      key={`${module.id}-${isChecked}`} // Force re-render when state changes
                      checked={isChecked}
                      onCheckedChange={(checked) => handleToggleModule(module.id, checked)}
                    />
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Palette className="mr-2" size={20} />
              <h3 className="text-lg">Theme Settings</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Matrix Background</Label>
                <Switch
                  key={`matrix-${preferences?.theme_settings.matrix_background || false}`}
                  checked={preferences?.theme_settings.matrix_background || false}
                  onCheckedChange={(checked) =>
                    handleUpdatePreferences({
                      theme_settings: { ...preferences?.theme_settings, matrix_background: checked }
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Glitch Effects</Label>
                <Switch
                  key={`glitch-${preferences?.theme_settings.glitch_effects || false}`}
                  checked={preferences?.theme_settings.glitch_effects || false}
                  onCheckedChange={(checked) =>
                    handleUpdatePreferences({
                      theme_settings: { ...preferences?.theme_settings, glitch_effects: checked }
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Animations</Label>
                <Switch
                  key={`animations-${preferences?.theme_settings.animation_enabled || false}`}
                  checked={preferences?.theme_settings.animation_enabled || false}
                  onCheckedChange={(checked) =>
                    handleUpdatePreferences({
                      theme_settings: { ...preferences?.theme_settings, animation_enabled: checked }
                    })
                  }
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center mb-4">
              <BarChart3 className="mr-2" size={20} />
              <h3 className="text-lg">Dashboard Layout</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Revenue Counter</Label>
                  <p className="text-xs text-muted-foreground">Display revenue lost counter widget</p>
                </div>
                <Switch
                  key={`revenue-counter-${preferences?.dashboard_layout.show_revenue_counter || false}`}
                  checked={preferences?.dashboard_layout.show_revenue_counter || false}
                  onCheckedChange={(checked) =>
                    handleUpdatePreferences({
                      dashboard_layout: { ...preferences?.dashboard_layout, show_revenue_counter: checked }
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Ship Feed</Label>
                  <p className="text-xs text-muted-foreground">Display shipping/deployment activity feed</p>
                </div>
                <Switch
                  key={`ship-feed-${preferences?.dashboard_layout.show_ship_feed || false}`}
                  checked={preferences?.dashboard_layout.show_ship_feed || false}
                  onCheckedChange={(checked) =>
                    handleUpdatePreferences({
                      dashboard_layout: { ...preferences?.dashboard_layout, show_ship_feed: checked }
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Priority Manager</Label>
                  <p className="text-xs text-muted-foreground">Display task priority management widget</p>
                </div>
                <Switch
                  key={`priority-manager-${preferences?.dashboard_layout.show_priority_manager || false}`}
                  checked={preferences?.dashboard_layout.show_priority_manager || false}
                  onCheckedChange={(checked) =>
                    handleUpdatePreferences({
                      dashboard_layout: { ...preferences?.dashboard_layout, show_priority_manager: checked }
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Weekly Constraint</Label>
                  <p className="text-xs text-muted-foreground">Display weekly constraint tracking</p>
                </div>
                <Switch
                  key={`weekly-constraint-${preferences?.dashboard_layout.show_weekly_constraint || false}`}
                  checked={preferences?.dashboard_layout.show_weekly_constraint || false}
                  onCheckedChange={(checked) =>
                    handleUpdatePreferences({
                      dashboard_layout: { ...preferences?.dashboard_layout, show_weekly_constraint: checked }
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Alert System</Label>
                  <p className="text-xs text-muted-foreground">Display system alerts and notifications</p>
                </div>
                <Switch
                  key={`alert-system-${preferences?.dashboard_layout.show_alert_system || false}`}
                  checked={preferences?.dashboard_layout.show_alert_system || false}
                  onCheckedChange={(checked) =>
                    handleUpdatePreferences({
                      dashboard_layout: { ...preferences?.dashboard_layout, show_alert_system: checked }
                    })
                  }
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center mb-4">
              <DollarSign className="mr-2" size={20} />
              <h3 className="text-lg">Cash Page Settings</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Burn Rate</Label>
                  <p className="text-xs text-muted-foreground">Display burn rate tracking section</p>
                </div>
                <Switch
                  key={`burn-rate-${preferences?.cash_layout.show_burn_rate || false}`}
                  checked={preferences?.cash_layout.show_burn_rate || false}
                  onCheckedChange={(checked) =>
                    handleUpdatePreferences({
                      cash_layout: { ...preferences?.cash_layout, show_burn_rate: checked }
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Runway</Label>
                  <p className="text-xs text-muted-foreground">Display runway calculation section</p>
                </div>
                <Switch
                  key={`runway-${preferences?.cash_layout.show_runway || false}`}
                  checked={preferences?.cash_layout.show_runway || false}
                  onCheckedChange={(checked) =>
                    handleUpdatePreferences({
                      cash_layout: { ...preferences?.cash_layout, show_runway: checked }
                    })
                  }
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Github className="mr-2" size={20} />
              <h3 className="text-lg">GitHub Integration</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="githubToken">GitHub Personal Access Token</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Create a token at{' '}
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-terminal-accent hover:underline"
                  >
                    github.com/settings/tokens
                  </a>
                  {' '}with <code className="text-xs bg-muted px-1 py-0.5 rounded">repo</code> scope
                </p>
                <Input
                  id="githubToken"
                  type="password"
                  value={githubSettings.apiToken}
                  onChange={(e) => setGithubSettings(prev => ({ ...prev, apiToken: e.target.value }))}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                />
              </div>

              <div>
                <Label htmlFor="githubUsername">GitHub Username</Label>
                <Input
                  id="githubUsername"
                  value={githubSettings.username}
                  onChange={(e) => setGithubSettings(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="your-github-username"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleTestGithubConnection} variant="outline">
                  <Github className="mr-2" size={16} />
                  Test Connection
                </Button>
                <Button onClick={handleSaveGithubSettings} disabled={saving}>
                  <Save className="mr-2" size={16} />
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>

              <div className="mt-4 p-4 bg-muted rounded-md">
                <h4 className="text-sm font-medium mb-2">What can you do with GitHub integration?</h4>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Track commits and pull requests automatically</li>
                  <li>Sync repository activity to your dashboard</li>
                  <li>View contribution metrics and coding patterns</li>
                  <li>Automatically update KPIs based on GitHub activity</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;