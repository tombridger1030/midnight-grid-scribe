// GitHub API integration utilities

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  repo: string;
  url: string;
}

export interface GitHubRepo {
  name: string;
  full_name: string;
  description: string;
  url: string;
  language: string;
  updated_at: string;
}

class GitHubIntegration {
  private apiToken: string | null = null;
  private username: string | null = null;

  constructor() {
    this.loadSettings();
  }

  loadSettings() {
    this.apiToken = localStorage.getItem('github_api_token');
    this.username = localStorage.getItem('github_username');
  }

  isConfigured(): boolean {
    return !!(this.apiToken && this.username);
  }

  getSettings() {
    return {
      apiToken: this.apiToken,
      username: this.username
    };
  }

  private async fetchFromGitHub(endpoint: string) {
    if (!this.apiToken) {
      throw new Error('GitHub API token not configured');
    }

    const response = await fetch(`https://api.github.com${endpoint}`, {
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      // Try to get error details from response body
      let errorMessage = response.statusText || `HTTP ${response.status}`;
      try {
        const errorBody = await response.json();
        if (errorBody.message) {
          errorMessage = errorBody.message;
        }
      } catch {
        // Ignore JSON parse errors
      }
      throw new Error(`GitHub API error: ${errorMessage}`);
    }

    return response.json();
  }

  async getRecentCommits(days: number = 5): Promise<GitHubCommit[]> {
    if (!this.isConfigured()) {
      console.warn('GitHub integration not configured');
      return [];
    }

    try {
      // Calculate date range
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceISO = since.toISOString();

      // Get user's repositories
      const repos = await this.fetchFromGitHub(`/user/repos?sort=updated&per_page=100`);

      // Fetch commits from each repo
      const allCommits: GitHubCommit[] = [];

      for (const repo of repos) {
        try {
          const commits = await this.fetchFromGitHub(
            `/repos/${repo.full_name}/commits?author=${this.username}&since=${sinceISO}&per_page=100`
          );

          for (const commit of commits) {
            allCommits.push({
              sha: commit.sha,
              message: commit.commit.message,
              author: commit.commit.author.name,
              date: commit.commit.author.date,
              repo: repo.full_name,
              url: commit.html_url
            });
          }
        } catch (error) {
          // This can happen for empty repos or repos without access - silently skip
          // Only log for debugging if not a common "no commits" case
          const errorMsg = error instanceof Error ? error.message : String(error);
          if (!errorMsg.includes('Git Repository is empty') && !errorMsg.includes('404')) {
            console.warn(`Skipping commits for ${repo.full_name}: ${errorMsg}`);
          }
          // Continue with other repos
        }
      }

      // Sort by date (newest first)
      allCommits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return allCommits;
    } catch (error) {
      console.error('Failed to fetch GitHub commits:', error);
      throw error;
    }
  }

  async getUserRepos(): Promise<GitHubRepo[]> {
    if (!this.isConfigured()) {
      console.warn('GitHub integration not configured');
      return [];
    }

    try {
      const repos = await this.fetchFromGitHub(`/user/repos?sort=updated&per_page=50`);

      return repos.map((repo: any) => ({
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description || '',
        url: repo.html_url,
        language: repo.language || 'Unknown',
        updated_at: repo.updated_at
      }));
    } catch (error) {
      console.error('Failed to fetch GitHub repos:', error);
      throw error;
    }
  }

  async getCommitStats(days: number = 7): Promise<{
    totalCommits: number;
    reposContributed: number;
    averagePerDay: number;
    byRepo: Record<string, number>;
  }> {
    const commits = await this.getRecentCommits(days);

    const byRepo: Record<string, number> = {};
    commits.forEach(commit => {
      byRepo[commit.repo] = (byRepo[commit.repo] || 0) + 1;
    });

    return {
      totalCommits: commits.length,
      reposContributed: Object.keys(byRepo).length,
      averagePerDay: commits.length / days,
      byRepo
    };
  }
}

export const githubIntegration = new GitHubIntegration();