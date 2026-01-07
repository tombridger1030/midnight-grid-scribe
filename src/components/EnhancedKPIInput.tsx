import React, { useState, useEffect } from "react";
import {
  WeeklyKPIValues,
  getCurrentWeek,
  getWeeklyKPIRecord,
  updateWeeklyKPIRecord,
  calculateKPIProgress,
  getKPIStatus,
  formatWeekKey,
  calculateWeekCompletion,
  loadWeeklyKPIsWithSync,
  getWeeklyDailyValues,
  updateWeeklyDailyValue,
  getWeekDayDates,
  clearWeeklyTargetCache,
  clearAllWeekData,
} from "@/lib/weeklyKpi";
import { kpiManager, ConfigurableKPI } from "@/lib/configurableKpis";
import { userStorage } from "@/lib/userStorage";
import { characterService, STAT_CONFIG } from "@/lib/characterSystem";
import { questService } from "@/lib/questSystem";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  Target,
  TrendingUp,
  Plus,
  Minus,
  Edit3,
  Trash2,
  Save,
  X,
  PlusCircle,
  Sword,
  Shield,
  Zap,
  Brain,
  Heart,
  Footprints,
  Eye,
  Sparkles,
  Flame,
  Crown,
} from "lucide-react";

interface EnhancedKPIInputProps {
  onWeekChange?: (weekKey: string) => void;
  enableQuestMode?: boolean;
}

