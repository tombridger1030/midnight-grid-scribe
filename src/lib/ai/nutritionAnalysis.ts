/**
 * Nutrition Analysis Service
 *
 * Uses OpenAI GPT-4o for OCR and Anthropic Claude for text analysis.
 * Proxies through Supabase Edge Function to avoid CORS issues.
 *
 * Now supports:
 * - Food item breakdown (returns array of items instead of aggregate)
 * - Claude web search for accurate nutrition data
 * - Latest Claude model (claude-3-7-sonnet-20250224)
 */

import { supabase, SUPABASE_URL } from "@/lib/supabase";

// Edge Function URL
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/ai-proxy`;

export type InputMode = "product_name" | "weight_food" | "photo_ocr";
export type AIProvider = "openai" | "anthropic";

export interface FoodItem {
  name: string;
  brand?: string;
  servingSize?: string;
  calories: number;
  protein: number;
  carbs?: number;
  fat?: number;
  confidence: number;
  source: "ai" | "ai_with_search" | "manual";
}

export interface NutritionAnalysisInput {
  mode: InputMode;
  text?: string; // For product_name or weight_food modes
  imageData?: string; // Base64 for photo_ocr mode
  date: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snacks";
  useWebSearch?: boolean; // Enable Claude web search for accuracy
}

export interface NutritionAnalysisResult {
  items: FoodItem[]; // Array of items instead of aggregate
  totalCalories: number;
  totalProtein: number;
  totalCarbs?: number;
  totalFat?: number;
  confidence: number;
  provider: AIProvider;
  description: string; // Overall description of the meal
  rawResponse?: any;
}

// Web search tool configuration for Claude
// Minimal configuration - only type and name are required
const WEB_SEARCH_TOOL = {
  type: "web_search_20250305",
  name: "web_search",
};

// OpenAI OCR for nutritional labels - now returns items array
async function analyzeWithOpenAI(
  imageData: string,
): Promise<NutritionAnalysisResult> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabase.supabaseKey}`,
      apikey: supabase.supabaseKey,
    },
    body: JSON.stringify({
      provider: "openai",
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a nutrition expert. Analyze the nutritional label image and extract the food item with its nutritional information.

Respond ONLY with a JSON array in this exact format (even if only one item):
[
  {
    "name": "Food item name with serving size",
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number
  }
]

If values are not visible, estimate based on similar products. Return 0 for missing values.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract nutritional information from this label:",
            },
            {
              type: "image_url",
              image_url: {
                url: imageData,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Parse JSON response
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Try to extract JSON from response if it contains extra text
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Could not parse AI response");
    }
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];
  const foodItems: FoodItem[] = items.map((item: any) => ({
    name: item.name || "Unknown",
    servingSize: item.servingSize,
    calories: item.calories || 0,
    protein: item.protein || 0,
    carbs: item.carbs || 0,
    fat: item.fat || 0,
    confidence: 0.85,
    source: "ai" as const,
  }));

  return {
    items: foodItems,
    totalCalories: foodItems.reduce((sum, i) => sum + i.calories, 0),
    totalProtein: foodItems.reduce((sum, i) => sum + i.protein, 0),
    totalCarbs: foodItems.reduce((sum, i) => sum + (i.carbs || 0), 0),
    totalFat: foodItems.reduce((sum, i) => sum + (i.fat || 0), 0),
    confidence: 0.85, // OCR generally high confidence
    provider: "openai",
    description: `From label photo: ${foodItems.map((i) => i.name).join(", ")}`,
    rawResponse: data,
  };
}

