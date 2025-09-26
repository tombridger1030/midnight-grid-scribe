import { ShipRecord, logShip, loadNoctisiumData } from './storage';
// Import fixed for deduplication

// GitHub API configuration
const GITHUB_API_BASE = 'https://api.github.com';
const CACHE_KEY_LAST_SYNC = 'noctisium-github-last-sync';
const CACHE_KEY_GITHUB_DATA = 'noctisium-github-cache';
const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
  }>;
}

interface GitHubPullRequest {
  number: number;
  title: string;
  body?: string;
  state: string;
  merged_at: string | null;
  html_url: string;
  merge_commit_sha: string | null;
  base: {
    ref: string;
  };
  head: {
    ref: string;
  };
  user: {
    login: string;
  };
  additions?: number;
  deletions?: number;
  changed_files?: number;
}

interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  author: {
    login: string;
  };
}

interface GitHubShipMetadata {
  commitSha?: string;
  prNumber?: number;
  filesChanged?: number;
  branch?: string;
  author?: string;
  type: 'commit' | 'pr' | 'release';
}

interface GitHubConfig {
  token?: string;
  username?: string;
  repos: string[];
  enabled: boolean;
}

/**
 * Get GitHub configuration from environment variables
 */
export function getGitHubConfig(): GitHubConfig {
  const token = import.meta.env.VITE_GITHUB_TOKEN;
  const username = import.meta.env.VITE_GITHUB_USERNAME;
  const repos = import.meta.env.VITE_GITHUB_REPOS?.split(',').map((r: string) => r.trim()).filter(Boolean) || [];
  const enabled = import.meta.env.VITE_GITHUB_SYNC_ENABLED === 'true';

  console.log('🔧 GitHub Config:', {
    hasToken: !!token,
    tokenPrefix: token ? token.substring(0, 7) + '...' : 'none',
    username,
    repos,
    enabled
  });

  return { token, username, repos, enabled };
}

/**
 * Check if GitHub integration is properly configured
 */
export function isGitHubConfigured(): boolean {
  const config = getGitHubConfig();
  return !!(config.token && config.username && config.repos.length > 0 && config.enabled);
}

/**
 * Make authenticated GitHub API request
 */
async function githubRequest(endpoint: string): Promise<any> {
  const config = getGitHubConfig();
  
  if (!config.token) {
    throw new Error('GitHub token not configured');
  }

  console.log(`📡 GitHub API Request: ${endpoint}`);

  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'NoctisiumTracker/1.0'
    }
  });

  console.log(`📡 GitHub API Response: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    if (response.status === 403) {
      const rateLimitReset = response.headers.get('X-RateLimit-Reset');
      console.error('⚠️ GitHub API Rate Limit:', {
        remaining: response.headers.get('X-RateLimit-Remaining'),
        reset: rateLimitReset ? new Date(parseInt(rateLimitReset) * 1000).toISOString() : 'unknown'
      });
      throw new Error('GitHub API rate limit exceeded');
    }
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`📊 GitHub API Data:`, {
    endpoint,
    itemCount: Array.isArray(data) ? data.length : 'single item',
    dataType: typeof data
  });

  return data;
}

/**
 * Get the last sync timestamp
 */
function getLastSyncTime(): Date {
  const lastSync = localStorage.getItem(CACHE_KEY_LAST_SYNC);
  if (lastSync) {
    return new Date(lastSync);
  }
  // Default to 24 hours ago for first sync
  return new Date(Date.now() - 24 * 60 * 60 * 1000);
}

/**
 * Update the last sync timestamp
 */
function updateLastSyncTime(): void {
  localStorage.setItem(CACHE_KEY_LAST_SYNC, new Date().toISOString());
}

/**
 * Check if we should sync now (30 minutes since last sync)
 */
export function shouldSyncNow(): boolean {
  const lastSync = getLastSyncTime();
  const now = Date.now();
  return (now - lastSync.getTime()) >= SYNC_INTERVAL_MS;
}

/**
 * Fetch recent commits for a repository
 */
async function fetchRecentCommits(repo: string, since: Date): Promise<GitHubCommit[]> {
  const config = getGitHubConfig();
  const sinceIso = since.toISOString();
  
  console.log(`📦 Fetching commits for ${repo} since ${sinceIso}`);
  
  try {
    const commits = await githubRequest(`/repos/${config.username}/${repo}/commits?since=${sinceIso}&per_page=50`);
    
    console.log(`📦 Found ${commits.length} commits in ${repo}:`);
    commits.slice(0, 5).forEach((commit: any, i: number) => {
      console.log(`  ${i + 1}. ${commit.commit.message.split('\n')[0]} (${commit.sha.substring(0, 7)})`);
    });
    
    // Get detailed stats for each commit (GitHub API limitation - need separate calls)
    const detailedCommits = await Promise.all(
      commits.slice(0, 10).map(async (commit: any) => {
        try {
          const details = await githubRequest(`/repos/${config.username}/${repo}/commits/${commit.sha}`);
          console.log(`  📊 Commit ${commit.sha.substring(0, 7)} stats:`, {
            additions: details.stats?.additions || 0,
            deletions: details.stats?.deletions || 0,
            filesChanged: details.files?.length || 0
          });
          return {
            ...commit,
            stats: details.stats,
            files: details.files
          };
        } catch (error) {
          console.warn(`⚠️ Failed to fetch commit details for ${commit.sha}:`, error);
          return commit;
        }
      })
    );
    
    return detailedCommits;
  } catch (error) {
    console.error(`❌ Failed to fetch commits for ${repo}:`, error);
    return [];
  }
}

/**
 * Fetch recent merged pull requests for a repository
 */
async function fetchRecentPRs(repo: string, since: Date): Promise<GitHubPullRequest[]> {
  const config = getGitHubConfig();
  const sinceIso = since.toISOString();
  
  try {
    const prs = await githubRequest(`/repos/${config.username}/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=50`);
    
    // Filter for merged PRs since the specified date
    const mergedPRs = prs.filter((pr: GitHubPullRequest) => 
      pr.merged_at && new Date(pr.merged_at) > since
    );

    // Get detailed stats for each PR
    const detailedPRs = await Promise.all(
      mergedPRs.map(async (pr: any) => {
        try {
          const details = await githubRequest(`/repos/${config.username}/${repo}/pulls/${pr.number}`);
          return {
            ...pr,
            additions: details.additions,
            deletions: details.deletions,
            changed_files: details.changed_files
          };
        } catch (error) {
          console.warn(`Failed to fetch PR details for #${pr.number}:`, error);
          return pr;
        }
      })
    );
    
    return detailedPRs;
  } catch (error) {
    console.error(`Failed to fetch PRs for ${repo}:`, error);
    return [];
  }
}

