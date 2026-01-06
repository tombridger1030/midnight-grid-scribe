/**
 * Ships Page
 *
 * Dedicated page for logging and viewing ships.
 * Features new cyberpunk design matching Dashboard/Analytics.
 */

import React from "react";
import { motion } from "framer-motion";
import { ShipsFeed } from "@/components/ships/ShipsFeed";

const Ships: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto"
    >
      {/* Page Header */}
      <header className="mb-6">
        <h1 className="text-xl font-display text-terminal-accent mb-1">
          Shipping Log
        </h1>
        <p className="text-sm text-content-muted">
          Track your shipped work and progress
        </p>
      </header>

      {/* Ships Feed */}
      <ShipsFeed maxItems={50} />
    </motion.div>
  );
};

export default Ships;
