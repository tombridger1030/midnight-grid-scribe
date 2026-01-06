/**
 * ShipInput Component
 *
 * Inline form for adding new ships with proper focus states
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShipInputProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (description: string, url: string) => void;
  className?: string;
}

export const ShipInput: React.FC<ShipInputProps> = ({
  isOpen,
  onClose,
  onSubmit,
  className,
}) => {
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");

  // Reset form when closed
  useEffect(() => {
    if (!isOpen) {
      setDescription("");
      setUrl("");
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim()) {
      onSubmit(description.trim(), url.trim());
      setDescription("");
      setUrl("");
      onClose();
    }
  };

  const handleCancel = () => {
    setDescription("");
    setUrl("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className={cn("overflow-hidden", className)}
        >
          <form
            onSubmit={handleSubmit}
            className="p-4 rounded-xl border border-line bg-surface-secondary"
          >
            {/* Description input */}
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you ship?"
              className={cn(
                "w-full bg-transparent border-b-2 border-line",
                "focus:border-terminal-accent focus:outline-none",
                "transition-colors py-2 text-content-primary",
                "placeholder:text-content-muted",
              )}
              autoFocus
              maxLength={200}
            />

            {/* URL input */}
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Proof URL (optional - GitHub PR, tweet, etc.)"
              className={cn(
                "w-full bg-transparent border-b border-line",
                "focus:border-terminal-accent focus:outline-none",
                "transition-colors py-2 mt-3 text-sm text-content-primary",
                "placeholder:text-content-muted",
              )}
              maxLength={500}
            />

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm text-content-muted hover:text-content-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!description.trim()}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                  "bg-terminal-accent text-black",
                  "hover:bg-terminal-accent/90 hover:shadow-glow",
                  "transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                <Plus size={16} />
                <span>Ship It</span>
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Compact trigger button version
export const ShipInputTrigger: React.FC<{
  onClick: () => void;
  showLabel?: boolean;
}> = ({ onClick, showLabel = true }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
        "bg-terminal-accent text-black",
        "hover:bg-terminal-accent/90 hover:shadow-glow",
        "transition-all",
      )}
    >
      <Plus size={16} />
      {showLabel && <span>Add Ship</span>}
    </button>
  );
};

export default ShipInput;
