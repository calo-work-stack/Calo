import { prisma } from "../lib/database";
import { OpenAIService } from "./openai";
import { UserContextService, ComprehensiveUserContext } from "./userContext";

export interface GenerateMenuParams {
  userId: string;
  days?: number;
  mealsPerDay?: string;
  customRequest?: string;
  budget?: number;
  mealChangeFrequency?: string;
  includeLeftovers?: boolean;
  sameMealTimes?: boolean;
  targetCalories?: number;
  dietaryPreferences?: string[];
  excludedIngredients?: string[];
}

export interface MenuCompletionSummary {
  menu_id: string;
  title: string;
  total_days: number;
  start_date: Date;
  end_date: Date;
  total_meals: number;
  completed_meals: number;
  completion_rate: number;
  total_calories: number;
  avg_calories_per_day: number;
  total_protein: number;
  avg_protein_per_day: number;
  total_carbs: number;
  total_fat: number;
  daily_breakdown: Array<{
    day: number;
    date: string;
    meals_completed: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
}

export class RecommendedMenuService {
  static async generatePersonalizedMenu(params: GenerateMenuParams) {
    try {
      console.log("🎯 Generating personalized menu for user:", params.userId);

      // Get comprehensive user context for maximum personalization
      const userContext = await UserContextService.getComprehensiveContext(params.userId);

      // Get user's questionnaire for personalization
      const questionnaire = await prisma.userQuestionnaire.findFirst({
        where: { user_id: params.userId },
        orderBy: { date_completed: "desc" },
      });

      if (!questionnaire) {
        throw new Error(
          "User questionnaire not found. Please complete the questionnaire first."
        );
      }

      // Get user's nutrition goals
      const nutritionPlan = await prisma.nutritionPlan.findFirst({
        where: { user_id: params.userId },
        orderBy: { created_at: "desc" },
      });

      // Calculate dynamic targets based on user context
      const dynamicTargets = this.calculateDynamicTargets(userContext, nutritionPlan);

      // Generate menu using AI with comprehensive context or fallback
      const menuData = await this.generateMenuWithAI(
        params,
        questionnaire,
        nutritionPlan,
        userContext,
        dynamicTargets
      );

      // Save to database with context metadata
      const savedMenu = await this.saveMenuToDatabase(
        params.userId,
        menuData,
        params.days || 7,
        userContext
      );

      console.log("✅ Personalized menu generated successfully");
      return savedMenu;
    } catch (error) {
      console.error("💥 Error generating personalized menu:", error);
      throw error;
    }
  }

  /**
   * Calculate dynamic nutrition targets based on user's performance and goals
   */
  private static calculateDynamicTargets(
    context: ComprehensiveUserContext,
    nutritionPlan: any
  ): {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    water: number;
    adjustmentReason: string;
  } {
    const baseCalories = nutritionPlan?.goal_calories || context.goals.dailyCalories;
    const baseProtein = nutritionPlan?.goal_protein_g || context.goals.dailyProtein;
    const baseCarbs = nutritionPlan?.goal_carbs_g || context.goals.dailyCarbs;
    const baseFats = nutritionPlan?.goal_fats_g || context.goals.dailyFats;
    const baseWater = context.goals.dailyWater;

    let adjustmentReason = "";
    let calorieMultiplier = 1;
    let proteinMultiplier = 1;

    // Adjust based on goal achievement rate
    const achievementRate = context.performance.overallGoalAchievementRate;
    if (achievementRate < 0.7) {
      // User struggles to hit targets - make them slightly easier
      calorieMultiplier *= 0.95;
      adjustmentReason += "Adjusted for easier target achievement. ";
    } else if (achievementRate > 0.95) {
      // User consistently exceeds - can push slightly higher
      calorieMultiplier *= 1.03;
      proteinMultiplier *= 1.05;
      adjustmentReason += "Increased targets based on excellent performance. ";
    }

    // Adjust based on consistency
    if (context.performance.consistencyScore < 0.5) {
      // User is inconsistent - simplify targets
      adjustmentReason += "Simplified for better consistency. ";
    }

    // Adjust based on calorie trend
    if (context.performance.caloriesTrend === "increasing" && context.profile.mainGoal === "lose_weight") {
      calorieMultiplier *= 0.97;
      adjustmentReason += "Slight reduction to support weight loss goal. ";
    } else if (context.performance.caloriesTrend === "decreasing" && context.profile.mainGoal === "gain_muscle") {
      calorieMultiplier *= 1.05;
      proteinMultiplier *= 1.1;
      adjustmentReason += "Increased to support muscle gain goal. ";
    }

    // Adjust protein based on goal
    if (context.profile.mainGoal === "gain_muscle") {
      proteinMultiplier *= 1.1;
    } else if (context.profile.mainGoal === "lose_weight") {
      proteinMultiplier *= 1.05; // Preserve muscle during weight loss
    }

    // Streak bonus - motivational adjustment
    if (context.streaks.currentDailyStreak >= 7) {
      adjustmentReason += `Great ${context.streaks.currentDailyStreak}-day streak! `;
    }

    return {
      calories: Math.round(baseCalories * calorieMultiplier),
      protein: Math.round(baseProtein * proteinMultiplier),
      carbs: Math.round(baseCarbs * calorieMultiplier),
      fats: Math.round(baseFats * calorieMultiplier),
      water: baseWater,
      adjustmentReason: adjustmentReason || "Standard targets based on your profile.",
    };
  }

  static async generateCustomMenu(params: GenerateMenuParams) {
    try {
      console.log("🎨 Generating custom menu for user:", params.userId);

      // Get comprehensive user context for personalization
      const userContext = await UserContextService.getComprehensiveContext(params.userId);

      // Get user context
      const questionnaire = await prisma.userQuestionnaire.findFirst({
        where: { user_id: params.userId },
        orderBy: { date_completed: "desc" },
      });

      if (!questionnaire) {
        throw new Error(
          "User questionnaire not found. Please complete the questionnaire first."
        );
      }

      // Get nutrition plan for targets
      const nutritionPlan = await prisma.nutritionPlan.findFirst({
        where: { user_id: params.userId },
        orderBy: { created_at: "desc" },
      });

      // Calculate dynamic targets
      const dynamicTargets = this.calculateDynamicTargets(userContext, nutritionPlan);

      // Generate custom menu based on request with full context
      const menuData = await this.generateCustomMenuWithAI(
        params,
        questionnaire,
        userContext,
        dynamicTargets
      );

      // Save to database
      const savedMenu = await this.saveMenuToDatabase(
        params.userId,
        menuData,
        params.days || 7,
        userContext
      );

      console.log("✅ Custom menu generated successfully");
      return savedMenu;
    } catch (error) {
      console.error("💥 Error generating custom menu:", error);
      throw error;
    }
  }

