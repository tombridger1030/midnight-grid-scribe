/**
 * KPI Management Page
 * 
 * Standalone page for managing KPIs.
 * Wraps the existing KPIManagement component.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import KPIManagement from '@/components/KPIManagement';
import { cn } from '@/lib/utils';

const KPIManage: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto px-6 py-8"
    >
      {/* Header */}
      <header className="mb-6">
        <Link
          to="/kpis"
          className={cn(
            'inline-flex items-center gap-1.5 text-sm text-content-muted',
            'hover:text-terminal-accent transition-colors mb-3'
          )}
        >
          <ArrowLeft size={14} />
          Back to KPIs
        </Link>
        <h1 className="text-xl font-mono text-terminal-accent">KPI Management</h1>
        <p className="text-sm text-content-muted mt-1">
          Configure your weekly performance indicators
        </p>
      </header>

      {/* KPI Management Component */}
      <KPIManagement />
    </motion.div>
  );
};

export default KPIManage;
