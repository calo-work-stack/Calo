import { mapMealDataToPrismaFields, isMealMandatory } from "../utils/nutrition";
import { OpenAIService } from "./openai";
import { prisma } from "../lib/database";
import { MealAnalysisInput, MealUpdateInput } from "../types/nutrition";
import { AuthService } from "./auth";
import { asJsonObject, mapExistingMealToPrismaInput } from "../utils/nutrition";
import { CalendarService } from "./calendar";
import { clearStatisticsCache } from "./statistics";
import { errorMessageIncludes, getErrorMessage } from "../utils/errorUtils";
import { MealTrackingService } from "./mealTracking";

// Cache for frequently accessed data
const userStatsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for stats (longer now with smart updates)

// Cache for meals data - longer duration since we do smart updates
const mealsCache = new Map<string, { data: any[]; timestamp: number }>();
const MEALS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (smart updates keep it fresh)

// Helper to get cache key for user meals
const getMealsCacheKey = (user_id: string) => `user_meals_${user_id}_0_100`;

function transformMealForClient(meal: any) {
  const additives = meal.additives_json || {};
  const feedback = additives.feedback || {};

  // Safely parse ingredients
  let ingredients = [];
  if (meal.ingredients) {
    if (Array.isArray(meal.ingredients)) {
      ingredients = meal.ingredients;
    } else if (typeof meal.ingredients === "string") {
      try {
        ingredients = JSON.parse(meal.ingredients);
      } catch (e) {
        ingredients = [];
      }
    }
  }

  return {
    meal_id: meal.meal_id,
    user_id: meal.user_id,
    image_url: meal.image_url,
    upload_time: meal.upload_time,
    analysis_status: meal.analysis_status,
    meal_name: meal.meal_name,
    calories: meal.calories,
    protein_g: meal.protein_g,
    carbs_g: meal.carbs_g,
    fats_g: meal.fats_g,
    fiber_g: meal.fiber_g,
    sugar_g: meal.sugar_g,
    sodium_mg: meal.sodium_mg,
    created_at: meal.created_at,
    id: meal.meal_id.toString(),
    name: meal.meal_name || "Unknown Meal",
    description: meal.meal_name,
    imageUrl: meal.image_url,
    protein: meal.protein_g || 0,
    carbs: meal.carbs_g || 0,
    fat: meal.fats_g || 0,
    fiber: meal.fiber_g || 0,
    sugar: meal.sugar_g || 0,
    sodium: meal.sodium_mg || 0,
    userId: meal.user_id,
    ingredients: ingredients, // Include ingredients in response
    isFavorite: additives.isFavorite || false,
    is_favorite: additives.isFavorite || false, // Both formats for compatibility
    tasteRating: feedback.tasteRating || 0,
    satietyRating: feedback.satietyRating || 0,
    energyRating: feedback.energyRating || 0,
    heavinessRating: feedback.heavinessRating || 0,
    taste_rating: feedback.tasteRating || 0, // Dual format
    satiety_rating: feedback.satietyRating || 0,
    energy_rating: feedback.energyRating || 0,
    heaviness_rating: feedback.heavinessRating || 0,
    meal_period: meal.meal_period || "other", // Ensure meal_period is included
    mealPeriod: meal.meal_period || "other", // Also add camelCase version for compatibility
    is_mandatory: meal.is_mandatory !== undefined ? meal.is_mandatory : true,
    isMandatory: meal.is_mandatory !== undefined ? meal.is_mandatory : true, // camelCase version
  };
}

// QUOTA CHECKS REMOVED - NO LIMITS ENFORCED

export class NutritionService {
  static async analyzeMeal(user_id: string, data: MealAnalysisInput) {
    const { imageBase64, language } = data;
    if (!imageBase64?.trim()) throw new Error("Image data is required");

    let cleanBase64 = imageBase64.trim().replace(/^data:.*base64,/, "");
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(cleanBase64))
      throw new Error("Invalid base64 image format");

    const user = await prisma.user.findUnique({ where: { user_id } });
    if (!user) throw new Error("User not found");

