/**
 * ShipEmptyState Component
 *
 * Empty state illustration for when no ships exist
 */

import React from "react";
import { motion } from "framer-motion";
import { Ship } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShipEmptyStateProps {
  onAddShip?: () => void;
  className?: string;
}

export const ShipEmptyState: React.FC<ShipEmptyStateProps> = ({
  onAddShip,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-20",
        className,
      )}
    >
      {/* Animated icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 15,
        }}
        className="relative mb-6"
      >
        <div className="w-20 h-20 rounded-2xl bg-surface-tertiary flex items-center justify-center">
          <Ship size={32} className="text-content-muted" />
        </div>
        {/* Glow effect */}
        <motion.div
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 bg-terminal-accent/20 rounded-2xl blur-xl -z-10"
        />
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-xl font-display text-terminal-accent mb-2"
      >
        No Ships Yet
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-content-muted text-center max-w-md mb-6"
      >
        Start shipping user-visible value to build your shipping streak
      </motion.p>

      {/* CTA Button */}
      {onAddShip && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={onAddShip}
          className="px-6 py-2.5 rounded-lg bg-terminal-accent text-black font-medium hover:bg-terminal-accent/90 hover:shadow-glow transition-all"
        >
          Log Your First Ship
        </motion.button>
      )}
    </div>
  );
};

export default ShipEmptyState;
