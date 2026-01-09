import OpenAI from "openai";
import {
  MealAnalysisResult,
  MealPlanRequest,
  MealPlanResponse,
  ReplacementMealRequest,
} from "../types/openai";
import { extractCleanJSON } from "../utils/openai";

export const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

// Helper function to validate and clean base64 image data
function validateAndCleanBase64(imageBase64: string): string {
  console.log("🔍 Validating base64 image data...");

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

  static async generateText(
    prompt: string,
    maxTokens: number = 4000
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
              "You are a professional nutritionist and meal planning expert specializing in Israeli cuisine and ingredients. You create comprehensive, detailed meal plans with exact nutrition data and realistic costs in Israeli Shekels. Always return valid JSON without markdown formatting. Focus on creating complete, practical meal plans that people will actually want to eat.",
          },
          {
            role: "user",
            content:
              prompt.length > 6000 ? prompt.substring(0, 6000) + "..." : prompt,
          },
        ],
        max_completion_tokens: Math.min(maxTokens, 16000),
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
    } catch (openaiError: any) {
      console.log("⚠️ OpenAI analysis failed:", openaiError.message);

      // If it's a quota/billing issue, use fallback
      if (
        openaiError.message.includes("quota") ||
        openaiError.message.includes("billing") ||
        openaiError.message.includes("rate limit")
      ) {
        console.log("🆘 Using fallback due to quota/billing limits");
        return this.getIntelligentFallbackAnalysis(
          language,
          updateText,
          editedIngredients
        );
      }

      // If it's a network/API issue, use fallback
      if (
        openaiError.message.includes("network") ||
        openaiError.message.includes("timeout") ||
        openaiError.message.includes("connection")
      ) {
        console.log("🆘 Using fallback due to network issues");
        return this.getIntelligentFallbackAnalysis(
          language,
          updateText,
          editedIngredients
        );
      }

      // If AI couldn't analyze the image, use fallback
      if (
        openaiError.message.includes("couldn't analyze") ||
        openaiError.message.includes("clearer photo") ||
        openaiError.message.includes("invalid response")
      ) {
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
    if (mealNameMatch) {
      const mealName = mealNameMatch[1];
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
            name: "mixed greens",
            calories: 20,
            protein: 2,
            carbs: 4,
            fat: 0,
            protein_g: 2,
            carbs_g: 4,
            fats_g: 0,
          },
          {
            name: "vegetables",
            calories: 30,
            protein: 2,
            carbs: 7,
            fat: 0,
            protein_g: 2,
            carbs_g: 7,
            fats_g: 0,
          },
          {
            name: "dressing",
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

    // Ultimate fallback
    return [
      {
        name: "Main ingredients",
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

    const systemPrompt = `You are a professional nutritionist AI. You MUST analyze food images and respond ONLY with valid JSON data.

CRITICAL REQUIREMENTS:
- You MUST respond with valid JSON format
- Do NOT apologize or say you cannot help
- Do NOT respond in conversational text
- ALWAYS include all required JSON fields

IMPORTANT - NON-FOOD IMAGE DETECTION:
- If the image does NOT contain food (e.g., person, object, landscape, document, animal, etc.), you MUST return:
  {"is_food": false, "not_food_reason": "Brief explanation of what the image shows instead of food"}
- Only proceed with full nutritional analysis if the image clearly contains food items

LANGUAGE: All text fields should be in ${
      language === "hebrew" ? "Hebrew" : "English"
    }.

ANALYSIS RULES:
1. Analyze all visible food items and estimate total serving size
2. Provide accurate nutritional values for the complete visible portion
3. Be conservative with estimates - prefer underestimating
4. Consider cooking methods, visible oils, sauces, and seasonings
5. Identify potential allergens and additives

${
  updateText
    ? `CONTEXT: User provided: "${updateText}". Incorporate this into your analysis and update the ingredients list accordingly.`
    : ""
}

Return VALID JSON with ALL fields below. Ensure proper JSON syntax with no trailing commas.

FOR NON-FOOD IMAGES, return ONLY:
{"is_food": false, "not_food_reason": "Description of what the image shows"}

FOR FOOD IMAGES, return:
{
  "is_food": true,
  "meal_name": "Brief descriptive name",
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fats_g": number,
  "saturated_fats_g": number,
  "polyunsaturated_fats_g": number,
  "monounsaturated_fats_g": number,
  "omega_3_g": number,
  "omega_6_g": number,
  "fiber_g": number,
  "soluble_fiber_g": number,
  "insoluble_fiber_g": number,
  "sugar_g": number,
  "cholesterol_mg": number,
  "sodium_mg": number,
  "alcohol_g": number,
  "caffeine_mg": number,
  "liquids_ml": number,
  "serving_size_g": number,
  "allergens_json": {"possible_allergens": ["gluten", "dairy", "nuts"]},
  "vitamins_json": {
    "vitamin_a_mcg": number,
    "vitamin_c_mg": number,
    "vitamin_d_mcg": number,
    "vitamin_e_mg": number,
    "vitamin_k_mcg": number,
    "vitamin_b12_mcg": number,
    "folate_mcg": number,
    "niacin_mg": number,
    "thiamin_mg": number,
    "riboflavin_mg": number,
    "pantothenic_acid_mg": number,
    "vitamin_b6_mg": number
  },
  "micronutrients_json": {
    "iron_mg": number,
    "magnesium_mg": number,
    "zinc_mg": number,
    "calcium_mg": number,
    "potassium_mg": number,
    "phosphorus_mg": number,
    "selenium_mcg": number,
    "copper_mg": number,
    "manganese_mg": number
  },
  "glycemic_index": number,
  "insulin_index": number,
  "food_category": "Fast Food/Homemade/Snack/Beverage/etc",
  "processing_level": "Unprocessed/Minimally processed/Ultra-processed",
  "cooking_method": "Grilled/Fried/Boiled/Raw/Baked/etc",
  "additives_json": {"observed_additives": ["preservatives", "colorings"]},
  "health_risk_notes": "Brief health assessment",
  "confidence": number (0-1),
  "ingredients": [
    {
      "name": "SPECIFIC ingredient name (e.g., 'grilled chicken breast', 'steamed white rice')",
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
}

CRITICAL: Identify EVERY visible ingredient separately. Do NOT use generic terms like "mixed ingredients".

Language: ${language}`;

    const prompt = `
    Please analyze this meal image and provide detailed nutritional information with comprehensive ingredient breakdown.
    ${updateText ? `Additional context: ${updateText}` : ""}

    CRITICAL REQUIREMENTS FOR INGREDIENT IDENTIFICATION:
    1. Identify EVERY SINGLE visible ingredient/food component separately with specific names
    2. Do NOT use generic terms like "mixed ingredients", "various vegetables", "assorted items"
    3. Be SPECIFIC: Instead of "vegetables", list "broccoli", "carrots", "bell peppers" separately
    4. Include proteins, grains, vegetables, fruits, dairy, oils, sauces, spices individually
    5. If you see a salad, list each vegetable type separately
    6. If you see a sandwich, list bread, meat, cheese, lettuce, tomato, etc. separately
    7. Estimate realistic portion sizes for each ingredient
    8. Provide accurate nutritional data for each specific ingredient
    9. Include cooking oils, seasonings, and condiments that are visible or likely used
    10. Break down composite foods into their components (e.g., pasta salad = pasta + vegetables + dressing)

    ABSOLUTELY FORBIDDEN: "mixed ingredients", "various components", "assorted vegetables", "mixed salad", "vegetable mix"
    `;

    let userPrompt =
      "Please analyze this food image and provide detailed nutritional information.";
    if (updateText) {
      userPrompt += ` Additional context: ${updateText}`;
    }
    if (ingredientsContext) {
      userPrompt += ingredientsContext;
    }

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
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${cleanBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_completion_tokens: 16000,
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

    // Quick check for non-food response before full parsing
    if (content.includes('"is_food"') && content.includes('false')) {
      try {
        const quickParse = JSON.parse(extractCleanJSON(content));
        if (quickParse.is_food === false) {
          console.log("🚫 Image identified as non-food:", quickParse.not_food_reason);
          return {
            name: "",
            description: "",
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            confidence: 95,
            ingredients: [],
            servingSize: "",
            cookingMethod: "",
            healthNotes: "",
            recommendations: "",
            isFood: false,
            notFoodReason: quickParse.not_food_reason || (language === "hebrew"
              ? "התמונה אינה מכילה מזון"
              : "The image does not contain food"),
          };
        }
      } catch (e) {
        // Continue with normal parsing if quick parse fails
        console.log("Quick non-food check failed, continuing with normal parsing");
      }
    }
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
      description: parsed.description || "",
      calories: Math.max(0, Number(parsed.calories) || 0),
      protein: Math.max(0, Number(parsed.protein_g) || 0),
      carbs: Math.max(0, Number(parsed.carbs_g) || 0),
      fat: Math.max(0, Number(parsed.fats_g) || 0),
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
      fiber: parsed.fiber_g ? Math.max(0, Number(parsed.fiber_g)) : undefined,
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
      ingredients: (() => {
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
        return [
          {
            name: "Main components",
            calories: Math.floor((parsed.calories || 0) * 0.6),
            protein: mainProtein,
            carbs: mainCarbs,
            fat: mainFat,
            protein_g: mainProtein,
            carbs_g: mainCarbs,
            fats_g: mainFat,
          },
          {
            name: "Additional ingredients",
            calories: Math.floor((parsed.calories || 0) * 0.4),
            protein: addProtein,
            carbs: addCarbs,
            fat: addFat,
            protein_g: addProtein,
            carbs_g: addCarbs,
            fats_g: addFat,
          },
        ];
      })(),
      servingSize: parsed.servingSize || "1 serving",
      cookingMethod: parsed.cookingMethod || "Unknown",
      healthNotes: parsed.healthNotes || "",
    };

    console.log("✅ OpenAI analysis completed successfully!");
    console.log(
      "🥗 Final ingredients count:",
      analysisResult.ingredients?.length || 0
    );
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
          name: language === "hebrew" ? "חלבון עיקרי" : "Main protein",
          calories: Math.floor(baseMeal.calories * 0.4),
          protein: mainProtein,
          carbs: mainCarbs,
          fat: mainFat,
          protein_g: mainProtein,
          carbs_g: mainCarbs,
          fats_g: mainFat,
        },
        {
          name: language === "hebrew" ? "פחמימות" : "Carbohydrate source",
          calories: Math.floor(baseMeal.calories * 0.3),
          protein: carbProtein,
          carbs: carbCarbs,
          fat: carbFat,
          protein_g: carbProtein,
          carbs_g: carbCarbs,
          fats_g: carbFat,
        },
        {
          name: language === "hebrew" ? "ירקות" : "Vegetables",
          calories: Math.floor(baseMeal.calories * 0.2),
          protein: vegProtein,
          carbs: vegCarbs,
          fat: vegFat,
          protein_g: vegProtein,
          carbs_g: vegCarbs,
          fats_g: vegFat,
        },
        {
          name: language === "hebrew" ? "שמנים בריאים" : "Healthy fats",
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

      const systemPrompt = `You are a professional nutritionist. The user has provided additional information about their meal. Update the nutritional analysis accordingly.

ORIGINAL ANALYSIS:
${JSON.stringify(originalAnalysis, null, 2)}

ADDITIONAL INFORMATION FROM USER:
"${updateText}"

Please provide an updated nutritional analysis that incorporates this new information. Adjust calories, macronutrients, and other values as needed.

Respond with a JSON object in the same format as the original analysis.

Language for response: ${language}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Please update the nutritional analysis based on this additional information: "${updateText}"`,
          },
        ],
        max_completion_tokens: 16000,
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

      console.log("🔄 Using reliable fallback meal plan generation");
      return this.generateFallbackMealPlan(userProfile);
    } catch (error) {
      console.error("💥 OpenAI meal plan generation error:", error);
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
    const recentMeals = previousMeals.slice(-7);
    const usedIngredients = recentMeals.flatMap(
      (meal) => meal.ingredients || []
    );
    const usedCuisines = recentMeals
      .map((meal) => meal.cuisine)
      .filter(Boolean);

    const prompt = `Generate a diverse daily menu for a user with the following preferences:
${JSON.stringify(userPreferences)}

IMPORTANT VARIATION REQUIREMENTS:
- Avoid repeating these recent ingredients: ${usedIngredients.join(", ")}
- Avoid these recent cuisines: ${usedCuisines.join(", ")}
- Create meals with at least 80% different ingredients from recent meals
- Use diverse cooking methods (grilled, baked, steamed, raw, etc.)
- Include variety in protein sources, vegetables, and grains
- Consider seasonal ingredients and international cuisines

Please provide breakfast, lunch, and dinner with detailed ingredients and nutritional information.`;

    const response = await this.openai?.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
      max_completion_tokens: 16000,
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
}