    console.log("🚀 Starting meal analysis for user:", user_id);
    console.log("🔑 OpenAI API Key available:", !!process.env.OPENAI_API_KEY);
    console.log("💬 Update text provided:", !!data.updateText);
    console.log(
      "🥗 Edited ingredients provided:",
      data.editedIngredients?.length || 0
    );
    console.log("🍽️ Meal Type:", data.mealType);
    console.log("🕰️ Meal Period:", data.mealPeriod);

    // Ensure proper meal type mapping
    const mealTypeMapping = {
      breakfast: "breakfast",
      lunch: "lunch",
      dinner: "dinner",
      snack: "snack",
      morning_snack: "morning_snack",
      afternoon_snack: "afternoon_snack",
      late_night: "late_night",
      other: "other",
    };

    // Auto-detect meal type based on time if not provided
    let finalMealType = data.mealType || data.mealPeriod;

    if (!finalMealType) {
      const currentHour = new Date().getHours();
      if (currentHour >= 5 && currentHour < 12) {
        finalMealType = "breakfast";
      } else if (currentHour >= 12 && currentHour < 18) {
        finalMealType = "lunch";
      } else if (currentHour >= 18 && currentHour < 22) {
        finalMealType = "dinner";
      } else {
        finalMealType = "other";
      }
    }

    // Normalize meal type
    finalMealType = mealTypeMapping[finalMealType] || "other";

    console.log("🔄 Final meal type determined:", finalMealType);
    console.log("📅 Original meal period:", data.mealPeriod);