const EnhancedKPIInput: React.FC<EnhancedKPIInputProps> = ({
  onWeekChange,
  enableQuestMode = true,
}) => {
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeek());
  const [values, setValues] = useState<WeeklyKPIValues>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userKPIs, setUserKPIs] = useState<ConfigurableKPI[]>([]);
  const [dailyRefresh, setDailyRefresh] = useState(0);
  const [editingKPI, setEditingKPI] = useState<string | null>(null);
  const [editingDaily, setEditingDaily] = useState<{
    kpiId: string;
    dayIndex: number;
  } | null>(null);
  const [viewMode, setViewMode] = useState<"classic" | "quest">("quest");

  // Quest-specific states
  const [characterStats, setCharacterStats] = useState<any>(null);
  const [criticalHitChances, setCriticalHitChances] = useState<
    Record<string, number>
  >({});
  const [currentStreak, setCurrentStreak] = useState(0);
  const [potentialRewards, setPotentialRewards] = useState<Record<string, any>>(
    {},
  );

  // Existing state management from original component
  const [isCreatingKPI, setIsCreatingKPI] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    target: 0,
    minTarget: 0,
    unit: "",
    weight: 1,
  });
  const [weekTargets, setWeekTargets] = useState<
    Record<string, { target: number; minTarget?: number }>
  >({});
  const [weekNames, setWeekNames] = useState<Record<string, string>>({});
  const [editingWeekTarget, setEditingWeekTarget] = useState<string | null>(
    null,
  );
  const [weekTargetForm, setWeekTargetForm] = useState<{
    target: number;
    minTarget?: number;
  }>({ target: 0, minTarget: undefined });
  const [editingWeekName, setEditingWeekName] = useState<string | null>(null);
  const [weekNameForm, setWeekNameForm] = useState<string>("");

  // Load data including quest enhancements
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        await kpiManager.initializeDefaultKPIs();
        await kpiManager.migrateAverageKPIs();
        await kpiManager.makeReadingNonImpactable(); // Reading KPI is just for fun

        // One-time migration: Clear old fiscal year week data (switched to calendar year Jan 2026)
        const calendarYearMigrationKey = "calendar_year_migration_2026";
        if (!localStorage.getItem(calendarYearMigrationKey)) {
          console.log("🗓️ Running calendar year migration...");
          await clearAllWeekData();
          localStorage.setItem(
            calendarYearMigrationKey,
            new Date().toISOString(),
          );
          console.log("✅ Calendar year migration complete");
        }

        const activeKPIs = await kpiManager.getActiveKPIs();
        setUserKPIs(activeKPIs);

        await loadWeeklyKPIsWithSync();

        const record = getWeeklyKPIRecord(currentWeek);
        setValues(record?.values || {});
        onWeekChange?.(currentWeek);

        // Load quest-related data
        if (enableQuestMode && viewMode === "quest") {
          const [stats, quests, streak] = await Promise.all([
            characterService.getCharacterStats(),
            questService.getActiveQuests(),
            calculateCurrentStreak(),
          ]);

          setCharacterStats(stats);
          setCurrentStreak(streak);
          calculateQuestRewards(activeKPIs, record?.values || {});
        }

        // Load week-specific target overrides
        try {
          const overrides =
            await userStorage.getWeeklyTargetOverrides(currentWeek);
          const map: Record<string, { target: number; minTarget?: number }> =
            {};
          const nameMap: Record<string, string> = {};
          overrides.forEach((o) => {
            map[o.kpi_id] = {
              target: Number(o.target_value) || 0,
              minTarget:
                o.min_target_value !== null
                  ? Number(o.min_target_value)
                  : undefined,
            };
            if (o.name_override) nameMap[o.kpi_id] = o.name_override;
          });
          setWeekTargets(map);
          setWeekNames(nameMap);
        } catch (e) {
          console.warn("Failed to load weekly target overrides:", e);
        }
      } catch (error) {
        console.error("Failed to load weekly KPI data:", error);
        const record = getWeeklyKPIRecord(currentWeek);
        setValues(record?.values || {});
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [currentWeek, onWeekChange, enableQuestMode, viewMode]);

  // Calculate quest-related enhancements
  const calculateCurrentStreak = async (): Promise<number> => {
    try {
      const questStats = await questService.getQuestStatistics();
      return questStats.completion_rate > 0
        ? Math.floor(questStats.completion_rate / 10)
        : 0;
    } catch {
      return 0;
    }
  };

  const calculateQuestRewards = (
    kpis: ConfigurableKPI[],
    currentValues: WeeklyKPIValues,
  ) => {
    const rewards: Record<string, any> = {};
    const chances: Record<string, number> = {};

    kpis.forEach((kpi) => {
      const value = currentValues[kpi.kpi_id] || 0;
      const progress = (value / kpi.target) * 100;

      // Calculate stat XP gains
      const statGains = characterService.calculateStatXPFromKPI(
        kpi.category,
        progress,
      );

      // Calculate critical hit chance (15% base + performance bonus)
      const baseChance = 15;
      const performanceBonus = Math.min(15, Math.max(0, (progress - 80) / 2));
      const finalChance = Math.min(30, baseChance + performanceBonus);

      rewards[kpi.kpi_id] = {
        statXP: statGains,
        rr: Math.round(progress / 10), // 1 RR per 10% completion
        criticalHitChance: finalChance,
      };

      chances[kpi.kpi_id] = finalChance;
    });

    setPotentialRewards(rewards);
    setCriticalHitChances(chances);
  };

  // Enhanced KPI update with quest rewards
  const updateKPI = async (kpiId: string, value: number) => {
    const newValues = { ...values, [kpiId]: Math.max(0, value) };
    setValues(newValues);

    try {
      setIsSyncing(true);
      await updateWeeklyKPIRecord(currentWeek, { [kpiId]: Math.max(0, value) });

      // Apply quest rewards if in quest mode
      if (enableQuestMode && viewMode === "quest") {
        const kpi = userKPIs.find((k) => k.kpi_id === kpiId);
        if (kpi) {
          const progress = (value / kpi.target) * 100;
          const statGains = characterService.calculateStatXPFromKPI(
            kpi.category,
            progress,
          );

          // Apply stat XP gains
          await characterService.applyKPIStatXP(kpi.category, progress);

          // Update character stats
          const stats = await characterService.getCharacterStats();
          setCharacterStats(stats);

          // Update rewards calculation
          calculateQuestRewards(userKPIs, newValues);
        }
      }
    } catch (error) {
      console.error("Failed to sync KPI update:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Get stat icon for display
  const getStatIcon = (statName: string) => {
    const icons: Record<string, React.ReactNode> = {
      strength: <Sword className="w-4 h-4" />,
      intelligence: <Brain className="w-4 h-4" />,
      wisdom: <Eye className="w-4 h-4" />,
      constitution: <Shield className="w-4 h-4" />,
      agility: <Footprints className="w-4 h-4" />,
      all_stats: <Crown className="w-4 h-4" />,
    };
    return icons[statName] || <Sparkles className="w-4 h-4" />;
  };

  // Get rarity badge for KPI based on performance
  const getPerformanceRarity = (kpi: ConfigurableKPI, value: number) => {
    const progress = (value / kpi.target) * 100;

    if (progress >= 100) return { text: "MASTER", color: "#f59e0b" };
    if (progress >= 90) return { text: "EXPERT", color: "#8b5cf6" };
    if (progress >= 75) return { text: "SKILLED", color: "#3b82f6" };
    if (progress >= 50) return { text: "ADEPT", color: "#10b981" };
    return { text: "NOVICE", color: "#94a3b8" };
  };

  const overallCompletion = Math.round(
    kpiManager.calculateWeekCompletion(values, userKPIs),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-terminal-accent/70">Loading training data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      {enableQuestMode && (
        <div className="flex justify-center">
          <Tabs
            value={viewMode}
            onValueChange={(value) => setViewMode(value as "classic" | "quest")}
          >
            <TabsList className="grid w-full grid-cols-2 bg-terminal-bg/50 border border-terminal-accent/30">
              <TabsTrigger
                value="classic"
                className="data-[state=active]:bg-terminal-accent data-[state=active]:text-terminal-bg"
              >
                <Target className="w-4 h-4 mr-2" />
                Classic KPI
              </TabsTrigger>
              <TabsTrigger
                value="quest"
                className="data-[state=active]:bg-terminal-accent data-[state=active]:text-terminal-bg"
              >
                <Sword className="w-4 h-4 mr-2" />
                Quest Mode
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Enhanced Header for Quest Mode */}
      {viewMode === "quest" && enableQuestMode && (
        <div className="border border-terminal-accent/30 bg-terminal-bg/50 p-6 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Character Level */}
            {characterStats && (
              <div className="text-center">
                <h3 className="text-sm font-medium text-terminal-accent/80 mb-2">
                  Character Level
                </h3>
                <div className="text-3xl font-bold text-terminal-text cyberpunk-header">
                  {Object.values(characterStats)
                    .filter((stat: any) => stat.stat_name !== "all_stats")
                    .reduce(
                      (sum: number, stat: any) => sum + stat.current_level,
                      0,
                    )}
                </div>
                <div className="text-xs text-terminal-accent/60 mt-1">
                  Total Levels
                </div>
              </div>
            )}

            {/* Current Streak */}
            <div className="text-center">
              <h3 className="text-sm font-medium text-terminal-accent/80 mb-2 flex items-center justify-center gap-1">
                <Flame className="w-4 h-4" />
                Current Streak
              </h3>
              <div className="text-3xl font-bold text-terminal-accent cyberpunk-glow-neon-red">
                {currentStreak}
              </div>
              <div className="text-xs text-terminal-accent/60 mt-1">
                Days Active
              </div>
            </div>

            {/* Critical Hit Power */}
            <div className="text-center">
              <h3 className="text-sm font-medium text-terminal-accent/80 mb-2 flex items-center justify-center gap-1">
                <Zap className="w-4 h-4" />
                Critical Power
              </h3>
              <div className="text-3xl font-bold text-terminal-accent cyberpunk-glow-yellow">
                {Object.values(criticalHitChances).reduce(
                  (sum, chance) => sum + chance,
                  0,
                ) / Object.keys(criticalHitChances).length || 0}
                %
              </div>
              <div className="text-xs text-terminal-accent/60 mt-1">
                Avg. Chance
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Week Navigation Header */}
      <div className="flex items-center justify-between p-4 border border-terminal-accent/30 bg-terminal-bg/50">
        <button
          onClick={() => {
            const [year, week] = currentWeek.split("-W").map(Number);
            let newWeek = week - 1;
            let newYear = year;
            if (newWeek < 1) {
              newWeek = 52;
              newYear -= 1;
            }
            const newWeekKey = `${newYear}-W${newWeek.toString().padStart(2, "0")}`;
            setCurrentWeek(newWeekKey);
          }}
          className="terminal-button p-2"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="text-center">
          <h2 className="text-lg text-terminal-accent font-medium">
            {formatWeekKey(currentWeek)}
            {viewMode === "quest" && " - Training Week"}
          </h2>
          <div className="text-sm text-terminal-accent/70">
            Week {currentWeek}
            {isSyncing && (
              <span className="ml-2 text-terminal-accent/50">• Syncing...</span>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            const [year, week] = currentWeek.split("-W").map(Number);
            let newWeek = week + 1;
            let newYear = year;
            if (newWeek > 52) {
              newWeek = 1;
              newYear += 1;
            }
            const newWeekKey = `${newYear}-W${newWeek.toString().padStart(2, "0")}`;
            setCurrentWeek(newWeekKey);
          }}
          className="terminal-button p-2"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Overall Progress with Quest Enhancement */}
      <div className="p-4 border border-terminal-accent/30 bg-terminal-bg/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-terminal-accent" />
            <span className="text-terminal-accent font-medium">
              {viewMode === "quest" ? "Training Progress" : "Week Completion"}
            </span>
          </div>
          <div className="text-2xl font-bold text-terminal-accent">
            {overallCompletion}%
          </div>
        </div>
        <Progress value={overallCompletion} className="h-3" />
        <div className="text-xs text-terminal-accent/70 mt-2">
          {viewMode === "quest"
            ? "Overall training progress across all disciplines"
            : "Overall progress across all KPIs"}
        </div>

        {/* Critical Hit Indicators for Quest Mode */}
        {viewMode === "quest" && enableQuestMode && (
          <div className="mt-4 space-y-2">
            <div className="text-xs text-terminal-accent/60 uppercase tracking-wider">
              Critical Hit Potential
            </div>
            <div className="flex flex-wrap gap-2">
              {userKPIs.slice(0, 5).map((kpi) => {
                const chance = criticalHitChances[kpi.kpi_id] || 0;
                const value = values[kpi.kpi_id] || 0;
                const progress = (value / kpi.target) * 100;

                return (
                  <div
                    key={kpi.kpi_id}
                    className="flex items-center gap-2 px-2 py-1 rounded border border-terminal-accent/20"
                    style={{
                      backgroundColor:
                        chance > 20 ? `${kpi.color}20` : "transparent",
                      borderColor: chance > 20 ? kpi.color : undefined,
                    }}
                  >
                    <span className="text-xs text-terminal-accent/80">
                      {kpi.name}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-mono",
                        chance > 20
                          ? "text-terminal-accent cyberpunk-glow-neon-red"
                          : "text-terminal-accent/60",
                      )}
                    >
                      {chance.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced KPI Display with Quest Elements */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-terminal-bg/50 border border-terminal-accent/30">
          <TabsTrigger value="all">All KPIs</TabsTrigger>
          <TabsTrigger value="strength">Strength</TabsTrigger>
          <TabsTrigger value="intellect">Intellect</TabsTrigger>
          <TabsTrigger value="agility">Agility</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {userKPIs.map((kpi) => {
              const value = values[kpi.kpi_id] || 0;
              const progress = Math.min(100, (value / kpi.target) * 100);
              const status = getKPIStatus(kpi.kpi_id, value);
              const rarity = getPerformanceRarity(kpi, value);

              return (
                <div
                  key={kpi.kpi_id}
                  className="space-y-3 border-2 p-4 relative overflow-hidden"
                  style={{ borderColor: kpi.color + "40" }}
                >
                  {/* Quest Mode Elements */}
                  {viewMode === "quest" && enableQuestMode && (
                    <div className="absolute top-2 right-2">
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          borderColor: rarity.color,
                          color: rarity.color,
                        }}
                      >
                        {rarity.text}
                      </Badge>
                    </div>
                  )}

                  {/* KPI Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-terminal-text">
                        {weekNames[kpi.kpi_id] || kpi.name}
                      </div>
                      <div className="text-xs text-terminal-accent/70">
                        Target: {weekTargets[kpi.kpi_id]?.target || kpi.target}{" "}
                        {kpi.unit}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className="text-lg font-bold"
                        style={{ color: kpi.color }}
                      >
                        {value}
                      </div>
                      <div className="text-xs text-terminal-accent/70">
                        {Math.round(progress)}%
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative">
                    <Progress value={progress} className="h-2" />
                    <div
                      className="absolute top-0 left-0 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: kpi.color,
                        opacity: 0.9,
                        boxShadow:
                          progress >= 80 ? `0 0 8px ${kpi.color}80` : undefined,
                      }}
                    />
                  </div>

                  {/* Quest Rewards */}
                  {viewMode === "quest" &&
                    enableQuestMode &&
                    potentialRewards[kpi.kpi_id] && (
                      <div className="space-y-2 pt-2 border-t border-terminal-accent/20">
                        <div className="text-xs text-terminal-accent/60 uppercase tracking-wider">
                          Potential Rewards
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(
                            potentialRewards[kpi.kpi_id].statXP,
                          ).map(([stat, xp]) => (
                            <div
                              key={stat}
                              className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                              style={{
                                backgroundColor: `${STAT_CONFIG[stat]?.color || "#FF073A"}20`,
                                borderColor: `${STAT_CONFIG[stat]?.color || "#FF073A"}40`,
                                borderWidth: "1px",
                              }}
                            >
                              {getStatIcon(stat)}
                              <span
                                style={{
                                  color: STAT_CONFIG[stat]?.color || "#FF073A",
                                }}
                              >
                                +{xp} {stat}
                              </span>
                            </div>
                          ))}
                          <div className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-terminal-bg/30 border border-terminal-accent/20">
                            <span className="text-terminal-accent">
                              +{potentialRewards[kpi.kpi_id].rr} RR
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        updateKPI(
                          kpi.kpi_id,
                          Math.max(0, value - (kpi.unit === "hours" ? 0.5 : 1)),
                        )
                      }
                      className="w-8 h-8 rounded border border-terminal-accent/30 hover:border-terminal-accent/60 bg-terminal-bg hover:bg-terminal-accent/10 flex items-center justify-center transition-colors"
                      style={{
                        borderColor: kpi.color + "40",
                        color: kpi.color,
                      }}
                      disabled={value <= 0}
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min="0"
                      step={kpi.unit === "hours" ? "0.5" : "1"}
                      value={value}
                      onChange={async (e) => {
                        const raw = parseFloat(e.target.value);
                        const parsed = Number.isFinite(raw) ? raw : 0;
                        await updateKPI(kpi.kpi_id, parsed);
                      }}
                      className="terminal-input w-16 text-center text-sm"
                    />
                    <button
                      onClick={() =>
                        updateKPI(
                          kpi.kpi_id,
                          value + (kpi.unit === "hours" ? 0.5 : 1),
                        )
                      }
                      className="w-8 h-8 rounded border border-terminal-accent/30 hover:border-terminal-accent/60 bg-terminal-bg hover:bg-terminal-accent/10 flex items-center justify-center transition-colors"
                      style={{
                        borderColor: kpi.color + "40",
                        color: kpi.color,
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Category-specific tabs would be filtered here */}
        <TabsContent value="strength">
          {/* Filtered strength-related KPIs */}
        </TabsContent>

        <TabsContent value="intellect">
          {/* Filtered intellect-related KPIs */}
        </TabsContent>

        <TabsContent value="agility">
          {/* Filtered agility-related KPIs */}
        </TabsContent>
      </Tabs>

      {/* No KPIs message */}
      {userKPIs.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Target className="mx-auto mb-2 opacity-50" size={48} />
          <p>No KPIs configured yet.</p>
          <p className="text-sm">Go to Profile → KPIs to set up your goals.</p>
        </div>
      )}
    </div>
  );
};

export default EnhancedKPIInput;