/**
 * Fetch recent releases for a repository
 */
async function fetchRecentReleases(repo: string, since: Date): Promise<GitHubRelease[]> {
  const config = getGitHubConfig();
  
  try {
    const releases = await githubRequest(`/repos/${config.username}/${repo}/releases?per_page=20`);
    
    // Filter releases since the specified date
    return releases.filter((release: GitHubRelease) => 
      new Date(release.published_at) > since
    );
  } catch (error) {
    console.error(`Failed to fetch releases for ${repo}:`, error);
    return [];
  }
}

/**
 * Determine if a commit represents a significant change worth tracking
 */
function isSignificantCommit(commit: GitHubCommit): boolean {
  const message = commit.commit.message.toLowerCase();
  const sha = commit.sha.substring(0, 7);
  
  console.log(`🔍 Analyzing commit ${sha}: "${commit.commit.message.split('\n')[0]}"`);
  
  // Skip merge commits
  if (message.startsWith('merge ') || message.includes('merge branch')) {
    console.log(`  ⏩ Skipped: merge commit`);
    return false;
  }
  
  // Skip dependency updates
  if (message.includes('update dependencies') || 
      message.includes('bump version') ||
      message.includes('package-lock.json') ||
      message.match(/^(chore|docs|style):/)) {
    console.log(`  ⏩ Skipped: dependency/chore/docs update`);
    return false;
  }
  
  // Skip if only documentation/config files changed
  if (commit.files && commit.files.length > 0) {
    const significantFiles = commit.files.filter(file => 
      !file.filename.match(/\.(md|txt|json|yml|yaml|xml|config|env\.example)$/i) &&
      !file.filename.startsWith('.')
    );
    
    console.log(`  📁 Files: ${commit.files.length} total, ${significantFiles.length} significant`);
    
    if (significantFiles.length === 0) {
      console.log(`  ⏩ Skipped: only docs/config files changed`);
      return false;
    }
  }
  
  // Look for ship-worthy keywords
  const shipKeywords = ['feature', 'feat', 'fix', 'ship', 'deploy', 'release', 'implement', 'add'];
  const hasShipKeyword = shipKeywords.some(keyword => message.includes(keyword));
  
  // Require minimum change size or ship keyword
  const hasSubstantialChanges = commit.stats && commit.stats.total > 5;
  
  console.log(`  📊 Analysis:`, {
    hasShipKeyword,
    hasSubstantialChanges,
    totalChanges: commit.stats?.total || 0
  });
  
  const isSignificant = hasShipKeyword || hasSubstantialChanges;
  console.log(`  ${isSignificant ? '✅ SIGNIFICANT' : '⏩ Skipped'}: ${isSignificant ? 'Will create ship' : 'Not significant enough'}`);
  
  return isSignificant;
}

