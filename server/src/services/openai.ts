import OpenAI from "openai";
import {
  Ingredient,
  MealAnalysisResult,
  MealPlanRequest,
  MealPlanResponse,
  ReplacementMealRequest,
} from "../types/openai";
import { extractCleanJSON } from "../utils/openai";
import { getErrorMessage, errorMessageIncludesAny } from "../utils/errorUtils";

// AI Price Estimation Interfaces
export interface AIPriceEstimate {
  estimated_price: number;
  price_per_100g: number;
  currency: string;
  confidence: "high" | "medium" | "low";
  price_range: string;
}

export interface IngredientForPricing {
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
}

export interface MealPriceEstimate {
  total_estimated_cost: number;
  ingredient_costs: Array<{
    name: string;
    estimated_cost: number;
  }>;
  currency: string;
  confidence: "high" | "medium" | "low";
}

// Price cache for faster API responses (5 minute TTL)
const priceCache = new Map<string, { price: AIPriceEstimate; timestamp: number }>();
const PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedPrice(key: string): AIPriceEstimate | null {
  const cached = priceCache.get(key);
  if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL) {
    return cached.price;
  }
  priceCache.delete(key);
  return null;
}

function setCachedPrice(key: string, price: AIPriceEstimate): void {
  priceCache.set(key, { price, timestamp: Date.now() });
  // Clean old entries periodically
  if (priceCache.size > 500) {
    const now = Date.now();
    for (const [k, v] of priceCache.entries()) {
      if (now - v.timestamp > PRICE_CACHE_TTL) {
        priceCache.delete(k);
      }
    }
  }
}

export const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

// Helper function to validate and clean base64 image data
function validateAndCleanBase64(imageBase64: string): string {

  if (!imageBase64 || imageBase64.trim() === "") {
    throw new Error("Empty image data provided");
  }

  let cleanBase64 = imageBase64.trim();

  // Remove data URL prefix if present
  if (cleanBase64.startsWith("data:image/")) {
    const commaIndex = cleanBase64.indexOf(",");
    if (commaIndex === -1) {
      throw new Error("Invalid data URL format - missing comma");
    }
    cleanBase64 = cleanBase64.substring(commaIndex + 1);
  }

  // Remove any whitespace
  cleanBase64 = cleanBase64.replace(/\s/g, "");

  // Validate base64 format
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(cleanBase64)) {
    throw new Error("Invalid base64 format - contains invalid characters");
  }

  // Check minimum length (at least 1KB for a valid image)
  if (cleanBase64.length < 1000) {
    throw new Error("Base64 data too short - likely not a valid image");
  }

  // Check maximum size (10MB limit)
  const estimatedBytes = (cleanBase64.length * 3) / 4;
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB
  if (estimatedBytes > maxSizeBytes) {
    throw new Error("Image too large - must be under 10MB");
  }

  console.log(
    `✅ Base64 validation successful: ${
      cleanBase64.length
    } chars, ~${Math.round(estimatedBytes / 1024)}KB`
  );
  return cleanBase64;
}

// Fast ingredient emoji/icon mapping - instant lookup, no API calls needed
const ingredientEmojiMap: { [key: string]: string } = {
  // Proteins
  chicken: "🍗", beef: "🥩", pork: "🥓", fish: "🐟", salmon: "🍣", tuna: "🐟",
  shrimp: "🦐", lobster: "🦞", crab: "🦀", egg: "🥚", eggs: "🥚", turkey: "🦃",
  lamb: "🍖", duck: "🦆", bacon: "🥓", ham: "🍖", sausage: "🌭", steak: "🥩",
  // Dairy
  milk: "🥛", cheese: "🧀", yogurt: "🥛", butter: "🧈", cream: "🥛", ice: "🧊",
  // Grains & Carbs
  bread: "🍞", rice: "🍚", pasta: "🍝", noodles: "🍜", wheat: "🌾", oats: "🌾",
  cereal: "🥣", flour: "🌾", quinoa: "🌾", corn: "🌽", tortilla: "🫓",
  // Fruits
  apple: "🍎", banana: "🍌", orange: "🍊", lemon: "🍋", lime: "🍋", grape: "🍇",
  strawberry: "🍓", blueberry: "🫐", raspberry: "🍓", cherry: "🍒", peach: "🍑",
  pear: "🍐", watermelon: "🍉", melon: "🍈", pineapple: "🍍", mango: "🥭",
  coconut: "🥥", kiwi: "🥝", avocado: "🥑", tomato: "🍅",
  // Vegetables
  carrot: "🥕", broccoli: "🥦", lettuce: "🥬", spinach: "🥬", cabbage: "🥬",
  cucumber: "🥒", pepper: "🌶️", onion: "🧅", garlic: "🧄", potato: "🥔",
  eggplant: "🍆", mushroom: "🍄", peas: "🫛", beans: "🫘",
  celery: "🥬", zucchini: "🥒", squash: "🎃", pumpkin: "🎃", asparagus: "🥦",
  // Nuts & Seeds
  peanut: "🥜", almond: "🥜", walnut: "🥜", cashew: "🥜", pistachio: "🥜",
  // Condiments & Sauces
  salt: "🧂", sugar: "🍬", honey: "🍯", oil: "🫒", olive: "🫒", vinegar: "🍶",
  sauce: "🥫", ketchup: "🥫", mustard: "🥫", mayo: "🥫", soy: "🥫",
  // Beverages
  coffee: "☕", tea: "🍵", juice: "🧃", water: "💧", wine: "🍷", beer: "🍺",
  // Baked goods
  cake: "🍰", cookie: "🍪", pie: "🥧", donut: "🍩", croissant: "🥐",
  // Other
  chocolate: "🍫", candy: "🍬", pizza: "🍕", burger: "🍔", sandwich: "🥪",
  taco: "🌮", burrito: "🌯", sushi: "🍣", ramen: "🍜", soup: "🍲",
  salad: "🥗", fries: "🍟", hotdog: "🌭", popcorn: "🍿",
};

// Get emoji for ingredient - instant, no API call
function getIngredientEmoji(ingredientName: string): string {
  const name = ingredientName.toLowerCase().trim();

  // Direct match
  if (ingredientEmojiMap[name]) {
    return ingredientEmojiMap[name];
  }

  // Partial match - check if any key is contained in the name
  for (const [key, emoji] of Object.entries(ingredientEmojiMap)) {
    if (name.includes(key) || key.includes(name)) {
      return emoji;
    }
  }

  // Default food emoji
  return "🍽️";
}

