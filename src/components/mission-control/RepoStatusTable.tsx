import { useMemo } from "react";
import { mcTokens } from "@/styles/mission-control-tokens";
import { PanelHeader } from "./PanelHeader";

interface CommitRow {
  date: string;
  repo_name: string;
  commit_count: number;
  lines_added: number;
  lines_deleted: number;
}

interface RepoStatusTableProps {
  commits: CommitRow[];
  repoCount: number;
}

interface RepoAgg {
  name: string;
  todayCommits: number;
  monthCommits: number;
  netLoc: number;
  status: "today" | "week" | "inactive";
}

function formatLoc(n: number): string {
  if (n === 0) return "0";
  const sign = n > 0 ? "+" : "";
  const abs = Math.abs(n);
  if (abs >= 1000) {
    return `${sign}${(n / 1000).toFixed(1)}K`;
  }
  return `${sign}${n}`;
}

function stripOwner(repoName: string): string {
  const slash = repoName.indexOf("/");
  return slash !== -1 ? repoName.slice(slash + 1) : repoName;
}

const statusOrder: Record<string, number> = { today: 0, week: 1, inactive: 2 };

export function RepoStatusTable({ commits, repoCount }: RepoStatusTableProps) {
  const repos = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000)
      .toISOString()
      .slice(0, 10);
    const monthStart = todayStr.slice(0, 7);

    const map = new Map<
      string,
      {
        todayCommits: number;
        monthCommits: number;
        netLoc: number;
        hasToday: boolean;
        hasWeek: boolean;
      }
    >();

    for (const row of commits) {
      let entry = map.get(row.repo_name);
      if (!entry) {
        entry = {
          todayCommits: 0,
          monthCommits: 0,
          netLoc: 0,
          hasToday: false,
          hasWeek: false,
        };
        map.set(row.repo_name, entry);
      }
      if (row.date === todayStr) {
        entry.todayCommits += row.commit_count;
        entry.hasToday = true;
      }
      if (row.date >= weekAgo) {
        entry.hasWeek = true;
      }
      if (row.date >= monthStart + "-01") {
        entry.monthCommits += row.commit_count;
      }
      entry.netLoc += row.lines_added - row.lines_deleted;
    }

    const result: RepoAgg[] = [];
    for (const [name, data] of map) {
      let status: RepoAgg["status"] = "inactive";
      if (data.hasToday) status = "today";
      else if (data.hasWeek) status = "week";

      result.push({
        name: stripOwner(name),
        todayCommits: data.todayCommits,
        monthCommits: data.monthCommits,
        netLoc: data.netLoc,
        status,
      });
    }

    result.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    return result;
  }, [commits]);

  const statusDotColor: Record<string, string> = {
    today: "#00ff88",
    week: "#ffb800",
    inactive: "#5a7a9e",
  };

  const headerStyle: React.CSSProperties = {
    color: mcTokens.colors.accent.teal,
    fontSize: "11px",
    fontFamily: mcTokens.typography.fontFamily,
    fontWeight: mcTokens.typography.label.weight,
    letterSpacing: "1px",
    textTransform: "uppercase",
    padding: "0 4px 2px 0",
    textAlign: "left",
    borderBottom: `1px solid ${mcTokens.colors.border.subtle}`,
  };

  const cellStyle: React.CSSProperties = {
    color: mcTokens.colors.text.primary,
    fontSize: "11px",
    fontFamily: mcTokens.typography.fontFamily,
    padding: "0 4px",
    height: "20px",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PanelHeader title="REPO STATUS" detail={`${repoCount} TRACKED`} />
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          scrollbarWidth: "thin",
          scrollbarColor: `${mcTokens.colors.border.default} transparent`,
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >
          <thead>
            <tr>
              <th style={{ ...headerStyle, width: "40%" }}>REPO</th>
              <th style={{ ...headerStyle, width: "15%", textAlign: "right" }}>
                TODAY
              </th>
              <th style={{ ...headerStyle, width: "15%", textAlign: "right" }}>
                MONTH
              </th>
              <th style={{ ...headerStyle, width: "22%", textAlign: "right" }}>
                LoC
              </th>
              <th style={{ ...headerStyle, width: "8%", textAlign: "center" }}>
                {" "}
              </th>
            </tr>
          </thead>
          <tbody>
            {repos.map((repo) => (
              <tr key={repo.name}>
                <td
                  style={{
                    ...cellStyle,
                    maxWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {repo.name}
                </td>
                <td style={{ ...cellStyle, textAlign: "right" }}>
                  {repo.todayCommits || "--"}
                </td>
                <td style={{ ...cellStyle, textAlign: "right" }}>
                  {repo.monthCommits || "--"}
                </td>
                <td
                  style={{
                    ...cellStyle,
                    textAlign: "right",
                    color:
                      repo.netLoc > 0
                        ? mcTokens.colors.status.green
                        : repo.netLoc < 0
                          ? mcTokens.colors.status.red
                          : mcTokens.colors.text.primary,
                  }}
                >
                  {formatLoc(repo.netLoc)}
                </td>
                <td style={{ ...cellStyle, textAlign: "center" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: statusDotColor[repo.status],
                    }}
                  />
                </td>
              </tr>
            ))}
            {repos.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    ...cellStyle,
                    textAlign: "center",
                    color: mcTokens.colors.text.secondary,
                    padding: "16px 0",
                  }}
                >
                  No repositories tracked
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
