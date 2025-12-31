/**
 * Ships Page
 * 
 * Dedicated page for logging and viewing ships.
 * Includes manual ships, GitHub commits, and content published.
 */

import React from 'react';
import { ShipFeed } from '@/components/ShipFeed';

const Ships: React.FC = () => {
  return (
    <div className="min-h-screen bg-terminal-bg p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <ShipFeed maxItems={50} />
      </div>
    </div>
  );
};

export default Ships;
