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
  water_goal_ml: number;
  water_intake_ml: number;
  events: Array<{
    id: string;
    title: string;
    type: string;
    created_at: string;
  }>;
}

export interface CalendarStats {
  monthlyProgress: number;
  streakDays: number;
  bestWeek: string;
  challengingWeek: string;
  improvementPercent: number;
  totalGoalDays: number;
  averageCalories: number;
  averageProtein: number;
  averageWater: number;
  motivationalMessage: string;
  gamificationBadges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    achieved_at: string;
  }>;
  weeklyInsights: {
    bestWeekDetails: {
      weekStart: string;
      weekEnd: string;
      averageProgress: number;
      highlights: string[];
    };
    challengingWeekDetails: {
      weekStart: string;
      weekEnd: string;
      averageProgress: number;
      challenges: string[];
    };
  };
}

export interface WeeklyAnalysis {
  weekStart: string;
  weekEnd: string;
  averageProgress: number;
  totalDays: number;
  goalDays: number;
  highlights: string[];
  challenges: string[];
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  date: string;
  title: string;
  type: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface GamificationBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
  points: number;
}