/**
 * Determine if a PR represents a significant change worth tracking
 */
function isSignificantPR(pr: GitHubPullRequest): boolean {
  const title = pr.title.toLowerCase();
  const body = (pr.body || '').toLowerCase();
  
  // Skip draft PRs or WIP
  if (title.includes('wip') || title.includes('draft') || body.includes('work in progress')) {
    return false;
  }
  
  // Skip dependency updates
  if (title.includes('dependabot') || title.includes('update dependencies')) {
    return false;
  }
  
  // Target main branches
  const mainBranches = ['main', 'master', 'production', 'prod'];
  if (!mainBranches.includes(pr.base.ref)) {
    return false;
  }
  
  // Look for ship-worthy content
  const shipKeywords = ['feature', 'feat', 'fix', 'ship', 'deploy', 'release', 'implement', 'add'];
  const hasShipKeyword = shipKeywords.some(keyword => 
    title.includes(keyword) || body.includes(keyword)
  );
  
  // Require minimum changes or ship keyword
  const hasSubstantialChanges = pr.changed_files && pr.changed_files > 1;
  
  return hasShipKeyword || hasSubstantialChanges;
}

/**
 * Convert GitHub commit to ship description
 */
function formatCommitAsShip(commit: GitHubCommit, repo: string): string {
  const message = commit.commit.message.split('\n')[0]; // First line only
  const fileCount = commit.files?.length || 0;
  const sha = commit.sha.substring(0, 7);
  
  if (fileCount > 0) {
    return `${message} (${fileCount} files, ${sha}) - ${repo}`;
  }
  return `${message} (${sha}) - ${repo}`;
}

/**
 * Convert GitHub PR to ship description
 */
function formatPRAsShip(pr: GitHubPullRequest, repo: string): string {
  const fileCount = pr.changed_files || 0;
  if (fileCount > 0) {
    return `PR #${pr.number}: ${pr.title} (${fileCount} files) - ${repo}`;
  }
  return `PR #${pr.number}: ${pr.title} - ${repo}`;
}

/**
 * Convert GitHub release to ship description
 */
function formatReleaseAsShip(release: GitHubRelease, repo: string): string {
  return `Release ${release.tag_name}: ${release.name || release.tag_name} - ${repo}`;
}

/**
 * Check if a ship with the same proof URL already exists
 */
function shipExists(proofUrl: string): boolean {
  const data = loadNoctisiumData();
  return data.ships.some(ship => ship.proofUrl === proofUrl);
}

/**
 * Process GitHub data and create ship records (with deduplication)
 */
function processGitHubData(
  commits: GitHubCommit[], 
  prs: GitHubPullRequest[], 
  releases: GitHubRelease[], 
  repo: string
): ShipRecord[] {
  const ships: ShipRecord[] = [];
  let skippedDuplicates = 0;
  
  console.log(`🔄 Processing GitHub data for ${repo}...`);
  
  // Process releases (highest priority)
  releases.forEach(release => {
    if (shipExists(release.html_url)) {
      console.log(`  ⏩ Skipped duplicate release: ${release.tag_name}`);
      skippedDuplicates++;
      return;
    }
    
    const ship = logShip(
      formatReleaseAsShip(release, repo),
      release.html_url,
      'github_pr' // Use github_pr type for all GitHub sources
    );
    
    // Update timestamp to match GitHub event
    ship.timestamp = release.published_at;
    ships.push(ship);
    console.log(`  ✅ Created ship for release: ${release.tag_name}`);
  });
  
  // Process merged PRs (high priority)
  prs.filter(isSignificantPR).forEach(pr => {
    if (shipExists(pr.html_url)) {
      console.log(`  ⏩ Skipped duplicate PR: #${pr.number}`);
      skippedDuplicates++;
      return;
    }
    
    const ship = logShip(
      formatPRAsShip(pr, repo),
      pr.html_url,
      'github_pr'
    );
    
    // Update timestamp to match merge time
    if (pr.merged_at) {
      ship.timestamp = pr.merged_at;
    }
    ships.push(ship);
    console.log(`  ✅ Created ship for PR: #${pr.number}`);
  });
  
  // Process significant commits (lower priority, avoid duplicates with PRs)
  const prCommitShas = new Set(prs.map(pr => pr.merge_commit_sha).filter(Boolean));
  commits
    .filter(commit => !prCommitShas.has(commit.sha))
    .filter(isSignificantCommit)
    .forEach(commit => {
      if (shipExists(commit.html_url)) {
        console.log(`  ⏩ Skipped duplicate commit: ${commit.sha.substring(0, 7)}`);
        skippedDuplicates++;
        return;
      }
      
      const ship = logShip(
        formatCommitAsShip(commit, repo),
        commit.html_url,
        'github_pr'
      );
      
      // Update timestamp to match commit time
      ship.timestamp = commit.commit.author.date;
      ships.push(ship);
      console.log(`  ✅ Created ship for commit: ${commit.sha.substring(0, 7)}`);
    });
  
  console.log(`📊 GitHub processing complete: ${ships.length} new ships, ${skippedDuplicates} duplicates skipped`);
  return ships;
}

