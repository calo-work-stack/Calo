import { prisma } from "../lib/database";
import {
  OpenAIService,
  IngredientForPricing,
  MealPriceEstimate,
} from "./openai";
import { UserContextService, ComprehensiveUserContext } from "./userContext";
import {
  estimateIngredientPrice,
  estimateTotalPrice,
  formatPrice,
} from "../utils/pricing";

// Budget validation constants
const DEFAULT_DAILY_BUDGET = 100; // ₪100/day default
const MIN_DAILY_BUDGET = 30; // Minimum realistic daily food budget
const MAX_DAILY_BUDGET = 500; // Maximum daily food budget

export interface BudgetValidation {
  isWithinBudget: boolean;
  totalCost: number;
  dailyBudget: number;
  totalBudget: number;
  overageAmount: number;
  costBreakdown: {
    day: number;
    cost: number;
  }[];
}

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
  previousReview?: {
    rating: number;
    liked?: string | null;
    disliked?: string | null;
    suggestions?: string | null;
    wouldRecommend?: boolean;
  };
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
  /**
   * Get user's daily food budget from questionnaire
   */
  static async getUserDailyBudget(userId: string): Promise<number> {
    try {
      const questionnaire = await prisma.userQuestionnaire.findFirst({
        where: { user_id: userId },
        orderBy: { date_completed: "desc" },
        select: { daily_food_budget: true },
      });

      const budget = questionnaire?.daily_food_budget;
      if (budget && budget >= MIN_DAILY_BUDGET && budget <= MAX_DAILY_BUDGET) {
        return budget;
      }
      return DEFAULT_DAILY_BUDGET;
    } catch (error) {
      console.warn("Failed to get user budget, using default:", error);
      return DEFAULT_DAILY_BUDGET;
    }
  }

  /**
   * Calculate total cost from menu meals using AI pricing
   * This is the primary method - uses AI for accurate Israeli market prices
   */
  static async calculateMenuCostWithAI(meals: any[]): Promise<{
    totalCost: number;
    dailyCosts: Map<number, number>;
    mealCosts: Map<string, number>;
  }> {
    const dailyCosts = new Map<number, number>();
    const mealCosts = new Map<string, number>();
    let totalCost = 0;

    try {
      // Prepare meals for AI pricing
      const mealsForPricing = meals.map((meal) => ({
        name: meal.name || "Unknown Meal",
        ingredients: (meal.ingredients || []).map((ing: any) => ({
          name: ing.name,
          quantity: ing.quantity || 100,
          unit: ing.unit || "g",
          category: ing.category || "other",
        })),
      }));

      // Get AI-based cost estimates
      const aiCostResult = await OpenAIService.estimateMenuCostWithAI(
        mealsForPricing
      );

      // Process results
      for (const meal of meals) {
        const dayNumber = meal.day_number || 1;
        const mealCost =
          aiCostResult.mealCosts.get(meal.name) ||
          (meal.ingredients?.length || 0) * 5;

        totalCost += mealCost;
        mealCosts.set(meal.name, mealCost);
        dailyCosts.set(dayNumber, (dailyCosts.get(dayNumber) || 0) + mealCost);

        // Update ingredient costs from AI
        if (meal.ingredients && Array.isArray(meal.ingredients)) {
          for (const ingredient of meal.ingredients) {
            const aiCost = aiCostResult.ingredientCosts.get(
              ingredient.name.toLowerCase()
            );
            if (aiCost !== undefined) {
              ingredient.estimated_cost = aiCost;
            }
          }
        }
      }

      console.log(`💰 AI Menu cost calculated: ₪${totalCost.toFixed(2)}`);
      return {
        totalCost: Math.round(totalCost * 100) / 100,
        dailyCosts,
        mealCosts,
      };
    } catch (error) {
      console.error("❌ AI menu cost calculation failed, using fallback:", error);
      // Fallback to local pricing
      return this.calculateMenuCostFallback(meals);
    }
  }

  /**
   * Fallback cost calculation using local pricing utility
   * Used when AI is not available
   */
  static calculateMenuCostFallback(meals: any[]): {
    totalCost: number;
    dailyCosts: Map<number, number>;
    mealCosts: Map<string, number>;
  } {
    const dailyCosts = new Map<number, number>();
    const mealCosts = new Map<string, number>();
    let totalCost = 0;

    for (const meal of meals) {
      const dayNumber = meal.day_number || 1;
      let mealCost = 0;

      if (meal.ingredients && Array.isArray(meal.ingredients)) {
        for (const ingredient of meal.ingredients) {
          const cost =
            ingredient.estimated_cost ||
            estimateIngredientPrice(
              ingredient.name,
              ingredient.quantity || 100,
              ingredient.unit || "g",
              ingredient.category || "other",
            ).estimated_price;
          mealCost += cost;
          ingredient.estimated_cost = cost;
        }
      }

      totalCost += mealCost;
      mealCosts.set(meal.name, mealCost);
      dailyCosts.set(dayNumber, (dailyCosts.get(dayNumber) || 0) + mealCost);
    }

    return {
      totalCost: Math.round(totalCost * 100) / 100,
      dailyCosts,
      mealCosts,
    };
  }

  /**
   * Synchronous cost calculation (for backwards compatibility)
   * @deprecated Use calculateMenuCostWithAI for accurate AI-based pricing
   */
  static calculateMenuCost(meals: any[]): {
    totalCost: number;
    dailyCosts: Map<number, number>;
  } {
    const result = this.calculateMenuCostFallback(meals);
    return {
      totalCost: result.totalCost,
      dailyCosts: result.dailyCosts,
    };
  }

  /**
   * Validate menu cost against user's budget
   */
  static async validateMenuBudget(
    userId: string,
    meals: any[],
    daysCount: number,
  ): Promise<BudgetValidation> {
    const dailyBudget = await this.getUserDailyBudget(userId);
    const totalBudget = dailyBudget * daysCount;
    const { totalCost, dailyCosts } = this.calculateMenuCost(meals);

    const costBreakdown = Array.from(dailyCosts.entries()).map(
      ([day, cost]) => ({
        day,
        cost: Math.round(cost * 100) / 100,
      }),
    );

    const isWithinBudget = totalCost <= totalBudget;
    const overageAmount = isWithinBudget
      ? 0
      : Math.round((totalCost - totalBudget) * 100) / 100;

    return {
      isWithinBudget,
      totalCost,
      dailyBudget,
      totalBudget,
      overageAmount,
      costBreakdown,
    };
  }

  /**
   * Optimize menu to fit within budget by suggesting cheaper alternatives
   */
  static async optimizeMenuForBudget(
    meals: any[],
    targetBudget: number,
    currentCost: number,
  ): Promise<{ optimizedMeals: any[]; savings: number }> {
    const reductionNeeded = currentCost - targetBudget;
    if (reductionNeeded <= 0) {
      return { optimizedMeals: meals, savings: 0 };
    }

    console.log(
      `💰 Need to reduce menu cost by ₪${reductionNeeded.toFixed(2)}`,
    );

    // Sort meals by cost (highest first) and try to optimize
    const mealsWithCost = meals
      .map((meal) => {
        const { totalCost } = this.calculateMenuCost([meal]);
        return { meal, cost: totalCost };
      })
      .sort((a, b) => b.cost - a.cost);

    let totalSavings = 0;
    const optimizedMeals = mealsWithCost.map(({ meal }) => {
      // Simple optimization: reduce expensive ingredient quantities by 10-20%
      if (meal.ingredients && Array.isArray(meal.ingredients)) {
        meal.ingredients = meal.ingredients.map((ing: any) => {
          if (ing.estimated_cost && ing.estimated_cost > 5) {
            const reduction = Math.min(0.2, reductionNeeded / currentCost);
            const newQuantity = Math.round(
              (ing.quantity || 100) * (1 - reduction),
            );
            const savings = ing.estimated_cost * reduction;
            totalSavings += savings;
            return {
              ...ing,
              quantity: newQuantity,
              estimated_cost: ing.estimated_cost - savings,
            };
          }
          return ing;
        });
      }
      return meal;
    });

    console.log(`💵 Achieved savings of ₪${totalSavings.toFixed(2)}`);
    return { optimizedMeals, savings: Math.round(totalSavings * 100) / 100 };
  }

  static async generatePersonalizedMenu(params: GenerateMenuParams) {
    try {
      console.log("🎯 Generating personalized menu for user:", params.userId);

      // Get user's daily budget for menu generation
      const userBudget =
        params.budget || (await this.getUserDailyBudget(params.userId));
      console.log(`💰 User daily budget: ₪${userBudget}`);

      // Get comprehensive user context for maximum personalization
      const userContext = await UserContextService.getComprehensiveContext(
        params.userId,
      );

      // Get user's questionnaire for personalization
      const questionnaire = await prisma.userQuestionnaire.findFirst({
        where: { user_id: params.userId },
        orderBy: { date_completed: "desc" },
      });

      if (!questionnaire) {
        throw new Error(
          "User questionnaire not found. Please complete the questionnaire first.",
        );
      }

      // Get user's nutrition goals
      const nutritionPlan = await prisma.nutritionPlan.findFirst({
        where: { user_id: params.userId },
        orderBy: { created_at: "desc" },
      });

      // Calculate dynamic targets based on user context
      const dynamicTargets = this.calculateDynamicTargets(
        userContext,
        nutritionPlan,
      );

      // Fetch the most recent menu review so the AI can learn from past feedback
      const latestReview = await prisma.menuReview.findFirst({
        where: { user_id: params.userId },
        orderBy: { created_at: "desc" },
      });

      const paramsWithReview: GenerateMenuParams = {
        ...params,
        ...(latestReview && {
          previousReview: {
            rating: latestReview.rating ?? 0,
            liked: latestReview.liked,
            disliked: latestReview.disliked,
            suggestions: latestReview.suggestions,
            wouldRecommend: latestReview.would_recommend ?? false,
          },
        }),
      };

      // Generate menu using AI with comprehensive context or fallback
      const menuData = await this.generateMenuWithAI(
        paramsWithReview,
        questionnaire,
        nutritionPlan,
        userContext,
        dynamicTargets,
      );

      // Save to database with context metadata
      const savedMenu = await this.saveMenuToDatabase(
        params.userId,
        menuData,
        params.days || 7,
        userContext,
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
    nutritionPlan: any,
  ): {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    water: number;
    adjustmentReason: string;
  } {
    const baseCalories =
      nutritionPlan?.goal_calories || context.goals.dailyCalories;
    const baseProtein =
      nutritionPlan?.goal_protein_g || context.goals.dailyProtein;
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
    if (
      context.performance.caloriesTrend === "increasing" &&
      context.profile.mainGoal === "lose_weight"
    ) {
      calorieMultiplier *= 0.97;
      adjustmentReason += "Slight reduction to support weight loss goal. ";
    } else if (
      context.performance.caloriesTrend === "decreasing" &&
      context.profile.mainGoal === "gain_muscle"
    ) {
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
      adjustmentReason:
        adjustmentReason || "Standard targets based on your profile.",
    };
  }

  static async generateCustomMenu(params: GenerateMenuParams) {
    try {
      console.log("🎨 Generating custom menu for user:", params.userId);

      // Get comprehensive user context for personalization
      const userContext = await UserContextService.getComprehensiveContext(
        params.userId,
      );

      // Get user context
      const questionnaire = await prisma.userQuestionnaire.findFirst({
        where: { user_id: params.userId },
        orderBy: { date_completed: "desc" },
      });

      if (!questionnaire) {
        throw new Error(
          "User questionnaire not found. Please complete the questionnaire first.",
        );
      }

      // Get nutrition plan for targets
      const nutritionPlan = await prisma.nutritionPlan.findFirst({
        where: { user_id: params.userId },
        orderBy: { created_at: "desc" },
      });

      // Calculate dynamic targets
      const dynamicTargets = this.calculateDynamicTargets(
        userContext,
        nutritionPlan,
      );

      // Generate custom menu based on request with full context
      const menuData = await this.generateCustomMenuWithAI(
        params,
        questionnaire,
        userContext,
        dynamicTargets,
      );

      // Save to database
      const savedMenu = await this.saveMenuToDatabase(
        params.userId,
        menuData,
        params.days || 7,
        userContext,
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
    dynamicTargets?: {
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
      water: number;
      adjustmentReason: string;
    },
  ) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.log("⚠️ No OpenAI key, using fallback menu generation");
        return this.generateFallbackMenu(
          params,
          questionnaire,
          userContext,
          dynamicTargets,
        );
      }

      // Use enhanced prompt with full user context if available
      const prompt = userContext
        ? this.buildEnhancedMenuPrompt(
            params,
            questionnaire,
            nutritionPlan,
            userContext,
            dynamicTargets!,
          )
        : this.buildMenuGenerationPrompt(params, questionnaire, nutritionPlan);

      const aiResponse = await OpenAIService.generateText(prompt, 2000);

      // Parse AI response
      const menuData = this.parseAIMenuResponse(aiResponse);
      return menuData;
    } catch (error) {
      console.log("⚠️ AI menu generation failed, using fallback");
      return this.generateFallbackMenu(
        params,
        questionnaire,
        userContext,
        dynamicTargets,
      );
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
    dynamicTargets: {
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
      water: number;
      adjustmentReason: string;
    },
  ): string {
    const {
      profile,
      performance,
      mealPatterns,
      streaks,
      healthInsights,
      achievements,
    } = context;

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
🥩 Protein: ${dynamicTargets.protein}g (${Math.round(((dynamicTargets.protein * 4) / dynamicTargets.calories) * 100)}% of calories)
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

${params.previousReview ? `=== PREVIOUS MENU FEEDBACK ===
Rating: ${params.previousReview.rating}/5 stars
What they liked: ${params.previousReview.liked || "Not specified"}
What they disliked: ${params.previousReview.disliked || "Not specified"}
Suggestions for improvement: ${params.previousReview.suggestions || "None"}
Would recommend: ${params.previousReview.wouldRecommend ? "Yes" : "No"}
→ IMPORTANT: Use this feedback to improve this new menu. Include more of what they liked, avoid what they disliked, and act on their suggestions.

` : ""}=== PERSONALIZATION INSTRUCTIONS ===
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
    dynamicTargets?: {
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
      water: number;
      adjustmentReason: string;
    },
  ) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.log("⚠️ No OpenAI key, using fallback custom menu");
        return this.generateFallbackCustomMenu(
          params,
          questionnaire,
          userContext,
          dynamicTargets,
        );
      }

      // Use enhanced prompt with context if available
      const prompt =
        userContext && dynamicTargets
          ? this.buildEnhancedCustomMenuPrompt(
              params,
              questionnaire,
              userContext,
              dynamicTargets,
            )
          : this.buildCustomMenuPrompt(params, questionnaire);

      const aiResponse = await OpenAIService.generateText(prompt, 2000);

      // Parse AI response
      const menuData = this.parseAIMenuResponse(aiResponse);
      return menuData;
    } catch (error) {
      console.log("⚠️ AI custom menu generation failed, using fallback");
      return this.generateFallbackCustomMenu(
        params,
        questionnaire,
        userContext,
        dynamicTargets,
      );
    }
  }

  /**
   * Build enhanced custom menu prompt with full user context
   */
  private static buildEnhancedCustomMenuPrompt(
    params: GenerateMenuParams,
    questionnaire: any,
    context: ComprehensiveUserContext,
    dynamicTargets: {
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
      water: number;
      adjustmentReason: string;
    },
  ): string {
    const { profile, performance, mealPatterns, streaks, healthInsights } =
      context;

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
    nutritionPlan: any,
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
    questionnaire: any,
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

  private static async generateFallbackMenu(
    params: GenerateMenuParams,
    questionnaire: any,
    userContext?: ComprehensiveUserContext,
    dynamicTargets?: {
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
      water: number;
      adjustmentReason: string;
    },
  ) {
    const days = params.days || 7;
    const mealsPerDay = this.getMealsPerDayCount(
      params.mealsPerDay || "3_main",
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
        calories: isWeightLoss
          ? Math.round(caloriesPerMeal * 0.85)
          : caloriesPerMeal,
        protein: isMuscleGain
          ? Math.round(proteinPerMeal * 1.1)
          : proteinPerMeal,
        carbs: isWeightLoss ? 12 : 18,
        fat: isWeightLoss ? 15 : 20,
        fiber: 3,
        prep_time_minutes: 15,
        cooking_method: "Pan frying",
        instructions:
          "Scramble eggs with vegetables and serve with whole grain toast",
        ingredients: [
          {
            name: "eggs",
            quantity: isMuscleGain ? 3 : 2,
            unit: "piece",
            category: "protein",
          },
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
        protein: isMuscleGain
          ? Math.round(proteinPerMeal * 1.2)
          : proteinPerMeal,
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
          {
            name: "olive oil",
            quantity: isWeightLoss ? 10 : 15,
            unit: "ml",
            category: "fat",
          },
        ],
      },
      {
        name: "Baked Salmon with Quinoa",
        meal_type: "DINNER",
        calories: Math.round(caloriesPerMeal * 1.1),
        protein: isMuscleGain
          ? Math.round(proteinPerMeal * 1.15)
          : proteinPerMeal,
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
          {
            name: "quinoa",
            quantity: isWeightLoss ? 60 : 80,
            unit: "g",
            category: "grain",
          },
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
          {
            name: "Greek yogurt",
            quantity: 200,
            unit: "g",
            category: "protein",
          },
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
          {
            name: "protein powder",
            quantity: 30,
            unit: "g",
            category: "protein",
          },
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
        const templateMeal =
          fallbackMeals.find((m) => m.meal_type === mealType) ||
          fallbackMeals[mealIndex % fallbackMeals.length];

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

    // Calculate actual estimated cost from ingredients using AI
    const { totalCost, dailyCosts, mealCosts } =
      await this.calculateMenuCostWithAI(meals);
    const dailyBudget =
      params.budget || (await this.getUserDailyBudget(params.userId));
    const totalBudget = dailyBudget * days;

    // Log budget status
    console.log(
      `💰 AI Menu cost: ₪${totalCost.toFixed(2)} / Budget: ₪${totalBudget.toFixed(2)}`,
    );
    if (totalCost > totalBudget) {
      console.warn(
        `⚠️ Menu exceeds budget by ₪${(totalCost - totalBudget).toFixed(2)}`,
      );
    }

    const goal =
      userContext?.profile.mainGoal || questionnaire.main_goal || "health";
    const adjustmentNote = dynamicTargets?.adjustmentReason || "";
    const budgetNote =
      totalCost <= totalBudget
        ? `Within budget (₪${totalCost.toFixed(0)}/${totalBudget.toFixed(0)})`
        : `Over budget by ₪${(totalCost - totalBudget).toFixed(0)}`;

    return {
      title: `Personalized ${days}-Day Menu for ${goal}`,
      description: `Customized meal plan with ${dynamicTargets?.calories || 2000}kcal daily target. ${adjustmentNote} ${budgetNote}`,
      total_calories: totalCalories,
      total_protein: totalProtein,
      total_carbs: totalCarbs,
      total_fat: totalFat,
      days_count: days,
      estimated_cost: totalCost,
      daily_budget: dailyBudget,
      total_budget: totalBudget,
      is_within_budget: totalCost <= totalBudget,
      daily_cost_breakdown: Array.from(dailyCosts.entries()).map(
        ([day, cost]) => ({ day, cost }),
      ),
      meals,
    };
  }

  private static generateFallbackCustomMenu(
    params: GenerateMenuParams,
    questionnaire: any,
    userContext?: ComprehensiveUserContext,
    dynamicTargets?: {
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
      water: number;
      adjustmentReason: string;
    },
  ) {
    // Similar to fallback menu but customized based on the request
    const customizedMeals = this.customizeMealsBasedOnRequest(
      params.customRequest || "",
      questionnaire,
    );

    return this.generateFallbackMenu(
      { ...params, customRequest: undefined },
      questionnaire,
      userContext,
      dynamicTargets,
    );
  }

  private static customizeMealsBasedOnRequest(
    request: string,
    questionnaire: any,
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
    userContext?: ComprehensiveUserContext,
  ) {
    try {
      console.log("💾 Saving menu to database...");

      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + daysCount);

      // Determine dietary category based on user context
      let dietaryCategory = menuData.dietary_category || "BALANCED";
      if (userContext) {
        if (userContext.profile.dietaryStyle === "vegetarian")
          dietaryCategory = "VEGETARIAN";
        else if (userContext.profile.dietaryStyle === "vegan")
          dietaryCategory = "VEGAN";
        else if (userContext.profile.mainGoal === "lose_weight")
          dietaryCategory = "LOW_CALORIE";
        else if (userContext.profile.mainGoal === "gain_muscle")
          dietaryCategory = "HIGH_PROTEIN";
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

        // Save ingredients with AI-estimated costs
        if (meal.ingredients && Array.isArray(meal.ingredients)) {
          // Get AI pricing for all ingredients in this meal
          let ingredientCostsMap = new Map<string, number>();
          try {
            const mealPriceEstimate = await OpenAIService.estimateMealPriceWithAI(
              meal.ingredients.map((ing: any) => ({
                name: ing.name,
                quantity: ing.quantity || 100,
                unit: ing.unit || "g",
                category: ing.category || "other",
              }))
            );
            for (const ic of mealPriceEstimate.ingredient_costs) {
              ingredientCostsMap.set(ic.name.toLowerCase(), ic.estimated_cost);
            }
          } catch (error) {
            console.warn("⚠️ AI ingredient pricing failed, using fallback");
          }

          const ingredientPromises = meal.ingredients.map((ingredient: any) => {
            // Use AI-estimated cost, then fall back to local pricing
            const ingredientCost =
              ingredientCostsMap.get(ingredient.name.toLowerCase()) ||
              ingredient.estimated_cost ||
              estimateIngredientPrice(
                ingredient.name,
                ingredient.quantity || 100,
                ingredient.unit || "g",
                ingredient.category || "other",
              ).estimated_price;

            return prisma.recommendedIngredient.create({
              data: {
                meal_id: savedMeal.meal_id,
                name: ingredient.name,
                quantity: ingredient.quantity || 1,
                unit: ingredient.unit || "piece",
                category: ingredient.category || "other",
                estimated_cost: ingredientCost,
              },
            });
          });

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

  /**
   * Get AI-generated meal alternatives for a given meal
   */
  static async getMealAlternatives(
    originalMeal: any,
    questionnaire: any,
    count: number = 3,
    language: string = "en",
  ): Promise<any[]> {
    try {
      console.log("🔄 Generating meal alternatives for:", originalMeal.name, "in language:", language);

      // Determine language instructions
      const isHebrew = language === "he" || language === "Hebrew";
      const languageInstruction = isHebrew
        ? "IMPORTANT: Generate ALL text content (meal names, cooking methods, ingredient names, match reasons) in HEBREW. Use Hebrew food names and descriptions."
        : "Generate all content in English.";
      const matchReasonOptions = isHebrew
        ? '["תזונה דומה", "עשיר בחלבון", "הכנה מהירה", "מנחם ונעים"]'
        : '["Similar nutrition", "Higher protein", "Quick preparation", "Comfort option"]';

      // Try AI-based generation first
      if (process.env.OPENAI_API_KEY) {
        try {
          const prompt = `Generate ${count} alternative meals to replace "${originalMeal.name}" (${originalMeal.meal_type}).

${languageInstruction}

Original meal has approximately ${originalMeal.calories} calories, ${originalMeal.protein} protein, ${originalMeal.carbs} carbs, ${originalMeal.fat} fat.
Dietary style: ${questionnaire?.dietary_style || "Balanced"}. Allergies: ${questionnaire?.allergies?.join(", ") || "None"}. Dislikes: ${questionnaire?.disliked_foods?.join(", ") || "None"}. Likes: ${questionnaire?.liked_foods?.join(", ") || "None"}.

Requirements:
- Similar nutritional values (within 15% of original)
- One higher protein option, one quicker option, one comfort option
- Respect allergies and dietary restrictions

CRITICAL RULES FOR JSON OUTPUT:
- All numeric fields (calories, protein, carbs, fat, prep_time_minutes, quantity) must be plain numbers WITHOUT units. Write 25 not 25g. Write 350 not 350kcal.
- Return ONLY a valid JSON array. No extra text before or after.
- No comments, no trailing commas.
- ${languageInstruction}

[{"meal_id":"alt_1","name":"Example Meal","calories":350,"protein":25,"carbs":40,"fat":12,"prep_time_minutes":20,"cooking_method":"Grilling","match_reason":"Similar nutrition","ingredients":[{"name":"chicken breast","quantity":150,"unit":"g"}]}]

match_reason must be one of: ${matchReasonOptions}.
Return ${count} meals in the array.`;

          const aiResponse = await OpenAIService.generateText(prompt, 1500);
          const parsed = this.parseAIAlternativesResponse(aiResponse);
          if (parsed && parsed.length > 0) {
            return parsed.map((alt: any, index: number) => ({
              ...alt,
              meal_id: `alt_${Date.now()}_${index}`,
            }));
          }
        } catch (aiError) {
          console.warn("⚠️ AI alternatives generation failed, using fallback");
        }
      }

      // Fallback: Generate alternatives based on meal type
      return this.generateFallbackAlternatives(originalMeal, count, language);
    } catch (error) {
      console.error("💥 Error generating meal alternatives:", error);
      return this.generateFallbackAlternatives(originalMeal, count, language);
    }
  }

  private static cleanAIJson(text: string): string {
    let cleaned = text;
    // Remove trailing commas before } or ]
    cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
    // Remove single-line comments
    cleaned = cleaned.replace(/\/\/[^\n]*/g, "");
    // Remove control characters (except newlines/tabs needed for structure)
    cleaned = cleaned.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
    // Fix unquoted property names (e.g., name: "value" -> "name": "value")
    cleaned = cleaned.replace(/([{,])\s*([a-zA-Z_]\w*)\s*:/g, '$1"$2":');
    // Strip unit suffixes from numeric values (e.g., 25g -> 25, 350kcal -> 350)
    cleaned = cleaned.replace(/:\s*(\d+\.?\d*)\s*[a-zA-Z]+\s*([,}\]\n\r])/g, ": $1$2");
    // Replace single quotes with double quotes
    cleaned = cleaned.replace(/'/g, '"');
    return cleaned;
  }

  private static parseAIAlternativesResponse(response: string): any[] | null {
    console.log("🔍 Raw AI alternatives response:", response.substring(0, 500));

    try {
      let cleaned = response.trim();

      // Remove markdown code blocks
      if (cleaned.includes("```")) {
        cleaned = cleaned.replace(/```json\s*/g, "").replace(/```\s*/g, "");
      }

      // Extract JSON array
      const jsonStart = cleaned.indexOf("[");
      const jsonEnd = cleaned.lastIndexOf("]");

      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        console.error("No JSON array found in AI response");
        return null;
      }

      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
      cleaned = this.cleanAIJson(cleaned);

      return JSON.parse(cleaned);
    } catch (error) {
      console.error("Failed to parse AI alternatives (attempt 1):", error);
      // Try one more aggressive cleanup attempt
      try {
        let text = response;
        const start = text.indexOf("[");
        const end = text.lastIndexOf("]");
        if (start !== -1 && end !== -1) {
          text = text.substring(start, end + 1);
          text = this.cleanAIJson(text);
          // Also try to fix values wrapped in quotes that should be numbers
          text = text.replace(/"(\d+\.?\d*)"/g, "$1");
          return JSON.parse(text);
        }
      } catch (error2) {
        console.error("Failed to parse AI alternatives (attempt 2):", error2);
      }
      return null;
    }
  }

  private static generateFallbackAlternatives(
    originalMeal: any,
    count: number,
    language: string = "en",
  ): any[] {
    const mealType = originalMeal.meal_type?.toUpperCase() || "LUNCH";
    const isHebrew = language === "he" || language === "Hebrew";

    // Define templates with both English and Hebrew names
    const getTemplate = (en: string, he: string, method_en: string, method_he: string, reason_en: string, reason_he: string) => ({
      name: isHebrew ? he : en,
      cooking_method: isHebrew ? method_he : method_en,
      match_reason: isHebrew ? reason_he : reason_en,
    });

    const alternativeTemplates: Record<string, any[]> = {
      BREAKFAST: [
        {
          ...getTemplate("Overnight Oats with Berries", "שיבולת שועל לילה עם פירות יער", "No-cook", "ללא בישול", "Similar nutrition", "תזונה דומה"),
          calories: Math.round(originalMeal.calories * 0.95),
          protein: Math.round(originalMeal.protein * 0.9),
          carbs: Math.round(originalMeal.carbs * 1.1),
          fat: Math.round(originalMeal.fat * 0.85),
          prep_time_minutes: 5,
        },
        {
          ...getTemplate("High-Protein Omelet", "חביתה עשירה בחלבון", "Pan-frying", "טיגון במחבת", "Higher protein", "עשיר בחלבון"),
          calories: Math.round(originalMeal.calories * 0.85),
          protein: Math.round(originalMeal.protein * 1.3),
          carbs: Math.round(originalMeal.carbs * 0.5),
          fat: Math.round(originalMeal.fat * 1.1),
          prep_time_minutes: 12,
        },
        {
          ...getTemplate("Protein Smoothie Bowl", "קערת שייק חלבון", "Blending", "ערבוב בבלנדר", "Quick preparation", "הכנה מהירה"),
          calories: Math.round(originalMeal.calories * 1.05),
          protein: Math.round(originalMeal.protein * 1.1),
          carbs: Math.round(originalMeal.carbs * 1.2),
          fat: Math.round(originalMeal.fat * 0.7),
          prep_time_minutes: 8,
        },
      ],
      LUNCH: [
        {
          ...getTemplate("Mediterranean Grain Bowl", "קערת דגנים ים תיכונית", "Assembly", "הרכבה", "Similar nutrition", "תזונה דומה"),
          calories: Math.round(originalMeal.calories * 0.95),
          protein: Math.round(originalMeal.protein * 0.95),
          carbs: Math.round(originalMeal.carbs * 1.05),
          fat: Math.round(originalMeal.fat * 0.9),
          prep_time_minutes: 20,
        },
        {
          ...getTemplate("Grilled Chicken Protein Bowl", "קערת עוף צלוי עשירה בחלבון", "Grilling", "צלייה על האש", "Higher protein", "עשיר בחלבון"),
          calories: Math.round(originalMeal.calories * 1.0),
          protein: Math.round(originalMeal.protein * 1.25),
          carbs: Math.round(originalMeal.carbs * 0.85),
          fat: Math.round(originalMeal.fat * 0.95),
          prep_time_minutes: 25,
        },
        {
          ...getTemplate("Quick Wrap & Soup Combo", "טורטייה ומרק מהיר", "Quick assembly", "הרכבה מהירה", "Quick preparation", "הכנה מהירה"),
          calories: Math.round(originalMeal.calories * 0.9),
          protein: Math.round(originalMeal.protein * 0.9),
          carbs: Math.round(originalMeal.carbs * 0.95),
          fat: Math.round(originalMeal.fat * 0.85),
          prep_time_minutes: 10,
        },
      ],
      DINNER: [
        {
          ...getTemplate("Baked Fish with Vegetables", "דג אפוי עם ירקות", "Baking", "אפייה בתנור", "Similar nutrition", "תזונה דומה"),
          calories: Math.round(originalMeal.calories * 0.9),
          protein: Math.round(originalMeal.protein * 1.1),
          carbs: Math.round(originalMeal.carbs * 0.7),
          fat: Math.round(originalMeal.fat * 0.85),
          prep_time_minutes: 35,
        },
        {
          ...getTemplate("Lean Beef Stir-Fry", "מוקפץ בקר רזה", "Stir-frying", "טיגון מהיר בווק", "Higher protein", "עשיר בחלבון"),
          calories: Math.round(originalMeal.calories * 0.95),
          protein: Math.round(originalMeal.protein * 1.2),
          carbs: Math.round(originalMeal.carbs * 0.9),
          fat: Math.round(originalMeal.fat * 0.95),
          prep_time_minutes: 25,
        },
        {
          ...getTemplate("One-Pan Sheet Dinner", "ארוחה במגש אחד", "Sheet pan roasting", "צלייה במגש", "Quick preparation", "הכנה מהירה"),
          calories: Math.round(originalMeal.calories * 1.0),
          protein: Math.round(originalMeal.protein * 0.95),
          carbs: Math.round(originalMeal.carbs * 1.05),
          fat: Math.round(originalMeal.fat * 1.05),
          prep_time_minutes: 15,
        },
      ],
      SNACK: [
        {
          ...getTemplate("Greek Yogurt with Nuts", "יוגורט יווני עם אגוזים", "No-cook", "ללא בישול", "Higher protein", "עשיר בחלבון"),
          calories: Math.round(originalMeal.calories * 0.95),
          protein: Math.round(originalMeal.protein * 1.2),
          carbs: Math.round(originalMeal.carbs * 0.8),
          fat: Math.round(originalMeal.fat * 1.1),
          prep_time_minutes: 2,
        },
        {
          ...getTemplate("Fruit & Cottage Cheese", "פירות וגבינת קוטג'", "No-cook", "ללא בישול", "Similar nutrition", "תזונה דומה"),
          calories: Math.round(originalMeal.calories * 0.9),
          protein: Math.round(originalMeal.protein * 1.1),
          carbs: Math.round(originalMeal.carbs * 1.1),
          fat: Math.round(originalMeal.fat * 0.7),
          prep_time_minutes: 3,
        },
        {
          ...getTemplate("Protein Energy Bites", "כדורי אנרגיה מחלבון", "Grab & go", "קח ולך", "Quick preparation", "הכנה מהירה"),
          calories: Math.round(originalMeal.calories * 1.05),
          protein: Math.round(originalMeal.protein * 1.0),
          carbs: Math.round(originalMeal.carbs * 1.1),
          fat: Math.round(originalMeal.fat * 0.9),
          prep_time_minutes: 0,
        },
      ],
    };

    const templates = alternativeTemplates[mealType] || alternativeTemplates.LUNCH;
    return templates.slice(0, count).map((alt, index) => ({
      ...alt,
      meal_id: `alt_${Date.now()}_${index}`,
      ingredients: [],
    }));
  }

  static async replaceMeal(
    userId: string,
    menuId: string,
    mealId: string,
    preferences: any,
    language: string = "en",
  ) {
    try {
      console.log("🔄 === MEAL SWAP STARTED ===");
      console.log("🔄 Menu ID:", menuId);
      console.log("🔄 Meal ID to replace:", mealId);
      console.log("🔄 Language:", language);
      console.log("🔄 Preferences:", JSON.stringify(preferences, null, 2));

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
        console.error("❌ Current meal not found!");
        throw new Error("Meal not found");
      }

      console.log("📋 Current meal found:", currentMeal.name);

      // Generate replacement meal with language support (ALWAYS uses AI)
      console.log("🤖 Calling AI to generate replacement...");
      const replacementMeal = await this.generateReplacementMeal(
        currentMeal,
        preferences,
        userId,
        language,
      );

      console.log("✅ AI generated replacement:", replacementMeal.name);

      // Ensure instructions is a string (AI might return array)
      const instructionsStr = Array.isArray(replacementMeal.instructions)
        ? replacementMeal.instructions.join("\n")
        : (replacementMeal.instructions || "");

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
          instructions: instructionsStr,
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

      console.log("🎉 === MEAL SWAP COMPLETED ===");
      console.log("✅ Old meal:", currentMeal.name);
      console.log("✅ New meal:", updatedMeal.name);
      return updatedMeal;
    } catch (error) {
      console.error("💥 === MEAL SWAP FAILED ===");
      console.error("💥 Error:", error);
      throw error;
    }
  }

  private static async generateReplacementMeal(
    currentMeal: any,
    preferences: any,
    userId: string,
    language: string = "en",
  ) {
    console.log("🤖 generateReplacementMeal called:", {
      currentMealName: currentMeal.name,
      alternativeName: preferences?.alternativeName,
      selectedAlternativeId: preferences?.selectedAlternativeId,
      language,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    });

    // Determine language
    const isHebrew = language === "he" || language === "Hebrew";
    const languageInstruction = isHebrew
      ? "IMPORTANT: Generate ALL text content (meal name, cooking method, instructions, ingredient names) in HEBREW. Use Hebrew food names and descriptions."
      : "Generate all content in English.";

    // Get user questionnaire for dietary preferences
    const questionnaire = await prisma.userQuestionnaire.findFirst({
      where: { user_id: userId },
    });

    // Extract values from preferences
    const alternativeName = preferences?.alternativeName || currentMeal.name;
    const targetCalories = preferences?.targetCalories || currentMeal.calories;
    const targetProtein = preferences?.targetProtein || currentMeal.protein;
    const targetCarbs = preferences?.targetCarbs || currentMeal.carbs;
    const targetFat = preferences?.targetFat || currentMeal.fat;
    const prepTime = preferences?.prepTime || currentMeal.prep_time_minutes || 25;
    const cookingMethod = preferences?.cookingMethod || currentMeal.cooking_method || "Standard preparation";

    // ALWAYS try AI first
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ OPENAI_API_KEY is not set!");
      throw new Error("OpenAI API key is not configured");
    }

    console.log("🚀 Calling OpenAI to generate replacement meal:", alternativeName);

    const prompt = `Generate a detailed recipe for "${alternativeName}" (${currentMeal.meal_type}).

${languageInstruction}

You MUST generate this exact meal: "${alternativeName}"

Nutrition targets:
- Calories: ${targetCalories}
- Protein: ${targetProtein}g
- Carbs: ${targetCarbs}g
- Fat: ${targetFat}g

User profile:
- Dietary style: ${questionnaire?.dietary_style || "Balanced"}
- Allergies: ${questionnaire?.allergies?.join(", ") || "None"}
- Dislikes: ${questionnaire?.disliked_foods?.join(", ") || "None"}

Prep time: ${prepTime} minutes
Cooking method: ${cookingMethod}

Return ONLY valid JSON with this exact structure (no markdown, no comments):
{"name":"meal name","calories":${targetCalories},"protein":${targetProtein},"carbs":${targetCarbs},"fat":${targetFat},"fiber":5,"prep_time_minutes":${prepTime},"cooking_method":"cooking method description","instructions":"Step 1: ... Step 2: ... Step 3: ...","ingredients":[{"name":"ingredient name","quantity":100,"unit":"g","category":"protein"}]}`;

    try {
      const aiResponse = await OpenAIService.generateText(prompt, 1500);
      console.log("✅ AI response received, length:", aiResponse.length);

      let cleaned = aiResponse.trim();

      // Remove markdown code blocks if present
      if (cleaned.includes("```")) {
        cleaned = cleaned.replace(/```json\s*/g, "").replace(/```\s*/g, "");
      }

      // Extract JSON object
      const objStart = cleaned.indexOf("{");
      const objEnd = cleaned.lastIndexOf("}");

      if (objStart === -1 || objEnd === -1) {
        console.error("❌ No JSON object found in AI response:", cleaned.substring(0, 200));
        throw new Error("AI did not return valid JSON");
      }

      cleaned = cleaned.substring(objStart, objEnd + 1);
      cleaned = this.cleanAIJson(cleaned);

      const parsed = JSON.parse(cleaned);

      if (!parsed.name || !parsed.calories) {
        console.error("❌ Parsed JSON missing required fields:", parsed);
        throw new Error("AI response missing required fields");
      }

      // Ensure instructions is a string
      if (Array.isArray(parsed.instructions)) {
        parsed.instructions = parsed.instructions.join("\n");
      }

      console.log("✅ Successfully generated replacement meal:", parsed.name);
      return parsed;

    } catch (aiError: any) {
      console.error("❌ AI generation failed:", aiError.message);
      console.error("Full error:", aiError);

      // Instead of silent fallback, throw the error so user knows something went wrong
      throw new Error(`Failed to generate replacement meal: ${aiError.message}`);
    }
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
        params.originalMenu.days_count,
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
      0,
    );
    const totalProtein = enhancedMeals.reduce(
      (sum, meal) => sum + meal.protein,
      0,
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
    isFavorite: boolean,
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
    liked: boolean,
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
              estimated_cost: ingredient.estimated_cost || 0,
            });
          }
        });
      });

      // Get AI pricing for all aggregated ingredients
      const ingredientsForPricing = Array.from(ingredientMap.values()).map(
        (item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
        })
      );

      try {
        const aiPriceEstimate = await OpenAIService.estimateMealPriceWithAI(
          ingredientsForPricing
        );
        // Update costs with AI estimates
        for (const ic of aiPriceEstimate.ingredient_costs) {
          const key = ic.name.toLowerCase();
          if (ingredientMap.has(key)) {
            ingredientMap.get(key).estimated_cost = ic.estimated_cost;
          }
        }
        console.log(`💰 AI shopping list pricing complete`);
      } catch (error) {
        console.warn("⚠️ AI shopping list pricing failed, using stored costs");
        // Fall back to stored costs or local pricing
        for (const [key, item] of ingredientMap.entries()) {
          if (!item.estimated_cost || item.estimated_cost === 0) {
            item.estimated_cost = estimateIngredientPrice(
              item.name,
              item.quantity || 100,
              item.unit || "g",
              item.category || "other"
            ).estimated_price;
          }
        }
      }

      const items = Array.from(ingredientMap.values());
      const totalCost = items.reduce(
        (sum, item) => sum + (item.estimated_cost || 0),
        0,
      );

      // Group by category for a smarter shopping experience
      const categoryMap = new Map<string, { items: typeof items; category_cost: number }>();
      for (const item of items) {
        const cat = (item.category || "other").toLowerCase();
        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, { items: [], category_cost: 0 });
        }
        const group = categoryMap.get(cat)!;
        group.items.push(item);
        group.category_cost += item.estimated_cost || 0;
      }

      const grouped_by_category = Object.fromEntries(
        Array.from(categoryMap.entries()).map(([cat, group]) => [
          cat,
          {
            items: group.items,
            category_cost: Math.round(group.category_cost * 100) / 100,
            item_count: group.items.length,
          },
        ]),
      );

      return {
        menu_id: menuId,
        items,
        grouped_by_category,
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
    menuId: string,
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
            completion.meal_type === meal.meal_type,
        ),
      ).length;

      const completionRate =
        totalMeals > 0 ? (completedMeals / totalMeals) * 100 : 0;

      const totalCalories = menu.meals.reduce(
        (sum, meal) => sum + meal.calories,
        0,
      );
      const totalProtein = menu.meals.reduce(
        (sum, meal) => sum + meal.protein,
        0,
      );
      const totalCarbs = menu.meals.reduce((sum, meal) => sum + meal.carbs, 0);
      const totalFat = menu.meals.reduce((sum, meal) => sum + meal.fat, 0);

      const avgCaloriesPerDay = totalCalories / menu.days_count;
      const avgProteinPerDay = totalProtein / menu.days_count;

      const dailyBreakdown = Array.from({ length: menu.days_count }).map(
        (_, dayIndex) => {
          const dayNumber = dayIndex + 1;
          const dayMeals = menu.meals.filter(
            (meal) => meal.day_number === dayNumber,
          );

          const dayCompletedMeals = dayMeals.filter((meal) =>
            mealCompletions.some(
              (completion) =>
                completion.day_number === meal.day_number &&
                completion.meal_type === meal.meal_type,
            ),
          ).length;

          const dayCalories = dayMeals.reduce(
            (sum, meal) => sum + meal.calories,
            0,
          );
          const dayProtein = dayMeals.reduce(
            (sum, meal) => sum + meal.protein,
            0,
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
        },
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
