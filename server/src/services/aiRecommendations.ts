import { OpenAIService } from "./openai";
import { prisma } from "../lib/database";
import { StatisticsService } from "./statistics";

export interface DailyRecommendation {
  id: string;
  user_id: string;
  date: string;
  recommendations: {
    nutrition_tips: string[];
    meal_suggestions: string[];
    goal_adjustments: string[];
    behavioral_insights: string[];
  };
  priority_level: "low" | "medium" | "high";
  confidence_score: number;
  based_on: {
    recent_performance: any;
    goal_achievement: any;
    nutritional_gaps: any;
  };
  created_at: Date;
  is_read: boolean;
}

export class AIRecommendationService {
  static async generateDailyRecommendations(
    userId: string,
  ): Promise<DailyRecommendation> {
    const startTime = Date.now();
    console.log(`🤖 [${userId}] Starting recommendation generation`);

    try {
      // Get user's recent performance (last 7 days)
      console.log(`📊 [${userId}] Fetching recent statistics...`);
      const recentStats = await StatisticsService.getNutritionStatistics(
        userId,
        "week",
      );
      console.log(`📊 [${userId}] Recent stats retrieved`);

      // Get yesterday's performance specifically
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStart = new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate(),
      );
      const yesterdayEnd = new Date(yesterdayStart);
      yesterdayEnd.setDate(yesterdayEnd.getDate() + 1);

      console.log(`📅 [${userId}] Fetching yesterday's consumption...`);
      const yesterdayStats = await StatisticsService.getPeriodConsumption(
        userId,
        yesterdayStart,
        yesterdayEnd,
      );
      const dailyGoals = await StatisticsService.getUserDailyGoals(userId);

      // Get user preferences and restrictions
      console.log(`👤 [${userId}] Fetching user profile...`);
      const userProfile = await this.getUserProfile(userId);

      // Generate AI recommendations
      console.log(`🤖 [${userId}] Calling AI service...`);
      const aiRecommendations = await this.callAIForRecommendations({
        userId,
        recentPerformance: recentStats.data,
        yesterdayConsumption: yesterdayStats,
        dailyGoals,
        userProfile,
      });
      console.log(`✅ [${userId}] AI recommendations received`);

      // Save recommendations to database
      console.log(`💾 [${userId}] Saving to database...`);
      const savedRecommendation = await this.saveRecommendations(
        userId,
        aiRecommendations,
      );

      const duration = Date.now() - startTime;
      console.log(
        `✅ [${userId}] Recommendations generated and saved in ${duration}ms`,
      );
      return savedRecommendation;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `💥 [${userId}] Generation failed after ${duration}ms:`,
        error,
      );

