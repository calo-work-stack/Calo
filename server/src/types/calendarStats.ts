export interface DayData {
  date: string;
  calories_goal: number;
  calories_actual: number;
  protein_goal: number;
  protein_actual: number;
  carbs_goal: number;
  carbs_actual: number;
  fat_goal: number;
  fat_actual: number;
  meal_count: number;
  quality_score: number;
  water_intake_ml: number;
  events: CalendarEventSimple[];
}

export interface CalendarEventSimple {
  id: string;
  title: string;
  type: string;
  created_at: string;
  description?: string;
}

export interface WeeklyAnalysisDetail {
  weekStart: string;
  weekEnd: string;
  averageProgress: number;
  totalDays: number;
  goalDays: number;
  highlights: string[];
  challenges: string[];
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFat: number;
  averageWater: number;
  perfectDays: number;
}

export interface MonthlyNutritionBreakdown {
  calories: {
    average: number;
    min: number;
    max: number;
    total: number;
    goalAverage: number;
    adherencePercent: number;
  };
  protein: {
    average: number;
    min: number;
    max: number;
    total: number;
    goalAverage: number;
    adherencePercent: number;
  };
  carbs: {
    average: number;
    min: number;
    max: number;
    total: number;
    goalAverage: number;
    adherencePercent: number;
  };
  fat: {
    average: number;
    min: number;
    max: number;
    total: number;
    goalAverage: number;
    adherencePercent: number;
  };
  water: {
    average: number;
    min: number;
    max: number;
    total: number;
    dailyGoal: number;
    adherencePercent: number;
  };
}

export interface MacroTrends {
  caloriesTrend: "increasing" | "decreasing" | "stable";
  proteinTrend: "increasing" | "decreasing" | "stable";
  carbsTrend: "increasing" | "decreasing" | "stable";
  fatTrend: "increasing" | "decreasing" | "stable";
  waterTrend: "increasing" | "decreasing" | "stable";
  overallTrend: "improving" | "declining" | "stable";
}

export interface GamificationBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  achieved_at: string;
  points: number;
}

export interface EnhancedCalendarStats {
  // Basic Stats
  monthlyProgress: number;
  streakDays: number;
  totalGoalDays: number;
  totalDays: number;
  perfectDays: number;

  // Nutrition Averages
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFat: number;
  averageWater: number;

  // Detailed Nutrition Breakdown
  nutritionBreakdown: MonthlyNutritionBreakdown;

  // Quality Metrics
  averageQualityScore: number;
  averageMealCount: number;

  // Trends & Analysis
  bestWeek: string;
  challengingWeek: string;
  improvementPercent: number;
  macroTrends: MacroTrends;

  // Weekly Insights
  weeklyInsights: {
    bestWeekDetails: WeeklyAnalysisDetail;
    challengingWeekDetails: WeeklyAnalysisDetail;
    allWeeks: WeeklyAnalysisDetail[];
  };

  // Motivation & Gamification
  motivationalMessage: string;
  gamificationBadges: GamificationBadge[];
  totalPoints: number;

  // Comparison with Previous Month
  comparison: {
    caloriesDiff: number;
    proteinDiff: number;
    carbsDiff: number;
    fatDiff: number;
    waterDiff: number;
    progressDiff: number;
    streakDiff: number;
  };
}
