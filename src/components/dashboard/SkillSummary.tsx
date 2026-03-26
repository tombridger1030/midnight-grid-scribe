import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useSkills } from "@/hooks/useSkills";
import { Progress } from "@/components/ui/progress";

export const SkillSummary: React.FC = () => {
  const { skills, isLoading, error, overallProgress, overdueCount } = useSkills();

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-8 p-4 border border-terminal-accent/20 rounded-lg text-sm text-terminal-accent/70"
      >
        Loading skills...
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-8 p-4 border border-red-500/40 rounded-lg text-sm text-red-400"
      >
        Failed to load skill summary.
      </motion.div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.55 }}
      className="mt-8 border border-terminal-accent/30 rounded-lg p-4 bg-terminal-bg/10"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-terminal-accent text-sm">Skills</h3>
        <Link
          to="/progression"
          className="text-xs text-terminal-accent/70 hover:text-terminal-accent flex items-center gap-1"
        >
          View all
          <ArrowRight size={12} />
        </Link>
      </div>

      {skills.length === 0 ? (
        <div className="text-sm text-terminal-accent/70">
          No skills tracked yet. Add one in progression.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-terminal-accent/70">Overall Progress</span>
            <span className="font-mono text-terminal-accent">
              {overallProgress.toFixed(1)}%
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />

          <div className="text-xs text-terminal-accent/70">
            Overdue checkpoints:{" "}
            <span className="font-mono text-terminal-accent">{overdueCount}</span>
          </div>

          <div className="space-y-2">
            {skills.slice(0, 4).map((skill) => (
              <div key={skill.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-terminal-accent/80 truncate pr-3">
                    {skill.name}
                  </span>
                  <span className="font-mono text-terminal-accent/80">
                    {skill.progressPercentage.toFixed(0)}%
                  </span>
                </div>
                <Progress value={skill.progressPercentage} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.section>
  );
};

export default SkillSummary;
