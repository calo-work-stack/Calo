import { prisma } from "../../lib/database";
import { DatabaseOptimizationService } from "./optimization";
import { OpenAIService } from "../openai";
import {
  DailyRecommendation,
  AIRecommendationResponse,
} from "../../types/recommendations";
import { StatisticsService } from "../statistics";
import { UserContextService, ComprehensiveUserContext } from "../userContext";
export interface RecommendationCreationResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export class EnhancedAIRecommendationService {
  /**
   * Generate AI recommendations for all eligible users
   */
  static async generateRecommendationsForAllUsers(): Promise<RecommendationCreationResult> {
    console.log("🤖 Starting enhanced AI recommendations generation...");

    const result: RecommendationCreationResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    try {
      const today = new Date().toISOString().split("T")[0];

      // Get all users with signup date
      const users = await prisma.user.findMany({
        select: {
          user_id: true,
          subscription_type: true,
          signup_date: true,
        },
      });

      console.log(`🎯 Found ${users.length} users to process.`);

      if (users.length === 0) {
        console.log("📝 No users found for AI recommendations.");
        return result;
      }

      // Process users in smaller batches
      const batchSize = 5;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (user) => {
            try {
              // Import plan limits
              const { shouldCreateAIRecommendationToday } = await import(
                "../../config/planLimits"
              );

              // Check if user is eligible based on their tier
              if (
                !shouldCreateAIRecommendationToday(
                  user.subscription_type,
                  user.signup_date
                )
              ) {
                result.skipped++;
                console.log(
                  `⏭️ Skipped user ${user.user_id} - tier not eligible for AI recommendations today.`
                );
                return;
              }

              // Double-check for duplicates
              const duplicateCheck =
                await DatabaseOptimizationService.checkForDuplicates(
                  user.user_id,
                  today
                );

              if (duplicateCheck.hasRecommendation) {
                result.skipped++;
                console.log(
                  `⏭️ Skipped user ${user.user_id} - recommendation already exists`
                );
                return;
              }

              // Check if user logged any meals yesterday - if not, keep previous recommendation
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStart = new Date(yesterday);
              yesterdayStart.setHours(0, 0, 0, 0);
              const yesterdayEnd = new Date(yesterday);
              yesterdayEnd.setHours(23, 59, 59, 999);

              const yesterdayMealCount = await prisma.meal.count({
                where: {
                  user_id: user.user_id,
                  created_at: {
                    gte: yesterdayStart,
                    lte: yesterdayEnd,
                  },
                },
              });

              if (yesterdayMealCount === 0) {
                result.skipped++;
                console.log(
                  `⏭️ Skipped user ${user.user_id} - no meals logged yesterday, keeping previous recommendation`
                );
                return;
              }

              // Generate personalized recommendations
              const recommendation =
                await this.generatePersonalizedRecommendation(
                  user.user_id,
                  // Assuming questionnaire data can be fetched here if needed,
                  // or passed if available in the user object.
                  // For now, let's assume it's fetched within generatePersonalizedRecommendation.
                  null // Placeholder, as questionnaire is not directly fetched here.
                );

              if (recommendation) {
                result.created++;
                console.log(
                  `✅ Generated recommendation for user: ${user.user_id}`
                );
              }
            } catch (error) {
              result.errors.push(
                `User ${user.user_id}: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`
              );
              console.error(
                `❌ Failed to generate recommendation for user ${user.user_id}:`,
                error
              );
            }
          })
        );

