import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Brain,
  Briefcase,
  Code2,
  DollarSign,
  Dumbbell,
  LucideIcon,
  Plus,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useProgression } from "@/hooks/useProgression";
import { useSkills } from "@/hooks/useSkills";
import type { SkillData, SkillCheckpoint } from "@/lib/skillProgression";
import type { WeeklyKPIValues } from "@/lib/weeklyKpi";
import SkillColumn from "@/components/SkillColumn";
import SkillProgressChart from "@/components/SkillProgressChart";
import KPIImpactVisualizer from "@/components/KPIImpactVisualizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const ICON_OPTIONS: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: "TrendingUp", label: "Growth", icon: TrendingUp },
  { value: "Dumbbell", label: "Fitness", icon: Dumbbell },
  { value: "Brain", label: "Focus", icon: Brain },
  { value: "DollarSign", label: "Finance", icon: DollarSign },
  { value: "Briefcase", label: "Career", icon: Briefcase },
  { value: "BookOpen", label: "Knowledge", icon: BookOpen },
  { value: "Code2", label: "Engineering", icon: Code2 },
  { value: "Target", label: "Targets", icon: Target },
];

interface SkillFormState {
  name: string;
  category: string;
  icon: string;
  color: string;
  unit: string;
  currentValue: string;
  targetValue: string;
}

interface CheckpointFormState {
  name: string;
  targetDate: string;
  progressPercentage: string;
}

const DEFAULT_SKILL_FORM: SkillFormState = {
  name: "",
  category: "",
  icon: "TrendingUp",
  color: "#5FE3B3",
  unit: "%",
  currentValue: "0",
  targetValue: "100",
};

const DEFAULT_CHECKPOINT_FORM: CheckpointFormState = {
  name: "",
  targetDate: "",
  progressPercentage: "0",
};