    // Perform AI analysis with timeout and proper error handling
    let analysis;
    try {
      analysis = await Promise.race([
        OpenAIService.analyzeMealImage(
          cleanBase64,
          language,
          data.updateText,
          data.editedIngredients
        ),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Analysis timeout after 60 seconds")),
            60000
          )
        ),
      ]);
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error("💥 AI analysis failed:", errorMsg);

      // If it's a timeout, throw a user-friendly message
      if (errorMessageIncludes(error, "timeout")) {
        throw new Error(
          "Analysis is taking too long. Please try again with a clearer image."
        );
      }

      // For other errors, provide a helpful fallback message
      throw new Error(
        "Unable to analyze this image. Please try a clearer photo with better lighting, or try again later."
      );
    }

    console.log("✅ Analysis completed successfully");
    console.log("📊 Analysis result:", {
      name: analysis.name,
      calories: analysis.calories,
      confidence: analysis.confidence,
      ingredients_count: analysis.ingredients?.length || 0,
    });

    // Update request count asynchronously to not block response
    setImmediate(async () => {
      try {
        await prisma.user.update({
          where: { user_id },
          data: { ai_requests_count: user.ai_requests_count + 1 },
        });
      } catch (error) {
        console.warn("Failed to update request count:", error);
      }
    });

    // Enhanced ingredient mapping with better error handling
    const ingredients = (analysis.ingredients || []).map(
      (ingredient, index) => {
        // Ensure ingredient is an object with proper structure
        if (typeof ingredient === "string") {
          return {
            name: ingredient,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium_mg: 0,
          };
        }

        return {
          name: ingredient.name || `Item ${index + 1}`,
          calories: Number(ingredient.calories || 0),
          protein: Number(ingredient.protein_g || ingredient.protein || 0),
          carbs: Number(ingredient.carbs_g || ingredient.carbs || 0),
          fat: Number(ingredient.fats_g || ingredient.fat || 0),
          fiber: Number(ingredient.fiber_g || 0),
          sugar: Number(ingredient.sugar_g || 0),
          sodium_mg: Number(ingredient.sodium_mg || 0),
          cholesterol_mg: Number(ingredient.cholesterol_mg || 0),
          saturated_fats_g: Number(ingredient.saturated_fats_g || 0),
          polyunsaturated_fats_g: Number(
            ingredient.polyunsaturated_fats_g || 0
          ),
          monounsaturated_fats_g: Number(
            ingredient.monounsaturated_fats_g || 0
          ),
          omega_3_g: Number(ingredient.omega_3_g || 0),
          omega_6_g: Number(ingredient.omega_6_g || 0),
          soluble_fiber_g: Number(ingredient.soluble_fiber_g || 0),
          insoluble_fiber_g: Number(ingredient.insoluble_fiber_g || 0),
          alcohol_g: Number(ingredient.alcohol_g || 0),
          caffeine_mg: Number(ingredient.caffeine_mg || 0),
          serving_size_g: Number(ingredient.serving_size_g || 0),
          glycemic_index: ingredient.glycemic_index || null,
          insulin_index: ingredient.insulin_index || null,
          vitamins_json: ingredient.vitamins_json || {},
          micronutrients_json: ingredient.micronutrients_json || {},
          allergens_json: ingredient.allergens_json || {},
        };
      }
    );

    const mappedMeal = mapMealDataToPrismaFields(
      analysis,
      user_id,
      cleanBase64,
      data.mealType,
      data.mealPeriod
    );

    // Validate that we have meaningful data
    if (!mappedMeal.meal_name || mappedMeal.meal_name.trim() === "") {
      mappedMeal.meal_name = analysis.name || "Analyzed Meal";
    }

    // Ensure minimum nutritional data
    if (mappedMeal.calories === 0 && ingredients.length === 0) {
      throw new Error(
        "Analysis failed to identify any nutritional content. Please try a clearer image."
      );
    }

    console.log("✅ Meal analysis completed successfully!");

    return {
      success: true,
      data: {
        ...mappedMeal,
        ingredients,
        healthScore: (analysis.confidence || 75).toString(),
        recommendations:
          analysis.healthNotes ||
          analysis.recommendations ||
          "Meal analysis completed successfully.",
      },
      confidence: analysis.confidence || 75,
    };
  }

  static async updateMeal(
    user_id: string,
    params: { meal_id: string; updateText: string; language?: string }
  ): Promise<any> {
    try {
      console.log("🔄 Starting meal update process for meal:", params.meal_id);

      // Find the existing meal
      const existingMeal = await prisma.meal.findFirst({
        where: {
          meal_id: parseInt(params.meal_id),
          user_id,
        },
      });

      if (!existingMeal) {
        throw new Error("Meal not found or access denied");
      }

      console.log("📝 Found existing meal:", existingMeal.meal_name);

      // Get the existing image base64 from the database
      let imageBase64 = "";
      if (existingMeal.image_url) {
        // Extract base64 from data URL if present
        if (existingMeal.image_url.startsWith("data:image/")) {
          const commaIndex = existingMeal.image_url.indexOf(",");
          if (commaIndex !== -1) {
            imageBase64 = existingMeal.image_url.substring(commaIndex + 1);
          }
        } else {
          imageBase64 = existingMeal.image_url;
        }
      }

      if (!imageBase64) {
        throw new Error("No image data found for this meal");
      }

      console.log("🖼️ Retrieved image data for analysis");

      // Prepare existing meal data as "edited ingredients" for context
      const existingIngredients = [];
      if (existingMeal.ingredients) {
        try {
          const parsedIngredients =
            typeof existingMeal.ingredients === "string"
              ? JSON.parse(existingMeal.ingredients)
              : existingMeal.ingredients;

          if (Array.isArray(parsedIngredients)) {
            existingIngredients.push(...parsedIngredients);
          }
        } catch (error) {
          console.warn("Failed to parse existing ingredients:", error);
        }
      }

      // Call the AI analysis with the update text and existing context
      const analysisResult = await this.analyzeMeal(user_id, {
        imageBase64,
        language: params.language || "english",
        date: new Date().toISOString().split("T")[0],
        updateText: params.updateText,
        editedIngredients: existingIngredients,
        mealPeriod: existingMeal.meal_period || "other", // Preserve existing meal period
      });

      if (!analysisResult.success || !analysisResult.data) {
        throw new Error("Analysis failed during update");
      }

      console.log("✅ AI analysis completed for update");

      // Prepare the updated meal data
      const updatedMealData = mapMealDataToPrismaFields(
        analysisResult.data,
        user_id,
        imageBase64,
        undefined,
        existingMeal.meal_period || "other" // Ensure meal_period is preserved
      );

      // Update the meal in the database
      const updatedMeal = await prisma.meal.update({
        where: {
          meal_id: parseInt(params.meal_id),
        },
        data: {
          ...updatedMealData,
          updated_at: new Date(),
        },
      });

      console.log("🎉 Meal updated successfully");

      // Clear relevant caches
      this.clearUserMealsCaches(user_id);

      return updatedMeal;
    } catch (error) {
      console.error("💥 Error updating meal:", error);
      throw error;
    }
  }

  static async saveMeal(user_id: string, mealData: any, imageBase64?: string) {
    try {
      // Determine if meal is mandatory based on meal_period or explicit is_mandatory
      const mealPeriod = mealData.mealPeriod || mealData.meal_period || "other";
      const is_mandatory = mealData.is_mandatory !== undefined
        ? mealData.is_mandatory
        : isMealMandatory(mealPeriod);

      // Validate mandatory meal creation if this is a mandatory meal
      if (is_mandatory) {
        await MealTrackingService.validateMandatoryMealCreation(user_id);
      }

      // Direct create - faster than transaction for single operation
      const meal = await prisma.meal.create({
        data: mapMealDataToPrismaFields(
          mealData,
          user_id,
          imageBase64,
          mealData.mealType,
          mealPeriod,
          is_mandatory
        ),
      });

      // Smart cache update - add meal directly without refetching
      this.addMealToCache(user_id, meal);

      return transformMealForClient(meal);
    } catch (error) {
      console.error("💥 Error saving meal:", error);
      throw error; // Preserve the original error message
    }
  }

  static async getUserMeals(
    user_id: string,
    offset: number = 0,
    limit: number = 100
  ): Promise<any[]> {
    try {
      console.log(`📱 Fetching meals for user: ${user_id}`);

      const cacheKey = `user_meals_${user_id}_${offset}_${limit}`;
      const cached = mealsCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < MEALS_CACHE_DURATION) {
        console.log("🎯 Returning cached meals");
        return cached.data;
      }

      const meals = await prisma.meal.findMany({
        where: { user_id },
        orderBy: { created_at: "desc" },
        skip: offset,
        take: limit,
        select: {
          meal_id: true,
          user_id: true,
          image_url: true,
          upload_time: true,
          analysis_status: true,
          meal_name: true,
          meal_period: true,
          description: true,
          calories: true,
          protein_g: true,
          carbs_g: true,
          fats_g: true,
          saturated_fats_g: true,
          polyunsaturated_fats_g: true,
          monounsaturated_fats_g: true,
          omega_3_g: true,
          omega_6_g: true,
          fiber_g: true,
          soluble_fiber_g: true,
          insoluble_fiber_g: true,
          sugar_g: true,
          cholesterol_mg: true,
          sodium_mg: true,
          alcohol_g: true,
          caffeine_mg: true,
          liquids_ml: true,
          serving_size_g: true,
          allergens_json: true,
          vitamins_json: true,
          micronutrients_json: true,
          glycemic_index: true,
          insulin_index: true,
          food_category: true,
          processing_level: true,
          confidence: true,
          cooking_method: true,
          additives_json: true,
          health_risk_notes: true,
          ingredients: true,
          created_at: true,
          updated_at: true,
          // User interaction fields - favorites and ratings
          is_favorite: true,
          taste_rating: true,
          satiety_rating: true,
          energy_rating: true,
          heaviness_rating: true,
        },
      });

      const processedMeals = meals.map((meal) => ({
        ...meal,
        // Ensure backwards compatibility
        id: meal.meal_id?.toString(),
        name: meal.meal_name,
        imageUrl: meal.image_url,
        userId: meal.user_id,
        uploadTime: meal.upload_time,
        createdAt: meal.created_at,

        // Meal period - ensure it's included
        meal_period: meal.meal_period || "other",
        mealPeriod: meal.meal_period || "other", // Also add camelCase version for compatibility

        // Nutrition data with backwards compatibility
        protein: meal.protein_g,
        carbs: meal.carbs_g,
        fat: meal.fats_g,
        fats: meal.fats_g,
        fiber: meal.fiber_g,
        sugar: meal.sugar_g,
        sodium: meal.sodium_mg,

        // Parse ingredients if stored as JSON
        ingredients:
          typeof meal.ingredients === "string"
            ? JSON.parse(meal.ingredients || "[]")
            : meal.ingredients || [],

        // Ratings and preferences (both snake_case and camelCase for compatibility)
        taste_rating: meal.taste_rating || 0,
        satiety_rating: meal.satiety_rating || 0,
        energy_rating: meal.energy_rating || 0,
        heaviness_rating: meal.heaviness_rating || 0,
        is_favorite: meal.is_favorite || false,
        // camelCase versions for backwards compatibility
        tasteRating: meal.taste_rating || 0,
        satietyRating: meal.satiety_rating || 0,
        energyRating: meal.energy_rating || 0,
        heavinessRating: meal.heaviness_rating || 0,
        isFavorite: meal.is_favorite || false,

        // Additional fields
        description: meal.description,
        confidence: meal.confidence,
        analysisStatus: meal.analysis_status,
      }));

      // Cache the results
      mealsCache.set(cacheKey, {
        data: processedMeals,
        timestamp: Date.now(),
      });

      console.log(`✅ Retrieved ${processedMeals.length} meals for user`);
      return processedMeals;
    } catch (error) {
      console.error("💥 Error fetching user meals:", error);
      throw new Error("Failed to fetch meals");
    }
  }

  static async getRangeStatistics(
    userId: string,
    startDate: string,
    endDate: string
  ) {
    try {
      console.log("📊 Getting range statistics for user:", userId);
      console.log("📅 Date range:", { startDate, endDate });

      // Check cache first
      const cacheKey = `stats_${userId}_${startDate}_${endDate}`;
      const cached = userStatsCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log("🔄 Using cached statistics");
        return cached.data;
      }

      const startDateTime = new Date(startDate + "T00:00:00.000Z");
      const endDateTime = new Date(endDate + "T23:59:59.999Z");

      const meals = await prisma.meal.findMany({
        where: {
          user_id: userId,
          created_at: {
            gte: startDateTime,
            lte: endDateTime,
          },
        },
        orderBy: {
          created_at: "asc",
        },
        // Add select to only fetch needed fields for better performance
        select: {
          meal_id: true,
          user_id: true,
          meal_name: true,
          calories: true,
          protein_g: true,
          carbs_g: true,
          fats_g: true,
          fiber_g: true,
          sugar_g: true,
          sodium_mg: true,
          saturated_fats_g: true,
          polyunsaturated_fats_g: true,
          monounsaturated_fats_g: true,
          omega_3_g: true,
          omega_6_g: true,
          soluble_fiber_g: true,
          insoluble_fiber_g: true,
          cholesterol_mg: true,
          alcohol_g: true,
          caffeine_mg: true,
          liquids_ml: true,
          serving_size_g: true,
          glycemic_index: true,
          insulin_index: true,
          confidence: true,
          created_at: true,
          upload_time: true,
        },
      });

      if (meals.length === 0) {
        const emptyResult = {
          totalDays: 0,
          totalMeals: 0,
          dailyBreakdown: [],
          ...Object.fromEntries(
            [
              "calories",
              "protein_g",
              "carbs_g",
              "fats_g",
              "saturated_fats_g",
              "polyunsaturated_fats_g",
              "monounsaturated_fats_g",
              "omega_3_g",
              "omega_6_g",
              "fiber_g",
              "soluble_fiber_g",
              "insoluble_fiber_g",
              "sugar_g",
              "cholesterol_mg",
              "sodium_mg",
              "alcohol_g",
              "caffeine_mg",
              "liquids_ml",
              "serving_size_g",
              "glycemic_index",
              "insulin_index",
              "confidence",
            ].flatMap((field) => [
              [`total_${field}`, 0],
              [`average_${field}`, 0],
            ])
          ),
        };

        // Cache empty result too
        userStatsCache.set(cacheKey, {
          data: emptyResult,
          timestamp: Date.now(),
        });

        return emptyResult;
      }

      const totalMeals = meals.length;

      const numericFields = [
        "calories",
        "protein_g",
        "carbs_g",
        "fats_g",
        "saturated_fats_g",
        "polyunsaturated_fats_g",
        "monounsaturated_fats_g",
        "omega_3_g",
        "omega_6_g",
        "fiber_g",
        "soluble_fiber_g",
        "insoluble_fiber_g",
        "sugar_g",
        "cholesterol_mg",
        "sodium_mg",
        "alcohol_g",
        "caffeine_mg",
        "liquids_ml",
        "serving_size_g",
        "glycemic_index",
        "insulin_index",
        "confidence",
      ];

      const totals: Record<string, number> = {};
      for (const field of numericFields) totals[field] = 0;

      for (const meal of meals) {
        for (const field of numericFields) {
          totals[field] += (meal[field as keyof typeof meal] as number) || 0;
        }
      }

      const uniqueDates = new Set(
        meals.map((meal) => meal.created_at.toISOString().split("T")[0])
      );
      const totalDays = uniqueDates.size;

      const averages = Object.fromEntries(
        Object.entries(totals).map(([key, val]) => [
          `average_${key}`,
          totalDays > 0 ? val / totalDays : 0,
        ])
      );

      // Group meals by day
      const dailyData = meals.reduce((acc, meal) => {
        const date = meal.created_at.toISOString().split("T")[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            meals: [],
          };
        }

        acc[date].meals.push({
          meal_id: meal.meal_id,
          user_id: meal.user_id,
          meal_name: meal.meal_name,
          calories: meal.calories,
          protein_g: meal.protein_g,
          carbs_g: meal.carbs_g,
          fats_g: meal.fats_g,
          saturated_fats_g: meal.saturated_fats_g,
          polyunsaturated_fats_g: meal.polyunsaturated_fats_g,
          monounsaturated_fats_g: meal.monounsaturated_fats_g,
          omega_3_g: meal.omega_3_g,
          omega_6_g: meal.omega_6_g,
          fiber_g: meal.fiber_g,
          soluble_fiber_g: meal.soluble_fiber_g,
          insoluble_fiber_g: meal.insoluble_fiber_g,
          sugar_g: meal.sugar_g,
          cholesterol_mg: meal.cholesterol_mg,
          sodium_mg: meal.sodium_mg,
          alcohol_g: meal.alcohol_g,
          caffeine_mg: meal.caffeine_mg,
          liquids_ml: meal.liquids_ml,
          serving_size_g: meal.serving_size_g,
          glycemic_index: meal.glycemic_index,
          insulin_index: meal.insulin_index,
          confidence: meal.confidence,
          created_at: meal.created_at,
          upload_time: meal.upload_time,
        });

        return acc;
      }, {} as Record<string, any>);

      const dailyBreakdown = Object.values(dailyData);

      const statistics = {
        totalDays,
        totalMeals,
        ...Object.fromEntries(
          Object.entries(totals).map(([key, val]) => [
            `total_${key}`,
            Math.round(val * 100) / 100,
          ])
        ),
        ...Object.entries(averages).reduce((acc, [key, val]) => {
          acc[key] = Math.round(val * 100) / 100;
          return acc;
        }, {} as Record<string, number>),
        dailyBreakdown: dailyBreakdown.sort((a, b) =>
          a.date.localeCompare(b.date)
        ),
        dateRange: {
          startDate,
          endDate,
        },
      };

      // Cache the result
      userStatsCache.set(cacheKey, {
        data: statistics,
        timestamp: Date.now(),
      });

      console.log("✅ Range statistics calculated successfully");
      return statistics;
    } catch (error) {
      console.error("💥 Error getting range statistics:", error);
      throw error;
    }
  }

  static async getDailyStats(user_id: string, date: string) {
    try {
      // Check cache first
      const cacheKey = `daily_${user_id}_${date}`;
      const cached = userStatsCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }

      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      const meals = await prisma.meal.findMany({
        where: {
          user_id,
          created_at: { gte: startDate, lt: endDate },
        },
        select: {
          calories: true,
          protein_g: true,
          carbs_g: true,
          fats_g: true,
          fiber_g: true,
          sugar_g: true,
        },
      });

      const result = meals.reduce(
        (acc, meal) => {
          acc.calories += meal.calories || 0;
          acc.protein += meal.protein_g || 0;
          acc.carbs += meal.carbs_g || 0;
          acc.fat += meal.fats_g || 0;
          acc.fiber += meal.fiber_g || 0;
          acc.sugar += meal.sugar_g || 0;
          acc.meal_count++;
          return acc;
        },
        {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          sugar: 0,
          meal_count: 0,
        }
      );

      // Cache the result
      userStatsCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error("💥 Error fetching daily stats:", error);
      throw new Error("Failed to fetch daily stats");
    }
  }

  static async saveMealFeedback(
    user_id: string,
    meal_id: string,
    feedback: any
  ) {
    try {
      const meal = await prisma.meal.findFirst({
        where: { meal_id: parseInt(meal_id), user_id },
      });
      if (!meal) throw new Error("Meal not found");

      // Update the dedicated rating columns
      const updateData: any = {
        updated_at: new Date(),
      };

      if (feedback.tasteRating !== undefined) {
        updateData.taste_rating = feedback.tasteRating;
      }
      if (feedback.satietyRating !== undefined) {
        updateData.satiety_rating = feedback.satietyRating;
      }
      if (feedback.energyRating !== undefined) {
        updateData.energy_rating = feedback.energyRating;
      }
      if (feedback.heavinessRating !== undefined) {
        updateData.heaviness_rating = feedback.heavinessRating;
      }

      await prisma.meal.update({
        where: { meal_id: meal.meal_id },
        data: updateData,
      });

      // Clear related caches
      this.clearUserCaches(user_id);

      return { meal_id, feedback };
    } catch (error) {
      console.error("💥 Error saving meal feedback:", error);
      throw error;
    }
  }

  static async toggleMealFavorite(user_id: string, meal_id: string) {
    try {
      const meal = await prisma.meal.findFirst({
        where: { meal_id: parseInt(meal_id), user_id },
        select: { meal_id: true, is_favorite: true },
      });
      if (!meal) throw new Error("Meal not found");

      const current = meal.is_favorite || false;

      await prisma.meal.update({
        where: { meal_id: meal.meal_id },
        data: {
          is_favorite: !current,
          updated_at: new Date(),
        },
      });

      // Clear related caches
      this.clearUserCaches(user_id);

      return { meal_id, isFavorite: !current };
    } catch (error) {
      console.error("💥 Error toggling meal favorite:", error);
      throw error;
    }
  }

  static async duplicateMeal(
    user_id: string,
    meal_id: string,
    newDate?: string
  ) {
    try {
      const originalMeal = await prisma.meal.findFirst({
        where: { meal_id: parseInt(meal_id), user_id },
      });
      if (!originalMeal) throw new Error("Meal not found");

      const duplicateDate = newDate ? new Date(newDate) : new Date();
      const duplicatedMeal = await prisma.meal.create({
        data: mapExistingMealToPrismaInput(
          originalMeal,
          user_id,
          duplicateDate
        ),
      });

      // Clear related caches
      this.clearUserCaches(user_id);

      return transformMealForClient(duplicatedMeal);
    } catch (error) {
      console.error("💥 Error duplicating meal:", error);
      throw error;
    }
  }

  // Helper method to clear user-specific caches
  private static clearUserCaches(user_id: string) {
    const keysToDelete: string[] = [];

    for (const [key] of userStatsCache) {
      if (key.includes(user_id)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => userStatsCache.delete(key));
    console.log(
      `🧹 Cleared ${keysToDelete.length} cache entries for user ${user_id}`
    );
  }

  // Helper method to clear user-specific meal caches
  private static clearUserMealsCaches(user_id: string) {
    const keysToDelete: string[] = [];

    for (const [key] of mealsCache) {
      if (key.includes(user_id)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => mealsCache.delete(key));
    console.log(
      `🧹 Cleared ${keysToDelete.length} meal cache entries for user ${user_id}`
    );
  }

  // Method to clear all caches
  static clearAllCaches() {
    userStatsCache.clear();
    mealsCache.clear();
    console.log("🧹 All nutrition service caches cleared");
  }

  // Public method to clear caches for a specific user
  static clearCachesForUser(user_id: string) {
    this.clearUserMealsCaches(user_id);
    this.clearUserCaches(user_id);
  }

  // ============ SMART CACHE UPDATE METHODS ============
  // These update the cache directly without refetching from DB

  /**
   * Add a new meal to the cache (called after meal creation)
   * Much faster than invalidating and refetching everything
   */
  static addMealToCache(user_id: string, meal: any) {
    const cacheKey = getMealsCacheKey(user_id);
    const cached = mealsCache.get(cacheKey);

    const processedMeal = this.processMealForCache(meal);

    if (cached) {
      // Add to beginning of array (newest first)
      cached.data.unshift(processedMeal);
      cached.timestamp = Date.now(); // Refresh timestamp
      console.log(`⚡ Added meal ${meal.meal_id} to cache for user ${user_id}`);
    } else {
      // Initialize cache with this meal
      mealsCache.set(cacheKey, {
        data: [processedMeal],
        timestamp: Date.now(),
      });
      console.log(`⚡ Initialized cache with meal ${meal.meal_id} for user ${user_id}`);
    }

    // Clear related caches since totals changed
    this.clearUserCaches(user_id);
    CalendarService.clearUserCache(user_id);
    clearStatisticsCache(user_id);
  }

  /**
   * Update a specific meal in the cache (called after meal update)
   */
  static updateMealInCache(user_id: string, meal: any) {
    const cacheKey = getMealsCacheKey(user_id);
    const cached = mealsCache.get(cacheKey);

    if (cached) {
      const index = cached.data.findIndex((m: any) => m.meal_id === meal.meal_id);
      if (index !== -1) {
        cached.data[index] = this.processMealForCache(meal);
        cached.timestamp = Date.now();
        console.log(`⚡ Updated meal ${meal.meal_id} in cache for user ${user_id}`);
      }
    }

    // Clear related caches since values might have changed
    this.clearUserCaches(user_id);
    CalendarService.clearUserCache(user_id);
    clearStatisticsCache(user_id);
  }

  /**
   * Remove a meal from the cache (called after meal deletion)
   */
  static removeMealFromCache(user_id: string, meal_id: number) {
    const cacheKey = getMealsCacheKey(user_id);
    const cached = mealsCache.get(cacheKey);

    if (cached) {
      const index = cached.data.findIndex((m: any) => m.meal_id === meal_id);
      if (index !== -1) {
        cached.data.splice(index, 1);
        cached.timestamp = Date.now();
        console.log(`⚡ Removed meal ${meal_id} from cache for user ${user_id}`);
      }
    }

    // Clear related caches since totals changed
    this.clearUserCaches(user_id);
    CalendarService.clearUserCache(user_id);
    clearStatisticsCache(user_id);
  }

  /**
   * Process a raw meal into the cached format
   */
  private static processMealForCache(meal: any) {
    return {
      ...meal,
      id: meal.meal_id?.toString(),
      name: meal.meal_name,
      imageUrl: meal.image_url,
      userId: meal.user_id,
      uploadTime: meal.upload_time,
      createdAt: meal.created_at,
      meal_period: meal.meal_period || "other",
      mealPeriod: meal.meal_period || "other",
      protein: meal.protein_g,
      carbs: meal.carbs_g,
      fat: meal.fats_g,
      fats: meal.fats_g,
      fiber: meal.fiber_g,
      sugar: meal.sugar_g,
      sodium: meal.sodium_mg,
      ingredients:
        typeof meal.ingredients === "string"
          ? JSON.parse(meal.ingredients || "[]")
          : meal.ingredients || [],
      taste_rating: meal.taste_rating || 0,
      satiety_rating: meal.satiety_rating || 0,
      energy_rating: meal.energy_rating || 0,
      heaviness_rating: meal.heaviness_rating || 0,
      is_favorite: meal.is_favorite || false,
      tasteRating: meal.taste_rating || 0,
      satietyRating: meal.satiety_rating || 0,
      energyRating: meal.energy_rating || 0,
      heavinessRating: meal.heaviness_rating || 0,
      isFavorite: meal.is_favorite || false,
      description: meal.description,
      confidence: meal.confidence,
      analysisStatus: meal.analysis_status,
    };
  }
}