      // Return fallback recommendations if AI fails
      return this.getFallbackRecommendations(userId);
    }
  }

  private static async callAIForRecommendations(data: any): Promise<any> {
    // Check API key first
    if (!process.env.OPENAI_API_KEY) {
      console.warn(
        "⚠️ OpenAI API key not configured, using fallback recommendations",
      );
      return this.getFallbackRecommendationStructure();
    }

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
IMPORTANT: Return ONLY valid JSON, no markdown code blocks or additional text.
`;

    let lastError: Error | null = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `🤖 Attempting AI generation (attempt ${attempt}/${maxRetries})`,
        );

        const response = await OpenAIService.generateText(prompt, 1500);

        // Validate response before parsing
        if (!response || response.trim().length === 0) {
          throw new Error("Empty response from OpenAI");
        }

        // Try to parse JSON
        let parsed;
        try {
          // First try direct parsing
          parsed = JSON.parse(response.trim());
        } catch (parseError) {
          // Try to extract JSON from markdown code blocks
          const jsonMatch =
            response.match(/```json\s*([\s\S]*?)\s*```/) ||
            response.match(/```\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[1].trim());
          } else {
            throw new Error(`Invalid JSON response: ${parseError}`);
          }
        }

        // Validate structure
        if (!this.validateRecommendationStructure(parsed)) {
          throw new Error(
            "Invalid recommendation structure - missing required fields",
          );
        }

        console.log("✅ AI generation successful");
        return parsed;
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed, use fallback
    console.warn(
      `⚠️ All AI generation attempts failed (${lastError?.message}), using fallback`,
    );
    return this.getFallbackRecommendationStructure();
  }

  private static validateRecommendationStructure(data: any): boolean {
    return (
      data &&
      Array.isArray(data.nutrition_tips) &&
      Array.isArray(data.meal_suggestions) &&
      Array.isArray(data.goal_adjustments) &&
      Array.isArray(data.behavioral_insights) &&
      typeof data.priority_level === "string" &&
      typeof data.confidence_score === "number"
    );
  }

  private static getFallbackRecommendationStructure() {
    return {
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
      key_focus_areas: ["hydration", "protein_intake", "consistency"],
    };
  }

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
        health_conditions: questionnaire?.medical_conditions
          ? [questionnaire.medical_conditions]
          : [],
        main_goal: questionnaire?.main_goal || "WEIGHT_MAINTENANCE",
        activity_level: questionnaire?.physical_activity_level || "MODERATE",
        age: questionnaire?.age || 30,
        weight_kg: questionnaire?.weight_kg || 70,
      };
    } catch (error) {
      console.error("Error getting user profile:", error);
      return {};
    }
  }

  private static async saveRecommendations(
    userId: string,
    recommendations: any,
  ): Promise<DailyRecommendation> {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Check if recommendations already exist for today
      const existing = await prisma.aiRecommendation.findFirst({
        where: {
          user_id: userId,
          date: today,
        },
      });

      if (existing) {
        // Update existing recommendations
        const updated = await prisma.aiRecommendation.update({
          where: { id: existing.id },
          data: {
            recommendations: recommendations,
            priority_level: recommendations.priority_level || "medium",
            confidence_score: recommendations.confidence_score || 0.75,
            updated_at: new Date(),
          },
        });

        return this.formatRecommendation(updated);
      } else {
        // Create new recommendations
        const created = await prisma.aiRecommendation.create({
          data: {
            user_id: userId,
            date: today,
            recommendations: recommendations,
            priority_level: recommendations.priority_level || "medium",
            confidence_score: recommendations.confidence_score || 0.75,
            based_on: {
              recent_performance: "7_day_analysis",
              goal_achievement: "daily_tracking",
              nutritional_gaps: "macro_micro_analysis",
            },
            is_read: false,
          },
        });

        return this.formatRecommendation(created);
      }
    } catch (error) {
      console.error("Error saving recommendations:", error);
      throw error;
    }
  }

  private static async getFallbackRecommendations(
    userId: string,
  ): Promise<DailyRecommendation> {
    console.log("🆘 Using fallback recommendations");

    const fallbackRecommendations = {
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
    };

    return this.saveRecommendations(userId, {
      ...fallbackRecommendations,
      priority_level: "medium",
      confidence_score: 0.6,
    });
  }

  private static formatRecommendation(
    dbRecommendation: any,
  ): DailyRecommendation {
    return {
      id: dbRecommendation.id,
      user_id: dbRecommendation.user_id,
      date: dbRecommendation.date,
      recommendations: dbRecommendation.recommendations,
      priority_level: dbRecommendation.priority_level,
      confidence_score: dbRecommendation.confidence_score,
      based_on: dbRecommendation.based_on,
      created_at: dbRecommendation.created_at,
      is_read: dbRecommendation.is_read,
    };
  }

  static async getUserRecommendations(
    userId: string,
    limit: number = 7,
  ): Promise<DailyRecommendation[]> {
    try {
      const recommendations = await prisma.aiRecommendation.findMany({
        where: { user_id: userId },
        orderBy: { date: "desc" },
        take: limit,
      });

      return recommendations.map(this.formatRecommendation);
    } catch (error) {
      console.error("Error getting user recommendations:", error);
      return [];
    }
  }

  static async markRecommendationAsRead(
    userId: string,
    recommendationId: string,
  ): Promise<boolean> {
    try {
      await prisma.aiRecommendation.update({
        where: {
          id: recommendationId,
          user_id: userId,
        },
        data: { is_read: true },
      });

      return true;
    } catch (error) {
      console.error("Error marking recommendation as read:", error);
      return false;
    }
  }
}
