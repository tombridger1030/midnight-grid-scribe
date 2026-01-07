import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Target,
  Hash,
  Type,
  Palette,
  ArrowUp,
  ArrowDown,
  Link,
  Github,
  Clock,
  LayoutGrid,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  kpiManager,
  ConfigurableKPI,
  AutoSyncSource,
  DisplayMode,
  DEFAULT_KPI_TEMPLATES,
  KPI_CATEGORIES,
} from "@/lib/configurableKpis";
import { useToast } from "@/components/ui/use-toast";
import { REALTIME_EVENTS } from "@/hooks/useRealtimeSync";

const AUTO_SYNC_OPTIONS: {
  value: AutoSyncSource;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  { value: null, label: "None", icon: null, description: "Manual entry only" },
  {
    value: "github_prs",
    label: "GitHub PRs",
    icon: <Github size={14} />,
    description: "Auto-count PRs created",
  },
  {
    value: "github_commits",
    label: "GitHub Commits",
    icon: <Github size={14} />,
    description: "Auto-count commits",
  },
  {
    value: "deep_work_timer",
    label: "Deep Work Timer",
    icon: <Clock size={14} />,
    description: "Auto-sync from timer",
  },
];

const DISPLAY_MODE_OPTIONS: {
  value: DisplayMode;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    value: "simple",
    label: "Simple",
    icon: <LayoutGrid size={14} />,
    description: "Basic counter row",
  },
  {
    value: "daily_breakdown",
    label: "Daily Breakdown",
    icon: <Calendar size={14} />,
    description: "Collapsible with daily view",
  },
];

interface KPIManagementProps {
  onClose?: () => void;
}

const DEFAULT_CATEGORY_OPTIONS = [
  { value: "discipline", label: "Discipline", color: "#06B6D4" },
  { value: "engineering", label: "Engineering", color: "#EC4899" },
  { value: "learning", label: "Learning", color: "#8B5CF6" },
  { value: "fitness", label: "Fitness", color: "#FF073A" },
  { value: "health", label: "Health", color: "#4ADE80" },
  { value: "productivity", label: "Productivity", color: "#5FE3B3" },
  { value: "social", label: "Social", color: "#F59E0B" },
];

const COLOR_PRESETS = [
  "#FF073A",
  "#53B4FF",
  "#5FE3B3",
  "#FFD700",
  "#FF6B35",
  "#4ADE80",
  "#8B5CF6",
  "#F59E0B",
  "#EC4899",
  "#06B6D4",
  "#64748B",
  "#DC2626",
  "#059669",
  "#7C2D12",
  "#1E293B",
];

