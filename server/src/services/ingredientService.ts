import { openai } from "./openai";
import ingredientNutritionData from "../data/ingredientNutrition.json";
import preparationRulesData from "../data/preparationRules.json";

// Types
export interface NutritionPer100g {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
}

export interface IngredientData {
  name_en: string;
  name_he: string;
  aliases_he: string[];
  category: string;
  per_100g: NutritionPer100g;
  piece_weight_g: number;
}

export interface PreparationRule {
  name_en: string;
  name_he: string;
  aliases_he: string[];
  aliases_en: string[];
  modifiers_per_100g: Partial<NutritionPer100g>;
}

export interface ParsedIngredient {
  ingredient_key: string | null;
  ingredient_name_en: string;
  ingredient_name_he: string;
  preparation_method: string | null;
  quantity: number;
  unit: string;
  is_estimated: boolean;
  estimated_nutrition?: NutritionPer100g;
}

export interface CalculatedNutrition extends NutritionPer100g {
  quantity_g: number;
  preparation_method: string | null;
  is_estimated: boolean;
}

// Unit conversion constants (to grams)
const UNIT_CONVERSIONS: Record<string, number> = {
  // Weight
  g: 1,
  gram: 1,
  grams: 1,
  גרם: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  קילו: 1000,
  "קילו גרם": 1000,
  oz: 28.35,
  ounce: 28.35,
  ounces: 28.35,
  lb: 453.6,
  pound: 453.6,
  pounds: 453.6,

  // Volume (approximate for cooking)
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
  כפית: 5,
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  כף: 15,
  cup: 240,
  cups: 240,
  כוס: 240,
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  "מ״ל": 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
  ליטר: 1000,

  // Count-based (needs ingredient context)
  piece: -1, // Special marker - resolved per ingredient
  pieces: -1,
  יחידה: -1,
  יחידות: -1,
  unit: -1,
  units: -1,
};

// Type the imported JSON data
const ingredientNutrition = ingredientNutritionData as Record<string, IngredientData>;
const preparationRules = preparationRulesData as Record<string, PreparationRule>;

/**
 * Parse free-text ingredient input using AI
 */
export async function parseIngredientInput(
  input: string,
  language: "he" | "en" = "he"
): Promise<ParsedIngredient> {
  // First try to match directly from our database
  const directMatch = findIngredientMatch(input, language);
  const prepMatch = findPreparationMatch(input, language);
  const quantityMatch = parseQuantityFromText(input);

  if (directMatch) {
    return {
      ingredient_key: directMatch.key,
      ingredient_name_en: directMatch.data.name_en,
      ingredient_name_he: directMatch.data.name_he,
      preparation_method: prepMatch?.key || null,
      quantity: quantityMatch.quantity,
      unit: quantityMatch.unit,
      is_estimated: false,
    };
  }

  // If no direct match and we have OpenAI, use AI to parse
  if (openai) {
    try {
      const parsed = await parseWithAI(input, language);
      // Try to match the AI-parsed ingredient
      const aiMatch = findIngredientMatch(
        parsed.ingredient_name,
        language
      );

      if (aiMatch) {
        return {
          ingredient_key: aiMatch.key,
          ingredient_name_en: aiMatch.data.name_en,
          ingredient_name_he: aiMatch.data.name_he,
          preparation_method: parsed.preparation_method || prepMatch?.key || null,
          quantity: parsed.quantity || quantityMatch.quantity,
          unit: parsed.unit || quantityMatch.unit,
          is_estimated: false,
        };
      }

      // AI recognized ingredient but not in our DB - estimate nutrition
      const estimatedNutrition = await estimateNutritionWithAI(
        parsed.ingredient_name,
        language
      );

      return {
        ingredient_key: null,
        ingredient_name_en: language === "en" ? parsed.ingredient_name : "",
        ingredient_name_he: language === "he" ? parsed.ingredient_name : "",
        preparation_method: parsed.preparation_method || prepMatch?.key || null,
        quantity: parsed.quantity || quantityMatch.quantity,
        unit: parsed.unit || quantityMatch.unit,
        is_estimated: true,
        estimated_nutrition: estimatedNutrition,
      };
    } catch (error) {
      console.error("AI parsing failed:", error);
    }
  }

  // Fallback: return what we can parse
  return {
    ingredient_key: null,
    ingredient_name_en: language === "en" ? input : "",
    ingredient_name_he: language === "he" ? input : "",
    preparation_method: prepMatch?.key || null,
    quantity: quantityMatch.quantity,
    unit: quantityMatch.unit,
    is_estimated: true,
  };
}