/**
 * Sync GitHub data and create ship records
 */
export async function syncGitHubShips(): Promise<{ success: boolean; shipsCreated: number; error?: string }> {
  if (!isGitHubConfigured()) {
    return { success: false, shipsCreated: 0, error: 'GitHub integration not configured' };
  }
  
  if (!shouldSyncNow()) {
    return { success: true, shipsCreated: 0, error: 'Sync not needed yet' };
  }
  
  const config = getGitHubConfig();
  const lastSync = getLastSyncTime();
  
  console.log(`🔄 Syncing GitHub data since ${lastSync.toISOString()}...`);
  
  let totalShipsCreated = 0;
  
  try {
    for (const repo of config.repos) {
      console.log(`📦 Processing repository: ${repo}`);
      
      // Fetch data in parallel
      const [commits, prs, releases] = await Promise.all([
        fetchRecentCommits(repo, lastSync),
        fetchRecentPRs(repo, lastSync),
        fetchRecentReleases(repo, lastSync)
      ]);
      
      console.log(`Found ${commits.length} commits, ${prs.length} PRs, ${releases.length} releases in ${repo}`);
      
      // Process and create ships
      const ships = processGitHubData(commits, prs, releases, repo);
      totalShipsCreated += ships.length;
      
      console.log(`Created ${ships.length} ships from ${repo}`);
    }
    
    // Update sync timestamp
    updateLastSyncTime();
    
    console.log(`✅ GitHub sync complete. Created ${totalShipsCreated} ships total.`);
    
    return { success: true, shipsCreated: totalShipsCreated };
    
  } catch (error) {
    console.error('❌ GitHub sync failed:', error);
    return { 
      success: false, 
      shipsCreated: totalShipsCreated,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get GitHub sync status for UI display
 */
export function getGitHubSyncStatus(): {
  configured: boolean;
  lastSync: Date | null;
  nextSync: Date | null;
  repositories: string[];
} {
  const config = getGitHubConfig();
  const lastSync = getLastSyncTime();
  const nextSync = new Date(lastSync.getTime() + SYNC_INTERVAL_MS);
  
  return {
    configured: isGitHubConfigured(),
    lastSync,
    nextSync,
    repositories: config.repos
  };
}

/**
 * Manual sync trigger (bypasses time check)
 */
export async function triggerManualSync(): Promise<{ success: boolean; shipsCreated: number; error?: string }> {
  console.log('🔄 Manual sync triggered - bypassing time check');
  
  // Temporarily bypass time check by clearing last sync
  localStorage.removeItem(CACHE_KEY_LAST_SYNC);
  
  return await syncGitHubShips();
}

/**
 * Test function to verify GitHub integration with detailed logging
 */
export async function testGitHubIntegration(): Promise<void> {
  console.log('🧪 Testing GitHub Integration...');
  
  const config = getGitHubConfig();
  console.log('📋 Configuration check:', {
    configured: isGitHubConfigured(),
    hasToken: !!config.token,
    username: config.username,
    repos: config.repos,
    enabled: config.enabled
  });
  
  if (!isGitHubConfigured()) {
    console.error('❌ GitHub integration not properly configured');
    return;
  }
  
  // Clear cache for fresh test
  localStorage.removeItem(CACHE_KEY_LAST_SYNC);
  console.log('🧹 Cleared sync cache for fresh test');
  
  try {
    const result = await syncGitHubShips();
    console.log('🎯 Test completed:', result);
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Expose test function to window for console access
if (typeof window !== 'undefined') {
  (window as any).testGitHubIntegration = testGitHubIntegration;
}