const KPIManagement: React.FC<KPIManagementProps> = ({ onClose }) => {
  const [kpis, setKpis] = useState<ConfigurableKPI[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<
    typeof DEFAULT_KPI_TEMPLATES
  >([]);
  const [editingKPI, setEditingKPI] = useState<ConfigurableKPI | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    target: 1,
    min_target: undefined as number | undefined,
    unit: "",
    category: "fitness" as ConfigurableKPI["category"],
    color: "#5FE3B3",
    auto_sync_source: null as AutoSyncSource,
    display_mode: "simple" as DisplayMode,
  });

  useEffect(() => {
    loadKPIs();
  }, []);

  const loadKPIs = async () => {
    try {
      setIsLoading(true);
      const userKPIs = await kpiManager.getUserKPIs();
      setKpis(userKPIs);

      // Load available templates (ones user hasn't added yet)
      const templates = await kpiManager.getAvailableTemplates();
      setAvailableTemplates(templates);

      // Extract custom categories from KPIs
      const categories = new Set<string>();
      userKPIs.forEach((kpi) => {
        const isDefaultCategory = DEFAULT_CATEGORY_OPTIONS.some(
          (opt) => opt.value === kpi.category,
        );
        if (!isDefaultCategory) {
          categories.add(kpi.category);
        }
      });
      setCustomCategories(Array.from(categories));
    } catch (error) {
      console.error("Failed to load KPIs:", error);
      toast({
        title: "Error loading KPIs",
        description: "Failed to load your KPIs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get all available categories (default + custom)
  const getAllCategories = () => {
    const defaultCats = DEFAULT_CATEGORY_OPTIONS.map((opt) => opt.value);
    return [...defaultCats, ...customCategories];
  };

  // Add new custom category
  const addCustomCategory = () => {
    if (
      newCategory.trim() &&
      !getAllCategories().includes(newCategory.trim().toLowerCase())
    ) {
      const category = newCategory.trim().toLowerCase();
      setCustomCategories((prev) => [...prev, category]);
      setFormData((prev) => ({ ...prev, category: category as any }));
      setNewCategory("");
      setShowNewCategory(false);
    }
  };

  const addTemplate = async (templateKpiId: string) => {
    try {
      const template = availableTemplates.find(
        (t) => t.kpi_id === templateKpiId,
      );
      await kpiManager.addTemplateKPI(templateKpiId);
      await loadKPIs();

      toast({
        title: "KPI Added",
        description: `${template?.name || "KPI"} has been added to your KPIs.`,
      });

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent(REALTIME_EVENTS.KPI_UPDATED));
    } catch (error) {
      console.error("Failed to add template:", error);
      toast({
        title: "Error adding KPI",
        description: "Failed to add KPI. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startCreating = () => {
    setFormData({
      name: "",
      target: 1,
      min_target: undefined,
      unit: "",
      category: "fitness",
      color: "#5FE3B3",
      auto_sync_source: null,
      display_mode: "simple",
    });
    setIsCreating(true);
    setEditingKPI(null);
  };

  const startEditing = (kpi: ConfigurableKPI) => {
    setFormData({
      name: kpi.name,
      target: kpi.target,
      min_target: kpi.min_target,
      unit: kpi.unit,
      category: kpi.category,
      color: kpi.color,
      auto_sync_source: kpi.auto_sync_source || null,
      display_mode: kpi.display_mode || "simple",
    });
    setEditingKPI(kpi);
    setIsCreating(false);
  };

  const cancelEditing = () => {
    setEditingKPI(null);
    setIsCreating(false);
    setFormData({
      name: "",
      target: 1,
      min_target: undefined,
      unit: "",
      category: "fitness",
      color: "#5FE3B3",
      auto_sync_source: null,
      display_mode: "simple",
    });
  };

  const saveKPI = async () => {
    if (!formData.name.trim() || !formData.unit.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and unit are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isCreating) {
        // Create new KPI
        await kpiManager.createKPI({
          kpi_id: formData.name.toLowerCase().replace(/\s+/g, ""),
          name: formData.name,
          target: formData.target,
          min_target: formData.min_target,
          unit: formData.unit,
          category: formData.category,
          color: formData.color,
          auto_sync_source: formData.auto_sync_source,
          display_mode: formData.display_mode,
          is_active: true,
          sort_order: kpis.length + 1,
        });

        toast({
          title: "KPI Created",
          description: `${formData.name} has been created successfully.`,
        });
      } else if (editingKPI) {
        // Update existing KPI
        await kpiManager.updateKPI(editingKPI.kpi_id, {
          name: formData.name,
          target: formData.target,
          min_target: formData.min_target,
          unit: formData.unit,
          category: formData.category,
          color: formData.color,
          auto_sync_source: formData.auto_sync_source,
          display_mode: formData.display_mode,
        });

        toast({
          title: "KPI Updated",
          description: `${formData.name} has been updated successfully.`,
        });
      }

      await loadKPIs();
      cancelEditing();

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent(REALTIME_EVENTS.KPI_UPDATED));
    } catch (error) {
      console.error("Failed to save KPI:", error);
      toast({
        title: "Error saving KPI",
        description: "Failed to save KPI. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteKPI = async (kpi: ConfigurableKPI) => {
    if (
      !confirm(
        `Are you sure you want to delete "${kpi.name}"? This will remove all historical data for this KPI.`,
      )
    ) {
      return;
    }

    try {
      const result = await kpiManager.permanentlyDeleteKPI(kpi.kpi_id);

      // Force a small delay to let the database sync
      await new Promise((resolve) => setTimeout(resolve, 100));

      await loadKPIs();

      toast({
        title: "KPI Deleted",
        description: `${kpi.name} has been deleted successfully.`,
      });

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent(REALTIME_EVENTS.KPI_UPDATED));
    } catch (error) {
      console.error("Failed to delete KPI:", error);
      toast({
        title: "Error deleting KPI",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete KPI. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleKPIActive = async (kpi: ConfigurableKPI) => {
    try {
      await kpiManager.updateKPI(kpi.kpi_id, {
        is_active: !kpi.is_active,
      });
      await loadKPIs();

      toast({
        title: kpi.is_active ? "KPI Disabled" : "KPI Enabled",
        description: `${kpi.name} has been ${kpi.is_active ? "disabled" : "enabled"}.`,
      });

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent(REALTIME_EVENTS.KPI_UPDATED));
    } catch (error) {
      console.error("Failed to toggle KPI:", error);
      toast({
        title: "Error updating KPI",
        description: "Failed to update KPI status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const moveKPI = async (kpi: ConfigurableKPI, direction: "up" | "down") => {
    const currentIndex = kpis.findIndex((k) => k.id === kpi.id);
    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= kpis.length) return;

    try {
      await kpiManager.updateKPI(kpi.kpi_id, {
        sort_order: kpis[targetIndex].sort_order,
      });
      await kpiManager.updateKPI(kpis[targetIndex].kpi_id, {
        sort_order: kpi.sort_order,
      });
      await loadKPIs();

      toast({
        title: "KPI Reordered",
        description: `${kpi.name} has been moved ${direction}.`,
      });
    } catch (error) {
      console.error("Failed to reorder KPI:", error);
      toast({
        title: "Error reordering KPI",
        description: "Failed to reorder KPI. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-panel border border-accent-cyan p-6 rounded-sm">
        <div className="text-center py-8">
          <div className="text-accent-cyan mb-2">Loading KPIs...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-panel border border-accent-cyan rounded-sm">
      <div className="p-4 border-b border-accent-cyan/20 flex items-center justify-between">
        <h2 className="text-accent-cyan font-mono text-lg flex items-center">
          <Target className="mr-2" size={20} />
          KPI Management
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-accent-pink hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Create/Edit Form */}
        {(isCreating || editingKPI) && (
          <div className="bg-sidebar border border-accent-cyan/30 p-4 rounded-sm space-y-4">
            <h3 className="text-accent-cyan font-mono text-sm">
              {isCreating ? "Create New KPI" : "Edit KPI"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full bg-panel border border-gray-600 rounded px-3 py-2 text-sm"
                  placeholder="e.g., Gym Sessions"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Unit</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, unit: e.target.value }))
                  }
                  className="w-full bg-panel border border-gray-600 rounded px-3 py-2 text-sm"
                  placeholder="e.g., sessions, hours, points"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Target
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.target}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      target: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full bg-panel border border-gray-600 rounded px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Min Target (optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.min_target || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      min_target: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    }))
                  }
                  className="w-full bg-panel border border-gray-600 rounded px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Category
                </label>
                <div className="space-y-2">
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className="w-full bg-panel border border-gray-600 rounded px-3 py-2 text-sm"
                  >
                    {DEFAULT_CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                    {customCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>

                  {showNewCategory ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="New category name"
                        className="flex-1 bg-panel border border-gray-600 rounded px-3 py-2 text-xs"
                        onKeyPress={(e) =>
                          e.key === "Enter" && addCustomCategory()
                        }
                      />
                      <button
                        onClick={addCustomCategory}
                        className="px-3 py-2 bg-accent-cyan text-black rounded text-xs hover:bg-accent-cyan/80 transition-colors"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowNewCategory(false);
                          setNewCategory("");
                        }}
                        className="px-3 py-2 bg-gray-600 text-white rounded text-xs hover:bg-gray-500 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewCategory(true)}
                      className="text-xs text-accent-cyan hover:text-white transition-colors"
                    >
                      + Add Custom Category
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        color: e.target.value,
                      }))
                    }
                    className="w-10 h-8 bg-panel border border-gray-600 rounded"
                  />
                  <div className="flex gap-1 flex-wrap">
                    {COLOR_PRESETS.slice(0, 6).map((color) => (
                      <button
                        key={color}
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, color }))
                        }
                        className="w-6 h-6 rounded border border-gray-600 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">
                  <Link size={12} className="inline mr-1" />
                  Auto-Sync Source
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {AUTO_SYNC_OPTIONS.map((option) => (
                    <button
                      key={option.value || "none"}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          auto_sync_source: option.value,
                        }))
                      }
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded border text-sm transition-all",
                        formData.auto_sync_source === option.value
                          ? "border-accent-cyan bg-accent-cyan/10 text-accent-cyan"
                          : "border-gray-600 text-gray-400 hover:border-gray-500",
                      )}
                    >
                      {option.icon}
                      <div className="text-left">
                        <div className="font-medium">{option.label}</div>
                        <div className="text-[10px] opacity-70">
                          {option.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {formData.auto_sync_source === "github_prs" && (
                  <p className="text-xs text-gray-500 mt-2">
                    Requires GitHub token in Profile &gt; Integrations
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">
                  <LayoutGrid size={12} className="inline mr-1" />
                  Display Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DISPLAY_MODE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          display_mode: option.value,
                        }))
                      }
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded border text-sm transition-all",
                        formData.display_mode === option.value
                          ? "border-accent-cyan bg-accent-cyan/10 text-accent-cyan"
                          : "border-gray-600 text-gray-400 hover:border-gray-500",
                      )}
                    >
                      {option.icon}
                      <div className="text-left">
                        <div className="font-medium">{option.label}</div>
                        <div className="text-[10px] opacity-70">
                          {option.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {formData.display_mode === "daily_breakdown" && (
                  <p className="text-xs text-gray-500 mt-2">
                    Shows collapsible daily breakdown like Deep Work Hours
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={saveKPI}
                className="flex items-center gap-2 px-4 py-2 bg-accent-cyan text-black rounded text-sm hover:bg-accent-cyan/80 transition-colors"
              >
                <Save size={16} />
                Save KPI
              </button>
              <button
                onClick={cancelEditing}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-500 transition-colors"
              >
                <X size={16} />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Add New Button */}
        {!isCreating && !editingKPI && (
          <button
            onClick={startCreating}
            className="flex items-center gap-2 px-4 py-2 bg-accent-cyan text-black rounded text-sm hover:bg-accent-cyan/80 transition-colors"
          >
            <Plus size={16} />
            Add New KPI
          </button>
        )}

        {/* Quick Add Templates */}
        {!isCreating && !editingKPI && availableTemplates.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider font-medium">
              Quick Add
            </h3>
            <div className="flex flex-wrap gap-2">
              {availableTemplates.map((template) => (
                <button
                  key={template.kpi_id}
                  onClick={() => addTemplate(template.kpi_id)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all border hover:scale-105"
                  style={{
                    backgroundColor: `${template.color}15`,
                    borderColor: `${template.color}40`,
                    color: template.color,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = template.color;
                    e.currentTarget.style.backgroundColor = `${template.color}25`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${template.color}40`;
                    e.currentTarget.style.backgroundColor = `${template.color}15`;
                  }}
                >
                  <span>{KPI_CATEGORIES[template.category]?.icon || "🎯"}</span>
                  <span>{template.name}</span>
                  <Plus size={12} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* KPI List */}
        <div className="space-y-2">
          {kpis.map((kpi, index) => (
            <div
              key={kpi.id}
              className={cn(
                "bg-sidebar border rounded-sm p-4 transition-all",
                kpi.is_active
                  ? "border-gray-600"
                  : "border-gray-700 opacity-60",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full border-2"
                    style={{
                      backgroundColor: kpi.color,
                      borderColor: kpi.color,
                    }}
                  />
                  <div>
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      {kpi.name}
                      {kpi.auto_sync_source && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-cyan/20 text-accent-cyan flex items-center gap-1">
                          {kpi.auto_sync_source === "github_prs" && (
                            <Github size={10} />
                          )}
                          {kpi.auto_sync_source === "deep_work_timer" && (
                            <Clock size={10} />
                          )}
                          Auto-sync
                        </span>
                      )}
                    </h4>
                    <div className="text-xs text-gray-400">
                      Target: {kpi.target} {kpi.unit}
                      {kpi.min_target && ` (min: ${kpi.min_target})`}
                      {" • "}{" "}
                      {DEFAULT_CATEGORY_OPTIONS.find(
                        (c) => c.value === kpi.category,
                      )?.label ||
                        kpi.category.charAt(0).toUpperCase() +
                          kpi.category.slice(1)}
                      {!kpi.is_active && " • DISABLED"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveKPI(kpi, "up")}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    onClick={() => moveKPI(kpi, "down")}
                    disabled={index === kpis.length - 1}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    onClick={() => toggleKPIActive(kpi)}
                    className={cn(
                      "px-2 py-1 text-xs rounded transition-colors",
                      kpi.is_active
                        ? "bg-yellow-600 text-white hover:bg-yellow-700"
                        : "bg-green-600 text-white hover:bg-green-700",
                    )}
                  >
                    {kpi.is_active ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => startEditing(kpi)}
                    className="p-1 text-gray-400 hover:text-accent-cyan"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => deleteKPI(kpi)}
                    className="p-1 text-gray-400 hover:text-accent-pink"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {kpis.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Target className="mx-auto mb-2 opacity-50" size={48} />
              <p>No KPIs configured yet.</p>
              <p className="text-sm">Click "Add New KPI" to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KPIManagement;