/**
 * Find ingredient in database by name
 */
function findIngredientMatch(
  input: string,
  language: "he" | "en"
): { key: string; data: IngredientData } | null {
  const normalizedInput = input.toLowerCase().trim();

  for (const [key, data] of Object.entries(ingredientNutrition)) {
    // Check English name
    if (data.name_en.toLowerCase() === normalizedInput) {
      return { key, data };
    }

    // Check Hebrew name
    if (data.name_he === normalizedInput) {
      return { key, data };
    }

    // Check Hebrew aliases
    if (data.aliases_he.some((alias) => alias === normalizedInput)) {
      return { key, data };
    }

    // Partial match - input contains the ingredient name
    if (language === "he") {
      if (
        normalizedInput.includes(data.name_he) ||
        data.aliases_he.some((alias) => normalizedInput.includes(alias))
      ) {
        return { key, data };
      }
    } else {
      if (normalizedInput.includes(data.name_en.toLowerCase())) {
        return { key, data };
      }
    }
  }

  return null;
}

/**
 * Find preparation method in input
 */
function findPreparationMatch(
  input: string,
  language: "he" | "en"
): { key: string; data: PreparationRule } | null {
  const normalizedInput = input.toLowerCase().trim();

  for (const [key, data] of Object.entries(preparationRules)) {
    if (language === "he") {
      if (
        normalizedInput.includes(data.name_he) ||
        data.aliases_he.some((alias) => normalizedInput.includes(alias))
      ) {
        return { key, data };
      }
    } else {
      if (
        normalizedInput.includes(data.name_en.toLowerCase()) ||
        data.aliases_en.some((alias) =>
          normalizedInput.includes(alias.toLowerCase())
        )
      ) {
        return { key, data };
      }
    }
  }

  return null;
}

/**
 * Parse quantity and unit from text
 */
function parseQuantityFromText(input: string): { quantity: number; unit: string } {
  // Match patterns like "100g", "2 cups", "3 כף", etc.
  const patterns = [
    /(\d+(?:\.\d+)?)\s*(g|gram|grams|גרם|kg|קילו|tsp|כפית|tbsp|כף|cup|כוס|piece|יחידה|ml|l|oz)/i,
    /(\d+(?:\.\d+)?)/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      const quantity = parseFloat(match[1]);
      const unit = match[2]?.toLowerCase() || "g";
      return { quantity, unit };
    }
  }

  return { quantity: 100, unit: "g" };
}

/**
 * AI parsing for complex inputs
 */
async function parseWithAI(
  input: string,
  language: "he" | "en"
): Promise<{
  ingredient_name: string;
  preparation_method: string | null;
  quantity: number | null;
  unit: string | null;
}> {
  if (!openai) {
    throw new Error("OpenAI not configured");
  }

  const prompt =
    language === "he"
      ? `Parse this Hebrew ingredient text and extract the components.
Input: "${input}"

Return ONLY valid JSON with these fields:
{
  "ingredient_name": "the ingredient name in Hebrew without preparation method",
  "preparation_method": "cooking method if mentioned (מטוגן, מבושל, צלוי, etc.) or null",
  "quantity": number or null,
  "unit": "unit in Hebrew or English" or null
}

Examples:
"חציל מטוגן 100 גרם" → {"ingredient_name": "חציל", "preparation_method": "מטוגן", "quantity": 100, "unit": "גרם"}
"2 כפות טחינה" → {"ingredient_name": "טחינה", "preparation_method": null, "quantity": 2, "unit": "כף"}`
      : `Parse this English ingredient text and extract the components.
Input: "${input}"

Return ONLY valid JSON with these fields:
{
  "ingredient_name": "the ingredient name without preparation method",
  "preparation_method": "cooking method if mentioned (fried, grilled, baked, etc.) or null",
  "quantity": number or null,
  "unit": "unit" or null
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: 200,
  });

  const content = response.choices[0]?.message?.content || "{}";
  const jsonMatch = content.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  throw new Error("Failed to parse AI response");
}

/**
 * Estimate nutrition for unknown ingredients using AI
 */
async function estimateNutritionWithAI(
  ingredientName: string,
  language: "he" | "en"
): Promise<NutritionPer100g> {
  if (!openai) {
    // Return default values if no AI
    return {
      calories: 100,
      protein_g: 3,
      carbs_g: 10,
      fats_g: 5,
      fiber_g: 2,
      sugar_g: 3,
      sodium_mg: 100,
    };
  }

  const prompt = `Estimate nutrition values per 100g for: "${ingredientName}"
Return ONLY valid JSON:
{
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fats_g": number,
  "fiber_g": number,
  "sugar_g": number,
  "sodium_mg": number
}
Use realistic values based on similar foods.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 150,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("AI nutrition estimation failed:", error);
  }

  return {
    calories: 100,
    protein_g: 3,
    carbs_g: 10,
    fats_g: 5,
    fiber_g: 2,
    sugar_g: 3,
    sodium_mg: 100,
  };
}