  private static async generateMenuWithAI(
    params: GenerateMenuParams,
    questionnaire: any,
    nutritionPlan: any,
    userContext?: ComprehensiveUserContext,
    dynamicTargets?: { calories: number; protein: number; carbs: number; fats: number; water: number; adjustmentReason: string }
  ) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.log("⚠️ No OpenAI key, using fallback menu generation");
        return this.generateFallbackMenu(params, questionnaire, userContext, dynamicTargets);
      }

      // Use enhanced prompt with full user context if available
      const prompt = userContext
        ? this.buildEnhancedMenuPrompt(params, questionnaire, nutritionPlan, userContext, dynamicTargets!)
        : this.buildMenuGenerationPrompt(params, questionnaire, nutritionPlan);

      const aiResponse = await OpenAIService.generateText(prompt, 2000);

      // Parse AI response
      const menuData = this.parseAIMenuResponse(aiResponse);
      return menuData;
    } catch (error) {
      console.log("⚠️ AI menu generation failed, using fallback");
      return this.generateFallbackMenu(params, questionnaire, userContext, dynamicTargets);
    }
  }

  /**
   * Build enhanced menu generation prompt with full user context
   */
  private static buildEnhancedMenuPrompt(
    params: GenerateMenuParams,
    questionnaire: any,
    nutritionPlan: any,
    context: ComprehensiveUserContext,
    dynamicTargets: { calories: number; protein: number; carbs: number; fats: number; water: number; adjustmentReason: string }
  ): string {
    const { profile, performance, mealPatterns, streaks, healthInsights, achievements } = context;

    return `Generate a HIGHLY PERSONALIZED ${params.days || 7}-day meal plan based on comprehensive user data.

=== USER PROFILE ===
Age: ${questionnaire.age} | Weight: ${profile.weight}kg → Target: ${profile.targetWeight}kg
Height: ${questionnaire.height_cm}cm | BMI: ${healthInsights.bmiCategory}
Main Goal: ${profile.mainGoal}
Activity Level: ${profile.activityLevel}
Dietary Style: ${profile.dietaryStyle}

=== CRITICAL RESTRICTIONS ===
🚫 ALLERGIES (NEVER include these): ${profile.allergies.length > 0 ? profile.allergies.join(", ") : "None"}
🚫 DISLIKES (Avoid): ${profile.dislikedFoods.slice(0, 8).join(", ") || "None specified"}
✅ LIKES (Prefer): ${profile.likedFoods.slice(0, 8).join(", ") || "None specified"}
Kosher: ${profile.kosher ? "YES - meals must be kosher" : "No restriction"}

=== PERSONALIZED NUTRITION TARGETS ===
📊 Daily Calories: ${dynamicTargets.calories}kcal
🥩 Protein: ${dynamicTargets.protein}g (${Math.round(dynamicTargets.protein * 4 / dynamicTargets.calories * 100)}% of calories)
🍞 Carbs: ${dynamicTargets.carbs}g
🥑 Fats: ${dynamicTargets.fats}g
💧 Water: ${dynamicTargets.water}ml/day
Adjustment: ${dynamicTargets.adjustmentReason}

=== USER PERFORMANCE DATA ===
30-Day Averages: ${performance.avgDailyCalories}kcal | ${performance.avgDailyProtein}g protein
Goal Achievement: ${Math.round(performance.overallGoalAchievementRate * 100)}%
Consistency Score: ${Math.round(performance.consistencyScore * 100)}%
Best Day: ${performance.bestPerformingDayOfWeek} | Needs Work: ${performance.worstPerformingDayOfWeek}
Trends: Calories ${performance.caloriesTrend} | Protein ${performance.proteinTrend}

=== USER MEAL PATTERNS ===
Preferred Meal Times: Breakfast ${mealPatterns.preferredBreakfastTime || "flexible"} | Lunch ${mealPatterns.preferredLunchTime || "flexible"} | Dinner ${mealPatterns.preferredDinnerTime || "flexible"}
Most Common Proteins: ${mealPatterns.mostCommonProteins.slice(0, 5).join(", ") || "Varied"}
Most Common Carbs: ${mealPatterns.mostCommonCarbs.slice(0, 5).join(", ") || "Varied"}
Avg Meals/Day: ${mealPatterns.averageMealsPerDay}

=== MOTIVATION & STREAK ===
Current Streak: ${streaks.currentDailyStreak} days (Longest: ${streaks.longestDailyStreak})
Level: ${achievements.currentLevel} | XP: ${achievements.totalXPEarned}
${achievements.nearCompletion.length > 0 ? `Near Achievement: ${achievements.nearCompletion[0]?.name}` : ""}

=== HEALTH INSIGHTS ===
Hydration: ${healthInsights.hydrationStatus}
Protein Intake: ${healthInsights.proteinIntakeStatus}
TDEE: ${healthInsights.estimatedTDEE}kcal | Recommended Adjustment: ${healthInsights.recommendedDeficitOrSurplus > 0 ? "+" : ""}${healthInsights.recommendedDeficitOrSurplus}kcal

=== MENU REQUIREMENTS ===
- Duration: ${params.days || 7} days
- Meals per day: ${this.getMealsPerDayCount(params.mealsPerDay || "3_main")}
- Budget: ${params.budget ? `₪${params.budget}/day` : "Moderate"}
- Max daily prep time: ${questionnaire.daily_cooking_time || "30 minutes"}
- Cooking methods: ${questionnaire.available_cooking_methods?.join(", ") || "All methods"}
${params.customRequest ? `- Special request: ${params.customRequest}` : ""}

=== PERSONALIZATION INSTRUCTIONS ===
1. Each day's total should match ~${dynamicTargets.calories}kcal with ${dynamicTargets.protein}g protein
2. Use their PREFERRED foods: ${profile.likedFoods.slice(0, 5).join(", ")}
3. AVOID their disliked foods completely
4. Consider their ${performance.bestPerformingDayOfWeek} is their best day - can have more complex meals
5. ${performance.worstPerformingDayOfWeek} is hardest - keep meals simple and satisfying
6. They're on a ${streaks.currentDailyStreak}-day streak - include encouraging variety
7. Include foods rich in the nutrients they typically lack based on their ${healthInsights.proteinIntakeStatus} protein status
8. Prefer their commonly eaten proteins: ${mealPatterns.mostCommonProteins.slice(0, 3).join(", ")}

Return JSON with this structure:
{
  "title": "Personalized ${params.days || 7}-Day Menu for ${profile.mainGoal}",
  "description": "Menu optimized for your ${profile.mainGoal} goal with ${dynamicTargets.calories}kcal daily target",
  "total_calories": number,
  "total_protein": number,
  "total_carbs": number,
  "total_fat": number,
  "days_count": ${params.days || 7},
  "estimated_cost": number,
  "meals": [
    {
      "name": "Meal name",
      "meal_type": "BREAKFAST/LUNCH/DINNER/SNACK",
      "day_number": 1-7,
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "fiber": number,
      "prep_time_minutes": number,
      "cooking_method": "method",
      "instructions": "cooking instructions",
      "ingredients": [{ "name": "ingredient", "quantity": number, "unit": "g/ml/piece", "category": "protein/vegetable/grain" }]
    }
  ]
}`;
  }

  private static async generateCustomMenuWithAI(
    params: GenerateMenuParams,
    questionnaire: any,
    userContext?: ComprehensiveUserContext,
    dynamicTargets?: { calories: number; protein: number; carbs: number; fats: number; water: number; adjustmentReason: string }
  ) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.log("⚠️ No OpenAI key, using fallback custom menu");
        return this.generateFallbackCustomMenu(params, questionnaire, userContext, dynamicTargets);
      }

      // Use enhanced prompt with context if available
      const prompt = userContext && dynamicTargets
        ? this.buildEnhancedCustomMenuPrompt(params, questionnaire, userContext, dynamicTargets)
        : this.buildCustomMenuPrompt(params, questionnaire);

      const aiResponse = await OpenAIService.generateText(prompt, 2000);

      // Parse AI response
      const menuData = this.parseAIMenuResponse(aiResponse);
      return menuData;
    } catch (error) {
      console.log("⚠️ AI custom menu generation failed, using fallback");
      return this.generateFallbackCustomMenu(params, questionnaire, userContext, dynamicTargets);
    }
  }

  /**
   * Build enhanced custom menu prompt with full user context
   */
  private static buildEnhancedCustomMenuPrompt(
    params: GenerateMenuParams,
    questionnaire: any,
    context: ComprehensiveUserContext,
    dynamicTargets: { calories: number; protein: number; carbs: number; fats: number; water: number; adjustmentReason: string }
  ): string {
    const { profile, performance, mealPatterns, streaks, healthInsights } = context;

    return `Create a PERSONALIZED custom meal plan based on this specific request: "${params.customRequest}"

=== USER PROFILE ===
Goal: ${profile.mainGoal} | Activity: ${profile.activityLevel}
Weight: ${profile.weight}kg → Target: ${profile.targetWeight}kg
Dietary Style: ${profile.dietaryStyle}

=== CRITICAL RESTRICTIONS ===
🚫 ALLERGIES: ${profile.allergies.length > 0 ? profile.allergies.join(", ") : "None"}
🚫 DISLIKES: ${profile.dislikedFoods.slice(0, 5).join(", ") || "None"}
✅ LIKES: ${profile.likedFoods.slice(0, 5).join(", ") || "None"}
Kosher: ${profile.kosher ? "YES" : "No"}

=== PERSONALIZED TARGETS ===
Daily Calories: ${dynamicTargets.calories}kcal
Protein: ${dynamicTargets.protein}g | Carbs: ${dynamicTargets.carbs}g | Fats: ${dynamicTargets.fats}g
Water: ${dynamicTargets.water}ml/day

=== USER PATTERNS ===
Avg Meals/Day: ${mealPatterns.averageMealsPerDay}
Common Proteins: ${mealPatterns.mostCommonProteins.slice(0, 3).join(", ") || "Varied"}
Current Streak: ${streaks.currentDailyStreak} days
Consistency: ${Math.round(performance.consistencyScore * 100)}%

=== CUSTOM REQUEST ===
"${params.customRequest}"

Plan Requirements:
- Duration: ${params.days || 7} days
- Meals per day: ${this.getMealsPerDayCount(params.mealsPerDay || "3_main")}
- Budget: ${params.budget ? `₪${params.budget}/day` : "Flexible"}
- Prep time: ${questionnaire.daily_cooking_time || "30 min"}/day

IMPORTANT: The custom request is the primary focus. Adapt all meals to fulfill this request while respecting allergies and maintaining nutritional balance.

Return JSON with the standard menu structure including title, description, totals, and meals array.`;
  }

  private static buildMenuGenerationPrompt(
    params: GenerateMenuParams,
    questionnaire: any,
    nutritionPlan: any
  ): string {
    return `Generate a ${params.days || 7}-day personalized meal plan.

User Profile:
- Age: ${questionnaire.age}
- Weight: ${questionnaire.weight_kg}kg
- Height: ${questionnaire.height_cm}cm
- Goal: ${questionnaire.main_goal}
- Activity Level: ${questionnaire.physical_activity_level}
- Dietary Style: ${questionnaire.dietary_style}
- Allergies: ${questionnaire.allergies?.join(", ") || "None"}
- Dislikes: ${questionnaire.disliked_foods?.join(", ") || "None"}
- Likes: ${questionnaire.liked_foods?.join(", ") || "None"}

Nutrition Targets:
- Daily Calories: ${nutritionPlan?.goal_calories || 2000}
- Daily Protein: ${nutritionPlan?.goal_protein_g || 150}g
- Daily Carbs: ${nutritionPlan?.goal_carbs_g || 250}g
- Daily Fats: ${nutritionPlan?.goal_fats_g || 67}g

Requirements:
- ${this.getMealsPerDayCount(params.mealsPerDay || "3_main")} meals per day
- Budget: ${params.budget ? `₪${params.budget} per day` : "Moderate budget"}
- Prep time: ${questionnaire.daily_cooking_time || "30 minutes"} per day
- Cooking methods: ${
      questionnaire.available_cooking_methods?.join(", ") || "All methods"
    }

Return JSON with this structure:
{
  "title": "Menu title",
  "description": "Menu description",
  "total_calories": number,
  "total_protein": number,
  "total_carbs": number,
  "total_fat": number,
  "days_count": ${params.days || 7},
  "estimated_cost": number,
  "meals": [
    {
      "name": "Meal name",
      "meal_type": "BREAKFAST/LUNCH/DINNER/SNACK",
      "day_number": 1-7,
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "fiber": number,
      "prep_time_minutes": number,
      "cooking_method": "method",
      "instructions": "cooking instructions",
      "ingredients": [
        {
          "name": "ingredient",
          "quantity": number,
          "unit": "g/ml/piece",
          "category": "protein/vegetable/grain"
        }
      ]
    }
  ]
}`;
  }

  private static buildCustomMenuPrompt(
    params: GenerateMenuParams,
    questionnaire: any
  ): string {
    return `Create a custom meal plan based on this request: "${
      params.customRequest
    }"

User Context:
- Dietary Style: ${questionnaire.dietary_style}
- Allergies: ${questionnaire.allergies?.join(", ") || "None"}
- Cooking Preference: ${questionnaire.cooking_preference}
- Budget: ${params.budget ? `₪${params.budget} per day` : "Flexible"}

Plan Requirements:
- Duration: ${params.days || 7} days
- Meals per day: ${this.getMealsPerDayCount(params.mealsPerDay || "3_main")}
- Custom request: ${params.customRequest}

Return the same JSON structure as before with meals that specifically address the custom request.`;
  }

  private static parseAIMenuResponse(aiResponse: string) {
    try {
      // Clean the response
      let cleaned = aiResponse.trim();
      if (cleaned.includes("```json")) {
        cleaned = cleaned.replace(/```json\s*/g, "").replace(/```\s*/g, "");
      }

      // Find JSON boundaries
      const jsonStart = cleaned.indexOf("{");
      const jsonEnd = cleaned.lastIndexOf("}");

      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
      }

      const parsed = JSON.parse(cleaned);

      // Validate structure
      if (!parsed.meals || !Array.isArray(parsed.meals)) {
        throw new Error("Invalid menu structure");
      }

      return parsed;
    } catch (error) {
      console.error("💥 Error parsing AI menu response:", error);
      throw new Error("Failed to parse AI menu response");
    }
  }

  private static generateFallbackMenu(
    params: GenerateMenuParams,
    questionnaire: any,
    userContext?: ComprehensiveUserContext,
    dynamicTargets?: { calories: number; protein: number; carbs: number; fats: number; water: number; adjustmentReason: string }
  ) {
    const days = params.days || 7;
    const mealsPerDay = this.getMealsPerDayCount(
      params.mealsPerDay || "3_main"
    );

    // Calculate per-meal targets based on dynamic targets
    const dailyCalories = dynamicTargets?.calories || 2000;
    const dailyProtein = dynamicTargets?.protein || 150;
    const caloriesPerMeal = Math.round(dailyCalories / mealsPerDay);
    const proteinPerMeal = Math.round(dailyProtein / mealsPerDay);

    // Adjust meal macros based on user's goal
    const isWeightLoss = userContext?.profile.mainGoal === "lose_weight";
    const isMuscleGain = userContext?.profile.mainGoal === "gain_muscle";

    const fallbackMeals = [
      {
        name: "Protein Scrambled Eggs",
        meal_type: "BREAKFAST",
        calories: isWeightLoss ? Math.round(caloriesPerMeal * 0.85) : caloriesPerMeal,
        protein: isMuscleGain ? Math.round(proteinPerMeal * 1.1) : proteinPerMeal,
        carbs: isWeightLoss ? 12 : 18,
        fat: isWeightLoss ? 15 : 20,
        fiber: 3,
        prep_time_minutes: 15,
        cooking_method: "Pan frying",
        instructions:
          "Scramble eggs with vegetables and serve with whole grain toast",
        ingredients: [
          { name: "eggs", quantity: isMuscleGain ? 3 : 2, unit: "piece", category: "protein" },
          {
            name: "whole grain bread",
            quantity: isWeightLoss ? 1 : 2,
            unit: "slice",
            category: "grain",
          },
          { name: "spinach", quantity: 50, unit: "g", category: "vegetable" },
        ],
      },
      {
        name: "Grilled Chicken Salad",
        meal_type: "LUNCH",
        calories: caloriesPerMeal,
        protein: isMuscleGain ? Math.round(proteinPerMeal * 1.2) : proteinPerMeal,
        carbs: isWeightLoss ? 20 : 28,
        fat: 18,
        fiber: 8,
        prep_time_minutes: 25,
        cooking_method: "Grilling",
        instructions:
          "Grill chicken breast and serve over mixed greens with olive oil dressing",
        ingredients: [
          {
            name: "chicken breast",
            quantity: isMuscleGain ? 180 : 150,
            unit: "g",
            category: "protein",
          },
          {
            name: "mixed greens",
            quantity: 120,
            unit: "g",
            category: "vegetable",
          },
          { name: "olive oil", quantity: isWeightLoss ? 10 : 15, unit: "ml", category: "fat" },
        ],
      },
      {
        name: "Baked Salmon with Quinoa",
        meal_type: "DINNER",
        calories: Math.round(caloriesPerMeal * 1.1),
        protein: isMuscleGain ? Math.round(proteinPerMeal * 1.15) : proteinPerMeal,
        carbs: isWeightLoss ? 35 : 45,
        fat: 18,
        fiber: 6,
        prep_time_minutes: 30,
        cooking_method: "Baking",
        instructions:
          "Bake salmon with herbs and serve with quinoa and steamed vegetables",
        ingredients: [
          {
            name: "salmon fillet",
            quantity: isMuscleGain ? 180 : 150,
            unit: "g",
            category: "protein",
          },
          { name: "quinoa", quantity: isWeightLoss ? 60 : 80, unit: "g", category: "grain" },
          { name: "broccoli", quantity: 120, unit: "g", category: "vegetable" },
        ],
      },
      {
        name: "Greek Yogurt Power Bowl",
        meal_type: "SNACK",
        calories: Math.round(caloriesPerMeal * 0.6),
        protein: Math.round(proteinPerMeal * 0.7),
        carbs: 25,
        fat: 8,
        fiber: 4,
        prep_time_minutes: 5,
        cooking_method: "Assembly",
        instructions: "Top Greek yogurt with nuts, seeds, and berries",
        ingredients: [
          { name: "Greek yogurt", quantity: 200, unit: "g", category: "protein" },
          { name: "mixed berries", quantity: 50, unit: "g", category: "fruit" },
          { name: "almonds", quantity: 20, unit: "g", category: "fat" },
        ],
      },
      {
        name: "Protein Smoothie",
        meal_type: "SNACK",
        calories: Math.round(caloriesPerMeal * 0.5),
        protein: Math.round(proteinPerMeal * 0.8),
        carbs: 20,
        fat: 5,
        fiber: 3,
        prep_time_minutes: 5,
        cooking_method: "Blending",
        instructions: "Blend all ingredients until smooth",
        ingredients: [
          { name: "protein powder", quantity: 30, unit: "g", category: "protein" },
          { name: "banana", quantity: 1, unit: "piece", category: "fruit" },
          { name: "almond milk", quantity: 250, unit: "ml", category: "dairy" },
        ],
      },
    ];

    const meals: any[] = [];
    const mealTypes = ["BREAKFAST", "LUNCH", "DINNER", "SNACK", "SNACK"];

    for (let day = 1; day <= days; day++) {
      for (let mealIndex = 0; mealIndex < mealsPerDay; mealIndex++) {
        const mealType = mealTypes[mealIndex] || "SNACK";
        const templateMeal = fallbackMeals.find(m => m.meal_type === mealType) || fallbackMeals[mealIndex % fallbackMeals.length];

        meals.push({
          ...templateMeal,
          day_number: day,
          name: `${templateMeal.name} - Day ${day}`,
        });
      }
    }

    const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
    const totalProtein = meals.reduce((sum, meal) => sum + meal.protein, 0);
    const totalCarbs = meals.reduce((sum, meal) => sum + meal.carbs, 0);
    const totalFat = meals.reduce((sum, meal) => sum + meal.fat, 0);

    const goal = userContext?.profile.mainGoal || questionnaire.main_goal || "health";
    const adjustmentNote = dynamicTargets?.adjustmentReason || "";

    return {
      title: `Personalized ${days}-Day Menu for ${goal}`,
      description: `Customized meal plan with ${dynamicTargets?.calories || 2000}kcal daily target. ${adjustmentNote}`,
      total_calories: totalCalories,
      total_protein: totalProtein,
      total_carbs: totalCarbs,
      total_fat: totalFat,
      days_count: days,
      estimated_cost: params.budget || 200,
      meals,
    };
  }

  private static generateFallbackCustomMenu(
    params: GenerateMenuParams,
    questionnaire: any,
    userContext?: ComprehensiveUserContext,
    dynamicTargets?: { calories: number; protein: number; carbs: number; fats: number; water: number; adjustmentReason: string }
  ) {
    // Similar to fallback menu but customized based on the request
    const customizedMeals = this.customizeMealsBasedOnRequest(
      params.customRequest || "",
      questionnaire
    );

    return this.generateFallbackMenu(
      { ...params, customRequest: undefined },
      questionnaire,
      userContext,
      dynamicTargets
    );
  }

  private static customizeMealsBasedOnRequest(
    request: string,
    questionnaire: any
  ) {
    // Analyze the custom request and adjust meals accordingly
    const lowerRequest = request.toLowerCase();

    if (lowerRequest.includes("protein") || lowerRequest.includes("muscle")) {
      return "high_protein";
    }
    if (lowerRequest.includes("vegetarian") || lowerRequest.includes("plant")) {
      return "vegetarian";
    }
    if (lowerRequest.includes("quick") || lowerRequest.includes("fast")) {
      return "quick_prep";
    }

    return "balanced";
  }

  private static async saveMenuToDatabase(
    userId: string,
    menuData: any,
    daysCount: number,
    userContext?: ComprehensiveUserContext
  ) {
    try {
      console.log("💾 Saving menu to database...");

      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + daysCount);

      // Determine dietary category based on user context
      let dietaryCategory = menuData.dietary_category || "BALANCED";
      if (userContext) {
        if (userContext.profile.dietaryStyle === "vegetarian") dietaryCategory = "VEGETARIAN";
        else if (userContext.profile.dietaryStyle === "vegan") dietaryCategory = "VEGAN";
        else if (userContext.profile.mainGoal === "lose_weight") dietaryCategory = "LOW_CALORIE";
        else if (userContext.profile.mainGoal === "gain_muscle") dietaryCategory = "HIGH_PROTEIN";
      }

      // Create the recommended menu with context-aware metadata
      const menu = await prisma.recommendedMenu.create({
        data: {
          user_id: userId,
          title: menuData.title,
          description: menuData.description,
          total_calories: menuData.total_calories,
          total_protein: menuData.total_protein,
          total_carbs: menuData.total_carbs,
          total_fat: menuData.total_fat,
          total_fiber: menuData.total_fiber || 0,
          days_count: daysCount,
          dietary_category: dietaryCategory,
          estimated_cost: menuData.estimated_cost,
          prep_time_minutes: menuData.prep_time_minutes || 30,
          difficulty_level: menuData.difficulty_level || 2,
          is_active: true,
          start_date: startDate,
          end_date: endDate,
        },
      });

      // Log personalization metrics for future improvements
      if (userContext) {
        console.log("📊 Menu personalization metrics:", {
          userId,
          goal: userContext.profile.mainGoal,
          dailyCalorieTarget: userContext.goals.dailyCalories,
          consistencyScore: userContext.performance.consistencyScore,
          streak: userContext.streaks.currentDailyStreak,
          dataCompleteness: userContext.dataCompleteness,
        });
      }

      // Save meals
      const mealPromises = menuData.meals.map(async (meal: any) => {
        const savedMeal = await prisma.recommendedMeal.create({
          data: {
            menu_id: menu.menu_id,
            name: meal.name,
            meal_type: meal.meal_type,
            day_number: meal.day_number,
            calories: meal.calories,
            protein: meal.protein,
            carbs: meal.carbs,
            fat: meal.fat,
            fiber: meal.fiber || 0,
            prep_time_minutes: meal.prep_time_minutes || 30,
            cooking_method: meal.cooking_method,
            instructions: meal.instructions,
          },
        });

        // Save ingredients
        if (meal.ingredients && Array.isArray(meal.ingredients)) {
          const ingredientPromises = meal.ingredients.map((ingredient: any) =>
            prisma.recommendedIngredient.create({
              data: {
                meal_id: savedMeal.meal_id,
                name: ingredient.name,
                quantity: ingredient.quantity || 1,
                unit: ingredient.unit || "piece",
                category: ingredient.category || "other",
                estimated_cost: ingredient.estimated_cost || 5,
              },
            })
          );

          await Promise.all(ingredientPromises);
        }

        return savedMeal;
      });

      await Promise.all(mealPromises);

      // Return complete menu with meals and ingredients
      const completeMenu = await prisma.recommendedMenu.findUnique({
        where: { menu_id: menu.menu_id },
        include: {
          meals: {
            include: {
              ingredients: true,
            },
            orderBy: [{ day_number: "asc" }, { meal_type: "asc" }],
          },
        },
      });

      console.log("✅ Menu saved to database successfully");
      return completeMenu;
    } catch (error) {
      console.error("💥 Error saving menu to database:", error);
      throw error;
    }
  }

  static async replaceMeal(
    userId: string,
    menuId: string,
    mealId: string,
    preferences: any
  ) {
    try {
      console.log("🔄 Replacing meal in menu:", { menuId, mealId });

      // Get the current meal
      const currentMeal = await prisma.recommendedMeal.findFirst({
        where: {
          meal_id: mealId,
          menu: {
            user_id: userId,
          },
        },
        include: {
          ingredients: true,
        },
      });

      if (!currentMeal) {
        throw new Error("Meal not found");
      }

      // Generate replacement meal
      const replacementMeal = await this.generateReplacementMeal(
        currentMeal,
        preferences,
        userId
      );

      // Update the meal
      const updatedMeal = await prisma.recommendedMeal.update({
        where: { meal_id: mealId },
        data: {
          name: replacementMeal.name,
          calories: replacementMeal.calories,
          protein: replacementMeal.protein,
          carbs: replacementMeal.carbs,
          fat: replacementMeal.fat,
          fiber: replacementMeal.fiber,
          prep_time_minutes: replacementMeal.prep_time_minutes,
          cooking_method: replacementMeal.cooking_method,
          instructions: replacementMeal.instructions,
        },
      });

      // Update ingredients
      await prisma.recommendedIngredient.deleteMany({
        where: { meal_id: mealId },
      });

      if (replacementMeal.ingredients) {
        await prisma.recommendedIngredient.createMany({
          data: replacementMeal.ingredients.map((ing: any) => ({
            meal_id: mealId,
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            category: ing.category,
          })),
        });
      }

      console.log("✅ Meal replaced successfully");
      return updatedMeal;
    } catch (error) {
      console.error("💥 Error replacing meal:", error);
      throw error;
    }
  }

  private static async generateReplacementMeal(
    currentMeal: any,
    preferences: any,
    userId: string
  ) {
    // Get user preferences
    const questionnaire = await prisma.userQuestionnaire.findFirst({
      where: { user_id: userId },
    });

    // Generate alternative meal with similar nutrition profile
    const alternatives = [
      {
        name: "Protein Bowl Alternative",
        calories: currentMeal.calories,
        protein: currentMeal.protein,
        carbs: currentMeal.carbs * 0.9,
        fat: currentMeal.fat * 1.1,
        fiber: (currentMeal.fiber || 5) + 2,
        prep_time_minutes: (currentMeal.prep_time_minutes || 30) - 5,
        cooking_method: "Bowl assembly",
        instructions: "Combine protein, grains, and vegetables in a bowl",
        ingredients: [
          {
            name: "lean protein",
            quantity: 150,
            unit: "g",
            category: "protein",
          },
          { name: "quinoa", quantity: 80, unit: "g", category: "grain" },
          {
            name: "mixed vegetables",
            quantity: 100,
            unit: "g",
            category: "vegetable",
          },
        ],
      },
    ];

    return alternatives[0];
  }

  static async generateEnhancedMenuWithFeedback(params: {
    userId: string;
    originalMenu: any;
    questionnaire: any;
    feedback: {
      rating: number;
      liked: string;
      disliked: string;
      suggestions: string;
      enhancements: string;
      wouldRecommend: boolean;
    };
  }) {
    try {
      console.log("🎨 Generating enhanced menu with user feedback");

      const prompt = `Create an enhanced ${
        params.originalMenu.days_count
      }-day meal plan based on user feedback.

ORIGINAL MENU:
Title: ${params.originalMenu.title}
Days: ${params.originalMenu.days_count}
Total Calories: ${params.originalMenu.total_calories}

USER FEEDBACK:
Rating: ${params.feedback.rating}/5
Would Recommend: ${params.feedback.wouldRecommend ? "Yes" : "No"}

What they liked: ${params.feedback.liked || "Not specified"}
What they didn't like: ${params.feedback.disliked || "Not specified"}
Suggestions: ${params.feedback.suggestions || "Not specified"}
Additional Enhancements: ${params.feedback.enhancements || "Not specified"}

USER PROFILE:
- Dietary Style: ${params.questionnaire?.dietary_style || "Balanced"}
- Allergies: ${params.questionnaire?.allergies?.join(", ") || "None"}
- Activity Level: ${params.questionnaire?.physical_activity_level || "Moderate"}
- Main Goal: ${params.questionnaire?.main_goal || "Health improvement"}

REQUIREMENTS:
1. Address ALL feedback points, especially dislikes and suggestions
2. Keep what they liked and improve what they didn't
3. Incorporate the enhancement requests
4. Maintain nutritional balance
5. Ensure variety and appeal

Generate a COMPLETE new menu in JSON format with the same structure as before, but IMPROVED based on feedback.`;

      let menuData;

      if (!process.env.OPENAI_API_KEY) {
        console.log("⚠️ No OpenAI key, using enhanced fallback");
        menuData = this.generateEnhancedFallbackMenu(params);
      } else {
        try {
          const aiResponse = await OpenAIService.generateText(prompt, 2000);
          menuData = this.parseAIMenuResponse(aiResponse);
        } catch (error) {
          console.log("⚠️ AI generation failed, using enhanced fallback");
          menuData = this.generateEnhancedFallbackMenu(params);
        }
      }

      // Save the new enhanced menu
      const savedMenu = await this.saveMenuToDatabase(
        params.userId,
        menuData,
        params.originalMenu.days_count
      );

      console.log("✅ Enhanced menu generated and saved");
      return savedMenu;
    } catch (error) {
      console.error("💥 Error generating enhanced menu:", error);
      throw error;
    }
  }

  private static generateEnhancedFallbackMenu(params: any) {
    const { originalMenu, feedback, questionnaire } = params;

    // Analyze feedback to create better menu
    const isLowCalorie =
      feedback.disliked?.toLowerCase().includes("calories") ||
      feedback.suggestions?.toLowerCase().includes("lower calories");
    const needsMoreProtein =
      feedback.liked?.toLowerCase().includes("protein") ||
      feedback.suggestions?.toLowerCase().includes("more protein");
    const wantsVariety =
      feedback.disliked?.toLowerCase().includes("repetitive") ||
      feedback.suggestions?.toLowerCase().includes("variety");

    const enhancedMeals = this.createEnhancedMeals({
      daysCount: originalMenu.days_count,
      isLowCalorie,
      needsMoreProtein,
      wantsVariety,
      dietaryStyle: questionnaire?.dietary_style,
    });

    const totalCalories = enhancedMeals.reduce(
      (sum, meal) => sum + meal.calories,
      0
    );
    const totalProtein = enhancedMeals.reduce(
      (sum, meal) => sum + meal.protein,
      0
    );
    const totalCarbs = enhancedMeals.reduce((sum, meal) => sum + meal.carbs, 0);
    const totalFat = enhancedMeals.reduce((sum, meal) => sum + meal.fat, 0);

    return {
      title: `Enhanced ${originalMenu.days_count}-Day Menu`,
      description: `Improved menu based on your feedback and preferences`,
      total_calories: totalCalories,
      total_protein: totalProtein,
      total_carbs: totalCarbs,
      total_fat: totalFat,
      days_count: originalMenu.days_count,
      estimated_cost: originalMenu.estimated_cost,
      meals: enhancedMeals,
    };
  }

  private static createEnhancedMeals(params: {
    daysCount: number;
    isLowCalorie: boolean;
    needsMoreProtein: boolean;
    wantsVariety: boolean;
    dietaryStyle?: string;
  }) {
    const mealTemplates = [
      {
        name: "Greek Yogurt Parfait",
        meal_type: "BREAKFAST",
        calories: params.isLowCalorie ? 280 : 350,
        protein: params.needsMoreProtein ? 28 : 22,
        carbs: 35,
        fat: 8,
        fiber: 5,
      },
      {
        name: "Quinoa Buddha Bowl",
        meal_type: "LUNCH",
        calories: params.isLowCalorie ? 420 : 480,
        protein: params.needsMoreProtein ? 32 : 25,
        carbs: 45,
        fat: 18,
        fiber: 10,
      },
      {
        name: "Grilled Salmon with Vegetables",
        meal_type: "DINNER",
        calories: params.isLowCalorie ? 450 : 520,
        protein: params.needsMoreProtein ? 38 : 32,
        carbs: 35,
        fat: 22,
        fiber: 8,
      },
    ];

    const meals: any[] = [];
    for (let day = 1; day <= params.daysCount; day++) {
      mealTemplates.forEach((template) => {
        meals.push({
          ...template,
          day_number: day,
          name: params.wantsVariety
            ? `${template.name} (Day ${day} Variation)`
            : template.name,
          prep_time_minutes: 25,
          cooking_method: "Mixed",
          instructions: `Prepare ${template.name} following standard recipe`,
          ingredients: [
            {
              name: "main ingredient",
              quantity: 150,
              unit: "g",
              category: "protein",
            },
            {
              name: "vegetables",
              quantity: 100,
              unit: "g",
              category: "vegetable",
            },
            { name: "grains", quantity: 80, unit: "g", category: "grain" },
          ],
        });
      });
    }

    return meals;
  }

  static async markMealAsFavorite(
    userId: string,
    menuId: string,
    mealId: string,
    isFavorite: boolean
  ) {
    try {
      // Save as user preference
      await prisma.userMealPreference.upsert({
        where: {
          user_id_template_id_preference_type: {
            user_id: userId,
            template_id: mealId,
            preference_type: "favorite",
          },
        },
        update: {
          rating: isFavorite ? 5 : 1,
          notes: isFavorite ? "Marked as favorite" : "Removed from favorites",
        },
        create: {
          user_id: userId,
          template_id: mealId,
          preference_type: "favorite",
          rating: isFavorite ? 5 : 1,
          notes: isFavorite ? "Marked as favorite" : "Removed from favorites",
        },
      });

      console.log("✅ Meal favorite status updated");
    } catch (error) {
      console.error("💥 Error updating meal favorite:", error);
      throw error;
    }
  }

  static async giveMealFeedback(
    userId: string,
    menuId: string,
    mealId: string,
    liked: boolean
  ) {
    try {
      await prisma.userMealPreference.upsert({
        where: {
          user_id_template_id_preference_type: {
            user_id: userId,
            template_id: mealId,
            preference_type: "feedback",
          },
        },
        update: {
          rating: liked ? 4 : 2,
          notes: liked ? "User liked this meal" : "User disliked this meal",
        },
        create: {
          user_id: userId,
          template_id: mealId,
          preference_type: "feedback",
          rating: liked ? 4 : 2,
          notes: liked ? "User liked this meal" : "User disliked this meal",
        },
      });

      console.log("✅ Meal feedback recorded");
    } catch (error) {
      console.error("💥 Error recording meal feedback:", error);
      throw error;
    }
  }

  static async generateShoppingList(userId: string, menuId: string) {
    try {
      console.log("🛒 Generating shopping list for menu:", menuId);

      const menu = await prisma.recommendedMenu.findFirst({
        where: {
          menu_id: menuId,
          user_id: userId,
        },
        include: {
          meals: {
            include: {
              ingredients: true,
            },
          },
        },
      });

      if (!menu) {
        throw new Error("Menu not found");
      }

      // Aggregate ingredients
      const ingredientMap = new Map();

      menu.meals.forEach((meal) => {
        meal.ingredients.forEach((ingredient) => {
          const key = ingredient.name.toLowerCase();
          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key);
            existing.quantity += ingredient.quantity;
          } else {
            ingredientMap.set(key, {
              name: ingredient.name,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              category: ingredient.category,
              estimated_cost: ingredient.estimated_cost || 5,
            });
          }
        });
      });

      const items = Array.from(ingredientMap.values());
      const totalCost = items.reduce(
        (sum, item) => sum + item.estimated_cost,
        0
      );

      return {
        menu_id: menuId,
        items,
        total_estimated_cost: totalCost,
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("💥 Error generating shopping list:", error);
      throw error;
    }
  }

  private static getMealsPerDayCount(mealsPerDay: string): number {
    switch (mealsPerDay) {
      case "2_main":
        return 2;
      case "3_main":
        return 3;
      case "3_plus_2_snacks":
        return 5;
      case "2_plus_1_intermediate":
        return 3;
      default:
        return 3;
    }
  }

  static async checkMenuCompletion(
    userId: string,
    menuId: string
  ): Promise<MenuCompletionSummary> {
    try {
      console.log("📊 Checking menu completion for:", { userId, menuId });

      const menu = await prisma.recommendedMenu.findFirst({
        where: {
          menu_id: menuId,
          user_id: userId,
        },
        include: {
          meals: {
            include: {
              ingredients: true,
            },
            orderBy: [{ day_number: "asc" }, { meal_type: "asc" }],
          },
        },
      });

      if (!menu) {
        throw new Error("Menu not found");
      }

      const mealCompletions = await prisma.mealCompletion.findMany({
        where: {
          user_id: userId,
          menu_id: menuId,
        },
      });

      const totalMeals = menu.meals.length;
      const completedMeals = menu.meals.filter((meal) =>
        mealCompletions.some(
          (completion) =>
            completion.day_number === meal.day_number &&
            completion.meal_type === meal.meal_type
        )
      ).length;

      const completionRate =
        totalMeals > 0 ? (completedMeals / totalMeals) * 100 : 0;

      const totalCalories = menu.meals.reduce(
        (sum, meal) => sum + meal.calories,
        0
      );
      const totalProtein = menu.meals.reduce(
        (sum, meal) => sum + meal.protein,
        0
      );
      const totalCarbs = menu.meals.reduce((sum, meal) => sum + meal.carbs, 0);
      const totalFat = menu.meals.reduce((sum, meal) => sum + meal.fat, 0);

      const avgCaloriesPerDay = totalCalories / menu.days_count;
      const avgProteinPerDay = totalProtein / menu.days_count;

      const dailyBreakdown = Array.from({ length: menu.days_count }).map(
        (_, dayIndex) => {
          const dayNumber = dayIndex + 1;
          const dayMeals = menu.meals.filter(
            (meal) => meal.day_number === dayNumber
          );

          const dayCompletedMeals = dayMeals.filter((meal) =>
            mealCompletions.some(
              (completion) =>
                completion.day_number === meal.day_number &&
                completion.meal_type === meal.meal_type
            )
          ).length;

          const dayCalories = dayMeals.reduce(
            (sum, meal) => sum + meal.calories,
            0
          );
          const dayProtein = dayMeals.reduce(
            (sum, meal) => sum + meal.protein,
            0
          );
          const dayCarbs = dayMeals.reduce((sum, meal) => sum + meal.carbs, 0);
          const dayFat = dayMeals.reduce((sum, meal) => sum + meal.fat, 0);

          const dayDate = new Date(menu.start_date || new Date());
          dayDate.setDate(dayDate.getDate() + dayIndex);

          return {
            day: dayNumber,
            date: dayDate.toISOString().split("T")[0],
            meals_completed: dayCompletedMeals,
            calories: dayCalories,
            protein: dayProtein,
            carbs: dayCarbs,
            fat: dayFat,
          };
        }
      );

      const completionSummary: MenuCompletionSummary = {
        menu_id: menu.menu_id,
        title: menu.title,
        total_days: menu.days_count,
        start_date: menu.start_date ? new Date(menu.start_date) : new Date(),
        end_date: menu.end_date ? new Date(menu.end_date) : new Date(),
        total_meals: totalMeals,
        completed_meals: completedMeals,
        completion_rate: Math.round(completionRate * 100) / 100,
        total_calories: totalCalories,
        avg_calories_per_day: Math.round(avgCaloriesPerDay),
        total_protein: totalProtein,
        avg_protein_per_day: Math.round(avgProteinPerDay * 10) / 10,
        total_carbs: totalCarbs,
        total_fat: totalFat,
        daily_breakdown: dailyBreakdown,
      };

      console.log("✅ Menu completion summary calculated:", completionSummary);
      return completionSummary;
    } catch (error) {
      console.error("💥 Error checking menu completion:", error);
      throw error;
    }
  }
}