// Anthropic Claude for text-based food analysis with web search support
async function analyzeWithAnthropic(
  text: string,
  mode: "product_name" | "weight_food",
  useWebSearch = true,
): Promise<NutritionAnalysisResult> {
  const systemPrompt = `You are a nutrition expert. Break down the meal or food into individual items with their nutritional information.

${
  mode === "weight_food"
    ? `For weight-based inputs (e.g., "800g extra lean turkey"), calculate nutrition based on the weight.`
    : `For product names or meal descriptions, break down into individual food items.`
}

${
  useWebSearch
    ? `Use web search to find accurate USDA nutritional data when needed.`
    : `Use your internal knowledge of USDA nutritional values.`
}

Return ONLY a JSON array in this exact format:
[
  {
    "name": "Food item name with serving size (e.g., 'Oatmeal (1 cup cooked)')",
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number
  }
]

Example for "oatmeal with blueberries and almonds":
[
  {"name": "Oatmeal (1 cup cooked)", "calories": 150, "protein": 6, "carbs": 27, "fat": 3},
  {"name": "Blueberries (1/2 cup)", "calories": 40, "protein": 0, "carbs": 10, "fat": 0},
  {"name": "Almonds (1 oz)", "calories": 164, "protein": 6, "carbs": 6, "fat": 14}
]

Return ONLY JSON.`;

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabase.supabaseKey}`,
      apikey: supabase.supabaseKey,
    },
    body: JSON.stringify({
      provider: "anthropic",
      model: "claude-sonnet-4-20250514", // Claude 4.0 Sonnet
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: text,
        },
      ],
      // Enable web search if requested
      tools: useWebSearch ? [WEB_SEARCH_TOOL] : undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Anthropic API error: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data = await response.json();

  // Handle different response formats:
  // 1. Direct text response (no tools used): { content: [{ type: "text", text: "..." }] }
  // 2. Tool use response (web search): { content: [{ type: "tool_use", ... }, { type: "text", text: "..." }] }
  // Find the text block in the content array
  const textBlock = data.content.find((block: any) => block.type === "text");
  if (!textBlock) {
    throw new Error("No text block found in AI response");
  }
  const content = textBlock.text;

  // Parse JSON response
  let items;
  try {
    items = JSON.parse(content);
  } catch {
    // Try to extract JSON from response if it contains extra text
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      items = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Could not parse AI response");
    }
  }

  const parsedItems = Array.isArray(items) ? items : [items];
  const foodItems: FoodItem[] = parsedItems.map((item: any) => ({
    name: item.name || "Unknown",
    servingSize: item.servingSize,
    calories: item.calories || 0,
    protein: item.protein || 0,
    carbs: item.carbs || 0,
    fat: item.fat || 0,
    confidence: useWebSearch ? 0.9 : 0.75,
    source: useWebSearch ? ("ai_with_search" as const) : ("ai" as const),
  }));

  return {
    items: foodItems,
    totalCalories: foodItems.reduce((sum, i) => sum + i.calories, 0),
    totalProtein: foodItems.reduce((sum, i) => sum + i.protein, 0),
    totalCarbs: foodItems.reduce((sum, i) => sum + (i.carbs || 0), 0),
    totalFat: foodItems.reduce((sum, i) => sum + (i.fat || 0), 0),
    confidence: useWebSearch ? 0.9 : 0.75,
    provider: "anthropic",
    description: text,
    rawResponse: data,
  };
}

// Main analysis function
export async function analyzeNutrition(
  input: NutritionAnalysisInput,
): Promise<NutritionAnalysisResult> {
  try {
    let result: NutritionAnalysisResult;

    if (input.mode === "photo_ocr" && input.imageData) {
      result = await analyzeWithOpenAI(input.imageData);
    } else if (
      (input.mode === "product_name" || input.mode === "weight_food") &&
      input.text
    ) {
      result = await analyzeWithAnthropic(
        input.text,
        input.mode,
        input.useWebSearch ?? true, // Default to web search enabled
      );
    } else {
      throw new Error("Invalid input parameters");
    }

    // Store the analysis in database
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase.from("nutrition_ai_entries").insert({
        user_id: userData.user.id,
        date: input.date,
        meal_type: input.mealType,
        input_type: input.mode,
        input_text: input.text,
        input_image_url: input.imageData?.substring(0, 1000), // Store truncated URL
        calories: result.totalCalories,
        protein: result.totalProtein,
        carbs: result.totalCarbs,
        fat: result.totalFat,
        ai_provider: result.provider,
        confidence_score: result.confidence,
        model_version:
          result.provider === "openai"
            ? "gpt-4o"
            : "claude-3-7-sonnet-20250224",
        raw_response: result.rawResponse,
      });
    }

    return result;
  } catch (error) {
    console.error("Nutrition analysis failed:", error);
    throw error;
  }
}

// Get recent AI entries for a user
export async function getRecentNutritionAIEntries(limit = 10) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from("nutrition_ai_entries")
    .select("*")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// Convert image file to base64
export async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix to get just the base64
      const base64 = result.split(",")[1];
      resolve(`data:${file.type};base64,${base64}`);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Save food items to the food_items catalog
 * If an item with the same name exists, increment its usage count instead
 */
export async function saveFoodItems(
  items: FoodItem[],
): Promise<{ created: number; updated: number }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { created: 0, updated: 0 };

  let created = 0;
  let updated = 0;

  for (const item of items) {
    // Check if a similar item already exists
    const { data: existing } = await supabase
      .from("food_items")
      .select("*")
      .eq("user_id", userData.user.id)
      .ilike("name", item.name)
      .limit(1);

    if (existing && existing.length > 0) {
      // Update existing item's usage count and last_used_at
      await supabase
        .from("food_items")
        .update({
          times_used: (existing[0].times_used || 1) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", existing[0].id);
      updated++;
    } else {
      // Create new food item
      await supabase.from("food_items").insert({
        user_id: userData.user.id,
        name: item.name,
        brand: item.brand,
        serving_size: item.servingSize,
        calories_per_serving: item.calories,
        protein_g: item.protein,
        carbs_g: item.carbs || 0,
        fat_g: item.fat || 0,
        data_source: item.source,
        times_used: 1,
      });
      created++;
    }
  }

  return { created, updated };
}

/**
 * Save meal items for a specific date and meal type
 */
export async function saveMealItems(
  items: FoodItem[],
  date: string,
  mealType: "breakfast" | "lunch" | "dinner" | "snacks",
  quantity = 1,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  // First, find or create food_item_ids for each item
  const mealItemsToInsert = [];

  for (const item of items) {
    // Try to find matching food item
    const { data: existingFoodItem } = await supabase
      .from("food_items")
      .select("id")
      .eq("user_id", userData.user.id)
      .ilike("name", item.name)
      .limit(1);

    const foodItemId = existingFoodItem?.[0]?.id || null;

    mealItemsToInsert.push({
      user_id: userData.user.id,
      date,
      meal_type: mealType,
      food_item_id: foodItemId,
      name: item.name,
      serving_size: item.servingSize,
      calories: item.calories,
      protein_g: item.protein,
      carbs_g: item.carbs || 0,
      fat_g: item.fat || 0,
      quantity,
      ai_generated: item.source !== "manual",
      confidence_score: item.confidence,
    });
  }

  if (mealItemsToInsert.length > 0) {
    await supabase.from("meal_items").insert(mealItemsToInsert);
  }
}

/**
 * Get meal items for a specific date and meal type
 */
export async function getMealItems(
  date: string,
  mealType: "breakfast" | "lunch" | "dinner" | "snacks",
): Promise<
  Array<{
    id: string;
    name: string;
    serving_size: string | null;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    quantity: number;
    ai_generated: boolean;
    confidence_score: number;
  }>
> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from("meal_items")
    .select("*")
    .eq("user_id", userData.user.id)
    .eq("date", date)
    .eq("meal_type", mealType);

  if (error) throw error;
  return data || [];
}

/**
 * Delete a meal item by ID
 */
export async function deleteMealItem(itemId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("meal_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", userData.user.id);

  if (error) throw error;
}

/**
 * Search for food items in the user's catalog
 */
export async function searchFoodItems(
  query: string,
  limit = 10,
): Promise<
  Array<{
    id: string;
    name: string;
    brand: string | null;
    serving_size: string | null;
    calories_per_serving: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    times_used: number;
  }>
> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from("food_items")
    .select("*")
    .eq("user_id", userData.user.id)
    .ilike("name", `%${query}%`)
    .order("times_used", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