/**
 * Look up nutrition for an ingredient
 */
export function lookupNutrition(ingredientKey: string): NutritionPer100g | null {
  const data = ingredientNutrition[ingredientKey];
  return data?.per_100g || null;
}

/**
 * Get ingredient data by key
 */
export function getIngredient(ingredientKey: string): IngredientData | null {
  return ingredientNutrition[ingredientKey] || null;
}

/**
 * Convert quantity + unit to grams
 */
export function convertToGrams(
  quantity: number,
  unit: string,
  ingredientKey?: string
): number {
  const normalizedUnit = unit.toLowerCase().trim();
  const conversion = UNIT_CONVERSIONS[normalizedUnit];

  if (conversion === undefined) {
    // Unknown unit, assume grams
    return quantity;
  }

  if (conversion === -1) {
    // Piece-based - need ingredient context
    if (ingredientKey) {
      const data = ingredientNutrition[ingredientKey];
      if (data?.piece_weight_g) {
        return quantity * data.piece_weight_g;
      }
    }
    // Default piece weight
    return quantity * 100;
  }

  return quantity * conversion;
}

/**
 * Apply preparation method modifiers to nutrition
 */
export function applyPreparationModifier(
  nutrition: NutritionPer100g,
  preparationMethod: string | null,
  quantityGrams: number
): NutritionPer100g {
  if (!preparationMethod) {
    return nutrition;
  }

  const rule = preparationRules[preparationMethod];
  if (!rule) {
    return nutrition;
  }

  const modifiers = rule.modifiers_per_100g;
  const ratio = quantityGrams / 100;

  return {
    calories: nutrition.calories + (modifiers.calories || 0) * ratio,
    protein_g: nutrition.protein_g + (modifiers.protein_g || 0) * ratio,
    carbs_g: nutrition.carbs_g + (modifiers.carbs_g || 0) * ratio,
    fats_g: nutrition.fats_g + (modifiers.fats_g || 0) * ratio,
    fiber_g: nutrition.fiber_g + (modifiers.fiber_g || 0) * ratio,
    sugar_g: nutrition.sugar_g + (modifiers.sugar_g || 0) * ratio,
    sodium_mg: nutrition.sodium_mg + (modifiers.sodium_mg || 0) * ratio,
  };
}

/**
 * Calculate final nutrition for an ingredient
 */
