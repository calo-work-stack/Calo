import { prisma } from "../lib/database";

export interface MealsRemainingResult {
  remaining: number;
  limit: number;
  used: number;
  canLogMandatory: boolean;
}

export class MealTrackingService {
  /**
   * Get the user's meals_per_day limit from their questionnaire
   * Returns default of 3 if no questionnaire exists
   */
  static async getMealsPerDay(userId: string): Promise<number> {
    const questionnaire = await prisma.userQuestionnaire.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      select: { meals_per_day: true },
    });

    return questionnaire?.meals_per_day ?? 3;
  }

  /**
   * Count mandatory meals logged today for a user
   */
  static async getMandatoryMealsToday(userId: string): Promise<number> {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999
    );

    const count = await prisma.meal.count({
      where: {
        user_id: userId,
        is_mandatory: true,
        created_at: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    return count;
  }

  /**
   * Get remaining mandatory meals for today
   */
  static async getMealsRemaining(userId: string): Promise<MealsRemainingResult> {
    const [limit, used] = await Promise.all([
      this.getMealsPerDay(userId),
      this.getMandatoryMealsToday(userId),
    ]);

    const remaining = Math.max(0, limit - used);

    return {
      remaining,
      limit,
      used,
      canLogMandatory: remaining > 0,
    };
  }

  /**
   * Validate that a mandatory meal can be created
   * Throws an error if the daily limit is reached
   */
  static async validateMandatoryMealCreation(userId: string): Promise<void> {
    const { remaining, limit, used } = await this.getMealsRemaining(userId);

    if (remaining === 0) {
      throw new Error(
        `Daily mandatory meal limit reached. You have logged ${used}/${limit} mandatory meals today. You can still log snacks.`
      );
    }
  }

  /**
   * Check if a meal can be logged as mandatory
   * Returns { allowed: true } if allowed, or { allowed: false, message: string } if not
   */
  static async canLogMandatoryMeal(
    userId: string
  ): Promise<{ allowed: boolean; message?: string; remaining?: number; limit?: number }> {
    const { remaining, limit, used } = await this.getMealsRemaining(userId);

    if (remaining === 0) {
      return {
        allowed: false,
        message: `Daily mandatory meal limit reached (${used}/${limit}). You can still log snacks.`,
        remaining: 0,
        limit,
      };
    }

    return {
      allowed: true,
      remaining,
      limit,
    };
  }
}
