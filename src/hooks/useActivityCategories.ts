/**
 * useActivityCategories Hook
 *
 * Manages activity categories for deep work sessions
 */

import { useState, useEffect, useCallback } from "react";
import {
  deepWorkService,
  ActivityCategory,
  ActivityCategoriesConfig,
} from "@/lib/deepWorkService";

export function useActivityCategories() {
  const [categories, setCategories] = useState<ActivityCategory[]>([]);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const config = await deepWorkService.getActivityCategories();
      setCategories(config.categories);
      setDefaultCategoryId(config.default_category_id);
    } catch (error) {
      console.error("Failed to load activity categories:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addCategory = useCallback(
    async (category: Omit<ActivityCategory, "id">) => {
      const result = await deepWorkService.addActivityCategory(category);
      if (result) {
        await loadCategories();
        return result;
      }
      return null;
    },
    [loadCategories],
  );

  const updateCategory = useCallback(
    async (id: string, updates: Partial<Omit<ActivityCategory, "id">>) => {
      const success = await deepWorkService.updateActivityCategory(id, updates);
      if (success) {
        await loadCategories();
      }
      return success;
    },
    [loadCategories],
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      const success = await deepWorkService.deleteActivityCategory(id);
      if (success) {
        await loadCategories();
      }
      return success;
    },
    [loadCategories],
  );

  const setDefaultCategory = useCallback(
    async (id: string) => {
      // First, unset is_default on all categories
      const updates = categories.map((c) => ({
        ...c,
        is_default: c.id === id,
      }));

      const success = await deepWorkService.saveActivityCategories({
        categories: updates,
        default_category_id: id,
      });

      if (success) {
        await loadCategories();
      }
      return success;
    },
    [categories, loadCategories],
  );

  const getCategoryById = useCallback(
    (id: string) => {
      return categories.find((c) => c.id === id) || null;
    },
    [categories],
  );

  const defaultCategory = getCategoryById(defaultCategoryId || "");

  return {
    categories,
    defaultCategory,
    defaultCategoryId,
    isLoading,
    loadCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    setDefaultCategory,
    getCategoryById,
  };
}