export function calculateNutrition(
  ingredientKey: string | null,
  quantity: number,
  unit: string,
  preparationMethod: string | null,
  estimatedNutrition?: NutritionPer100g
): CalculatedNutrition {
  let nutritionPer100g: NutritionPer100g;
  let isEstimated = false;

  if (ingredientKey) {
    const lookup = lookupNutrition(ingredientKey);
    if (lookup) {
      nutritionPer100g = lookup;
    } else if (estimatedNutrition) {
      nutritionPer100g = estimatedNutrition;
      isEstimated = true;
    } else {
      // Fallback
      nutritionPer100g = {
        calories: 100,
        protein_g: 3,
        carbs_g: 10,
        fats_g: 5,
        fiber_g: 2,
        sugar_g: 3,
        sodium_mg: 100,
      };
      isEstimated = true;
    }
  } else if (estimatedNutrition) {
    nutritionPer100g = estimatedNutrition;
    isEstimated = true;
  } else {
    nutritionPer100g = {
      calories: 100,
      protein_g: 3,
      carbs_g: 10,
      fats_g: 5,
      fiber_g: 2,
      sugar_g: 3,
      sodium_mg: 100,
    };
    isEstimated = true;
  }

  // Convert to grams
  const quantityGrams = convertToGrams(quantity, unit, ingredientKey || undefined);

  // Calculate nutrition for the actual quantity
  const ratio = quantityGrams / 100;
  const scaledNutrition: NutritionPer100g = {
    calories: Math.round(nutritionPer100g.calories * ratio),
    protein_g: Math.round(nutritionPer100g.protein_g * ratio * 10) / 10,
    carbs_g: Math.round(nutritionPer100g.carbs_g * ratio * 10) / 10,
    fats_g: Math.round(nutritionPer100g.fats_g * ratio * 10) / 10,
    fiber_g: Math.round(nutritionPer100g.fiber_g * ratio * 10) / 10,
    sugar_g: Math.round(nutritionPer100g.sugar_g * ratio * 10) / 10,
    sodium_mg: Math.round(nutritionPer100g.sodium_mg * ratio),
  };

  // Apply preparation modifier
  const finalNutrition = applyPreparationModifier(
    scaledNutrition,
    preparationMethod,
    quantityGrams
  );

  return {
    ...finalNutrition,
    quantity_g: Math.round(quantityGrams),
    preparation_method: preparationMethod,
    is_estimated: isEstimated,
  };
}

/**
 * Search ingredients by query
 */
export function searchIngredients(
  query: string,
  language: "he" | "en" = "he",
  limit: number = 10
): Array<{
  key: string;
  name_en: string;
  name_he: string;
  category: string;
}> {
  const normalizedQuery = query.toLowerCase().trim();
  const results: Array<{
    key: string;
    name_en: string;
    name_he: string;
    category: string;
    score: number;
  }> = [];

  for (const [key, data] of Object.entries(ingredientNutrition)) {
    let score = 0;

    // Check Hebrew name
    if (data.name_he.includes(normalizedQuery)) {
      score = data.name_he === normalizedQuery ? 100 : 80;
    }

    // Check Hebrew aliases
    for (const alias of data.aliases_he) {
      if (alias.includes(normalizedQuery)) {
        score = Math.max(score, alias === normalizedQuery ? 90 : 70);
      }
    }

    // Check English name
    if (data.name_en.toLowerCase().includes(normalizedQuery)) {
      score = Math.max(
        score,
        data.name_en.toLowerCase() === normalizedQuery ? 100 : 80
      );
    }

    if (score > 0) {
      results.push({
        key,
        name_en: data.name_en,
        name_he: data.name_he,
        category: data.category,
        score,
      });
    }
  }

  // Sort by score and limit
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ key, name_en, name_he, category }) => ({
      key,
      name_en,
      name_he,
      category,
    }));
}

/**
 * Get all available units
 */
export function getAvailableUnits(): Array<{
  key: string;
  name_en: string;
  name_he: string;
  grams: number;
}> {
  return [
    { key: "g", name_en: "grams", name_he: "גרם", grams: 1 },
    { key: "tsp", name_en: "teaspoon", name_he: "כפית", grams: 5 },
    { key: "tbsp", name_en: "tablespoon", name_he: "כף", grams: 15 },
    { key: "cup", name_en: "cup", name_he: "כוס", grams: 240 },
    { key: "piece", name_en: "piece", name_he: "יחידה", grams: -1 },
  ];
}

/**
 * Get all available preparation methods
 */
export function getAvailablePreparations(): Array<{
  key: string;
  name_en: string;
  name_he: string;
  modifiers: Partial<NutritionPer100g>;
}> {
  return Object.entries(preparationRules).map(([key, data]) => ({
    key,
    name_en: data.name_en,
    name_he: data.name_he,
    modifiers: data.modifiers_per_100g,
  }));
}

/**
 * Get all ingredients (for admin/debug)
 */
export function getAllIngredients(): Array<{
  key: string;
  name_en: string;
  name_he: string;
  category: string;
}> {
  return Object.entries(ingredientNutrition).map(([key, data]) => ({
    key,
    name_en: data.name_en,
    name_he: data.name_he,
    category: data.category,
  }));
}
