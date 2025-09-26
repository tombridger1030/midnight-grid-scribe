# GitHub Integration Setup

This document explains how to set up GitHub integration for automatic ship tracking in your Midnight Grid Scribe dashboard.

## Overview

The GitHub integration automatically tracks your development activity and creates ship records for:
- **Merged Pull Requests** (highest priority)
- **Releases and Tags** (high priority)  
- **Significant Commits** (filtered to avoid noise)

## Setup Instructions

### 1. Create a GitHub Personal Access Token

1. Go to GitHub Settings > Developer Settings > Personal Access Tokens > Tokens (classic)
2. Click "Generate new token (classic)"
3. Name: `Midnight Grid Scribe Integration`
4. Expiration: No expiration (or set to your preference)
5. Select these scopes:
   - `repo` (Full control of private repositories)
   - `public_repo` (Access public repositories)
   - `user:read` (Read user profile data)

6. Copy the generated token (starts with `ghp_`)

### 2. Configure Environment Variables

Create a `.env` file in your project root with:

```env
# GitHub Integration
VITE_GITHUB_TOKEN=ghp_your_personal_access_token_here
VITE_GITHUB_USERNAME=your_github_username
VITE_GITHUB_REPOS=midnight-grid-scribe,other-repo,another-repo
VITE_GITHUB_SYNC_ENABLED=true
```

**Configuration Options:**

- `VITE_GITHUB_TOKEN`: Your GitHub personal access token
- `VITE_GITHUB_USERNAME`: Your GitHub username
- `VITE_GITHUB_REPOS`: Comma-separated list of repository names to monitor
- `VITE_GITHUB_SYNC_ENABLED`: Set to `true` to enable automatic syncing

### 3. Restart the Application

After adding the environment variables, restart your development server:

```bash
npm run dev
# or
yarn dev
```

## How It Works

### Automatic Sync (Every 30 Minutes)
- The system polls GitHub API every 30 minutes
- Checks for new commits, merged PRs, and releases
- Creates ship records automatically with proper attribution
- Links directly to GitHub for proof

### Smart Filtering
The system intelligently filters GitHub activity to avoid noise:

**✅ Creates Ships For:**
- Merged PRs to main/master branches
- Releases and version tags
- Commits with keywords: feature, fix, ship, deploy, implement
- Commits that change substantial code (>5 lines)

**❌ Skips:**
- Documentation-only changes (.md, .txt files)
- Dependency updates (package.json, lock files)
- WIP/draft PRs
- Merge commits
- Small formatting changes

### Manual Sync
- Click the refresh button in the Ship Feed
- Forces immediate sync regardless of timing
- Shows sync status and results

## Verification

Once configured, you should see:

1. **GitHub Connection Indicator**: WiFi icon next to "Ship Feed" title
2. **Repository List**: Shows monitored repos and next sync time
3. **Sync Button**: Manual refresh button with spinning animation
4. **GitHub Ships**: Automatically created ships with GitHub icon and direct links

## Troubleshooting

### "GitHub integration not configured"
- Check that all environment variables are set correctly
- Ensure `VITE_GITHUB_SYNC_ENABLED=true`
- Restart the development server

### "GitHub API rate limit exceeded" 
- GitHub allows 5,000 API requests per hour with personal tokens
- The integration uses ~48 requests per day per repository
- Rate limits reset hourly

### No ships being created
- Check that repositories have recent activity (commits, PRs, releases)
- Verify repository names are correct in `VITE_GITHUB_REPOS`
- Check browser console for error messages
- Try manual sync to see detailed error messages

### Permission errors
- Ensure your personal access token has `repo` scope
- Verify you have access to the repositories listed
- Check that the username matches your GitHub account

## Security Notes

- Keep your GitHub token secure and never commit it to version control
- The token provides access to your repositories - treat it like a password
- You can revoke the token anytime in GitHub settings
- Consider setting an expiration date for enhanced security

## API Rate Limits

- Personal Access Token: 5,000 requests/hour
- Each sync checks: commits, PRs, releases for each repository
- Estimated usage: ~48 requests/day per repository
- Well within GitHub's limits for typical usage

## Advanced Configuration

### Custom Sync Interval
To change the sync frequency, modify `SYNC_INTERVAL_MS` in `src/lib/github.ts`:

```typescript
const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes instead of 30
```

### Custom Filtering Rules
Modify the filtering functions in `src/lib/github.ts`:
- `isSignificantCommit()` - Controls which commits create ships
- `isSignificantPR()` - Controls which PRs create ships

### Multiple GitHub Accounts
Currently supports one GitHub account. For multiple accounts, you would need to:
1. Extend the configuration format
2. Modify the API functions to handle multiple tokens
3. Update the UI to show multiple account status