const Progression: React.FC = () => {
  const progression = useProgression();
  const {
    skills,
    isLoading,
    error,
    createSkill,
    deleteSkill,
    markCheckpointComplete,
    overallProgress,
    overdueCount,
  } = useSkills();

  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [skillForm, setSkillForm] = useState<SkillFormState>(DEFAULT_SKILL_FORM);
  const [checkpointForm, setCheckpointForm] = useState<CheckpointFormState>(
    DEFAULT_CHECKPOINT_FORM,
  );
  const [pendingCheckpoints, setPendingCheckpoints] = useState<
    Omit<SkillCheckpoint, "id">[]
  >([]);

  const selectedSkill = useMemo(() => {
    if (skills.length === 0) return null;
    if (!selectedSkillId) return skills[0];
    return skills.find((skill) => skill.id === selectedSkillId) || skills[0];
  }, [selectedSkillId, skills]);

  const currentWeekKPIs = useMemo(() => {
    try {
      const raw = localStorage.getItem("noctisium-weekly-kpis");
      if (!raw) return {};

      const parsed = JSON.parse(raw) as {
        records?: Array<{ weekKey: string; values: WeeklyKPIValues }>;
      };
      const records = parsed.records || [];
      const latestRecord = records.sort((a, b) => a.weekKey.localeCompare(b.weekKey)).at(-1);
      return latestRecord?.values || {};
    } catch {
      return {};
    }
  }, [skills.length]);

  const resetForm = () => {
    setSkillForm(DEFAULT_SKILL_FORM);
    setCheckpointForm(DEFAULT_CHECKPOINT_FORM);
    setPendingCheckpoints([]);
  };

  const addPendingCheckpoint = () => {
    if (!checkpointForm.name.trim() || !checkpointForm.targetDate) return;
    const checkpoint: Omit<SkillCheckpoint, "id"> = {
      name: checkpointForm.name.trim(),
      targetDate: checkpointForm.targetDate,
      progressPercentage: Number(checkpointForm.progressPercentage) || 0,
      isCompleted: false,
    };
    setPendingCheckpoints((previous) => [...previous, checkpoint]);
    setCheckpointForm(DEFAULT_CHECKPOINT_FORM);
  };

  const handleCreateSkill = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      await createSkill({
        name: skillForm.name.trim(),
        category: skillForm.category.trim(),
        icon: skillForm.icon,
        color: skillForm.color,
        unit: skillForm.unit,
        currentValue: Number(skillForm.currentValue) || 0,
        targetValue: Number(skillForm.targetValue) || 0,
        checkpoints: pendingCheckpoints,
      });
      setShowAddForm(false);
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-full">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-xl mx-auto pb-10 space-y-6"
      >
        <section className="border border-terminal-accent/30 rounded-lg p-4 bg-terminal-bg/20">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h1 className="text-lg text-terminal-accent">Progression</h1>
            <Button onClick={() => setShowAddForm(true)} className="gap-2">
              <Plus size={16} />
              Add Skill
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-xs text-terminal-accent/70">Level</div>
              <div className="font-mono text-terminal-accent font-bold">
                {progression.level}
              </div>
            </div>
            <div>
              <div className="text-xs text-terminal-accent/70">Rank</div>
              <div className="font-mono text-terminal-accent font-bold capitalize">
                {progression.rank}
              </div>
            </div>
            <div>
              <div className="text-xs text-terminal-accent/70">Streak</div>
              <div className="font-mono text-terminal-accent font-bold">
                {progression.streak}
              </div>
            </div>
            <div>
              <div className="text-xs text-terminal-accent/70">Skills</div>
              <div className="font-mono text-terminal-accent font-bold">
                {skills.length}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1 text-terminal-accent/70">
              <span>
                XP {progression.xpProgress.current}/{progression.xpProgress.required}
              </span>
              <span>{progression.xpProgress.percentage.toFixed(1)}%</span>
            </div>
            <Progress value={progression.xpProgress.percentage} className="h-2" />
          </div>
        </section>

        <section className="border border-terminal-accent/30 rounded-lg p-4 bg-terminal-bg/10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-terminal-accent text-sm">Skills</h2>
            <div className="text-xs text-terminal-accent/70 font-mono">
              AVG {overallProgress.toFixed(1)}% • {overdueCount} overdue
            </div>
          </div>

          {isLoading && (
            <div className="text-terminal-accent/70 text-sm py-8 text-center">
              Loading skills...
            </div>
          )}

          {!isLoading && error && (
            <div className="text-red-400 text-sm py-8 text-center">{error}</div>
          )}

          {!isLoading && !error && skills.length === 0 && (
            <div className="text-center py-8 space-y-3">
              <p className="text-terminal-accent/70 text-sm">
                No skills yet. Add your first skill to start tracking progression.
              </p>
              <Button onClick={() => setShowAddForm(true)}>Create First Skill</Button>
            </div>
          )}

          {!isLoading && !error && skills.length > 0 && (
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-4 min-w-max">
                {skills.map((skill) => (
                  <SkillColumn
                    key={skill.id}
                    skill={skill}
                    isSelected={selectedSkill?.id === skill.id}
                    onSkillClick={(clickedSkill) => setSelectedSkillId(clickedSkill.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {selectedSkill && (
          <section className="space-y-4">
            <div className="border border-terminal-accent/30 rounded-lg p-4 bg-terminal-bg/10">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-terminal-accent text-sm">Skill Trend</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteSkill(selectedSkill.id)}
                  className="gap-2"
                >
                  <Trash2 size={14} />
                  Delete
                </Button>
              </div>
              <SkillProgressChart
                skills={skills}
                selectedSkillId={selectedSkill.id}
                height={280}
              />
            </div>

            <div className="border border-terminal-accent/30 rounded-lg p-4 bg-terminal-bg/10">
              <KPIImpactVisualizer
                skill={selectedSkill}
                currentWeekKPIs={currentWeekKPIs}
                height={280}
              />
            </div>

            {selectedSkill.checkpoints.length > 0 && (
              <div className="border border-terminal-accent/30 rounded-lg p-4 bg-terminal-bg/10">
                <h3 className="text-terminal-accent text-sm mb-3">Checkpoints</h3>
                <div className="space-y-2">
                  {selectedSkill.checkpoints.map((checkpoint) => (
                    <div
                      key={checkpoint.id}
                      className="flex items-center justify-between border border-terminal-accent/20 rounded px-3 py-2 text-sm"
                    >
                      <div>
                        <div className="text-terminal-accent">{checkpoint.name}</div>
                        <div className="text-xs text-terminal-accent/60">
                          {checkpoint.targetDate} • {checkpoint.progressPercentage.toFixed(1)}%
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={checkpoint.isCompleted ? "secondary" : "outline"}
                        disabled={checkpoint.isCompleted}
                        onClick={() =>
                          markCheckpointComplete(selectedSkill.id, checkpoint.id)
                        }
                      >
                        {checkpoint.isCompleted ? "Complete" : "Mark Complete"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <div className="text-xs text-terminal-accent/50 text-center">
          Need a full weekly view? Open the <Link to="/dashboard" className="underline">Dashboard</Link>.
        </div>
      </motion.div>

      <Sheet open={showAddForm} onOpenChange={setShowAddForm}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Skill</SheetTitle>
            <SheetDescription>
              Create a skill target with optional checkpoints.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleCreateSkill} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="skill-name">Name</Label>
              <Input
                id="skill-name"
                value={skillForm.name}
                onChange={(event) =>
                  setSkillForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="skill-category">Category</Label>
              <Input
                id="skill-category"
                value={skillForm.category}
                onChange={(event) =>
                  setSkillForm((previous) => ({
                    ...previous,
                    category: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <Select
                value={skillForm.icon}
                onValueChange={(value) =>
                  setSkillForm((previous) => ({ ...previous, icon: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an icon" />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex items-center gap-2">
                          <Icon size={14} />
                          {option.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="skill-color">Color</Label>
                <Input
                  id="skill-color"
                  value={skillForm.color}
                  onChange={(event) =>
                    setSkillForm((previous) => ({
                      ...previous,
                      color: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skill-unit">Unit</Label>
                <Input
                  id="skill-unit"
                  value={skillForm.unit}
                  onChange={(event) =>
                    setSkillForm((previous) => ({
                      ...previous,
                      unit: event.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="skill-current">Current Value</Label>
                <Input
                  id="skill-current"
                  type="number"
                  value={skillForm.currentValue}
                  onChange={(event) =>
                    setSkillForm((previous) => ({
                      ...previous,
                      currentValue: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skill-target">Target Value</Label>
                <Input
                  id="skill-target"
                  type="number"
                  value={skillForm.targetValue}
                  onChange={(event) =>
                    setSkillForm((previous) => ({
                      ...previous,
                      targetValue: event.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="border border-terminal-accent/20 rounded-md p-3 space-y-3">
              <div className="text-sm text-terminal-accent">Checkpoints</div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Checkpoint name"
                  value={checkpointForm.name}
                  onChange={(event) =>
                    setCheckpointForm((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                />
                <Input
                  type="date"
                  value={checkpointForm.targetDate}
                  onChange={(event) =>
                    setCheckpointForm((previous) => ({
                      ...previous,
                      targetDate: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="Progress %"
                  value={checkpointForm.progressPercentage}
                  onChange={(event) =>
                    setCheckpointForm((previous) => ({
                      ...previous,
                      progressPercentage: event.target.value,
                    }))
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={addPendingCheckpoint}
                >
                  <Plus size={14} />
                  Add
                </Button>
              </div>

              {pendingCheckpoints.length > 0 && (
                <div className="space-y-2">
                  {pendingCheckpoints.map((checkpoint, index) => (
                    <div
                      key={`${checkpoint.name}-${index}`}
                      className="flex items-center justify-between text-xs border border-terminal-accent/20 rounded px-2 py-1"
                    >
                      <span>
                        {checkpoint.name} ({checkpoint.targetDate})
                      </span>
                      <button
                        type="button"
                        className="text-terminal-accent/70 hover:text-terminal-accent"
                        onClick={() =>
                          setPendingCheckpoints((previous) =>
                            previous.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Create Skill"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Progression;
