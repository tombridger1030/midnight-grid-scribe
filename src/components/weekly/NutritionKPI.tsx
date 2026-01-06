/**
 * NutritionKPI Component
 *
 * Tracks daily calories and protein by meal.
 * Shows 7-day overview with expandable day details.
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Utensils,
  ChevronDown,
  ChevronUp,
  Flame,
  Beef,
  Settings,
  Sparkles,
  Camera,
  Type,
  Scale,
  X,
} from "lucide-react";
import { colors } from "@/styles/design-tokens";
import { getCurrentLocalDate } from "@/lib/dateUtils";
import { DailyNutrition, MealType, MealData } from "@/hooks/useNutrition";
import {
  analyzeNutrition,
  imageToBase64,
  InputMode,
  NutritionAnalysisResult,
  FoodItem,
  saveFoodItems,
  saveMealItems,
} from "@/lib/ai/nutritionAnalysis";
import { toast } from "sonner";
import { Check, Trash2, Edit2 } from "lucide-react";
import { searchFoodItems } from "@/lib/ai/nutritionAnalysis";

interface NutritionKPIProps {
  weekData: Record<string, DailyNutrition>;
  weeklyTotals: { calories: number; protein: number };
  dailyAverage: { calories: number; protein: number };
  daysTracked: number;
  targetCalories: number;
  targetProtein: number;
  onUpdateMeal: (date: string, meal: MealType, data: MealData) => void;
  onUpdateTargets?: (calories: number, protein: number) => void;
  weekDates: { start: Date; end: Date };
}

const MEALS: { key: MealType; label: string; icon: string }[] = [
  { key: "breakfast", label: "Breakfast", icon: "🌅" },
  { key: "lunch", label: "Lunch", icon: "☀️" },
  { key: "dinner", label: "Dinner", icon: "🌙" },
  { key: "snacks", label: "Snacks", icon: "🍿" },
];

export const NutritionKPI: React.FC<NutritionKPIProps> = ({
  weekData,
  weeklyTotals,
  dailyAverage,
  daysTracked,
  targetCalories,
  targetProtein,
  onUpdateMeal,
  onUpdateTargets,
  weekDates,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [editCalories, setEditCalories] = useState(targetCalories.toString());
  const [editProtein, setEditProtein] = useState(targetProtein.toString());

  // AI Input state
  const [showAIInput, setShowAIInput] = useState(false);
  const [aiInputMode, setAiInputMode] = useState<InputMode>("product_name");
  const [aiInputText, setAiInputText] = useState("");
  const [aiImageFile, setAiImageFile] = useState<File | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<MealType>("breakfast");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Pending items confirmation state
  const [pendingItems, setPendingItems] = useState<
    (FoodItem & { selected: boolean })[]
  >([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editItemData, setEditItemData] = useState<FoodItem | null>(null);

  // Food suggestions state
  const [foodSuggestions, setFoodSuggestions] = useState<
    Array<{
      id: string;
      name: string;
      serving_size: string | null;
      calories_per_serving: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      times_used: number;
    }>
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Ref for dropdown click outside handling
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounced search for food suggestions (only when typing, not on focus)
  useEffect(() => {
    const debounceTimer = setTimeout(async () => {
      if (aiInputText.trim().length > 1 && aiInputMode !== "photo_ocr") {
        try {
          const items = await searchFoodItems(aiInputText, 5);
          setFoodSuggestions(items);
          setShowSuggestions(true);
          setSelectedSuggestionIndex(-1);
        } catch (error) {
          console.error("Failed to search food items:", error);
        }
      } else {
        setFoodSuggestions([]);
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    }, 200);

    return () => clearTimeout(debounceTimer);
  }, [aiInputText, aiInputMode]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Quick-add cached item to selected meal (no confirmation modal)
  const quickAddToSelectedMeal = async (item: {
    id: string;
    name: string;
    serving_size: string | null;
    calories_per_serving: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }) => {
    const foodItem: FoodItem = {
      name: item.name,
      servingSize: item.serving_size || undefined,
      calories: item.calories_per_serving,
      protein: item.protein_g,
      carbs: item.carbs_g,
      fat: item.fat_g,
      confidence: 1.0,
      source: "manual",
    };

    const date = getCurrentLocalDate();

    try {
      await Promise.all([
        saveFoodItems([foodItem]),
        saveMealItems([foodItem], date, selectedMeal),
      ]);

      // Update daily nutrition totals (add to existing)
      const existingCalories =
        weekData[date]?.[`${selectedMeal}_calories`] || 0;
      const existingProtein = weekData[date]?.[`${selectedMeal}_protein`] || 0;

      onUpdateMeal(date, selectedMeal, {
        calories: existingCalories + item.calories_per_serving,
        protein: existingProtein + item.protein_g,
      });

      toast.success(
        `Added ${item.name} to ${MEALS.find((m) => m.key === selectedMeal)?.label}`,
      );

      // Reset input
      setAiInputText("");
      setShowSuggestions(false);
      setFoodSuggestions([]);
      setSelectedSuggestionIndex(-1);
    } catch (error) {
      console.error("Failed to add item:", error);
      toast.error("Failed to add item");
    }
  };

  // Handle keyboard navigation for suggestions
  const handleSuggestionKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || foodSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) =>
        Math.min(prev + 1, foodSuggestions.length - 1),
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      quickAddToSelectedMeal(foodSuggestions[selectedSuggestionIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  // Generate all 7 days of the week
  const weekDays = useMemo(() => {
    const days: string[] = [];
    const current = new Date(weekDates.start);
    while (current <= weekDates.end) {
      days.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [weekDates]);

  // Calculate progress percentages
  const calorieProgress =
    targetCalories > 0
      ? Math.min(100, (dailyAverage.calories / targetCalories) * 100)
      : 0;
  const proteinProgress =
    targetProtein > 0
      ? Math.min(100, (dailyAverage.protein / targetProtein) * 100)
      : 0;

  // Get day totals
  const getDayTotals = (date: string) => {
    const day = weekData[date];
    if (!day) return { calories: 0, protein: 0 };
    return {
      calories:
        (day.breakfast_calories || 0) +
        (day.lunch_calories || 0) +
        (day.dinner_calories || 0) +
        (day.snacks_calories || 0),
      protein:
        (day.breakfast_protein || 0) +
        (day.lunch_protein || 0) +
        (day.dinner_protein || 0) +
        (day.snacks_protein || 0),
    };
  };

  // Format day name
  const formatDayName = (date: string) => {
    const d = new Date(date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateObj = new Date(date + "T00:00:00");
    dateObj.setHours(0, 0, 0, 0);

    if (dateObj.getTime() === today.getTime()) return "Today";
    return d.toLocaleDateString(undefined, { weekday: "short" });
  };

  const handleMealUpdate = (
    date: string,
    meal: MealType,
    field: "calories" | "protein",
    value: number,
  ) => {
    const day = weekData[date];
    const currentMeal: MealData = {
      calories: day?.[`${meal}_calories`] || 0,
      protein: day?.[`${meal}_protein`] || 0,
    };
    onUpdateMeal(date, meal, { ...currentMeal, [field]: value });
  };

  const handleSaveTargets = () => {
    const cal = parseInt(editCalories) || 1900;
    const prot = parseInt(editProtein) || 150;
    onUpdateTargets?.(cal, prot);
    setIsEditingTargets(false);
  };

  // Handle AI analysis - now shows confirmation screen
  const handleAIAnalyze = async () => {
    if (aiInputMode !== "photo_ocr" && !aiInputText.trim()) {
      toast.error("Please enter a food description");
      return;
    }
    if (aiInputMode === "photo_ocr" && !aiImageFile) {
      toast.error("Please upload a nutrition label photo");
      return;
    }

    setIsAnalyzing(true);
    try {
      const imageData =
        aiInputMode === "photo_ocr" && aiImageFile
          ? await imageToBase64(aiImageFile)
          : undefined;

      const result = await analyzeNutrition({
        mode: aiInputMode,
        text: aiInputText,
        imageData,
        date: getCurrentLocalDate(),
        mealType: selectedMeal,
        useWebSearch: true, // Enable web search for accuracy
      });

      // Show confirmation screen with item breakdown
      setPendingItems(
        result.items.map((item) => ({ ...item, selected: true })),
      );
      setShowConfirmation(true);

      // Reset input
      setAiInputText("");
      setAiImageFile(null);
    } catch (error) {
      console.error("AI analysis failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to analyze nutrition",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Calculate totals from pending items
  const getPendingTotals = () => {
    const selectedItems = pendingItems.filter((i) => i.selected);
    return {
      calories: selectedItems.reduce((sum, i) => sum + i.calories, 0),
      protein: selectedItems.reduce((sum, i) => sum + i.protein, 0),
      carbs: selectedItems.reduce((sum, i) => sum + (i.carbs || 0), 0),
      fat: selectedItems.reduce((sum, i) => sum + (i.fat || 0), 0),
      count: selectedItems.length,
    };
  };

  // Save confirmed items
  const handleSaveConfirmedItems = async () => {
    const selectedItems = pendingItems.filter((i) => i.selected);
    if (selectedItems.length === 0) {
      toast.error("Please select at least one item");
      return;
    }

    try {
      const date = getCurrentLocalDate();
      const itemsToSave = selectedItems.map(({ selected, ...item }) => item);

      // Save food items catalog and meal items
      await Promise.all([
        saveFoodItems(itemsToSave),
        saveMealItems(itemsToSave, date, selectedMeal),
      ]);

      // Update daily nutrition totals (add to existing)
      const totals = getPendingTotals();
      const existingCalories =
        weekData[date]?.[`${selectedMeal}_calories`] || 0;
      const existingProtein = weekData[date]?.[`${selectedMeal}_protein`] || 0;

      onUpdateMeal(date, selectedMeal, {
        calories: existingCalories + totals.calories,
        protein: existingProtein + totals.protein,
      });

      toast.success(
        `Added ${totals.count} item${totals.count > 1 ? "s" : ""} to ${MEALS.find((m) => m.key === selectedMeal)?.label}`,
      );

      setShowConfirmation(false);
      setPendingItems([]);
      setShowAIInput(false);
    } catch (error) {
      console.error("Failed to save items:", error);
      toast.error("Failed to save items. Please try again.");
    }
  };

  // Toggle item selection
  const toggleItemSelection = (index: number) => {
    setPendingItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item,
      ),
    );
  };

  // Delete item
  const deleteItem = (index: number) => {
    setPendingItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Start editing item
  const startEditItem = (index: number) => {
    setEditingItem(index);
    setEditItemData({ ...pendingItems[index] });
  };

  // Save edited item
  const saveEditedItem = () => {
    if (editingItem === null || !editItemData) return;

    setPendingItems((prev) =>
      prev.map((item, i) =>
        i === editingItem ? { ...editItemData, selected: item.selected } : item,
      ),
    );
    setEditingItem(null);
    setEditItemData(null);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingItem(null);
    setEditItemData(null);
  };

  return (
    <motion.div
      className="p-4 rounded-lg"
      style={{
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border.accent}`,
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header - Clickable to toggle collapse */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between mb-4 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{
              backgroundColor: `${colors.warning.DEFAULT}20`,
              border: `1px solid ${colors.warning.DEFAULT}40`,
            }}
          >
            <Utensils size={16} style={{ color: colors.warning.DEFAULT }} />
          </div>
          <div className="text-left">
            <span
              className="font-semibold text-sm"
              style={{ color: colors.warning.DEFAULT }}
            >
              Nutrition
            </span>
            <div
              className="text-xs font-mono"
              style={{ color: colors.text.muted }}
            >
              {dailyAverage.calories} cal avg • {dailyAverage.protein}g protein
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="text-xs font-mono"
            style={{ color: colors.text.muted }}
          >
            {daysTracked}/7 days
          </div>
          {isCollapsed ? (
            <ChevronDown size={18} style={{ color: colors.text.muted }} />
          ) : (
            <ChevronUp size={18} style={{ color: colors.text.muted }} />
          )}
        </div>
      </button>

      {/* Collapsible content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Daily Averages with Editable Targets */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Calories */}
              <div
                className="p-3 rounded-md"
                style={{ backgroundColor: colors.background.tertiary }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Flame size={14} style={{ color: colors.danger.DEFAULT }} />
                  <span
                    className="text-xs font-medium"
                    style={{ color: colors.text.secondary }}
                  >
                    Avg Calories
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-xl font-bold font-mono"
                    style={{ color: colors.text.primary }}
                  >
                    {dailyAverage.calories}
                  </span>
                  {isEditingTargets ? (
                    <input
                      type="number"
                      value={editCalories}
                      onChange={(e) => setEditCalories(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-16 px-1 py-0.5 text-xs rounded font-mono"
                      style={{
                        backgroundColor: colors.background.elevated,
                        border: `1px solid ${colors.warning.DEFAULT}`,
                        color: colors.text.primary,
                      }}
                    />
                  ) : (
                    <span
                      className="text-xs cursor-pointer hover:text-warning-400"
                      style={{ color: colors.text.muted }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditCalories(targetCalories.toString());
                        setEditProtein(targetProtein.toString());
                        setIsEditingTargets(true);
                      }}
                      title="Click to edit target"
                    >
                      /{targetCalories}
                    </span>
                  )}
                </div>
                <div
                  className="h-1.5 rounded-full mt-2 overflow-hidden"
                  style={{ backgroundColor: `${colors.danger.DEFAULT}20` }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${calorieProgress}%` }}
                    transition={{ duration: 0.6 }}
                    style={{ backgroundColor: colors.danger.DEFAULT }}
                  />
                </div>
              </div>

              {/* Protein */}
              <div
                className="p-3 rounded-md"
                style={{ backgroundColor: colors.background.tertiary }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Beef size={14} style={{ color: colors.success.DEFAULT }} />
                  <span
                    className="text-xs font-medium"
                    style={{ color: colors.text.secondary }}
                  >
                    Avg Protein
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-xl font-bold font-mono"
                    style={{ color: colors.text.primary }}
                  >
                    {dailyAverage.protein}g
                  </span>
                  {isEditingTargets ? (
                    <input
                      type="number"
                      value={editProtein}
                      onChange={(e) => setEditProtein(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-16 px-1 py-0.5 text-xs rounded font-mono"
                      style={{
                        backgroundColor: colors.background.elevated,
                        border: `1px solid ${colors.warning.DEFAULT}`,
                        color: colors.text.primary,
                      }}
                    />
                  ) : (
                    <span
                      className="text-xs cursor-pointer hover:text-warning-400"
                      style={{ color: colors.text.muted }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditCalories(targetCalories.toString());
                        setEditProtein(targetProtein.toString());
                        setIsEditingTargets(true);
                      }}
                      title="Click to edit target"
                    >
                      /{targetProtein}g
                    </span>
                  )}
                </div>
                <div
                  className="h-1.5 rounded-full mt-2 overflow-hidden"
                  style={{ backgroundColor: `${colors.success.DEFAULT}20` }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${proteinProgress}%` }}
                    transition={{ duration: 0.6 }}
                    style={{ backgroundColor: colors.success.DEFAULT }}
                  />
                </div>
              </div>
            </div>

            {/* Save targets button */}
            {isEditingTargets && (
              <div className="flex justify-end gap-2 mb-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTargets(false);
                  }}
                  className="px-3 py-1 text-xs rounded"
                  style={{
                    color: colors.text.muted,
                    border: `1px solid ${colors.border.DEFAULT}`,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveTargets();
                  }}
                  className="px-3 py-1 text-xs rounded"
                  style={{
                    backgroundColor: colors.warning.DEFAULT,
                    color: colors.background.primary,
                  }}
                >
                  Save Targets
                </button>
              </div>
            )}

            {/* AI Input Section */}
            <div className="mb-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAIInput(!showAIInput);
                }}
                className="w-full flex items-center justify-between p-3 rounded-md transition-all"
                style={{
                  backgroundColor: showAIInput
                    ? `${colors.primary.DEFAULT}15`
                    : colors.background.tertiary,
                  border: `1px dashed ${colors.primary.DEFAULT}50`,
                }}
              >
                <div className="flex items-center gap-2">
                  <Sparkles
                    size={16}
                    style={{ color: colors.primary.DEFAULT }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{ color: colors.primary.DEFAULT }}
                  >
                    AI-Powered Nutrition Analysis
                  </span>
                </div>
                {showAIInput ? (
                  <ChevronUp
                    size={16}
                    style={{ color: colors.primary.DEFAULT }}
                  />
                ) : (
                  <ChevronDown size={16} style={{ color: colors.text.muted }} />
                )}
              </button>

              <AnimatePresence>
                {showAIInput && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="p-4 mt-2 rounded-md space-y-4"
                      style={{
                        backgroundColor: colors.background.tertiary,
                        border: `1px solid ${colors.primary.DEFAULT}30`,
                      }}
                    >
                      {/* Mode Selection */}
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAiInputMode("product_name");
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs transition-all ${
                            aiInputMode === "product_name" ? "ring-1" : ""
                          }`}
                          style={{
                            backgroundColor:
                              aiInputMode === "product_name"
                                ? colors.primary.DEFAULT
                                : colors.background.elevated,
                            color:
                              aiInputMode === "product_name"
                                ? colors.background.primary
                                : colors.text.secondary,
                            ...(aiInputMode === "product_name"
                              ? {
                                  boxShadow: `0 0 10px ${colors.primary.DEFAULT}40`,
                                }
                              : {}),
                          }}
                        >
                          <Type size={14} />
                          Product Name
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAiInputMode("weight_food");
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs transition-all ${
                            aiInputMode === "weight_food" ? "ring-1" : ""
                          }`}
                          style={{
                            backgroundColor:
                              aiInputMode === "weight_food"
                                ? colors.primary.DEFAULT
                                : colors.background.elevated,
                            color:
                              aiInputMode === "weight_food"
                                ? colors.background.primary
                                : colors.text.secondary,
                            ...(aiInputMode === "weight_food"
                              ? {
                                  boxShadow: `0 0 10px ${colors.primary.DEFAULT}40`,
                                }
                              : {}),
                          }}
                        >
                          <Scale size={14} />
                          Weight + Food
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAiInputMode("photo_ocr");
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs transition-all ${
                            aiInputMode === "photo_ocr" ? "ring-1" : ""
                          }`}
                          style={{
                            backgroundColor:
                              aiInputMode === "photo_ocr"
                                ? colors.primary.DEFAULT
                                : colors.background.elevated,
                            color:
                              aiInputMode === "photo_ocr"
                                ? colors.background.primary
                                : colors.text.secondary,
                            ...(aiInputMode === "photo_ocr"
                              ? {
                                  boxShadow: `0 0 10px ${colors.primary.DEFAULT}40`,
                                }
                              : {}),
                          }}
                        >
                          <Camera size={14} />
                          Photo Label
                        </button>
                      </div>

                      {/* Text Input for product_name or weight_food modes */}
                      {aiInputMode !== "photo_ocr" && (
                        <div className="relative" ref={suggestionsRef}>
                          <input
                            type="text"
                            value={aiInputText}
                            onChange={(e) => {
                              setAiInputText(e.target.value);
                              setSelectedSuggestionIndex(-1);
                            }}
                            onFocus={() => {
                              if (foodSuggestions.length > 0) {
                                setShowSuggestions(true);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={handleSuggestionKeyDown}
                            placeholder={
                              aiInputMode === "weight_food"
                                ? "e.g., 800g extra lean turkey"
                                : "e.g., CorePower 26g protein shake"
                            }
                            className="w-full px-3 py-2 rounded text-sm"
                            style={{
                              backgroundColor: colors.background.elevated,
                              border: `1px solid ${
                                showSuggestions
                                  ? colors.primary.DEFAULT
                                  : colors.border.DEFAULT
                              }`,
                              color: colors.text.primary,
                            }}
                          />

                          {/* Suggestions Dropdown */}
                          <AnimatePresence>
                            {showSuggestions && foodSuggestions.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto"
                                style={{
                                  backgroundColor: colors.background.tertiary,
                                  border: `1px solid ${colors.border.accent}`,
                                }}
                              >
                                {foodSuggestions.map((item, index) => (
                                  <button
                                    key={item.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      quickAddToSelectedMeal(item);
                                    }}
                                    onMouseEnter={() =>
                                      setSelectedSuggestionIndex(index)
                                    }
                                    className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors"
                                    style={{
                                      backgroundColor:
                                        selectedSuggestionIndex === index
                                          ? `${colors.primary.DEFAULT}20`
                                          : "transparent",
                                      borderBottom:
                                        index < foodSuggestions.length - 1
                                          ? `1px solid ${colors.border.DEFAULT}30`
                                          : undefined,
                                    }}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div
                                        className="text-sm font-medium truncate"
                                        style={{ color: colors.text.primary }}
                                      >
                                        {item.name}
                                      </div>
                                      {item.serving_size && (
                                        <div
                                          className="text-xs truncate"
                                          style={{ color: colors.text.muted }}
                                        >
                                          {item.serving_size}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-mono ml-2">
                                      <div
                                        style={{ color: colors.danger.DEFAULT }}
                                      >
                                        {item.calories_per_serving} cal
                                      </div>
                                      <div
                                        style={{
                                          color: colors.success.DEFAULT,
                                        }}
                                      >
                                        {item.protein_g}g protein
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* File Upload for photo_ocr mode */}
                      {aiInputMode === "photo_ocr" && (
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setAiImageFile(file);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="hidden"
                            id="nutrition-image-upload"
                          />
                          <label
                            htmlFor="nutrition-image-upload"
                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm cursor-pointer transition-all ${
                              aiImageFile ? "border-dashed" : ""
                            }`}
                            style={{
                              backgroundColor: colors.background.elevated,
                              border: `1px solid ${aiImageFile ? colors.primary.DEFAULT : colors.border.DEFAULT}`,
                              color: aiImageFile
                                ? colors.primary.DEFAULT
                                : colors.text.secondary,
                            }}
                          >
                            <Camera size={16} />
                            {aiImageFile
                              ? aiImageFile.name
                              : "Upload Nutrition Label Photo"}
                          </label>
                        </div>
                      )}

                      {/* Meal Selection */}
                      <div>
                        <label
                          className="block text-xs mb-2"
                          style={{ color: colors.text.muted }}
                        >
                          Add to Meal
                        </label>
                        <div className="flex gap-2">
                          {MEALS.map((meal) => (
                            <button
                              key={meal.key}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMeal(meal.key);
                              }}
                              className={`flex-1 px-2 py-1.5 rounded text-xs transition-all ${
                                selectedMeal === meal.key ? "ring-1" : ""
                              }`}
                              style={{
                                backgroundColor:
                                  selectedMeal === meal.key
                                    ? colors.warning.DEFAULT
                                    : colors.background.elevated,
                                color:
                                  selectedMeal === meal.key
                                    ? colors.background.primary
                                    : colors.text.secondary,
                              }}
                            >
                              {meal.icon} {meal.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Analyze Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAIAnalyze();
                        }}
                        disabled={isAnalyzing}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all disabled:opacity-50"
                        style={{
                          backgroundColor: colors.primary.DEFAULT,
                          color: colors.background.primary,
                        }}
                      >
                        {isAnalyzing ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                            >
                              <Sparkles size={16} />
                            </motion.div>
                            <span>Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            <span>
                              Analyze & Add to{" "}
                              {MEALS.find((m) => m.key === selectedMeal)?.label}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Confirmation Modal for Food Items - Rendered via Portal */}
            {showConfirmation &&
              ReactDOM.createPortal(
                <AnimatePresence>
                  <>
                    {/* Backdrop */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowConfirmation(false)}
                      className="fixed inset-0 bg-black/50 z-40"
                    />
                    {/* Modal */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] md:w-[500px] max-h-[80vh] overflow-hidden z-50"
                    >
                      <div
                        className="h-full flex flex-col rounded-lg shadow-2xl overflow-hidden"
                        style={{
                          backgroundColor: colors.background.secondary,
                          border: `1px solid ${colors.border.accent}`,
                        }}
                      >
                        {/* Header */}
                        <div
                          className="p-4 flex items-center justify-between"
                          style={{
                            borderBottom: `1px solid ${colors.border.DEFAULT}`,
                          }}
                        >
                          <div>
                            <h3
                              className="font-semibold"
                              style={{ color: colors.text.primary }}
                            >
                              Confirm Food Items
                            </h3>
                            <p
                              className="text-xs mt-1"
                              style={{ color: colors.text.muted }}
                            >
                              Review and edit before adding to{" "}
                              {MEALS.find((m) => m.key === selectedMeal)?.label}
                            </p>
                          </div>
                          <button
                            onClick={() => setShowConfirmation(false)}
                            className="p-1 rounded hover:bg-white/10"
                          >
                            <X size={18} style={{ color: colors.text.muted }} />
                          </button>
                        </div>

                        {/* Items List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                          {pendingItems.map((item, index) => {
                            const isEditing = editingItem === index;
                            return (
                              <div
                                key={index}
                                className="p-3 rounded-md"
                                style={{
                                  backgroundColor: colors.background.tertiary,
                                  border: `1px solid ${colors.border.DEFAULT}`,
                                  opacity: item.selected ? 1 : 0.5,
                                }}
                              >
                                {isEditing ? (
                                  // Edit Mode
                                  <div className="space-y-2">
                                    <input
                                      type="text"
                                      value={editItemData?.name || ""}
                                      onChange={(e) =>
                                        setEditItemData((prev) =>
                                          prev
                                            ? { ...prev, name: e.target.value }
                                            : null,
                                        )
                                      }
                                      className="w-full px-2 py-1 text-sm rounded"
                                      style={{
                                        backgroundColor:
                                          colors.background.elevated,
                                        border: `1px solid ${colors.border.DEFAULT}`,
                                        color: colors.text.primary,
                                      }}
                                    />
                                    <div className="grid grid-cols-4 gap-2">
                                      <div>
                                        <label
                                          className="text-xs block mb-1"
                                          style={{ color: colors.text.muted }}
                                        >
                                          Calories
                                        </label>
                                        <input
                                          type="number"
                                          value={editItemData?.calories || 0}
                                          onChange={(e) =>
                                            setEditItemData((prev) =>
                                              prev
                                                ? {
                                                    ...prev,
                                                    calories:
                                                      parseInt(
                                                        e.target.value,
                                                      ) || 0,
                                                  }
                                                : null,
                                            )
                                          }
                                          className="w-full px-2 py-1 text-sm rounded"
                                          style={{
                                            backgroundColor:
                                              colors.background.elevated,
                                            border: `1px solid ${colors.border.DEFAULT}`,
                                            color: colors.text.primary,
                                          }}
                                        />
                                      </div>
                                      <div>
                                        <label
                                          className="text-xs block mb-1"
                                          style={{ color: colors.text.muted }}
                                        >
                                          Protein (g)
                                        </label>
                                        <input
                                          type="number"
                                          value={editItemData?.protein || 0}
                                          onChange={(e) =>
                                            setEditItemData((prev) =>
                                              prev
                                                ? {
                                                    ...prev,
                                                    protein:
                                                      parseInt(
                                                        e.target.value,
                                                      ) || 0,
                                                  }
                                                : null,
                                            )
                                          }
                                          className="w-full px-2 py-1 text-sm rounded"
                                          style={{
                                            backgroundColor:
                                              colors.background.elevated,
                                            border: `1px solid ${colors.border.DEFAULT}`,
                                            color: colors.text.primary,
                                          }}
                                        />
                                      </div>
                                      <div>
                                        <label
                                          className="text-xs block mb-1"
                                          style={{ color: colors.text.muted }}
                                        >
                                          Carbs (g)
                                        </label>
                                        <input
                                          type="number"
                                          value={editItemData?.carbs || 0}
                                          onChange={(e) =>
                                            setEditItemData((prev) =>
                                              prev
                                                ? {
                                                    ...prev,
                                                    carbs:
                                                      parseInt(
                                                        e.target.value,
                                                      ) || 0,
                                                  }
                                                : null,
                                            )
                                          }
                                          className="w-full px-2 py-1 text-sm rounded"
                                          style={{
                                            backgroundColor:
                                              colors.background.elevated,
                                            border: `1px solid ${colors.border.DEFAULT}`,
                                            color: colors.text.primary,
                                          }}
                                        />
                                      </div>
                                      <div>
                                        <label
                                          className="text-xs block mb-1"
                                          style={{ color: colors.text.muted }}
                                        >
                                          Fat (g)
                                        </label>
                                        <input
                                          type="number"
                                          value={editItemData?.fat || 0}
                                          onChange={(e) =>
                                            setEditItemData((prev) =>
                                              prev
                                                ? {
                                                    ...prev,
                                                    fat:
                                                      parseInt(
                                                        e.target.value,
                                                      ) || 0,
                                                  }
                                                : null,
                                            )
                                          }
                                          className="w-full px-2 py-1 text-sm rounded"
                                          style={{
                                            backgroundColor:
                                              colors.background.elevated,
                                            border: `1px solid ${colors.border.DEFAULT}`,
                                            color: colors.text.primary,
                                          }}
                                        />
                                      </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <button
                                        onClick={cancelEdit}
                                        className="px-3 py-1 text-xs rounded"
                                        style={{
                                          color: colors.text.muted,
                                          border: `1px solid ${colors.border.DEFAULT}`,
                                        }}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={saveEditedItem}
                                        className="px-3 py-1 text-xs rounded"
                                        style={{
                                          backgroundColor:
                                            colors.primary.DEFAULT,
                                          color: colors.background.primary,
                                        }}
                                      >
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  // View Mode
                                  <div className="flex items-start gap-3">
                                    <button
                                      onClick={() => toggleItemSelection(index)}
                                      className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                        item.selected
                                          ? "bg-primary-500 border-primary-500"
                                          : ""
                                      }`}
                                      style={{
                                        borderColor: item.selected
                                          ? colors.primary.DEFAULT
                                          : colors.border.DEFAULT,
                                        backgroundColor: item.selected
                                          ? colors.primary.DEFAULT
                                          : "transparent",
                                      }}
                                    >
                                      {item.selected && (
                                        <Check
                                          size={14}
                                          style={{
                                            color: colors.background.primary,
                                          }}
                                        />
                                      )}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <p
                                        className="text-sm font-medium truncate"
                                        style={{ color: colors.text.primary }}
                                      >
                                        {item.name}
                                      </p>
                                      <div className="flex items-center gap-3 mt-1 text-xs font-mono">
                                        <span
                                          style={{
                                            color: colors.danger.DEFAULT,
                                          }}
                                        >
                                          {item.calories} cal
                                        </span>
                                        <span
                                          style={{
                                            color: colors.success.DEFAULT,
                                          }}
                                        >
                                          {item.protein}g protein
                                        </span>
                                        {item.carbs !== undefined && (
                                          <span
                                            style={{ color: colors.text.muted }}
                                          >
                                            {item.carbs}g carbs
                                          </span>
                                        )}
                                        {item.fat !== undefined && (
                                          <span
                                            style={{ color: colors.text.muted }}
                                          >
                                            {item.fat}g fat
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => startEditItem(index)}
                                        className="p-1.5 rounded hover:bg-white/10"
                                        title="Edit item"
                                      >
                                        <Edit2
                                          size={14}
                                          style={{ color: colors.text.muted }}
                                        />
                                      </button>
                                      <button
                                        onClick={() => deleteItem(index)}
                                        className="p-1.5 rounded hover:bg-white/10"
                                        title="Delete item"
                                      >
                                        <Trash2
                                          size={14}
                                          style={{
                                            color: colors.danger.DEFAULT,
                                          }}
                                        />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Footer with Totals and Actions */}
                        <div
                          className="p-4 space-y-3"
                          style={{
                            borderTop: `1px solid ${colors.border.DEFAULT}`,
                          }}
                        >
                          {/* Totals Summary */}
                          <div
                            className="p-3 rounded-md flex items-center justify-between"
                            style={{
                              backgroundColor: colors.background.tertiary,
                            }}
                          >
                            <span
                              className="text-sm"
                              style={{ color: colors.text.secondary }}
                            >
                              Selected ({getPendingTotals().count} items)
                            </span>
                            <div className="flex items-center gap-3 text-sm font-mono">
                              <span style={{ color: colors.danger.DEFAULT }}>
                                {getPendingTotals().calories} cal
                              </span>
                              <span style={{ color: colors.success.DEFAULT }}>
                                {getPendingTotals().protein}g protein
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowConfirmation(false)}
                              className="flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-all"
                              style={{
                                color: colors.text.secondary,
                                border: `1px solid ${colors.border.DEFAULT}`,
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveConfirmedItems}
                              className="flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-all"
                              style={{
                                backgroundColor: colors.primary.DEFAULT,
                                color: colors.background.primary,
                              }}
                            >
                              Save Selected Items
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </>
                </AnimatePresence>,
                document.body,
              )}

            {/* 7-Day Grid */}
            <div className="space-y-1">
              {weekDays.map((date) => {
                const dayTotals = getDayTotals(date);
                const isExpanded = expandedDay === date;
                const dayData = weekData[date];
                const hasData = dayTotals.calories > 0 || dayTotals.protein > 0;

                return (
                  <div key={date}>
                    {/* Day Row */}
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedDay(isExpanded ? null : date);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-md transition-colors"
                      style={{
                        backgroundColor: isExpanded
                          ? colors.background.tertiary
                          : "transparent",
                      }}
                      whileHover={{ backgroundColor: colors.background.hover }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="text-xs font-mono w-12"
                          style={{ color: colors.text.muted }}
                        >
                          {formatDayName(date)}
                        </span>
                        {hasData ? (
                          <div className="flex items-center gap-3">
                            <span
                              className="text-sm font-mono"
                              style={{ color: colors.danger.DEFAULT }}
                            >
                              {dayTotals.calories}
                            </span>
                            <span
                              className="text-sm font-mono"
                              style={{ color: colors.success.DEFAULT }}
                            >
                              {dayTotals.protein}g
                            </span>
                          </div>
                        ) : (
                          <span
                            className="text-xs"
                            style={{ color: colors.text.disabled }}
                          >
                            No data
                          </span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp
                          size={14}
                          style={{ color: colors.text.muted }}
                        />
                      ) : (
                        <ChevronDown
                          size={14}
                          style={{ color: colors.text.muted }}
                        />
                      )}
                    </motion.button>

                    {/* Expanded Meal Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div
                            className="p-3 ml-4 mt-1 mb-2 rounded-md space-y-3"
                            style={{
                              backgroundColor: colors.background.tertiary,
                              border: `1px solid ${colors.border.DEFAULT}`,
                            }}
                          >
                            {MEALS.map((meal) => (
                              <div key={meal.key} className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span>{meal.icon}</span>
                                  <span
                                    className="text-xs font-medium"
                                    style={{ color: colors.text.secondary }}
                                  >
                                    {meal.label}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      placeholder="Cal"
                                      value={
                                        dayData?.[`${meal.key}_calories`] || ""
                                      }
                                      onChange={(e) =>
                                        handleMealUpdate(
                                          date,
                                          meal.key,
                                          "calories",
                                          parseInt(e.target.value) || 0,
                                        )
                                      }
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full px-2 py-1.5 rounded text-sm font-mono"
                                      style={{
                                        backgroundColor:
                                          colors.background.elevated,
                                        border: `1px solid ${colors.border.DEFAULT}`,
                                        color: colors.text.primary,
                                      }}
                                    />
                                    <span
                                      className="text-xs"
                                      style={{ color: colors.text.muted }}
                                    >
                                      cal
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      placeholder="Protein"
                                      value={
                                        dayData?.[`${meal.key}_protein`] || ""
                                      }
                                      onChange={(e) =>
                                        handleMealUpdate(
                                          date,
                                          meal.key,
                                          "protein",
                                          parseInt(e.target.value) || 0,
                                        )
                                      }
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full px-2 py-1.5 rounded text-sm font-mono"
                                      style={{
                                        backgroundColor:
                                          colors.background.elevated,
                                        border: `1px solid ${colors.border.DEFAULT}`,
                                        color: colors.text.primary,
                                      }}
                                    />
                                    <span
                                      className="text-xs"
                                      style={{ color: colors.text.muted }}
                                    >
                                      g
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Weekly Summary */}
            <div
              className="mt-4 pt-3 flex justify-between items-center"
              style={{ borderTop: `1px solid ${colors.border.DEFAULT}` }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: colors.text.muted }}
              >
                Weekly Total
              </span>
              <div className="flex items-center gap-4">
                <span
                  className="text-sm font-mono font-medium"
                  style={{ color: colors.danger.DEFAULT }}
                >
                  {weeklyTotals.calories.toLocaleString()} cal
                </span>
                <span
                  className="text-sm font-mono font-medium"
                  style={{ color: colors.success.DEFAULT }}
                >
                  {weeklyTotals.protein}g protein
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default NutritionKPI;