        // Delay between batches to be respectful to API limits
        if (i + batchSize < users.length) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      console.log(`✅ AI recommendations generation completed:`, result);
      return result;
    } catch (error) {
      console.error("💥 Error in AI recommendations generation:", error);
      result.errors.push(
        error instanceof Error ? error.message : "Unknown error"
      );
      return result;
    }
  }

  /**
   * Generate daily recommendations for a specific user
   */
  static async generateDailyRecommendations(
    userId: string
  ): Promise<DailyRecommendation> {
    try {
      console.log("🤖 Generating daily AI recommendations for user:", userId);

      // Get user's tier and signup date for eligibility check
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: {
          subscription_type: true,
          signup_date: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Import plan limits
      const { shouldCreateDailyGoals } = await import(
        "../../config/planLimits"
      );

      // Check if user is eligible for daily goals based on their tier
      if (!shouldCreateDailyGoals(user.subscription_type, user.signup_date)) {
        console.log(
          `⏭️ Skipping daily goals for user ${userId} - tier not eligible.`
        );
        // Return a default/empty recommendation if not eligible
        return this.getFallbackRecommendations(userId);
      }

      // Get user's recent performance (last 7 days)
      const recentStats = await StatisticsService.getNutritionStatistics(
        userId,
        "week"
      );

      // Get yesterday's performance specifically
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStart = new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate()
      );
      const yesterdayEnd = new Date(yesterdayStart);
      yesterdayEnd.setDate(yesterdayEnd.getDate() + 1);

      const yesterdayStats = await StatisticsService.getPeriodConsumption(
        userId,
        yesterdayStart,
        yesterdayEnd
      );
      const dailyGoals = await StatisticsService.getUserDailyGoals(userId);

      // Get user preferences and restrictions
      const userProfile = await this.getUserProfile(userId);

      // Generate AI recommendations
      const aiRecommendations = await this.callAIForRecommendations({
        userId,
        recentPerformance: recentStats.data,
        yesterdayConsumption: yesterdayStats,
        dailyGoals,
        userProfile,
      });

      // Save recommendations to database
      const savedRecommendation = await this.saveRecommendation(
        userId,
        aiRecommendations
      );

      console.log("✅ Daily recommendations generated and saved");
      return savedRecommendation;
    } catch (error) {
      console.error("💥 Error generating daily recommendations:", error);

      // Return fallback recommendations if AI fails or user is not eligible
      return this.getFallbackRecommendations(userId);
    }
  }

  /**
   * Get user profile for personalized recommendations
   */
  private static async getUserProfile(userId: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        include: {
          questionnaires: {
            orderBy: { date_completed: "desc" },
            take: 1,
          },
        },
      });

      const questionnaire = user?.questionnaires[0];

      return {
        dietary_preferences: questionnaire?.dietary_style
          ? [questionnaire.dietary_style]
          : [],
        health_conditions: questionnaire?.medical_conditions || [],
        main_goal: questionnaire?.main_goal || "WEIGHT_MAINTENANCE",
        activity_level: questionnaire?.physical_activity_level || "MODERATE",
        age: questionnaire?.age || 30,
        weight_kg: questionnaire?.weight_kg || 70,
        allergies: questionnaire?.allergies || [],
        restrictions: questionnaire?.dietary_restrictions || [],
      };
    } catch (error) {
      console.error("Error getting user profile:", error);
      return {
        dietary_preferences: [],
        health_conditions: [],
        main_goal: "WEIGHT_MAINTENANCE",
        activity_level: "MODERATE",
        age: 30,
        weight_kg: 70,
        allergies: [],
        restrictions: [],
      };
    }
  }

  /**
   * Call AI for recommendations generation
   */
  private static async callAIForRecommendations(
    data: any
  ): Promise<AIRecommendationResponse> {
    try {
      const prompt = `
You are a professional nutritionist AI assistant. Analyze the user's nutrition data and provide personalized daily recommendations.

USER DATA:
- Recent 7-day performance: ${JSON.stringify(data.recentPerformance, null, 2)}
- Yesterday's consumption: ${JSON.stringify(data.yesterdayConsumption, null, 2)}
- Daily goals: ${JSON.stringify(data.dailyGoals, null, 2)}
- User profile: ${JSON.stringify(data.userProfile, null, 2)}

ANALYSIS FOCUS:
1. Goal achievement patterns (under/over consumption)
2. Nutritional gaps or excesses
3. Consistency in eating habits
4. Areas for improvement

Provide recommendations in this JSON format:
{
  "nutrition_tips": ["tip1", "tip2", "tip3"],
  "meal_suggestions": ["suggestion1", "suggestion2"],
  "goal_adjustments": ["adjustment1", "adjustment2"],
  "behavioral_insights": ["insight1", "insight2"],
  "priority_level": "low|medium|high",
  "confidence_score": 0.85,
  "key_focus_areas": ["area1", "area2"]
}

Be specific, actionable, and encouraging. Focus on realistic improvements.
`;

      const response = await OpenAIService.generateText(prompt, 1500);
      return JSON.parse(response);
    } catch (error) {
      console.error("AI recommendation generation failed:", error);
      throw error;
    }
  }

  /**
   * Get fallback recommendations when AI fails
   */
  private static async getFallbackRecommendations(
    userId: string
  ): Promise<DailyRecommendation> {
    console.log("🆘 Using fallback recommendations");

    const fallbackRecommendations: AIRecommendationResponse = {
      nutrition_tips: [
        "Stay hydrated by drinking 8-10 glasses of water daily",
        "Include a variety of colorful vegetables in your meals",
        "Aim for lean protein sources like chicken, fish, or legumes",
      ],
      meal_suggestions: [
        "Start your day with a protein-rich breakfast",
        "Include fiber-rich foods to help you feel full longer",
      ],
      goal_adjustments: [
        "Track your meals consistently for better insights",
        "Focus on portion control for better goal achievement",
      ],
      behavioral_insights: [
        "Consistency in meal timing can improve your results",
        "Planning meals ahead helps maintain nutritional balance",
      ],
      priority_level: "medium",
      confidence_score: 0.6,
      key_focus_areas: ["hydration", "consistency"],
    };

    return this.saveRecommendation(userId, fallbackRecommendations);
  }

  /**
   * Generate personalized recommendation for a specific user
   * Uses comprehensive user context for intelligent personalization
   */
  private static async generatePersonalizedRecommendation(
    userId: string,
    questionnaire: any // This parameter might need to be fetched if not passed
  ): Promise<DailyRecommendation | null> {
    try {
      console.log(
        "🎯 Generating personalized recommendation for user:",
        userId
      );

      // Get comprehensive user context (cached for performance)
      const userContext = await UserContextService.getComprehensiveContext(userId);

      // Generate AI recommendations with full context
      const aiRecommendations = await this.generateContextualAIRecommendations(
        userId,
        userContext
      );

      // Save to database with enhanced metadata
      const savedRecommendation = await this.saveEnhancedRecommendation(
        userId,
        aiRecommendations,
        userContext
      );

      return savedRecommendation;
    } catch (error) {
      console.error("Error generating personalized recommendation:", error);

      // Create fallback recommendation
      return await this.createFallbackRecommendation(userId);
    }
  }

  /**
   * Generate AI recommendations using comprehensive user context
   */
  private static async generateContextualAIRecommendations(
    userId: string,
    context: ComprehensiveUserContext
  ): Promise<AIRecommendationResponse> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.log("⚠️ No OpenAI key, using intelligent fallback");
        return this.generateSmartFallbackRecommendations(context);
      }

      const prompt = this.buildComprehensivePrompt(context);
      const aiResponse = await OpenAIService.generateText(prompt, 1500, 0.7);

      // Parse AI response
      const parsed = JSON.parse(aiResponse);
      return this.validateAndNormalizeRecommendations(parsed);
    } catch (error) {
      console.error("AI recommendation generation failed:", error);
      return this.generateSmartFallbackRecommendations(context);
    }
  }

  /**
   * Build comprehensive prompt using full user context
   */
  private static buildComprehensivePrompt(context: ComprehensiveUserContext): string {
    const contextStr = UserContextService.buildPromptContext(context);

    return `You are an expert AI nutritionist providing HIGHLY PERSONALIZED daily recommendations.
Analyze ALL the user data below and generate specific, actionable recommendations.

${contextStr}

=== ANALYSIS REQUIREMENTS ===
1. ADAPT recommendations to user's specific goal (${context.profile.mainGoal})
2. ADJUST calorie/macro suggestions based on their TDEE (${context.healthInsights.estimatedTDEE}kcal) and goal
3. CONSIDER their performance trends (Calories: ${context.performance.caloriesTrend}, Protein: ${context.performance.proteinTrend})
4. REFERENCE their streaks to motivate (${context.streaks.currentDailyStreak} day streak)
5. NEVER suggest foods containing their allergies: ${context.profile.allergies.join(", ") || "None"}
6. RESPECT their dietary style: ${context.profile.dietaryStyle}
7. CONSIDER their near-complete achievements for motivation
8. ADDRESS any health status issues (Hydration: ${context.healthInsights.hydrationStatus}, Protein: ${context.healthInsights.proteinIntakeStatus})

=== SPECIFIC FOCUS AREAS ===
${context.performance.waterGoalAchievementRate < 0.7 ? "- User needs to increase WATER intake significantly" : ""}
${context.performance.proteinGoalAchievementRate < 0.8 ? "- User needs more PROTEIN to meet goals" : ""}
${context.performance.consistencyScore < 0.6 ? "- User struggles with CONSISTENCY - provide meal prep tips" : ""}
${context.recentActivity.todayMealsCount === 0 ? "- User hasn't logged any meals TODAY - encourage starting" : ""}
${context.streaks.currentDailyStreak >= 7 ? "- Celebrate their STREAK and encourage maintaining it" : ""}
${context.achievements.nearCompletion.length > 0 ? `- Mention they're close to unlocking: ${context.achievements.nearCompletion[0]?.name}` : ""}

=== DYNAMIC TARGETS (Personalized) ===
${this.calculateDynamicTargets(context)}

Provide recommendations in this EXACT JSON format:
{
  "nutrition_tips": [
    "Specific tip 1 with exact numbers based on their goals",
    "Specific tip 2 referencing their patterns",
    "Specific tip 3 addressing gaps"
  ],
  "meal_suggestions": [
    "Specific meal suggestion with portions tailored to their remaining ${context.recentActivity.remainingCalories}kcal",
    "Another suggestion considering their ${context.profile.dietaryStyle} preference"
  ],
  "goal_adjustments": [
    "Adjustment based on their ${context.performance.caloriesTrend} calorie trend",
    "Suggestion based on their ${Math.round(context.performance.overallGoalAchievementRate * 100)}% goal achievement"
  ],
  "behavioral_insights": [
    "Insight about their ${context.performance.bestPerformingDayOfWeek} vs ${context.performance.worstPerformingDayOfWeek} pattern",
    "Observation about their meal timing patterns"
  ],
  "water_recommendation": {
    "daily_target_ml": ${this.calculateOptimalWater(context)},
    "current_status": "${context.healthInsights.hydrationStatus}",
    "suggestion": "Specific hydration advice"
  },
  "calorie_recommendation": {
    "suggested_target": ${this.calculateOptimalCalories(context)},
    "reasoning": "Why this target suits their ${context.profile.mainGoal} goal"
  },
  "priority_level": "${this.determinePriority(context)}",
  "confidence_score": 0.85,
  "key_focus_areas": ["area1", "area2"],
  "personalized_motivation": "A motivating message mentioning their ${context.streaks.currentDailyStreak} day streak and Level ${context.achievements.currentLevel}"
}

Be SPECIFIC with numbers. Reference their ACTUAL data. Make it feel personally crafted for them.`;
  }

  /**
   * Calculate dynamic nutritional targets based on user context
   */
  private static calculateDynamicTargets(context: ComprehensiveUserContext): string {
    const { profile, healthInsights, performance, goals } = context;

    let calorieTarget = healthInsights.estimatedTDEE + healthInsights.recommendedDeficitOrSurplus;
    let proteinTarget = profile.weight * 1.6; // 1.6g per kg for active individuals
    let waterTarget = profile.weight * 35; // 35ml per kg

    // Adjust based on goal
    if (profile.mainGoal === "BUILD_MUSCLE" || profile.mainGoal === "WEIGHT_GAIN") {
      proteinTarget = profile.weight * 2.0;
      calorieTarget = healthInsights.estimatedTDEE + 300;
    } else if (profile.mainGoal === "WEIGHT_LOSS" || profile.mainGoal === "LOSE_WEIGHT") {
      calorieTarget = healthInsights.estimatedTDEE - 500;
      proteinTarget = profile.weight * 1.8; // Higher protein to preserve muscle
    }

    // Adjust based on activity
    if (profile.activityLevel === "VERY_ACTIVE" || profile.activityLevel === "HIGH") {
      waterTarget *= 1.2;
      calorieTarget *= 1.1;
    }

    return `
Recommended Calories: ${Math.round(calorieTarget)}kcal (TDEE ${healthInsights.estimatedTDEE} ${healthInsights.recommendedDeficitOrSurplus >= 0 ? "+" : ""}${healthInsights.recommendedDeficitOrSurplus})
Recommended Protein: ${Math.round(proteinTarget)}g (${(proteinTarget / profile.weight).toFixed(1)}g/kg body weight)
Recommended Water: ${Math.round(waterTarget)}ml
Current vs Target: Calories ${performance.avgDailyCalories}/${Math.round(calorieTarget)} | Protein ${performance.avgDailyProtein}/${Math.round(proteinTarget)}g`;
  }

  private static calculateOptimalWater(context: ComprehensiveUserContext): number {
    let base = context.profile.weight * 35;
    if (context.profile.activityLevel === "VERY_ACTIVE" || context.profile.activityLevel === "HIGH") {
      base *= 1.2;
    }
    return Math.round(base / 100) * 100; // Round to nearest 100ml
  }

  private static calculateOptimalCalories(context: ComprehensiveUserContext): number {
    const { healthInsights } = context;
    return Math.round((healthInsights.estimatedTDEE + healthInsights.recommendedDeficitOrSurplus) / 50) * 50;
  }

  private static determinePriority(context: ComprehensiveUserContext): "low" | "medium" | "high" {
    const { performance, healthInsights, recentActivity } = context;

    // High priority conditions
    if (performance.overallGoalAchievementRate < 0.5) return "high";
    if (healthInsights.hydrationStatus === "low") return "high";
    if (healthInsights.proteinIntakeStatus === "low") return "high";
    if (recentActivity.todayMealsCount === 0 && new Date().getHours() > 14) return "high";

    // Medium priority conditions
    if (performance.consistencyScore < 0.6) return "medium";
    if (performance.overallGoalAchievementRate < 0.8) return "medium";

    return "low";
  }

  /**
   * Generate smart fallback recommendations using context
   */
  private static generateSmartFallbackRecommendations(
    context: ComprehensiveUserContext
  ): AIRecommendationResponse {
    const recommendations: AIRecommendationResponse = {
      nutrition_tips: [],
      meal_suggestions: [],
      goal_adjustments: [],
      behavioral_insights: [],
      priority_level: this.determinePriority(context),
      confidence_score: 0.7,
      key_focus_areas: [],
    };

    // Hydration-based tips
    if (context.healthInsights.hydrationStatus === "low") {
      recommendations.nutrition_tips.push(
        `Increase water intake to ${this.calculateOptimalWater(context)}ml daily - you're currently at ${context.performance.avgDailyWater}ml`
      );
      recommendations.key_focus_areas.push("hydration");
    }

    // Protein-based tips
    if (context.healthInsights.proteinIntakeStatus === "low") {
      const targetProtein = Math.round(context.profile.weight * 1.6);
      recommendations.nutrition_tips.push(
        `Aim for ${targetProtein}g protein daily (currently averaging ${context.performance.avgDailyProtein}g)`
      );
      recommendations.key_focus_areas.push("protein");
    }

    // Goal-specific recommendations
    if (context.profile.mainGoal === "WEIGHT_LOSS" || context.profile.mainGoal === "LOSE_WEIGHT") {
      const targetCal = this.calculateOptimalCalories(context);
      recommendations.meal_suggestions.push(
        `Focus on high-volume, low-calorie foods to stay within ${targetCal}kcal while feeling satisfied`
      );
      recommendations.goal_adjustments.push(
        `Maintain a ${Math.abs(context.healthInsights.recommendedDeficitOrSurplus)}kcal deficit for steady weight loss`
      );
    } else if (context.profile.mainGoal === "BUILD_MUSCLE" || context.profile.mainGoal === "WEIGHT_GAIN") {
      recommendations.meal_suggestions.push(
        `Include calorie-dense nutritious foods like nuts, avocados, and whole grains`
      );
      recommendations.nutrition_tips.push(
        `Prioritize protein timing - consume 20-40g protein within 2 hours of exercise`
      );
    }

    // Consistency-based insights
    if (context.performance.consistencyScore < 0.6) {
      recommendations.behavioral_insights.push(
        `Your consistency is ${Math.round(context.performance.consistencyScore * 100)}% - try meal prepping on ${context.performance.worstPerformingDayOfWeek}s`
      );
    }

    // Streak motivation
    if (context.streaks.currentDailyStreak > 0) {
      recommendations.behavioral_insights.push(
        `Great ${context.streaks.currentDailyStreak}-day streak! Keep logging to reach your longest streak of ${context.streaks.longestDailyStreak} days`
      );
    }

    // Today's progress
    if (context.recentActivity.todayMealsCount === 0) {
      recommendations.meal_suggestions.push(
        `Start your day strong - you have ${context.recentActivity.remainingCalories}kcal to distribute across meals`
      );
    } else if (context.recentActivity.remainingCalories > 0) {
      recommendations.meal_suggestions.push(
        `You have ${context.recentActivity.remainingCalories}kcal and ${context.recentActivity.remainingProtein}g protein remaining for today`
      );
    }

    // Default recommendations if none generated
    if (recommendations.nutrition_tips.length === 0) {
      recommendations.nutrition_tips = [
        `Maintain your ${context.goals.dailyCalories}kcal daily target`,
        "Include colorful vegetables in each meal for micronutrients",
        "Spread protein intake evenly across meals for optimal absorption",
      ];
    }

    return recommendations;
  }

  /**
   * Save enhanced recommendation with context metadata
   */
  private static async saveEnhancedRecommendation(
    userId: string,
    recommendations: AIRecommendationResponse,
    context: ComprehensiveUserContext
  ): Promise<DailyRecommendation> {
    try {
      const today = new Date().toISOString().split("T")[0];

      const saved = await prisma.aiRecommendation.create({
        data: {
          user_id: userId,
          date: today,
          recommendations: recommendations,
          priority_level: recommendations.priority_level,
          confidence_score: recommendations.confidence_score,
          based_on: {
            context_completeness: context.dataCompleteness,
            goal: context.profile.mainGoal,
            current_streak: context.streaks.currentDailyStreak,
            goal_achievement_rate: Math.round(context.performance.overallGoalAchievementRate * 100),
            analysis_type: "comprehensive_30_day",
            tdee: context.healthInsights.estimatedTDEE,
            hydration_status: context.healthInsights.hydrationStatus,
            protein_status: context.healthInsights.proteinIntakeStatus,
          },
          is_read: false,
        },
      });

      // Clear context cache after generating new recommendations
      UserContextService.clearCache(userId);

      return {
        id: saved.id,
        user_id: saved.user_id,
        date: saved.date,
        recommendations: saved.recommendations as any,
        priority_level: saved.priority_level as "low" | "medium" | "high",
        confidence_score: saved.confidence_score,
        based_on: saved.based_on as any,
        created_at: saved.created_at,
        is_read: saved.is_read,
      };
    } catch (error) {
      console.error("Error saving enhanced recommendation:", error);
      throw error;
    }
  }

  /**
   * Get user's recent performance for analysis
   */
  private static async getUserRecentPerformance(userId: string) {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [recentMeals, recentWaterIntake, recentGoals] = await Promise.all([
        prisma.meal.findMany({
          where: {
            user_id: userId,
            created_at: { gte: sevenDaysAgo },
          },
          select: {
            calories: true,
            protein_g: true,
            carbs_g: true,
            fats_g: true,
            created_at: true,
          },
        }),
        prisma.waterIntake.findMany({
          where: {
            user_id: userId,
            date: { gte: sevenDaysAgo },
          },
          select: {
            cups_consumed: true,
            milliliters_consumed: true,
            date: true,
          },
        }),
        prisma.dailyGoal.findMany({
          where: {
            user_id: userId,
            date: { gte: sevenDaysAgo },
          },
          select: {
            calories: true,
            protein_g: true,
            water_ml: true,
            date: true,
          },
        }),
      ]);

      // Calculate performance metrics
      const totalCalories = recentMeals.reduce(
        (sum, meal) => sum + (meal.calories || 0),
        0
      );
      const totalProtein = recentMeals.reduce(
        (sum, meal) => sum + (meal.protein_g || 0),
        0
      );
      const avgWaterIntake =
        recentWaterIntake.reduce(
          (sum, water) => sum + (water.cups_consumed || 0),
          0
        ) / Math.max(recentWaterIntake.length, 1);

      const goalAchievementRate = this.calculateGoalAchievementRate(
        recentMeals,
        recentGoals
      );

      return {
        totalCalories,
        totalProtein,
        avgWaterIntake,
        goalAchievementRate,
        mealFrequency: recentMeals.length / 7,
        consistencyScore: this.calculateConsistencyScore(recentMeals),
      };
    } catch (error) {
      console.error("Error getting user recent performance:", error);
      return {
        totalCalories: 0,
        totalProtein: 0,
        avgWaterIntake: 0,
        goalAchievementRate: 0,
        mealFrequency: 0,
        consistencyScore: 0,
      };
    }
  }

  /**
   * Generate AI-powered recommendations
   */
  private static async generateAIRecommendations(
    userId: string,
    questionnaire: any,
    recentData: any
  ): Promise<AIRecommendationResponse> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.log("⚠️ No OpenAI key, using intelligent fallback");
        return this.generateIntelligentFallbackRecommendations(
          questionnaire,
          recentData
        );
      }

      const prompt = this.buildRecommendationPrompt(questionnaire, recentData);
      const aiResponse = await OpenAIService.generateText(prompt, 1000);

      // Parse AI response
      const parsed = JSON.parse(aiResponse);
      return this.validateAndNormalizeRecommendations(parsed);
    } catch (error) {
      console.error("AI recommendation generation failed:", error);
      return this.generateIntelligentFallbackRecommendations(
        questionnaire,
        recentData
      );
    }
  }

  /**
   * Build comprehensive prompt for AI recommendations
   */
  private static buildRecommendationPrompt(
    questionnaire: any,
    recentData: any
  ): string {
    return `Analyze this user's nutrition data and provide personalized daily recommendations.

USER PROFILE:
- Age: ${questionnaire?.age || "Unknown"}
- Goal: ${questionnaire?.main_goal || "GENERAL_HEALTH"}
- Activity Level: ${questionnaire?.physical_activity_level || "MODERATE"}
- Dietary Style: ${questionnaire?.dietary_style || "Regular"}
- Allergies: ${questionnaire?.allergies?.join(", ") || "None"}
- Weight: ${questionnaire?.weight_kg || "Unknown"}kg

RECENT PERFORMANCE (Last 7 days):
- Total Calories: ${recentData.totalCalories}
- Total Protein: ${recentData.totalProtein}g
- Average Water Intake: ${recentData.avgWaterIntake} cups/day
- Goal Achievement Rate: ${Math.round(recentData.goalAchievementRate * 100)}%
- Meal Frequency: ${recentData.mealFrequency} meals/day
- Consistency Score: ${Math.round(recentData.consistencyScore * 100)}%

ANALYSIS FOCUS:
1. Identify nutritional gaps or excesses
2. Assess goal achievement patterns
3. Evaluate eating consistency
4. Consider user's specific health goals

Provide recommendations in this JSON format:
{
  "nutrition_tips": ["tip1", "tip2", "tip3"],
  "meal_suggestions": ["suggestion1", "suggestion2"],
  "goal_adjustments": ["adjustment1", "adjustment2"],
  "behavioral_insights": ["insight1", "insight2"],
  "priority_level": "low|medium|high",
  "confidence_score": 0.85,
  "key_focus_areas": ["area1", "area2"]
}

Be specific, actionable, and encouraging. Consider the user's allergies and dietary restrictions.`;
  }

  /**
   * Generate intelligent fallback recommendations
   */
  private static generateIntelligentFallbackRecommendations(
    questionnaire: any,
    recentData: any
  ): AIRecommendationResponse {
    const recommendations: AIRecommendationResponse = {
      nutrition_tips: [],
      meal_suggestions: [],
      goal_adjustments: [],
      behavioral_insights: [],
      priority_level: "medium",
      confidence_score: 0.7,
      key_focus_areas: [],
    };

    // Analyze recent performance and generate targeted recommendations
    if (recentData.avgWaterIntake < 6) {
      recommendations.nutrition_tips.push(
        "Increase water intake to 8-10 cups daily for better hydration"
      );
      recommendations.key_focus_areas.push("hydration");
    }

    if (recentData.goalAchievementRate < 0.5) {
      recommendations.goal_adjustments.push(
        "Consider adjusting daily calorie goals to be more achievable"
      );
      recommendations.priority_level = "high";
    }

    if (recentData.mealFrequency < 2) {
      recommendations.behavioral_insights.push(
        "Try to maintain at least 3 meals per day for better nutrition distribution"
      );
    }

    // Goal-specific recommendations
    if (questionnaire?.main_goal === "WEIGHT_LOSS") {
      recommendations.meal_suggestions.push(
        "Focus on high-protein, low-calorie meals with plenty of vegetables"
      );
      recommendations.nutrition_tips.push(
        "Aim for a moderate calorie deficit while maintaining protein intake"
      );
    } else if (questionnaire?.main_goal === "WEIGHT_GAIN") {
      recommendations.meal_suggestions.push(
        "Include calorie-dense, nutritious foods like nuts, avocados, and lean proteins"
      );
      recommendations.nutrition_tips.push(
        "Add healthy snacks between meals to increase daily calorie intake"
      );
    }

    // Activity-based recommendations
    if (questionnaire?.physical_activity_level === "HIGH") {
      recommendations.nutrition_tips.push(
        "Increase protein intake to support muscle recovery and growth"
      );
      recommendations.meal_suggestions.push(
        "Include post-workout meals with carbs and protein within 2 hours of exercise"
      );
    }

    // Dietary style recommendations
    if (questionnaire?.dietary_style?.toLowerCase().includes("vegetarian")) {
      recommendations.nutrition_tips.push(
        "Ensure adequate B12, iron, and complete protein sources in your diet"
      );
    }

    // Default recommendations if none generated
    if (recommendations.nutrition_tips.length === 0) {
      recommendations.nutrition_tips = [
        "Maintain a balanced diet with variety in food choices",
        "Stay consistent with meal timing for better metabolism",
        "Include colorful vegetables and fruits in your daily meals",
      ];
    }

    if (recommendations.meal_suggestions.length === 0) {
      recommendations.meal_suggestions = [
        "Start your day with a protein-rich breakfast",
        "Include fiber-rich foods to help you feel satisfied longer",
      ];
    }

    return recommendations;
  }

  /**
   * Save recommendation to database
   */
  private static async saveRecommendation(
    userId: string,
    recommendations: AIRecommendationResponse
  ): Promise<DailyRecommendation> {
    try {
      const today = new Date().toISOString().split("T")[0];

      const saved = await prisma.aiRecommendation.create({
        data: {
          user_id: userId,
          date: today,
          recommendations: recommendations,
          priority_level: recommendations.priority_level,
          confidence_score: recommendations.confidence_score,
          based_on: {
            recent_performance: "7_day_analysis",
            goal_achievement: "daily_tracking",
            nutritional_gaps: "macro_micro_analysis",
          },
          is_read: false,
        },
      });

      return {
        id: saved.id,
        user_id: saved.user_id,
        date: saved.date,
        recommendations: saved.recommendations as any,
        priority_level: saved.priority_level as "low" | "medium" | "high",
        confidence_score: saved.confidence_score,
        based_on: saved.based_on as any,
        created_at: saved.created_at,
        is_read: saved.is_read,
      };
    } catch (error) {
      console.error("Error saving recommendation:", error);
      throw error;
    }
  }

  /**
   * Create fallback recommendation when AI fails
   */
  private static async createFallbackRecommendation(
    userId: string
  ): Promise<DailyRecommendation | null> {
    try {
      const questionnaire = await prisma.userQuestionnaire.findFirst({
        where: { user_id: userId },
        orderBy: { date_completed: "desc" },
      });

      const fallbackRecommendations =
        this.generateIntelligentFallbackRecommendations(questionnaire, {
          totalCalories: 0,
          totalProtein: 0,
          avgWaterIntake: 0,
          goalAchievementRate: 0,
          mealFrequency: 0,
          consistencyScore: 0,
        });

      return await this.saveRecommendation(userId, fallbackRecommendations);
    } catch (error) {
      console.error("Error creating fallback recommendation:", error);
      return null;
    }
  }

  /**
   * Calculate goal achievement rate
   */
  private static calculateGoalAchievementRate(
    meals: any[],
    goals: any[]
  ): number {
    if (goals.length === 0) return 0;

    // Group meals by date
    const mealsByDate = new Map<string, any[]>();
    meals.forEach((meal) => {
      const date = meal.created_at.toISOString().split("T")[0];
      if (!mealsByDate.has(date)) {
        mealsByDate.set(date, []);
      }
      mealsByDate.get(date)!.push(meal);
    });

    let achievedDays = 0;
    goals.forEach((goal) => {
      const date = goal.date.toISOString().split("T")[0];
      const dayMeals = mealsByDate.get(date) || [];
      const dayCalories = dayMeals.reduce(
        (sum, meal) => sum + (meal.calories || 0),
        0
      );

      if (dayCalories >= goal.calories * 0.8) {
        // 80% of goal considered achieved
        achievedDays++;
      }
    });

    return achievedDays / goals.length;
  }

  /**
   * Calculate consistency score based on meal timing patterns
   */
  private static calculateConsistencyScore(meals: any[]): number {
    if (meals.length < 3) return 0;

    // Group meals by date and calculate daily consistency
    const mealsByDate = new Map<string, any[]>();
    meals.forEach((meal) => {
      const date = meal.created_at.toISOString().split("T")[0];
      if (!mealsByDate.has(date)) {
        mealsByDate.set(date, []);
      }
      mealsByDate.get(date)!.push(meal);
    });

    let consistentDays = 0;
    mealsByDate.forEach((dayMeals) => {
      if (dayMeals.length >= 2) {
        // At least 2 meals per day
        consistentDays++;
      }
    });

    return consistentDays / mealsByDate.size;
  }

  /**
   * Validate and normalize AI recommendations
   */
  private static validateAndNormalizeRecommendations(
    parsed: any
  ): AIRecommendationResponse {
    return {
      nutrition_tips: Array.isArray(parsed.nutrition_tips)
        ? parsed.nutrition_tips
        : [],
      meal_suggestions: Array.isArray(parsed.meal_suggestions)
        ? parsed.meal_suggestions
        : [],
      goal_adjustments: Array.isArray(parsed.goal_adjustments)
        ? parsed.goal_adjustments
        : [],
      behavioral_insights: Array.isArray(parsed.behavioral_insights)
        ? parsed.behavioral_insights
        : [],
      priority_level: ["low", "medium", "high"].includes(parsed.priority_level)
        ? parsed.priority_level
        : "medium",
      confidence_score:
        typeof parsed.confidence_score === "number"
          ? parsed.confidence_score
          : 0.7,
      key_focus_areas: Array.isArray(parsed.key_focus_areas)
        ? parsed.key_focus_areas
        : [],
    };
  }

  /**
   * Get user recommendations with pagination
   */
  static async getUserRecommendations(
    userId: string,
    limit: number = 7
  ): Promise<DailyRecommendation[]> {
    try {
      const recommendations = await prisma.aiRecommendation.findMany({
        where: { user_id: userId },
        orderBy: { date: "desc" },
        take: limit,
      });

      return recommendations.map((rec) => ({
        id: rec.id,
        user_id: rec.user_id,
        date: rec.date,
        recommendations: rec.recommendations as any,
        priority_level: rec.priority_level as "low" | "medium" | "high",
        confidence_score: rec.confidence_score,
        based_on: rec.based_on as any,
        created_at: rec.created_at,
        is_read: rec.is_read,
      }));
    } catch (error) {
      console.error("Error getting user recommendations:", error);
      return [];
    }
  }
}