// Generate a simple color based on ingredient name (for gradient backgrounds)
function getIngredientColor(ingredientName: string): string {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
    "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
    "#F8B500", "#FF7F50", "#87CEEB", "#98FB98", "#DDA0DD"
  ];
  let hash = 0;
  for (let i = 0; i < ingredientName.length; i++) {
    hash = ingredientName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export class OpenAIService {
  private static openai: OpenAI | null = null;

  static {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } else {
      console.warn(
        "⚠️ OpenAI API key not found. AI features will use fallback responses."
      );
    }
  }

  /**
   * Get ingredient visual data (emoji + color) - INSTANT, no API call
   */
  static getIngredientVisual(ingredientName: string): { emoji: string; color: string } {
    return {
      emoji: getIngredientEmoji(ingredientName),
      color: getIngredientColor(ingredientName),
    };
  }

  /**
   * Add visual data to all ingredients - INSTANT, no API calls
   */
  static addIngredientVisuals(
    ingredients: Array<{ name: string; [key: string]: any }>
  ): Array<{ name: string; ing_img?: string; ing_emoji?: string; ing_color?: string; [key: string]: any }> {
    if (ingredients.length === 0) {
      return ingredients;
    }

    console.log(`🎨 Adding visuals for ${ingredients.length} ingredients (instant)...`);

    return ingredients.map((ingredient) => {
      const visual = this.getIngredientVisual(ingredient.name);
      return {
        ...ingredient,
        ing_emoji: visual.emoji,
        ing_color: visual.color,
        // ing_img can be added later via CDN or user upload
      };
    });
  }

  static async generateText(
    prompt: string,
    maxTokens: number = 2048
  ): Promise<string> {
    try {
      console.log("🤖 Sending request to OpenAI...");
      console.log("📏 Prompt length:", prompt.length, "characters");

      const response = await this.openai?.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert clinical nutritionist and meal planning specialist with deep knowledge of Israeli cuisine, Mediterranean diet, and evidence-based nutrition science. Your task is to create practical, delicious, and nutritionally accurate meal plans. CRITICAL: Return ONLY valid JSON — no markdown fences, no preamble, no explanation. All nutritional values must be accurate and internally consistent (ingredient calories must sum to meal total ±5%). All prices must be realistic Israeli shekel values (2024-2025 supermarket prices).",
          },
          {
            role: "user",
            content:
              prompt.length > 8000 ? prompt.substring(0, 8000) + "..." : prompt,
          },
        ],
        max_completion_tokens: Math.min(maxTokens, 4096),
        temperature: 0.5, // Lower for nutritionally accurate, consistent meal plans
        top_p: 0.88,
      });

      const content = response?.choices[0]?.message?.content || "";
      console.log("✅ OpenAI response received, length:", content.length);

      const cleanedContent = content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();

      console.log("🧹 Cleaned OpenAI response");
      return cleanedContent;
    } catch (error: any) {
      console.error("💥 OpenAI API error:", error);
      if (error.code === "insufficient_quota") {
        throw new Error(
          "OpenAI quota exceeded. Using fallback menu generation."
        );
      }
      throw new Error("Failed to generate AI response");
    }
  }

  static async analyzeMealImage(
    imageBase64: string,
    language: string = "english",
    updateText?: string,
    editedIngredients?: any[]
  ): Promise<MealAnalysisResult> {
    console.log("🤖 Starting meal image analysis...");
    console.log("🥗 Edited ingredients count:", editedIngredients?.length || 0);

    // Validate and clean the image data
    let cleanBase64: string;
    try {
      cleanBase64 = validateAndCleanBase64(imageBase64);
    } catch (validationError: any) {
      console.log("⚠️ Image validation failed:", validationError.message);
      throw new Error(`Invalid image data: ${validationError.message}`);
    }

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY || !this.openai) {
      console.log("⚠️ No OpenAI API key, using fallback analysis");
      return this.getIntelligentFallbackAnalysis(
        language,
        updateText,
        editedIngredients
      );
    }

    try {
      console.log("🚀 Attempting OpenAI analysis...");
      return await this.callOpenAIForAnalysis(
        cleanBase64,
        language,
        updateText,
        editedIngredients
      );
    } catch (openaiError: unknown) {
      const errorMsg = getErrorMessage(openaiError);
      console.log("⚠️ OpenAI analysis failed:", errorMsg);

      // If it's a quota/billing issue, use fallback
      if (errorMessageIncludesAny(openaiError, ["quota", "billing", "rate limit"])) {
        console.log("🆘 Using fallback due to quota/billing limits");
        return this.getIntelligentFallbackAnalysis(
          language,
          updateText,
          editedIngredients
        );
      }

      // If it's a network/API issue, use fallback
      if (errorMessageIncludesAny(openaiError, ["network", "timeout", "connection"])) {
        console.log("🆘 Using fallback due to network issues");
        return this.getIntelligentFallbackAnalysis(
          language,
          updateText,
          editedIngredients
        );
      }

      // If AI couldn't analyze the image, use fallback
      if (errorMessageIncludesAny(openaiError, ["couldn't analyze", "clearer photo", "invalid response"])) {
        console.log("🆘 Using fallback due to image analysis failure");
        return this.getIntelligentFallbackAnalysis(
          language,
          updateText,
          editedIngredients
        );
      }

      // For other errors, still try fallback before failing completely
      console.log("🆘 Using fallback due to unexpected error");
      return this.getIntelligentFallbackAnalysis(
        language,
        updateText,
        editedIngredients
      );
    }
  }

  private static extractIngredientsFromText(content: string): any[] {
    console.log(
      "🔍 Attempting to extract ingredients from partial response..."
    );

    const ingredients: any[] = [];

    // Try to find ingredients array in the content
    const ingredientsMatch = content.match(
      /"ingredients"\s*:\s*\[([\s\S]*?)\]/
    );
    if (ingredientsMatch) {
      try {
        const ingredientsArrayText = `[${ingredientsMatch[1]}]`;
        const parsedIngredients = JSON.parse(ingredientsArrayText);

        return parsedIngredients.map((ing: any) => {
          if (typeof ing === "string") {
            return {
              name: ing,
              calories: 0,
              protein_g: 0,
              carbs_g: 0,
              fats_g: 0,
            };
          }
          return {
            name: ing.name || "Unknown ingredient",
            calories: Math.max(0, Number(ing.calories) || 0),
            protein_g: Math.max(
              0,
              Number(ing.protein_g) || Number(ing.protein) || 0
            ),
            carbs_g: Math.max(0, Number(ing.carbs_g) || Number(ing.carbs) || 0),
            fats_g: Math.max(
              0,
              Number(ing.fats_g) || Number(ing.fat) || Number(ing.fats) || 0
            ),
            fiber_g: ing.fiber_g ? Math.max(0, Number(ing.fiber_g)) : undefined,
            sugar_g: ing.sugar_g ? Math.max(0, Number(ing.sugar_g)) : undefined,
            sodium_mg: ing.sodium_mg
              ? Math.max(0, Number(ing.sodium_mg))
              : undefined,
          };
        });
      } catch (parseError) {
        console.log("⚠️ Failed to parse ingredients array:", parseError);
      }
    }

    // Fallback: look for individual ingredient mentions in the text
    const commonIngredients = [
      "chicken",
      "beef",
      "pork",
      "fish",
      "salmon",
      "tuna",
      "eggs",
      "rice",
      "pasta",
      "bread",
      "quinoa",
      "oats",
      "cheese",
      "milk",
      "yogurt",
      "butter",
      "tomato",
      "onion",
      "garlic",
      "lettuce",
      "spinach",
      "broccoli",
      "carrot",
      "apple",
      "banana",
      "orange",
      "berries",
      "olive oil",
      "salt",
      "pepper",
      "herbs",
      "spices",
    ];

    const lowerContent = content.toLowerCase();
    const foundIngredients = commonIngredients.filter((ingredient) =>
      lowerContent.includes(ingredient)
    );

    if (foundIngredients.length > 0) {
      console.log(`🎯 Found ${foundIngredients.length} ingredients in text`);
      return foundIngredients.map((ingredient) => ({
        name: ingredient,
        calories: 50, // Rough estimate
        protein_g: 2,
        carbs_g: 8,
        fats_g: 2,
      }));
    }

    // Final fallback based on meal name if available
    const mealNameMatch = content.match(/"meal_name"\s*:\s*"([^"]+)"/);
    const mealName = mealNameMatch ? mealNameMatch[1] : undefined;
    if (mealName) {
      console.log(`🍽️ Creating ingredients based on meal name: ${mealName}`);

      // Create ingredients based on meal name
      if (mealName.toLowerCase().includes("pie")) {
        return [
          {
            name: "pie crust",
            calories: 150,
            protein: 2,
            carbs: 20,
            fat: 8,
            protein_g: 2,
            carbs_g: 20,
            fats_g: 8,
          },
          {
            name: "fruit filling",
            calories: 120,
            protein: 1,
            carbs: 30,
            fat: 1,
            protein_g: 1,
            carbs_g: 30,
            fats_g: 1,
          },
          {
            name: "sugar",
            calories: 50,
            protein: 0,
            carbs: 13,
            fat: 0,
            protein_g: 0,
            carbs_g: 13,
            fats_g: 0,
          },
        ];
      } else if (mealName.toLowerCase().includes("salad")) {
        return [
          {
            name: "lettuce",
            calories: 20,
            protein: 2,
            carbs: 4,
            fat: 0,
            protein_g: 2,
            carbs_g: 4,
            fats_g: 0,
          },
          {
            name: "tomato & cucumber",
            calories: 30,
            protein: 2,
            carbs: 7,
            fat: 0,
            protein_g: 2,
            carbs_g: 7,
            fats_g: 0,
          },
          {
            name: "olive oil dressing",
            calories: 80,
            protein: 0,
            carbs: 2,
            fat: 9,
            protein_g: 0,
            carbs_g: 2,
            fats_g: 9,
          },
        ];
      }
    }

    // Ultimate fallback - use meal name as the ingredient
    return [
      {
        name: mealName || "mixed dish",
        calories: 200,
        protein: 10,
        carbs: 25,
        fat: 8,
        protein_g: 10,
        carbs_g: 25,
        fats_g: 8,
      },
    ];
  }

  private static extractPartialJSON(content: string): any | null {
    try {
      console.log("🔧 Attempting to extract partial JSON data...");

      // Extract visible values from the partial response
      const extractValue = (key: string, defaultValue: any = 0) => {
        const patterns = [
          new RegExp(`"${key}"\\s*:\\s*([^,}\\n]+)`, "i"),
          new RegExp(`${key}[:"'\\s]*([^,}\\n]+)`, "i"),
        ];

        for (const pattern of patterns) {
          const match = content.match(pattern);
          if (match) {
            let value = match[1].trim().replace(/[",]/g, "");
            if (
              key.includes("_g") ||
              key === "calories" ||
              key.includes("_mg")
            ) {
              const num = parseFloat(value);
              return isNaN(num) ? defaultValue : num;
            }
            return value || defaultValue;
          }
        }
        return defaultValue;
      };

      // Extract ingredients using the improved method
      const extractedIngredients = this.extractIngredientsFromText(content);
      console.log(
        `🥗 Extracted ${extractedIngredients.length} ingredients from partial response`
      );

      // Build a basic meal analysis from partial content
      return {
        meal_name: extractValue("meal_name", "Analyzed Meal"),
        calories: extractValue("calories", 250),
        protein_g: extractValue("protein_g", 15),
        carbs_g: extractValue("carbs_g", 30),
        fats_g: extractValue("fats_g", 10),
        fiber_g: extractValue("fiber_g", 5),
        sugar_g: extractValue("sugar_g", 8),
        sodium_mg: extractValue("sodium_mg", 400),
        saturated_fats_g: extractValue("saturated_fats_g", 3),
        polyunsaturated_fats_g: extractValue("polyunsaturated_fats_g", 2),
        monounsaturated_fats_g: extractValue("monounsaturated_fats_g", 4),
        omega_3_g: extractValue("omega_3_g", 0.5),
        omega_6_g: extractValue("omega_6_g", 1.5),
        soluble_fiber_g: extractValue("soluble_fiber_g", 2),
        insoluble_fiber_g: extractValue("insoluble_fiber_g", 3),
        cholesterol_mg: extractValue("cholesterol_mg", 20),
        alcohol_g: extractValue("alcohol_g", 0),
        caffeine_mg: extractValue("caffeine_mg", 0),
        liquids_ml: extractValue("liquids_ml", 0),
        serving_size_g: extractValue("serving_size_g", 200),
        allergens_json: { possible_allergens: [] },
        vitamins_json: {
          vitamin_a_mcg: 100,
          vitamin_c_mg: 10,
          vitamin_d_mcg: 1,
          vitamin_e_mg: 2,
          vitamin_k_mcg: 20,
          vitamin_b12_mcg: 0.5,
          folate_mcg: 40,
          niacin_mg: 3,
          thiamin_mg: 0.2,
          riboflavin_mg: 0.3,
          pantothenic_acid_mg: 0.8,
          vitamin_b6_mg: 0.4,
        },
        micronutrients_json: {
          iron_mg: 2,
          magnesium_mg: 50,
          zinc_mg: 1.5,
          calcium_mg: 80,
          potassium_mg: 200,
          phosphorus_mg: 100,
          selenium_mcg: 10,
          copper_mg: 0.2,
          manganese_mg: 0.5,
        },
        glycemic_index: extractValue("glycemic_index", 55),
        insulin_index: extractValue("insulin_index", 45),
        food_category: extractValue("food_category", "Mixed"),
        processing_level: extractValue(
          "processing_level",
          "Minimally processed"
        ),
        cooking_method: extractValue("cooking_method", "Mixed"),
        additives_json: { observed_additives: [] },
        health_risk_notes: extractValue(
          "health_risk_notes",
          "Generally healthy meal"
        ),
        confidence: Math.min(1, Math.max(0, extractValue("confidence", 0.7))),
        ingredients: extractedIngredients,
        servingSize: "1 serving",
        cookingMethod: extractValue("cooking_method", "Mixed preparation"),
        healthNotes: "Nutritious meal",
      };
    } catch (error: any) {
      console.log("💥 Partial JSON extraction failed:", error.message);
      return null;
    }
  }

  private static fixMalformedJSON(jsonString: string): string {
    console.log("🔧 Attempting to fix malformed JSON...");

    let fixed = jsonString.trim();

    // Remove any trailing commas before closing braces/brackets
    fixed = fixed.replace(/,(\s*[}\]])/g, "$1");

    // Ensure proper closing of the main object
    let openBraces = 0;
    let lastValidIndex = -1;

    for (let i = 0; i < fixed.length; i++) {
      if (fixed[i] === "{") {
        openBraces++;
      } else if (fixed[i] === "}") {
        openBraces--;
        if (openBraces === 0) {
          lastValidIndex = i;
        }
      }
    }

    // If we have unclosed braces, truncate to last valid closing
    if (openBraces > 0 && lastValidIndex > 0) {
      fixed = fixed.substring(0, lastValidIndex + 1);
      console.log("🔧 Truncated JSON to last valid closing brace");
    }

    // Add missing closing brace if needed
    if (openBraces > 0) {
      fixed += "}";
      console.log("🔧 Added missing closing brace");
    }

    return fixed;
  }

  private static async callOpenAIForAnalysis(
    cleanBase64: string,
    language: string,
    updateText?: string,
    editedIngredients?: any[]
  ): Promise<MealAnalysisResult> {
    // Build context from edited ingredients if provided
    let ingredientsContext = "";
    if (editedIngredients && editedIngredients.length > 0) {
      ingredientsContext = `\n\nUSER PROVIDED INGREDIENTS: ${editedIngredients
        .map(
          (ing) =>
            `${ing.name}: ${ing.calories}cal, ${ing.protein}g protein, ${ing.carbs}g carbs, ${ing.fat}g fat`
        )
        .join("; ")}`;
    }

    const systemPrompt = `You are an expert clinical nutritionist and food scientist with deep knowledge of portion estimation, food composition, and culinary techniques. Your sole task is to analyze food images and return precise, evidence-based nutritional data.

OUTPUT RULE: Respond with ONLY a valid JSON object — no markdown fences, no explanations, no apologies. If you are uncertain about any value, make a calibrated estimate rather than refusing.

LANGUAGE: All string values (meal_name, food_category, cooking_method, health_risk_notes, ingredient names, allergens) must be in ${language === "hebrew" ? "Hebrew" : "English"}.

ANALYSIS METHODOLOGY:
1. IDENTIFICATION — Name every visible component specifically. Use culinary precision:
   - "grilled chicken breast (skinless)" not "chicken" or "meat"
   - "basmati rice, steamed" not "rice" or "grain"
   - "extra virgin olive oil" not "oil" or "fat"
   - "whole egg, scrambled" not "egg"

2. PORTION ESTIMATION — Estimate weight in grams using visual anchors:
   - Standard dinner plate ≈ 26–28 cm diameter
   - Typical restaurant chicken breast ≈ 150–180g
   - Cup of cooked rice ≈ 180–200g
   - Be conservative: slightly underestimate rather than overestimate

3. MACRONUTRIENT CALCULATION — Use Atwater factors:
   - Protein & Carbohydrates: 4 kcal/g
   - Fat: 9 kcal/g
   - Alcohol: 7 kcal/g
   - Cross-check: total calories should equal (protein×4) + (carbs×4) + (fat×9)

4. COOKING METHOD IMPACT — Adjust fat content based on preparation:
   - Deep-fried: add 8–15g fat per 100g
   - Sautéed/stir-fried: add 3–8g fat per 100g
   - Grilled/baked: minimal added fat
   - Always account for cooking oils, marinades, and sauces

5. ALLERGEN DETECTION — Carefully identify potential allergens: gluten, dairy, eggs, tree nuts, peanuts, shellfish, fish, soy, sesame, mustard, sulfites

6. CONFIDENCE SCORE — Set 0.0–1.0 based on:
   - 0.85–0.95: Clear image, single known dish, all ingredients visible
   - 0.70–0.84: Slight ambiguity in portions or minor hidden ingredients
   - 0.55–0.69: Blurry image, complex mixed dish, or many hidden components
${updateText ? `\n7. USER CONTEXT — The user provided this note: "${updateText}". Adjust your analysis to incorporate this information (e.g., if they mention added butter, include it as an ingredient).` : ""}

CRITICAL RULES:
- NEVER use vague names like "Unknown ingredient", "Mixed vegetables", "Various spices"
- ALWAYS account for hidden calories: cooking fats, sauces, dressings, marinades
- If multiple portions are visible on one plate, analyze ONE standard serving
- Sauces and dressings can add 100–300 kcal — include them explicitly
- The ingredients array calories MUST approximately sum to the total meal calories (±10%)

REQUIRED JSON STRUCTURE:
{
  "meal_name": "descriptive meal name",
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fats_g": number,
  "fiber_g": number,
  "sugar_g": number,
  "sodium_mg": number,
  "serving_size_g": number,
  "confidence": number (0.0-1.0),
  "food_category": "Breakfast|Lunch|Dinner|Snack|Dessert|Beverage",
  "cooking_method": "specific method(s)",
  "health_risk_notes": "brief health observations (max 2 sentences)",
  "allergens_json": { "possible_allergens": ["list", "of", "allergens"] },
  "ingredients": [
    {
      "name": "specific ingredient name",
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fats_g": number,
      "fiber_g": number,
      "sugar_g": number,
      "sodium_mg": number,
      "estimated_portion_g": number
    }
  ]
}`;

    const userPromptParts: string[] = [
      "Analyze this food image in detail. Identify every component separately — include main ingredients, side dishes, sauces, dressings, and garnishes. Provide accurate portion weights and complete nutritional data for each ingredient and the total meal.",
    ];
    if (updateText) {
      userPromptParts.push(`User note: ${updateText}`);
    }
    if (ingredientsContext) {
      userPromptParts.push(ingredientsContext);
    }
    const userPrompt = userPromptParts.join(" ");

    console.log("🚀 CALLING OPENAI API!");

    const response = await this.openai!.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userPrompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${cleanBase64}`,
                detail: "high", // High detail for accurate ingredient and portion recognition
              },
            },
          ],
        },
      ],
      max_completion_tokens: 3000, // Enough for detailed ingredient breakdown with full nutritional data
      temperature: 0.3, // Low temperature for factual, consistent nutritional estimates
      top_p: 0.85,
    });

    const content = response?.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    console.log("🤖 OpenAI response received successfully!");
    console.log("📄 Raw content preview:", content.substring(0, 200) + "...");

    // Check for non-English responses that indicate inability to analyze
    const hebrewRefusal =
      content.includes("מצטער") || content.includes("לא יכול");
    const englishRefusal =
      content.toLowerCase().includes("sorry") ||
      content.toLowerCase().includes("cannot") ||
      content.toLowerCase().includes("unable") ||
      content.toLowerCase().includes("can't");

    if (hebrewRefusal || englishRefusal) {
      console.log("⚠️ OpenAI refused to analyze the image");
      throw new Error(
        "The AI couldn't analyze this image. Please try a clearer photo with better lighting and make sure the food is clearly visible."
      );
    }

    // Check if response is JSON or text
    let parsed;

    try {
      const cleanJSON = extractCleanJSON(content);
      console.log("🧹 Cleaning JSON content...");

      // Try to fix malformed JSON before parsing
      const fixedJSON = this.fixMalformedJSON(cleanJSON);

      parsed = JSON.parse(fixedJSON);
      console.log("✅ Successfully parsed JSON response");
      console.log(
        "🥗 Parsed ingredients count:",
        parsed.ingredients?.length || 0
      );
    } catch (parseError: any) {
      console.log("⚠️ JSON parsing failed:", parseError.message);
      console.log("📄 Content sample:", content.substring(0, 200) + "...");

      // Try to extract partial JSON and fill missing fields
      if (
        content.includes("meal_name") ||
        content.includes("calories") ||
        content.includes("{")
      ) {
        console.log("🔧 Attempting to parse partial JSON...");
        try {
          const partialJson = this.extractPartialJSON(content);
          if (partialJson) {
            parsed = partialJson;
            console.log("✅ Successfully recovered partial JSON");
            console.log(
              "🥗 Recovered ingredients count:",
              partialJson.ingredients?.length || 0
            );
          } else {
            throw new Error("Could not recover JSON from partial response");
          }
        } catch (recoveryError: any) {
          console.log("💥 Recovery failed:", recoveryError.message);

          // Use fallback analysis if parsing completely fails
          console.log("🆘 Using fallback analysis due to parsing failure");
          return this.getIntelligentFallbackAnalysis(
            language,
            updateText,
            editedIngredients
          );
        }
      } else {
        // Use fallback analysis for completely invalid responses
        console.log(
          "🆘 Using fallback analysis due to invalid response format"
        );
        return this.getIntelligentFallbackAnalysis(
          language,
          updateText,
          editedIngredients
        );
      }
    }

    // If edited ingredients were provided, properly recalculate the entire meal
    if (editedIngredients && editedIngredients.length > 0) {
      console.log("🥗 Recalculating meal with edited ingredients");

      // Calculate totals from all ingredients
      const totals = editedIngredients.reduce(
        (acc: any, ingredient: any) => ({
          calories: acc.calories + (Number(ingredient.calories) || 0),
          protein: acc.protein + (Number(ingredient.protein) || 0),
          carbs: acc.carbs + (Number(ingredient.carbs) || 0),
          fat: acc.fat + (Number(ingredient.fat) || 0),
          fiber: acc.fiber + (Number(ingredient.fiber) || 0),
          sugar: acc.sugar + (Number(ingredient.sugar) || 0),
          sodium: acc.sodium + (Number(ingredient.sodium_mg) || 0),
          saturated_fats_g:
            acc.saturated_fats_g + (Number(ingredient.saturated_fats_g) || 0),
          polyunsaturated_fats_g:
            acc.polyunsaturated_fats_g +
            (Number(ingredient.polyunsaturated_fats_g) || 0),
          monounsaturated_fats_g:
            acc.monounsaturated_fats_g +
            (Number(ingredient.monounsaturated_fats_g) || 0),
          omega_3_g: acc.omega_3_g + (Number(ingredient.omega_3_g) || 0),
          omega_6_g: acc.omega_6_g + (Number(ingredient.omega_6_g) || 0),
          soluble_fiber_g:
            acc.soluble_fiber_g + (Number(ingredient.soluble_fiber_g) || 0),
          insoluble_fiber_g:
            acc.insoluble_fiber_g + (Number(ingredient.insoluble_fiber_g) || 0),
          cholesterol_mg:
            acc.cholesterol_mg + (Number(ingredient.cholesterol_mg) || 0),
          alcohol_g: acc.alcohol_g + (Number(ingredient.alcohol_g) || 0),
          caffeine_mg: acc.caffeine_mg + (Number(ingredient.caffeine_mg) || 0),
          serving_size_g:
            acc.serving_size_g + (Number(ingredient.serving_size_g) || 0),
        }),
        {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          sugar: 0,
          sodium: 0,
          saturated_fats_g: 0,
          polyunsaturated_fats_g: 0,
          monounsaturated_fats_g: 0,
          omega_3_g: 0,
          omega_6_g: 0,
          soluble_fiber_g: 0,
          insoluble_fiber_g: 0,
          cholesterol_mg: 0,
          alcohol_g: 0,
          caffeine_mg: 0,
          serving_size_g: 0,
        }
      );

      // Generate meaningful meal name based on ingredients
      const ingredientNames = editedIngredients
        .map((ing: any) => ing.name)
        .filter(Boolean);
      const mealName =
        ingredientNames.length > 0
          ? language === "hebrew"
            ? `ארוחה עם ${ingredientNames.slice(0, 2).join(" ו")}`
            : `Meal with ${ingredientNames.slice(0, 2).join(" and ")}`
          : language === "hebrew"
          ? "ארוחה מותאמת"
          : "Custom Meal";

      // Generate health notes based on nutritional content
      let healthNotes = "";
      if (language === "hebrew") {
        if (totals.protein > 25) healthNotes += "עשיר בחלבון. ";
        if (totals.fiber > 10) healthNotes += "עשיר בסיבים תזונתיים. ";
        if (totals.sodium > 800) healthNotes += "רמת נתרן גבוהה. ";
        if (!healthNotes) healthNotes = "ארוחה מאוזנת מבוססת רכיבים מותאמים.";
      } else {
        if (totals.protein > 25) healthNotes += "High in protein. ";
        if (totals.fiber > 10) healthNotes += "Good source of fiber. ";
        if (totals.sodium > 800) healthNotes += "High sodium content. ";
        if (!healthNotes)
          healthNotes = "Balanced meal based on custom ingredients.";
      }

      return {
        name: mealName,
        recommendations: healthNotes,
        description:
          language === "hebrew"
            ? "ארוחה מחושבת מחדש עם רכיבים מותאמים"
            : "Recalculated meal with custom ingredients",
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein * 10) / 10,
        carbs: Math.round(totals.carbs * 10) / 10,
        fat: Math.round(totals.fat * 10) / 10,
        fiber: Math.round(totals.fiber * 10) / 10,
        sugar: Math.round(totals.sugar * 10) / 10,
        sodium: Math.round(totals.sodium),
        saturated_fats_g: Math.round(totals.saturated_fats_g * 10) / 10,
        polyunsaturated_fats_g:
          Math.round(totals.polyunsaturated_fats_g * 10) / 10,
        monounsaturated_fats_g:
          Math.round(totals.monounsaturated_fats_g * 10) / 10,
        omega_3_g: Math.round(totals.omega_3_g * 10) / 10,
        omega_6_g: Math.round(totals.omega_6_g * 10) / 10,
        soluble_fiber_g: Math.round(totals.soluble_fiber_g * 10) / 10,
        insoluble_fiber_g: Math.round(totals.insoluble_fiber_g * 10) / 10,
        cholesterol_mg: Math.round(totals.cholesterol_mg),
        alcohol_g: Math.round(totals.alcohol_g * 10) / 10,
        caffeine_mg: Math.round(totals.caffeine_mg),
        serving_size_g: Math.round(totals.serving_size_g),
        confidence: 95, // High confidence for user-edited ingredients
        ingredients: editedIngredients.map((ing: any) => ({
          name: ing.name || "Unknown ingredient",
          calories: Number(ing.calories) || 0,
          protein: Number(ing.protein) || 0,
          carbs: Number(ing.carbs) || 0,
          fat: Number(ing.fat) || 0,
          protein_g: Number(ing.protein) || 0,
          carbs_g: Number(ing.carbs) || 0,
          fats_g: Number(ing.fat) || 0,
          fiber_g: Number(ing.fiber) || 0,
          sugar_g: Number(ing.sugar) || 0,
          sodium_mg: Number(ing.sodium_mg) || 0,
          saturated_fats_g: Number(ing.saturated_fats_g) || 0,
          polyunsaturated_fats_g: Number(ing.polyunsaturated_fats_g) || 0,
          monounsaturated_fats_g: Number(ing.monounsaturated_fats_g) || 0,
          omega_3_g: Number(ing.omega_3_g) || 0,
          omega_6_g: Number(ing.omega_6_g) || 0,
          soluble_fiber_g: Number(ing.soluble_fiber_g) || 0,
          insoluble_fiber_g: Number(ing.insoluble_fiber_g) || 0,
          cholesterol_mg: Number(ing.cholesterol_mg) || 0,
          alcohol_g: Number(ing.alcohol_g) || 0,
          caffeine_mg: Number(ing.caffeine_mg) || 0,
          serving_size_g: Number(ing.serving_size_g) || 0,
          glycemic_index: ing.glycemic_index || undefined,
          insulin_index: ing.insulin_index || undefined,
          vitamins_json: ing.vitamins_json || {},
          micronutrients_json: ing.micronutrients_json || {},
          allergens_json: ing.allergens_json || {},
        })),
        servingSize:
          totals.serving_size_g > 0 ? `${totals.serving_size_g}g` : "1 serving",
        cookingMethod: "Custom preparation",
        healthNotes: healthNotes,
        vitamins_json: this.aggregateVitamins(editedIngredients),
        micronutrients_json: this.aggregateMicronutrients(editedIngredients),
        allergens_json: this.aggregateAllergens(editedIngredients),
        glycemic_index: this.calculateAverageGI(editedIngredients) ?? undefined,
        insulin_index: this.calculateAverageII(editedIngredients) ?? undefined,
        food_category: "Mixed ingredients",
        processing_level: "Varies by ingredient",
      };
    }
    const analysisResult: MealAnalysisResult = {
      name: parsed.meal_name || "AI Analyzed Meal",
      recommendations: parsed.healthNotes || parsed.recommendations || "",
      description: parsed.description || "",
      calories: Math.max(0, Number(parsed.calories) || 0),
      // Check both field name variants - AI may return protein or protein_g
      protein: Math.max(0, Number(parsed.protein_g) || Number(parsed.protein) || 0),
      carbs: Math.max(0, Number(parsed.carbs_g) || Number(parsed.carbs) || 0),
      fat: Math.max(0, Number(parsed.fats_g) || Number(parsed.fat) || Number(parsed.fats) || 0),
      saturated_fats_g: parsed.saturated_fats_g
        ? Math.max(0, Number(parsed.saturated_fats_g))
        : undefined,
      polyunsaturated_fats_g: parsed.polyunsaturated_fats_g
        ? Math.max(0, Number(parsed.polyunsaturated_fats_g))
        : undefined,
      monounsaturated_fats_g: parsed.monounsaturated_fats_g
        ? Math.max(0, Number(parsed.monounsaturated_fats_g))
        : undefined,
      omega_3_g: parsed.omega_3_g
        ? Math.max(0, Number(parsed.omega_3_g))
        : undefined,
      omega_6_g: parsed.omega_6_g
        ? Math.max(0, Number(parsed.omega_6_g))
        : undefined,
      fiber: (parsed.fiber_g || parsed.fiber) ? Math.max(0, Number(parsed.fiber_g) || Number(parsed.fiber) || 0) : undefined,
      soluble_fiber_g: parsed.soluble_fiber_g
        ? Math.max(0, Number(parsed.soluble_fiber_g))
        : undefined,
      insoluble_fiber_g: parsed.insoluble_fiber_g
        ? Math.max(0, Number(parsed.insoluble_fiber_g))
        : undefined,
      sugar: parsed.sugar_g ? Math.max(0, Number(parsed.sugar_g)) : undefined,
      cholesterol_mg: parsed.cholesterol_mg
        ? Math.max(0, Number(parsed.cholesterol_mg))
        : undefined,
      sodium: parsed.sodium_mg
        ? Math.max(0, Number(parsed.sodium_mg))
        : undefined,
      alcohol_g: parsed.alcohol_g
        ? Math.max(0, Number(parsed.alcohol_g))
        : undefined,
      caffeine_mg: parsed.caffeine_mg
        ? Math.max(0, Number(parsed.caffeine_mg))
        : undefined,
      liquids_ml: parsed.liquids_ml
        ? Math.max(0, Number(parsed.liquids_ml))
        : undefined,
      serving_size_g: parsed.serving_size_g
        ? Math.max(0, Number(parsed.serving_size_g))
        : undefined,
      allergens_json: parsed.allergens_json || null,
      vitamins_json: parsed.vitamins_json || null,
      micronutrients_json: parsed.micronutrients_json || null,
      additives_json: parsed.additives_json || null,
      glycemic_index: parsed.glycemic_index
        ? Math.max(0, Number(parsed.glycemic_index))
        : undefined,
      insulin_index: parsed.insulin_index
        ? Math.max(0, Number(parsed.insulin_index))
        : undefined,
      food_category: parsed.food_category || null,
      processing_level: parsed.processing_level || null,
      cooking_method: parsed.cooking_method || null,
      health_risk_notes: parsed.health_risk_notes || null,
      confidence: Math.min(
        100,
        Math.max(0, Number(parsed.confidence) * 100 || 85)
      ),
      ingredients: ((() => {
        // Use parsed ingredients, ingredients_list, or parsed.ingredients as fallback
        const sourceIngredients =
          parsed.ingredients || parsed.ingredients_list || [];

        console.log("🔍 Processing ingredients from parsed response...");
        console.log("📊 Source ingredients type:", typeof sourceIngredients);
        console.log(
          "📊 Source ingredients length:",
          Array.isArray(sourceIngredients)
            ? sourceIngredients.length
            : "Not array"
        );

        if (Array.isArray(sourceIngredients) && sourceIngredients.length > 0) {
          console.log("✅ Found valid ingredients array");
          return sourceIngredients.map((ing: any, index: number) => {
            console.log(
              `🥗 Processing ingredient ${index + 1}:`,
              typeof ing,
              ing
            );

            if (typeof ing === "string") {
              return {
                name: ing,
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                protein_g: 0,
                carbs_g: 0,
                fats_g: 0,
              };
            }
            const proteinVal = Math.max(
              0,
              Number(ing.protein_g) || Number(ing.protein) || 0
            );
            const carbsVal = Math.max(
              0,
              Number(ing.carbs_g) || Number(ing.carbs) || 0
            );
            const fatVal = Math.max(
              0,
              Number(ing.fats_g) || Number(ing.fat) || Number(ing.fats) || 0
            );
            return {
              name: ing.name || `Unknown ingredient ${index + 1}`,
              calories: Math.max(0, Number(ing.calories) || 0),
              protein: proteinVal,
              carbs: carbsVal,
              fat: fatVal,
              protein_g: proteinVal,
              carbs_g: carbsVal,
              fats_g: fatVal,
              fiber_g: ing.fiber_g
                ? Math.max(0, Number(ing.fiber_g))
                : undefined,
              sugar_g: ing.sugar_g
                ? Math.max(0, Number(ing.sugar_g))
                : undefined,
              sodium_mg: ing.sodium_mg
                ? Math.max(0, Number(ing.sodium_mg))
                : undefined,
              estimated_portion_g: ing.estimated_portion_g
                ? Math.max(0, Number(ing.estimated_portion_g))
                : undefined,
            };
          });
        } else if (typeof sourceIngredients === "string") {
          console.log("⚠️ Found string instead of array, converting...");
          return [
            {
              name: sourceIngredients,
              calories: 0,
              protein_g: 0,
              carbs_g: 0,
              fats_g: 0,
            },
          ];
        }

        console.log("⚠️ No valid ingredients found, using meal-based fallback");
        // Final fallback based on meal name
        const mealName = parsed.meal_name || "Unknown meal";
        if (mealName.toLowerCase().includes("pie")) {
          return [
            {
              name: "pie crust",
              calories: 150,
              protein: 2,
              carbs: 20,
              fat: 8,
              protein_g: 2,
              carbs_g: 20,
              fats_g: 8,
            },
            {
              name: "fruit filling",
              calories: 120,
              protein: 1,
              carbs: 30,
              fat: 1,
              protein_g: 1,
              carbs_g: 30,
              fats_g: 1,
            },
            {
              name: "sugar",
              calories: 50,
              protein: 0,
              carbs: 13,
              fat: 0,
              protein_g: 0,
              carbs_g: 13,
              fats_g: 0,
            },
          ];
        }

        const mainProtein = Math.floor((parsed.protein_g || 0) * 0.6);
        const mainCarbs = Math.floor((parsed.carbs_g || 0) * 0.6);
        const mainFat = Math.floor((parsed.fats_g || 0) * 0.6);
        const addProtein = Math.floor((parsed.protein_g || 0) * 0.4);
        const addCarbs = Math.floor((parsed.carbs_g || 0) * 0.4);
        const addFat = Math.floor((parsed.fats_g || 0) * 0.4);
        const baseName = parsed.meal_name || mealName || "dish";
        return [
          {
            name: baseName,
            calories: Math.floor((parsed.calories || 0) * 0.6),
            protein: mainProtein,
            carbs: mainCarbs,
            fat: mainFat,
            protein_g: mainProtein,
            carbs_g: mainCarbs,
            fats_g: mainFat,
          },
          {
            name: `${baseName} sides`,
            calories: Math.floor((parsed.calories || 0) * 0.4),
            protein: addProtein,
            carbs: addCarbs,
            fat: addFat,
            protein_g: addProtein,
            carbs_g: addCarbs,
            fats_g: addFat,
          },
        ];
      })()) as Ingredient[],
      servingSize: parsed.servingSize || "1 serving",
      cookingMethod: parsed.cookingMethod || "Unknown",
      healthNotes: parsed.healthNotes || "",
    };

    console.log("✅ OpenAI analysis completed successfully!");
    console.log(
      "🥗 Final ingredients count:",
      analysisResult.ingredients?.length || 0
    );

    // Add visual data (emoji + color) for each ingredient - INSTANT, no API calls
    if (analysisResult.ingredients && analysisResult.ingredients.length > 0) {
      console.log("🎨 Adding ingredient visuals (instant)...");
      analysisResult.ingredients = this.addIngredientVisuals(analysisResult.ingredients) as Ingredient[];
      console.log("✅ Ingredient visuals added successfully");
    }

    return analysisResult;
  }

  private static getIntelligentFallbackAnalysis(
    language: string = "english",
    updateText?: string,
    editedIngredients?: any[]
  ): MealAnalysisResult {
    console.log("⚠️ Using fallback analysis - OpenAI not available or failed");
    console.log(
      "💡 To enable real AI analysis, ensure OPENAI_API_KEY is set in environment"
    );

    // If edited ingredients are provided, use them for calculations
    if (editedIngredients && editedIngredients.length > 0) {
      console.log("🔄 Using edited ingredients for fallback analysis");

      const totals = editedIngredients.reduce(
        (acc: any, ing: any) => ({
          calories: acc.calories + (ing.calories || 0),
          protein: acc.protein + (ing.protein || 0),
          carbs: acc.carbs + (ing.carbs || 0),
          fat: acc.fat + (ing.fat || 0),
          fiber: acc.fiber + (ing.fiber || 0),
          sugar: acc.sugar + (ing.sugar || 0),
          sodium: acc.sodium + (ing.sodium_mg || 0),
        }),
        {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          sugar: 0,
          sodium: 0,
        }
      );

      return {
        name: language === "hebrew" ? "ארוחה מותאמת" : "Custom Meal",
        description:
          language === "hebrew"
            ? "ארוחה מבוססת רכיבים מותאמים"
            : "Meal based on custom ingredients",
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
        fiber: totals.fiber,
        sugar: totals.sugar,
        sodium: totals.sodium,
        confidence: 90, // High confidence for user-edited ingredients
        ingredients: editedIngredients.map((ing: any) => ({
          name: ing.name,
          calories: ing.calories || 0,
          protein: ing.protein || 0,
          carbs: ing.carbs || 0,
          fat: ing.fat || 0,
          protein_g: ing.protein || 0,
          carbs_g: ing.carbs || 0,
          fats_g: ing.fat || 0,
          fiber_g: ing.fiber || 0,
          sugar_g: ing.sugar || 0,
          sodium_mg: ing.sodium_mg || 0,
        })),
        servingSize: "1 serving",
        cookingMethod: "Custom",
        healthNotes:
          language === "hebrew"
            ? "מבוסס על רכיבים מותאמים"
            : "Based on custom ingredients",
        recommendations: "",
      };
    }
    const baseMeal = {
      name: language === "hebrew" ? "ארוחה מעורבת" : "Mixed Meal",
      description:
        language === "hebrew"
          ? "ארוחה מזינה ומאוזנת"
          : "Nutritious and balanced meal",
      calories: 420 + Math.floor(Math.random() * 200),
      protein: 25 + Math.floor(Math.random() * 15),
      carbs: 45 + Math.floor(Math.random() * 25),
      fat: 15 + Math.floor(Math.random() * 10),
      fiber: 8 + Math.floor(Math.random() * 6),
      sugar: 12 + Math.floor(Math.random() * 8),
      sodium: 600 + Math.floor(Math.random() * 400),
      confidence: 75,
      saturated_fats_g: 5 + Math.floor(Math.random() * 3),
      polyunsaturated_fats_g: 3 + Math.random() * 2,
      monounsaturated_fats_g: 7 + Math.random() * 3,
      omega_3_g: 0.5 + Math.random() * 0.8,
      omega_6_g: 2 + Math.random() * 1.5,
      soluble_fiber_g: 3 + Math.floor(Math.random() * 2),
      insoluble_fiber_g: 5 + Math.floor(Math.random() * 3),
      cholesterol_mg: 25 + Math.floor(Math.random() * 50),
      alcohol_g: 0,
      caffeine_mg: Math.floor(Math.random() * 20),
      liquids_ml: 50 + Math.floor(Math.random() * 100),
      serving_size_g: 250 + Math.floor(Math.random() * 200),
      glycemic_index: 45 + Math.floor(Math.random() * 25),
      insulin_index: 40 + Math.floor(Math.random() * 30),
      food_category: "Homemade",
      processing_level: "Minimally processed",
      cooking_method: "Mixed methods",
      health_risk_notes:
        language === "hebrew"
          ? "ארוחה בריאה ומאוזנת"
          : "Healthy and balanced meal",
    };

    // Apply user comment modifications more intelligently
    if (updateText) {
      const lowerUpdate = updateText.toLowerCase();

      // Analyze comment for specific foods
      if (lowerUpdate.includes("toast") || lowerUpdate.includes("bread")) {
        baseMeal.carbs += 20;
        baseMeal.calories += 80;
        baseMeal.name =
          language === "hebrew" ? "ארוחה עם לחם" : "Meal with Bread";
      }

      if (lowerUpdate.includes("butter") || lowerUpdate.includes("oil")) {
        baseMeal.fat += 10;
        baseMeal.calories += 90;
      }

      if (lowerUpdate.includes("cheese") || lowerUpdate.includes("dairy")) {
        baseMeal.protein += 8;
        baseMeal.fat += 6;
        baseMeal.calories += 80;
      }

      if (
        lowerUpdate.includes("big") ||
        lowerUpdate.includes("large") ||
        lowerUpdate.includes("גדול")
      ) {
        baseMeal.calories += 150;
        baseMeal.protein += 10;
        baseMeal.carbs += 15;
        baseMeal.fat += 8;
      }

      if (
        lowerUpdate.includes("small") ||
        lowerUpdate.includes("little") ||
        lowerUpdate.includes("קטן")
      ) {
        baseMeal.calories = Math.max(200, baseMeal.calories - 100);
        baseMeal.protein = Math.max(10, baseMeal.protein - 5);
        baseMeal.carbs = Math.max(20, baseMeal.carbs - 10);
        baseMeal.fat = Math.max(8, baseMeal.fat - 5);
      }

      if (
        lowerUpdate.includes("meat") ||
        lowerUpdate.includes("chicken") ||
        lowerUpdate.includes("beef") ||
        lowerUpdate.includes("בשר")
      ) {
        baseMeal.protein += 15;
        baseMeal.fat += 5;
        baseMeal.name = language === "hebrew" ? "ארוחת בשר" : "Meat Meal";
      }

      if (
        lowerUpdate.includes("salad") ||
        lowerUpdate.includes("vegetable") ||
        lowerUpdate.includes("סלט")
      ) {
        baseMeal.calories = Math.max(150, baseMeal.calories - 200);
        baseMeal.carbs = Math.max(15, baseMeal.carbs - 20);
        baseMeal.fiber += 5;
        baseMeal.name = language === "hebrew" ? "סלט ירקות" : "Vegetable Salad";
      }

      if (
        lowerUpdate.includes("pasta") ||
        lowerUpdate.includes("rice") ||
        lowerUpdate.includes("bread") ||
        lowerUpdate.includes("פסטה") ||
        lowerUpdate.includes("אורז")
      ) {
        baseMeal.carbs += 20;
        baseMeal.calories += 100;
        baseMeal.name =
          language === "hebrew" ? "ארוחת פחמימות" : "Carbohydrate Meal";
      }
    }

    // Generate more realistic ingredients based on comment
    let ingredients = [];

    if (updateText?.toLowerCase().includes("salad")) {
      ingredients = [
        {
          name: language === "hebrew" ? "חסה" : "Lettuce",
          calories: 15,
          protein: 1,
          carbs: 3,
          fat: 0,
          protein_g: 1,
          carbs_g: 3,
          fats_g: 0,
        },
        {
          name: language === "hebrew" ? "עגבניות" : "Tomatoes",
          calories: 25,
          protein: 1,
          carbs: 5,
          fat: 0,
          protein_g: 1,
          carbs_g: 5,
          fats_g: 0,
        },
        {
          name: language === "hebrew" ? "מלפפון" : "Cucumber",
          calories: 12,
          protein: 1,
          carbs: 3,
          fat: 0,
          protein_g: 1,
          carbs_g: 3,
          fats_g: 0,
        },
        {
          name: language === "hebrew" ? "שמן זית" : "Olive oil",
          calories: 120,
          protein: 0,
          carbs: 0,
          fat: 14,
          protein_g: 0,
          carbs_g: 0,
          fats_g: 14,
        },
      ];
    } else if (updateText?.toLowerCase().includes("pasta")) {
      ingredients = [
        {
          name: language === "hebrew" ? "פסטה" : "Pasta",
          calories: 220,
          protein: 8,
          carbs: 44,
          fat: 1,
          protein_g: 8,
          carbs_g: 44,
          fats_g: 1,
        },
        {
          name: language === "hebrew" ? "רוטב עגבניות" : "Tomato sauce",
          calories: 35,
          protein: 2,
          carbs: 8,
          fat: 0,
          protein_g: 2,
          carbs_g: 8,
          fats_g: 0,
        },
        {
          name: language === "hebrew" ? "פרמזן" : "Parmesan cheese",
          calories: 110,
          protein: 10,
          carbs: 1,
          fat: 7,
          protein_g: 10,
          carbs_g: 1,
          fats_g: 7,
        },
      ];
    } else if (updateText?.toLowerCase().includes("rice")) {
      ingredients = [
        {
          name: language === "hebrew" ? "אורז לבן" : "White rice",
          calories: 180,
          protein: 4,
          carbs: 37,
          fat: 0,
          protein_g: 4,
          carbs_g: 37,
          fats_g: 0,
        },
        {
          name: language === "hebrew" ? "ירקות מבושלים" : "Steamed vegetables",
          calories: 35,
          protein: 2,
          carbs: 7,
          fat: 0,
          protein_g: 2,
          carbs_g: 7,
          fats_g: 0,
        },
        {
          name: language === "hebrew" ? "חזה עוף" : "Chicken breast",
          calories: 165,
          protein: 31,
          carbs: 0,
          fat: 4,
          protein_g: 31,
          carbs_g: 0,
          fats_g: 4,
        },
      ];
    } else {
      const mainProtein = Math.floor(baseMeal.protein * 0.6);
      const mainCarbs = Math.floor(baseMeal.carbs * 0.2);
      const mainFat = Math.floor(baseMeal.fat * 0.3);
      const carbProtein = Math.floor(baseMeal.protein * 0.2);
      const carbCarbs = Math.floor(baseMeal.carbs * 0.6);
      const carbFat = Math.floor(baseMeal.fat * 0.1);
      const vegProtein = Math.floor(baseMeal.protein * 0.15);
      const vegCarbs = Math.floor(baseMeal.carbs * 0.15);
      const vegFat = Math.floor(baseMeal.fat * 0.1);
      const fatsFat = Math.floor(baseMeal.fat * 0.5);
      ingredients = [
        {
          name: language === "hebrew" ? "עוף" : "chicken",
          calories: Math.floor(baseMeal.calories * 0.4),
          protein: mainProtein,
          carbs: mainCarbs,
          fat: mainFat,
          protein_g: mainProtein,
          carbs_g: mainCarbs,
          fats_g: mainFat,
        },
        {
          name: language === "hebrew" ? "אורז" : "rice",
          calories: Math.floor(baseMeal.calories * 0.3),
          protein: carbProtein,
          carbs: carbCarbs,
          fat: carbFat,
          protein_g: carbProtein,
          carbs_g: carbCarbs,
          fats_g: carbFat,
        },
        {
          name: language === "hebrew" ? "ירקות מעורבים" : "mixed vegetables",
          calories: Math.floor(baseMeal.calories * 0.2),
          protein: vegProtein,
          carbs: vegCarbs,
          fat: vegFat,
          protein_g: vegProtein,
          carbs_g: vegCarbs,
          fats_g: vegFat,
        },
        {
          name: language === "hebrew" ? "שמן זית" : "olive oil",
          calories: Math.floor(baseMeal.calories * 0.1),
          protein: 0,
          carbs: 0,
          fat: fatsFat,
          protein_g: 0,
          carbs_g: 0,
          fats_g: fatsFat,
        },
      ];
    }

    return {
      name: baseMeal.name,
      description: baseMeal.description,
      calories: baseMeal.calories,
      protein: baseMeal.protein,
      carbs: baseMeal.carbs,
      fat: baseMeal.fat,
      fiber: baseMeal.fiber,
      sugar: baseMeal.sugar,
      sodium: baseMeal.sodium,
      confidence: baseMeal.confidence,
      saturated_fats_g: baseMeal.saturated_fats_g,
      polyunsaturated_fats_g: baseMeal.polyunsaturated_fats_g,
      monounsaturated_fats_g: baseMeal.monounsaturated_fats_g,
      omega_3_g: baseMeal.omega_3_g,
      omega_6_g: baseMeal.omega_6_g,
      soluble_fiber_g: baseMeal.soluble_fiber_g,
      insoluble_fiber_g: baseMeal.insoluble_fiber_g,
      cholesterol_mg: baseMeal.cholesterol_mg,
      alcohol_g: baseMeal.alcohol_g,
      caffeine_mg: baseMeal.caffeine_mg,
      liquids_ml: baseMeal.liquids_ml,
      serving_size_g: baseMeal.serving_size_g,
      allergens_json: { possible_allergens: [] },
      vitamins_json: {
        vitamin_a_mcg: 200 + Math.floor(Math.random() * 300),
        vitamin_c_mg: 15 + Math.floor(Math.random() * 25),
        vitamin_d_mcg: 2 + Math.random() * 3,
        vitamin_e_mg: 3 + Math.random() * 5,
        vitamin_k_mcg: 25 + Math.floor(Math.random() * 50),
        vitamin_b12_mcg: 1 + Math.random() * 2,
        folate_mcg: 50 + Math.floor(Math.random() * 100),
        niacin_mg: 5 + Math.random() * 8,
        thiamin_mg: 0.3 + Math.random() * 0.5,
        riboflavin_mg: 0.4 + Math.random() * 0.6,
        pantothenic_acid_mg: 1 + Math.random() * 2,
        vitamin_b6_mg: 0.5 + Math.random() * 1,
      },
      micronutrients_json: {
        iron_mg: 3 + Math.random() * 5,
        magnesium_mg: 80 + Math.floor(Math.random() * 60),
        zinc_mg: 2 + Math.random() * 4,
        calcium_mg: 150 + Math.floor(Math.random() * 200),
        potassium_mg: 400 + Math.floor(Math.random() * 300),
        phosphorus_mg: 200 + Math.floor(Math.random() * 150),
        selenium_mcg: 15 + Math.random() * 20,
        copper_mg: 0.3 + Math.random() * 0.5,
        manganese_mg: 0.8 + Math.random() * 1.2,
      },
      glycemic_index: baseMeal.glycemic_index,
      insulin_index: baseMeal.insulin_index,
      food_category: baseMeal.food_category,
      processing_level: baseMeal.processing_level,
      cooking_method: baseMeal.cooking_method,
      health_risk_notes: baseMeal.health_risk_notes,
      ingredients,
      servingSize: "1 serving",
      cookingMethod: baseMeal.cooking_method,
      healthNotes:
        language === "hebrew"
          ? "ארוחה מאוזנת ובריאה"
          : "Balanced and healthy meal",
      recommendations: "",
    };
  }

  static async updateMealAnalysis(
    originalAnalysis: MealAnalysisResult,
    updateText: string,
    language: string = "english"
  ): Promise<MealAnalysisResult> {
    try {
      console.log("🔄 Updating meal analysis with additional info...");

      if (!process.env.OPENAI_API_KEY || !this.openai) {
        console.log("⚠️ No OpenAI API key found, using mock update");
        return this.getMockUpdate(originalAnalysis, updateText);
      }

      const systemPrompt = `Nutritionist. Update meal analysis based on user info. Return JSON only.
Original: calories=${originalAnalysis.calories}, protein=${originalAnalysis.protein}g, carbs=${originalAnalysis.carbs}g, fat=${originalAnalysis.fat}g
User update: "${updateText}"
Language: ${language}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Update nutritional analysis: "${updateText}". Return JSON with name, calories, protein, carbs, fat, ingredients array.`,
          },
        ],
        max_completion_tokens: 1024, // Reduced - updates are smaller
        temperature: 0.5,
        top_p: 0.9,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : content;
        const parsed = JSON.parse(jsonString);

        const updatedResult: MealAnalysisResult = {
          name: parsed.name || originalAnalysis.name,
          description: parsed.description || originalAnalysis.description,
          calories: Math.max(
            0,
            Number(parsed.calories) || originalAnalysis.calories
          ),
          protein: Math.max(
            0,
            Number(parsed.protein) || originalAnalysis.protein
          ),
          carbs: Math.max(0, Number(parsed.carbs) || originalAnalysis.carbs),
          fat: Math.max(0, Number(parsed.fat) || originalAnalysis.fat),
          fiber: parsed.fiber
            ? Math.max(0, Number(parsed.fiber))
            : originalAnalysis.fiber,
          sugar: parsed.sugar
            ? Math.max(0, Number(parsed.sugar))
            : originalAnalysis.sugar,
          sodium: parsed.sodium
            ? Math.max(0, Number(parsed.sodium))
            : originalAnalysis.sodium,
          confidence: Math.min(
            100,
            Math.max(
              0,
              Number(parsed.confidence) || originalAnalysis.confidence
            )
          ),
          ingredients: Array.isArray(parsed.ingredients)
            ? parsed.ingredients.map((ing: any) => {
                if (typeof ing === "string") {
                  return {
                    name: ing,
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    fat: 0,
                    protein_g: 0,
                    carbs_g: 0,
                    fats_g: 0,
                  };
                }
                const proteinVal = Math.max(
                  0,
                  Number(ing.protein_g) || Number(ing.protein) || 0
                );
                const carbsVal = Math.max(
                  0,
                  Number(ing.carbs_g) || Number(ing.carbs) || 0
                );
                const fatVal = Math.max(
                  0,
                  Number(ing.fats_g) || Number(ing.fat) || Number(ing.fats) || 0
                );
                return {
                  name: ing.name || "Unknown",
                  calories: Math.max(0, Number(ing.calories) || 0),
                  protein: proteinVal,
                  carbs: carbsVal,
                  fat: fatVal,
                  protein_g: proteinVal,
                  carbs_g: carbsVal,
                  fats_g: fatVal,
                  fiber_g: ing.fiber_g
                    ? Math.max(0, Number(ing.fiber_g))
                    : undefined,
                  sugar_g: ing.sugar_g
                    ? Math.max(0, Number(ing.sugar_g))
                    : undefined,
                  sodium_mg: ing.sodium_mg
                    ? Math.max(0, Number(ing.sodium_mg))
                    : undefined,
                };
              })
            : typeof parsed.ingredients === "string"
            ? [
                {
                  name: parsed.ingredients,
                  calories: 0,
                  protein: 0,
                  carbs: 0,
                  fat: 0,
                  protein_g: 0,
                  carbs_g: 0,
                  fats_g: 0,
                },
              ]
            : [],
          servingSize: parsed.servingSize || originalAnalysis.servingSize,
          cookingMethod: parsed.cookingMethod || originalAnalysis.cookingMethod,
          healthNotes: parsed.healthNotes || originalAnalysis.healthNotes,
          recommendations: "",
        };

        console.log("✅ Update completed:", updatedResult);
        return updatedResult;
      } catch (parseError: any) {
        console.error("💥 Failed to parse update response:", parseError);
        throw new Error(
          `Failed to parse OpenAI update response: ${parseError.message}`
        );
      }
    } catch (error) {
      console.error("💥 OpenAI update error:", error);
      throw error;
    }
  }

  private static getMockUpdate(
    originalAnalysis: MealAnalysisResult,
    updateText: string
  ): MealAnalysisResult {
    const lowerUpdate = updateText.toLowerCase();
    let multiplier = 1;

    if (
      lowerUpdate.includes("more") ||
      lowerUpdate.includes("big") ||
      lowerUpdate.includes("large")
    ) {
      multiplier = 1.3;
    } else if (
      lowerUpdate.includes("less") ||
      lowerUpdate.includes("small") ||
      lowerUpdate.includes("little")
    ) {
      multiplier = 0.7;
    }

    return {
      ...originalAnalysis,
      calories: Math.round(originalAnalysis.calories * multiplier),
      protein: Math.round(originalAnalysis.protein * multiplier),
      carbs: Math.round(originalAnalysis.carbs * multiplier),
      fat: Math.round(originalAnalysis.fat * multiplier),
      name: `${originalAnalysis.name} (Updated)`,
    };
  }

  static async generateMealPlan(
    userProfile: MealPlanRequest
  ): Promise<MealPlanResponse> {
    try {
      console.log("🤖 Generating AI meal plan...");

      if (!process.env.OPENAI_API_KEY || !this.openai) {
        console.log("⚠️ No OpenAI API key found, using fallback meal plan");
        return this.generateFallbackMealPlan(userProfile);
      }

      return await this.callOpenAIForMealPlan(userProfile);
    } catch (error) {
      console.error("💥 OpenAI meal plan generation error:", error);
      return this.generateFallbackMealPlan(userProfile);
    }
  }

  private static async callOpenAIForMealPlan(
    userProfile: MealPlanRequest
  ): Promise<MealPlanResponse> {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const mealTimings = this.generateMealTimings(userProfile.meals_per_day, userProfile.snacks_per_day);

    const allergiesStr = Array.isArray(userProfile.allergies) && userProfile.allergies.length > 0
      ? userProfile.allergies.join(", ")
      : "None";
    const excludedStr = userProfile.excluded_ingredients.length > 0
      ? userProfile.excluded_ingredients.join(", ")
      : "None";
    const preferencesStr = userProfile.dietary_preferences.length > 0
      ? userProfile.dietary_preferences.join(", ")
      : "No restrictions";

    const systemPrompt = `You are an expert clinical nutritionist and meal plan designer. Create a complete 7-day meal plan as a single valid JSON object. Return ONLY the JSON — no markdown, no text outside the JSON.

NUTRITIONAL ACCURACY REQUIREMENTS:
- Total daily calories must be within ±50kcal of the target
- Macros must sum correctly: calories = (protein×4) + (carbs×4) + (fats×9)
- Ingredient portions must be realistic (specify grams for solids, ml for liquids)
- Vary meals across the week — no meal should repeat more than twice
- Account for cultural food preferences and cooking skill level

COST REQUIREMENTS (Israeli market 2024-2025):
- Chicken breast: ~45 NIS/kg | Ground beef: ~60 NIS/kg | Eggs: ~3 NIS each
- Vegetables: ~5-15 NIS/kg | Grains (rice, pasta): ~10-20 NIS/kg
- Dairy (yogurt 200g): ~5-8 NIS | Cheese per 100g: ~8-15 NIS
- Legumes (canned): ~8-12 NIS | Olive oil (100ml): ~10-15 NIS`;

    const userPrompt = `Create a personalized 7-day meal plan for this user:

USER PROFILE:
- Age: ${userProfile.age} | Weight: ${userProfile.weight_kg}kg | Height: ${userProfile.height_cm}cm
- Goal: ${userProfile.main_goal}
- Activity Level: ${userProfile.physical_activity_level} | Sport: ${userProfile.sport_frequency}

DAILY NUTRITION TARGETS (MUST HIT THESE):
- Calories: ${userProfile.target_calories_daily} kcal
- Protein: ${userProfile.target_protein_daily}g
- Carbohydrates: ${userProfile.target_carbs_daily}g
- Fats: ${userProfile.target_fats_daily}g

MEAL SCHEDULE:
- Meals per day: ${userProfile.meals_per_day}
- Snacks per day: ${userProfile.snacks_per_day}
- Meal timings: ${mealTimings.join(", ")}

DIETARY CONSTRAINTS:
- Allergies (NEVER include these): ${allergiesStr}
- Excluded ingredients: ${excludedStr}
- Dietary preferences: ${preferencesStr}
- Meal texture preference: ${userProfile.meal_texture_preference || "No preference"}

PRACTICAL CONSTRAINTS:
- Cooking skill: ${userProfile.cooking_skill_level}
- Available cooking time: ${userProfile.available_cooking_time}
- Kitchen equipment: ${userProfile.kitchen_equipment.join(", ") || "Standard kitchen"}
- Include leftovers: ${userProfile.include_leftovers ? "Yes" : "No"}
- Fixed meal times: ${userProfile.fixed_meal_times ? "Yes" : "No"}
- Meal rotation every: ${userProfile.rotation_frequency_days} days

Return this exact JSON structure (fill all 7 days, each day with ${userProfile.meals_per_day + userProfile.snacks_per_day} meals):
{
  "weekly_plan": [
    {
      "day": "Sunday",
      "day_index": 0,
      "meals": [
        {
          "name": "meal name",
          "description": "brief appetizing description",
          "meal_timing": "${mealTimings[0] || "BREAKFAST"}",
          "dietary_category": "omnivore|vegetarian|vegan|keto|etc",
          "prep_time_minutes": 15,
          "difficulty_level": 1,
          "calories": 400,
          "protein_g": 30,
          "carbs_g": 35,
          "fats_g": 15,
          "fiber_g": 5,
          "sugar_g": 8,
          "sodium_mg": 400,
          "ingredients": [{"name": "chicken breast", "quantity": 150, "unit": "g", "category": "Protein"}],
          "instructions": [{"step": 1, "text": "instruction text"}],
          "allergens": [],
          "image_url": "",
          "portion_multiplier": 1,
          "is_optional": false
        }
      ]
    }
  ],
  "weekly_nutrition_summary": {
    "avg_daily_calories": ${userProfile.target_calories_daily},
    "avg_daily_protein": ${userProfile.target_protein_daily},
    "avg_daily_carbs": ${userProfile.target_carbs_daily},
    "avg_daily_fats": ${userProfile.target_fats_daily},
    "goal_adherence_percentage": 95
  },
  "shopping_tips": ["practical tip 1", "practical tip 2", "practical tip 3"],
  "meal_prep_suggestions": ["prep suggestion 1", "prep suggestion 2"]
}`;

    console.log("🚀 Calling OpenAI for AI meal plan generation...");

    try {
      const response = await this.openai!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 4096,
        temperature: 0.5,
        top_p: 0.88,
      });

      const content = response?.choices[0]?.message?.content || "";
      console.log("✅ OpenAI meal plan response received, length:", content.length);

      const cleanedContent = extractCleanJSON(content);
      const parsed = JSON.parse(cleanedContent) as MealPlanResponse;

      // Validate basic structure
      if (!parsed.weekly_plan || !Array.isArray(parsed.weekly_plan) || parsed.weekly_plan.length === 0) {
        throw new Error("Invalid meal plan structure from AI");
      }

      console.log(`✅ AI meal plan generated: ${parsed.weekly_plan.length} days`);
      return parsed;
    } catch (aiError) {
      console.error("💥 AI meal plan generation failed, falling back:", aiError);
      return this.generateFallbackMealPlan(userProfile);
    }
  }

  static async generateReplacementMeal(
    request: ReplacementMealRequest
  ): Promise<any> {
    try {
      console.log("🔄 Generating AI replacement meal...");

      if (!process.env.OPENAI_API_KEY || !this.openai) {
        console.log("⚠️ No OpenAI API key found, using fallback replacement");
        return this.generateFallbackReplacementMeal(request);
      }

      return this.generateFallbackReplacementMeal(request);
    } catch (error) {
      console.error("💥 OpenAI replacement meal generation error:", error);
      return this.generateFallbackReplacementMeal(request);
    }
  }

  static async generateNutritionInsights(
    meals: any[],
    stats: any
  ): Promise<string[]> {
    try {
      if (!process.env.OPENAI_API_KEY || !this.openai) {
        console.log("⚠️ No OpenAI API key found, using default insights");
        return [
          "Your nutrition tracking is helping you build healthy habits!",
          "Consider adding more variety to your meals for balanced nutrition.",
          "Keep logging your meals to maintain awareness of your eating patterns.",
        ];
      }

      return [
        "Your nutrition tracking is helping you build healthy habits!",
        "Consider adding more variety to your meals for balanced nutrition.",
        "Keep logging your meals to maintain awareness of your eating patterns.",
      ];
    } catch (error) {
      console.error("Error generating AI insights:", error);
      return [
        "Your nutrition tracking is helping you build healthy habits!",
        "Consider adding more variety to your meals for balanced nutrition.",
        "Keep logging your meals to maintain awareness of your eating patterns.",
      ];
    }
  }

  private static generateMealTimings(
    mealsPerDay: number,
    snacksPerDay: number
  ): string[] {
    const timings: string[] = [];

    if (mealsPerDay >= 1) timings.push("BREAKFAST");
    if (mealsPerDay >= 2) timings.push("LUNCH");
    if (mealsPerDay >= 3) timings.push("DINNER");

    if (snacksPerDay >= 1) timings.push("MORNING_SNACK");
    if (snacksPerDay >= 2) timings.push("AFTERNOON_SNACK");
    if (snacksPerDay >= 3) timings.push("EVENING_SNACK");

    return timings;
  }

  private static generateFallbackMealPlan(
    userProfile: MealPlanRequest
  ): MealPlanResponse {
    console.log("🆘 Generating fallback meal plan...");

    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const mealTimings = this.generateMealTimings(
      userProfile.meals_per_day,
      userProfile.snacks_per_day
    );

    const mealOptions = {
      BREAKFAST: [
        {
          name: "Scrambled Eggs with Avocado Toast",
          description: "Protein-rich eggs with healthy fats from avocado",
          calories: 420,
          protein_g: 22,
          carbs_g: 28,
          fats_g: 24,
          prep_time_minutes: 15,
          ingredients: [
            { name: "eggs", quantity: 2, unit: "piece", category: "Protein" },
            {
              name: "whole grain bread",
              quantity: 2,
              unit: "slice",
              category: "Grains",
            },
            { name: "avocado", quantity: 0.5, unit: "piece", category: "Fats" },
          ],
        },
        {
          name: "Greek Yogurt with Berries",
          description: "High-protein yogurt with antioxidant-rich berries",
          calories: 280,
          protein_g: 20,
          carbs_g: 25,
          fats_g: 8,
          prep_time_minutes: 5,
          ingredients: [
            {
              name: "greek yogurt",
              quantity: 200,
              unit: "g",
              category: "Dairy",
            },
            {
              name: "mixed berries",
              quantity: 100,
              unit: "g",
              category: "Fruits",
            },
            {
              name: "honey",
              quantity: 1,
              unit: "tbsp",
              category: "Sweeteners",
            },
          ],
        },
        {
          name: "Oatmeal with Nuts and Banana",
          description: "Fiber-rich oats with protein from nuts",
          calories: 350,
          protein_g: 12,
          carbs_g: 45,
          fats_g: 14,
          prep_time_minutes: 10,
          ingredients: [
            {
              name: "rolled oats",
              quantity: 50,
              unit: "g",
              category: "Grains",
            },
            { name: "banana", quantity: 1, unit: "piece", category: "Fruits" },
            { name: "almonds", quantity: 30, unit: "g", category: "Nuts" },
          ],
        },
      ],
      LUNCH: [
        {
          name: "Grilled Chicken Salad",
          description: "Lean protein with fresh vegetables",
          calories: 380,
          protein_g: 35,
          carbs_g: 15,
          fats_g: 20,
          prep_time_minutes: 20,
          ingredients: [
            {
              name: "chicken breast",
              quantity: 150,
              unit: "g",
              category: "Protein",
            },
            {
              name: "mixed greens",
              quantity: 100,
              unit: "g",
              category: "Vegetables",
            },
            { name: "olive oil", quantity: 2, unit: "tbsp", category: "Fats" },
          ],
        },
        {
          name: "Quinoa Buddha Bowl",
          description: "Complete protein quinoa with colorful vegetables",
          calories: 420,
          protein_g: 18,
          carbs_g: 55,
          fats_g: 15,
          prep_time_minutes: 25,
          ingredients: [
            { name: "quinoa", quantity: 80, unit: "g", category: "Grains" },
            {
              name: "roasted vegetables",
              quantity: 200,
              unit: "g",
              category: "Vegetables",
            },
            { name: "tahini", quantity: 2, unit: "tbsp", category: "Fats" },
          ],
        },
        {
          name: "Turkey and Hummus Wrap",
          description: "Lean protein with Mediterranean flavors",
          calories: 390,
          protein_g: 28,
          carbs_g: 35,
          fats_g: 16,
          prep_time_minutes: 10,
          ingredients: [
            {
              name: "whole wheat tortilla",
              quantity: 1,
              unit: "piece",
              category: "Grains",
            },
            {
              name: "turkey breast",
              quantity: 120,
              unit: "g",
              category: "Protein",
            },
            { name: "hummus", quantity: 3, unit: "tbsp", category: "Legumes" },
          ],
        },
      ],
      DINNER: [
        {
          name: "Baked Salmon with Sweet Potato",
          description: "Omega-3 rich fish with complex carbohydrates",
          calories: 520,
          protein_g: 40,
          carbs_g: 35,
          fats_g: 22,
          prep_time_minutes: 30,
          ingredients: [
            {
              name: "salmon fillet",
              quantity: 150,
              unit: "g",
              category: "Protein",
            },
            {
              name: "sweet potato",
              quantity: 200,
              unit: "g",
              category: "Vegetables",
            },
            {
              name: "broccoli",
              quantity: 150,
              unit: "g",
              category: "Vegetables",
            },
          ],
        },
        {
          name: "Lentil Curry with Rice",
          description: "Plant-based protein with aromatic spices",
          calories: 450,
          protein_g: 22,
          carbs_g: 65,
          fats_g: 12,
          prep_time_minutes: 35,
          ingredients: [
            {
              name: "red lentils",
              quantity: 100,
              unit: "g",
              category: "Legumes",
            },
            { name: "brown rice", quantity: 80, unit: "g", category: "Grains" },
            {
              name: "coconut milk",
              quantity: 100,
              unit: "ml",
              category: "Dairy",
            },
          ],
        },
        {
          name: "Chicken Stir-fry with Vegetables",
          description: "Quick and nutritious one-pan meal",
          calories: 410,
          protein_g: 32,
          carbs_g: 25,
          fats_g: 18,
          prep_time_minutes: 20,
          ingredients: [
            {
              name: "chicken breast",
              quantity: 150,
              unit: "g",
              category: "Protein",
            },
            {
              name: "mixed stir-fry vegetables",
              quantity: 200,
              unit: "g",
              category: "Vegetables",
            },
            { name: "sesame oil", quantity: 1, unit: "tbsp", category: "Fats" },
          ],
        },
      ],
    };

    const weeklyPlan = days.map((day, dayIndex) => ({
      day,
      day_index: dayIndex,
      meals: mealTimings.map((timing, mealIndex) => {
        const mealOptionsForTiming =
          mealOptions[timing as keyof typeof mealOptions] || mealOptions.LUNCH;
        const selectedMeal =
          mealOptionsForTiming[dayIndex % mealOptionsForTiming.length];

        return {
          name: selectedMeal.name,
          description: selectedMeal.description,
          meal_timing: timing,
          dietary_category: "BALANCED",
          prep_time_minutes: selectedMeal.prep_time_minutes,
          difficulty_level: 2,
          calories: selectedMeal.calories,
          protein_g: selectedMeal.protein_g,
          carbs_g: selectedMeal.carbs_g,
          fats_g: selectedMeal.fats_g,
          fiber_g: 6,
          sugar_g: 8,
          sodium_mg: 500,
          ingredients: selectedMeal.ingredients,
          instructions: [
            {
              step: 1,
              text: `Prepare ${selectedMeal.name} according to recipe`,
            },
            { step: 2, text: "Cook ingredients as needed" },
            { step: 3, text: "Serve and enjoy" },
          ],
          allergens: [],
          image_url:
            "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg",
          portion_multiplier: 1.0,
          is_optional: false,
        };
      }),
    }));

    return {
      weekly_plan: weeklyPlan,
      weekly_nutrition_summary: {
        avg_daily_calories: userProfile.target_calories_daily,
        avg_daily_protein: userProfile.target_protein_daily,
        avg_daily_carbs: userProfile.target_carbs_daily,
        goal_adherence_percentage: 90,
        avg_daily_fats: 0,
      },
      shopping_tips: [
        "Plan your shopping list based on the weekly meals",
        "Buy seasonal produce for better prices and freshness",
        "Prepare proteins in bulk on weekends to save time",
      ],
      meal_prep_suggestions: [
        "Cook grains in batches and store in the refrigerator",
        "Pre-cut vegetables for quick meal assembly",
        "Prepare protein sources in advance for easy cooking",
      ],
    };
  }

  private static generateFallbackReplacementMeal(
    request: ReplacementMealRequest
  ): any {
    console.log("🆘 Generating fallback replacement meal...");

    const replacementOptions = [
      {
        name: "Healthy Protein Bowl",
        description: "A balanced meal with lean protein and vegetables",
        calories: 400,
        protein_g: 30,
        carbs_g: 35,
        fats_g: 15,
      },
      {
        name: "Mediterranean Style Meal",
        description: "Fresh ingredients with Mediterranean flavors",
        calories: 450,
        protein_g: 25,
        carbs_g: 40,
        fats_g: 20,
      },
      {
        name: "Asian Inspired Dish",
        description: "Light and flavorful with Asian cooking techniques",
        calories: 380,
        protein_g: 28,
        carbs_g: 30,
        fats_g: 18,
      },
    ];

    const selectedReplacement =
      replacementOptions[Math.floor(Math.random() * replacementOptions.length)];

    return {
      name: selectedReplacement.name,
      description: selectedReplacement.description,
      meal_timing: request.current_meal.meal_timing,
      dietary_category: request.current_meal.dietary_category,
      prep_time_minutes: 25,
      difficulty_level: 2,
      calories: selectedReplacement.calories,
      protein_g: selectedReplacement.protein_g,
      carbs_g: selectedReplacement.carbs_g,
      fats_g: selectedReplacement.fats_g,
      fiber_g: 8,
      sugar_g: 5,
      sodium_mg: 600,
      ingredients: [
        {
          name: "Mixed healthy ingredients",
          quantity: 100,
          unit: "g",
          category: "Mixed",
        },
      ],
      instructions: [
        {
          step: 1,
          text: "Prepare ingredients according to your dietary preferences",
        },
        {
          step: 2,
          text: "Cook using your preferred method",
        },
      ],
      allergens: [],
      image_url:
        "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg",
      replacement_reason:
        "Generated as a healthy alternative that meets your nutritional needs",
    };
  }

  private static async generateDailyMenu(
    userPreferences: any,
    previousMeals: any[] = []
  ) {
    const recentMeals = previousMeals.slice(-5); // Reduced from 7
    const usedIngredients = recentMeals.flatMap(
      (meal) => meal.ingredients || []
    ).slice(0, 10); // Limit ingredients list

    const prompt = `Daily menu for: ${JSON.stringify(userPreferences).substring(0, 500)}
Avoid: ${usedIngredients.slice(0, 5).join(", ")}
Provide breakfast, lunch, dinner with ingredients and nutrition. Return JSON.`;

    const response = await this.openai?.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7, // Reduced from 0.9 for faster responses
      max_completion_tokens: 2048, // Reduced from 16000
      top_p: 0.9,
    });

    if (!response) {
      console.error("OpenAI API error: No response received.");
      return "Fallback menu: Salad for lunch, Pasta for dinner";
    }

    const content = response.choices[0]?.message?.content;

    if (!content) {
      console.error("OpenAI API error: Empty response content.");
      return "Fallback menu: Salad for lunch, Pasta for dinner";
    }

    return content;
  }

  private static aggregateVitamins(ingredients: any[]): any {
    return ingredients.reduce((acc, ing) => {
      if (ing.vitamins_json) {
        for (const vitamin in ing.vitamins_json) {
          if (acc[vitamin] === undefined) {
            acc[vitamin] = 0;
          }
          acc[vitamin] += Number(ing.vitamins_json[vitamin]) || 0;
        }
      }
      return acc;
    }, {});
  }

  private static aggregateMicronutrients(ingredients: any[]): any {
    return ingredients.reduce((acc, ing) => {
      if (ing.micronutrients_json) {
        for (const micronutrient in ing.micronutrients_json) {
          if (acc[micronutrient] === undefined) {
            acc[micronutrient] = 0;
          }
          acc[micronutrient] +=
            Number(ing.micronutrients_json[micronutrient]) || 0;
        }
      }
      return acc;
    }, {});
  }

  private static aggregateAllergens(ingredients: any[]): any {
    return ingredients.reduce(
      (acc, ing) => {
        if (ing.allergens_json && ing.allergens_json.possible_allergens) {
          ing.allergens_json.possible_allergens.forEach((allergen: any) => {
            if (!acc.possible_allergens.includes(allergen)) {
              acc.possible_allergens.push(allergen);
            }
          });
        }
        return acc;
      },
      { possible_allergens: [] }
    );
  }

  private static calculateAverageGI(ingredients: any[]): number | null {
    const validGIs = ingredients
      .map((ing) => ing.glycemic_index)
      .filter((gi) => typeof gi === "number");
    if (validGIs.length === 0) return null;
    const totalGI = validGIs.reduce((sum, gi) => sum + gi, 0);
    return totalGI / validGIs.length;
  }

  private static calculateAverageII(ingredients: any[]): number | null {
    const validIIs = ingredients
      .map((ing) => ing.insulin_index)
      .filter((ii) => typeof ii === "number");
    if (validIIs.length === 0) return null;
    const totalII = validIIs.reduce((sum, ii) => sum + ii, 0);
    return totalII / validIIs.length;
  }

  private static cleanJsonResponse(responseText: string): string {
    // Remove any markdown code block markers
    let cleaned = responseText
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "");

    // Remove any trailing incomplete content
    cleaned = cleaned.trim();

    // Find the last complete closing brace
    const lastBrace = cleaned.lastIndexOf("}");
    if (lastBrace > 0) {
      cleaned = cleaned.substring(0, lastBrace + 1);
    }

    return cleaned;
  }

  /**
   * Estimate price for a single ingredient using AI
   * Uses Israeli market prices in Shekels (₪)
   */
  static async estimateIngredientPriceWithAI(
    ingredient: IngredientForPricing
  ): Promise<AIPriceEstimate> {
    const defaultEstimate: AIPriceEstimate = {
      estimated_price: 5,
      price_per_100g: 3,
      currency: "ILS",
      confidence: "low",
      price_range: "₪3-8",
    };

    if (!process.env.OPENAI_API_KEY || !this.openai) {
      console.log("⚠️ No OpenAI API key for price estimation, using default");
      return defaultEstimate;
    }

    try {
      const prompt = `Estimate Israeli supermarket price for: ${ingredient.name}
Quantity: ${ingredient.quantity || 100}${ingredient.unit || "g"}
Category: ${ingredient.category || "food"}

Return JSON only: {"estimated_price":number,"price_per_100g":number,"confidence":"high"|"medium"|"low","price_range":"₪X-Y"}
Prices in Israeli Shekels (₪). Be realistic based on 2024 Israeli market prices.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Israeli supermarket price estimator. Return JSON only. All prices in Shekels (₪/ILS).",
          },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 150,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return defaultEstimate;

      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);

      return {
        estimated_price: Math.max(0, Number(parsed.estimated_price) || 5),
        price_per_100g: Math.max(0, Number(parsed.price_per_100g) || 3),
        currency: "ILS",
        confidence: parsed.confidence || "medium",
        price_range: parsed.price_range || `₪${Math.round(parsed.estimated_price * 0.85)}-${Math.round(parsed.estimated_price * 1.15)}`,
      };
    } catch (error) {
      console.error("❌ AI price estimation failed:", error);
      return defaultEstimate;
    }
  }

  /**
   * Estimate total price for a meal with multiple ingredients using AI
   * Batched request for efficiency
   */
  static async estimateMealPriceWithAI(
    ingredients: IngredientForPricing[]
  ): Promise<MealPriceEstimate> {
    const defaultEstimate: MealPriceEstimate = {
      total_estimated_cost: ingredients.length * 5,
      ingredient_costs: ingredients.map((ing) => ({
        name: ing.name,
        estimated_cost: 5,
      })),
      currency: "ILS",
      confidence: "low",
    };

    if (!ingredients || ingredients.length === 0) {
      return { ...defaultEstimate, total_estimated_cost: 0, ingredient_costs: [] };
    }

    if (!process.env.OPENAI_API_KEY || !this.openai) {
      console.log("⚠️ No OpenAI API key for meal price estimation, using default");
      return defaultEstimate;
    }

    try {
      const ingredientsList = ingredients
        .map((ing) => `- ${ing.name}: ${ing.quantity || 100}${ing.unit || "g"} (${ing.category || "food"})`)
        .join("\n");

      const prompt = `Estimate Israeli supermarket prices for these meal ingredients:
${ingredientsList}

Return JSON only:
{
  "total_estimated_cost": number,
  "ingredient_costs": [{"name": "ingredient name", "estimated_cost": number}],
  "confidence": "high"|"medium"|"low"
}
All prices in Israeli Shekels (₪). Base on 2024 Israeli market prices.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Israeli supermarket price estimator for meal ingredients. Return JSON only. All prices in Shekels (₪/ILS). Be accurate and realistic.",
          },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 500,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return defaultEstimate;

      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);

      return {
        total_estimated_cost: Math.max(0, Number(parsed.total_estimated_cost) || 0),
        ingredient_costs: Array.isArray(parsed.ingredient_costs)
          ? parsed.ingredient_costs.map((ic: any) => ({
              name: ic.name || "Unknown",
              estimated_cost: Math.max(0, Number(ic.estimated_cost) || 0),
            }))
          : defaultEstimate.ingredient_costs,
        currency: "ILS",
        confidence: parsed.confidence || "medium",
      };
    } catch (error) {
      console.error("❌ AI meal price estimation failed:", error);
      return defaultEstimate;
    }
  }

  /**
   * Estimate price for a product (from food scanner) using AI with caching
   */
  static async estimateProductPriceWithAI(
    productName: string,
    category: string,
    quantityGrams: number = 100
  ): Promise<AIPriceEstimate> {
    // Check cache first
    const cacheKey = `product:${productName.toLowerCase()}:${category.toLowerCase()}`;
    const cached = getCachedPrice(cacheKey);
    if (cached) {
      console.log(`💰 Cache hit for product: ${productName}`);
      // Adjust for quantity
      const adjustedPrice = (cached.price_per_100g * quantityGrams) / 100;
      return {
        ...cached,
        estimated_price: Math.round(adjustedPrice * 100) / 100,
      };
    }

    const result = await this.estimateIngredientPriceWithAI({
      name: productName,
      quantity: quantityGrams,
      unit: "g",
      category,
    });

    // Cache the result
    setCachedPrice(cacheKey, result);
    return result;
  }

  /**
   * Batch estimate prices for multiple products - more efficient
   * Uses a single AI call to price multiple products at once
   */
  static async batchEstimateProductPrices(
    products: Array<{ name: string; category: string }>
  ): Promise<Map<string, AIPriceEstimate>> {
    const results = new Map<string, AIPriceEstimate>();
    const uncachedProducts: Array<{ name: string; category: string; index: number }> = [];

    // Check cache first
    for (let i = 0; i < products.length; i++) {
      const prod = products[i];
      const cacheKey = `product:${prod.name.toLowerCase()}:${prod.category.toLowerCase()}`;
      const cached = getCachedPrice(cacheKey);
      if (cached) {
        results.set(prod.name, cached);
      } else {
        uncachedProducts.push({ ...prod, index: i });
      }
    }

    console.log(`💰 Batch pricing: ${results.size} cached, ${uncachedProducts.length} need AI`);

    if (uncachedProducts.length === 0) {
      return results;
    }

    // Default estimate for fallback
    const defaultEstimate: AIPriceEstimate = {
      estimated_price: 10,
      price_per_100g: 10,
      currency: "ILS",
      confidence: "low",
      price_range: "₪8-15",
    };

    if (!process.env.OPENAI_API_KEY || !this.openai) {
      for (const prod of uncachedProducts) {
        results.set(prod.name, defaultEstimate);
      }
      return results;
    }

    try {
      // Batch up to 20 products per AI call
      const batchSize = 20;
      for (let i = 0; i < uncachedProducts.length; i += batchSize) {
        const batch = uncachedProducts.slice(i, i + batchSize);
        const productList = batch
          .map((p, idx) => `${idx + 1}. ${p.name} (${p.category})`)
          .join("\n");

        const prompt = `Estimate Israeli supermarket prices (per 100g) for these products:
${productList}

Return JSON array only: [{"name":"product name","price_per_100g":number,"confidence":"high"|"medium"|"low"}]
Prices in Israeli Shekels (₪). Base on 2024 Israeli market prices. Be realistic.`;

        const response = await this.openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Israeli supermarket price estimator. Return JSON array only. All prices in Shekels (₪/ILS) per 100g.",
            },
            { role: "user", content: prompt },
          ],
          max_completion_tokens: 800,
          temperature: 0.3,
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
          const parsed = JSON.parse(cleaned);

          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              const matchingProd = batch.find(
                (p) => p.name.toLowerCase() === item.name?.toLowerCase()
              );
              if (matchingProd || item.name) {
                const price_per_100g = Math.max(0, Number(item.price_per_100g) || 10);
                const priceEstimate: AIPriceEstimate = {
                  estimated_price: price_per_100g,
                  price_per_100g,
                  currency: "ILS",
                  confidence: item.confidence || "medium",
                  price_range: `₪${Math.round(price_per_100g * 0.85)}-${Math.round(price_per_100g * 1.15)}`,
                };

                const prodName = matchingProd?.name || item.name;
                results.set(prodName, priceEstimate);

                // Cache the result
                const prod = batch.find((p) => p.name === prodName);
                if (prod) {
                  const cacheKey = `product:${prod.name.toLowerCase()}:${prod.category.toLowerCase()}`;
                  setCachedPrice(cacheKey, priceEstimate);
                }
              }
            }
          }
        }
      }

      // Fill in any missing products with defaults
      for (const prod of uncachedProducts) {
        if (!results.has(prod.name)) {
          results.set(prod.name, defaultEstimate);
        }
      }

      console.log(`💰 Batch AI pricing complete for ${uncachedProducts.length} products`);
    } catch (error) {
      console.error("❌ Batch product pricing failed:", error);
      for (const prod of uncachedProducts) {
        if (!results.has(prod.name)) {
          results.set(prod.name, defaultEstimate);
        }
      }
    }

    return results;
  }

  /**
   * Batch estimate prices for menu generation - more efficient
   * Returns a map of ingredient name -> estimated cost
   */
  static async estimateMenuCostWithAI(
    meals: Array<{
      name: string;
      ingredients: IngredientForPricing[];
    }>
  ): Promise<{
    totalCost: number;
    mealCosts: Map<string, number>;
    ingredientCosts: Map<string, number>;
  }> {
    const defaultResult = {
      totalCost: meals.length * 20,
      mealCosts: new Map(meals.map((m) => [m.name, 20])),
      ingredientCosts: new Map<string, number>(),
    };

    if (!process.env.OPENAI_API_KEY || !this.openai) {
      console.log("⚠️ No OpenAI API key for menu cost estimation");
      return defaultResult;
    }

    try {
      // Collect all unique ingredients
      const allIngredients = new Map<string, IngredientForPricing>();
      for (const meal of meals) {
        for (const ing of meal.ingredients || []) {
          const key = ing.name.toLowerCase();
          if (!allIngredients.has(key)) {
            allIngredients.set(key, ing);
          }
        }
      }

      const ingredientsList = Array.from(allIngredients.values())
        .slice(0, 50) // Limit to 50 ingredients for API limits
        .map((ing) => `${ing.name}: ${ing.quantity || 100}${ing.unit || "g"}`)
        .join(", ");

      const prompt = `Estimate Israeli supermarket prices for these ingredients:
${ingredientsList}

Return JSON: {"ingredients": {"ingredient_name": price_in_shekels}, "confidence": "high"|"medium"|"low"}
All prices in Israeli Shekels (₪). Based on 2024 Israeli market.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Israeli supermarket price estimator. Return JSON only. Prices in Shekels (₪).",
          },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 800,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return defaultResult;

      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);

      const ingredientCosts = new Map<string, number>();
      if (parsed.ingredients && typeof parsed.ingredients === "object") {
        for (const [name, price] of Object.entries(parsed.ingredients)) {
          ingredientCosts.set(name.toLowerCase(), Number(price) || 5);
        }
      }

      // Calculate meal costs
      const mealCosts = new Map<string, number>();
      let totalCost = 0;

      for (const meal of meals) {
        let mealCost = 0;
        for (const ing of meal.ingredients || []) {
          const cost = ingredientCosts.get(ing.name.toLowerCase()) || 5;
          mealCost += cost;
        }
        mealCosts.set(meal.name, Math.round(mealCost * 100) / 100);
        totalCost += mealCost;
      }

      return {
        totalCost: Math.round(totalCost * 100) / 100,
        mealCosts,
        ingredientCosts,
      };
    } catch (error) {
      console.error("❌ AI menu cost estimation failed:", error);
      return defaultResult;
    }
  }
}
