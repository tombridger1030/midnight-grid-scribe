/**
 * DayModal Component
 *
 * Modal showing ships and activity details for a selected day.
 */

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { loadNoctisiumData, ShipRecord } from "@/lib/storage";
import { ExternalLink, GitPullRequest, FileText, Share2 } from "lucide-react";

interface DayModalProps {
  date: string | null; // YYYY-MM-DD format
  onClose: () => void;
}

const SOURCE_CONFIG: Record<
  ShipRecord["source"],
  { label: string; icon: React.ReactNode; color: string }
> = {
  manual: {
    label: "Manual",
    icon: <FileText className="w-3 h-3" />,
    color: "bg-cyan-500/20 text-cyan-400",
  },
  github_pr: {
    label: "GitHub PR",
    icon: <GitPullRequest className="w-3 h-3" />,
    color: "bg-purple-500/20 text-purple-400",
  },
  content_publish: {
    label: "Content",
    icon: <Share2 className="w-3 h-3" />,
    color: "bg-green-500/20 text-green-400",
  },
  content_input: {
    label: "Content",
    icon: <Share2 className="w-3 h-3" />,
    color: "bg-green-500/20 text-green-400",
  },
  social_media: {
    label: "Social",
    icon: <Share2 className="w-3 h-3" />,
    color: "bg-blue-500/20 text-blue-400",
  },
};

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function DayModal({ date, onClose }: DayModalProps) {
  const [ships, setShips] = useState<ShipRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!date) {
      setShips([]);
      return;
    }

    setIsLoading(true);

    // Load ships from localStorage
    const data = loadNoctisiumData();
    const dayShips = (data.ships || []).filter((ship) => {
      const shipDate = ship.timestamp.split("T")[0];
      return shipDate === date;
    });

    // Sort by timestamp descending (newest first)
    dayShips.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    setShips(dayShips);
    setIsLoading(false);
  }, [date]);

  if (!date) return null;

  return (
    <Dialog open={!!date} onOpenChange={() => onClose()}>
      <DialogContent className="bg-[#0d0d0d] border-[#333] text-[#e0e0e0] max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#8A8D93] font-mono text-lg">
            {formatDisplayDate(date)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="text-center text-[#6e7681] py-8">Loading...</div>
          ) : ships.length === 0 ? (
            <div className="text-center text-[#6e7681] py-8">
              No ships on this day
            </div>
          ) : (
            <>
              <div className="text-xs text-[#6e7681] mb-2">
                {ships.length} ship{ships.length !== 1 ? "s" : ""} on this day
              </div>

              {ships.map((ship) => {
                const config =
                  SOURCE_CONFIG[ship.source] || SOURCE_CONFIG.manual;

                return (
                  <div
                    key={ship.id}
                    className="bg-[#161616] border border-[#333] rounded-lg p-3 space-y-2"
                  >
                    {/* Header with source badge and time */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${config.color}`}
                      >
                        {config.icon}
                        {config.label}
                      </span>
                      <span className="text-xs text-[#6e7681]">
                        {formatTime(ship.timestamp)}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-[#e0e0e0]">{ship.description}</p>

                    {/* Metadata row */}
                    <div className="flex items-center gap-3 text-xs text-[#6e7681]">
                      {ship.cycleTimeMinutes && (
                        <span>
                          Cycle:{" "}
                          {ship.cycleTimeMinutes < 60
                            ? `${ship.cycleTimeMinutes}m`
                            : `${Math.round(ship.cycleTimeMinutes / 60)}h`}
                        </span>
                      )}

                      {ship.proofUrl && (
                        <a
                          href={ship.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DayModal;
