export interface NutritionMetric {
  id: string;
  name: string;
  nameEn: string;
  value: number;
  unit: string;
  target: number;
  minTarget?: number;
  maxTarget?: number;
  percentage?: number;
  status?: "excellent" | "good" | "warning" | "danger";
  icon?: React.ReactNode;
  color: string;
  category: "macros" | "micros" | "lifestyle" | "quality" | "hydration";
  description?: string;
  recommendation?: string;
  trend?: "up" | "down" | "stable";
  weeklyAverage?: number;
  lastWeekChange?: number;
  chartData?: number[];
  chartLabels?: string[];
}

export interface ProgressData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  water: number;
  fiber: number;
  sugar: number;
  sodium: number;
  weight?: number;
  mood?: "happy" | "neutral" | "sad";
  energy?: "high" | "medium" | "low";
  satiety?: "very_full" | "satisfied" | "hungry";
  mealQuality?: number;
  mealsCount: number;
  requiredMeals: number;
}

export interface Achievement {
  id: string;
  title:
    | {
        en: string;
        he: string;
      }
    | string;
  description:
    | {
        en: string;
        he: string;
      }
    | string;
  icon: string;
  color: string;
  progress: number;
  maxProgress?: number;
  unlocked: boolean;
  category:
    | "STREAK"
    | "GOAL"
    | "IMPROVEMENT"
    | "CONSISTENCY"
    | "MILESTONE"
    | "SPECIAL";
  xpReward: number;
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
  unlockedDate?: string;
}

export interface AIRecommendation {
  id: string;
  date: string;
  recommendations: {
    nutrition_tips: string[];
    meal_suggestions: string[];
    goal_adjustments: string[];
    behavioral_insights: string[];
  };
  priority_level: "low" | "medium" | "high";
  confidence_score: number;
  is_read: boolean;
  created_at: string;
}

export interface StatisticsData {
  level: number;
  currentXP: number;
  totalPoints: number;
  currentStreak: number;
  weeklyStreak: number;
  perfectDays: number;
  dailyGoalDays: number;
  totalDays: number;
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFats: number;
  averageFiber: number;
  averageSugar: number;
  averageSodium: number;
  averageFluids: number;
  achievements: any[];
  badges: any[];
  dailyBreakdown: any[];
  successfulDays: number;
  averageCompletion: number;
  bestStreak: number;
  happyDays: number;
  highEnergyDays: number;
  satisfiedDays: number;
  averageMealQuality: number;
  userGoals: {
    dailyCalories: number;
    dailyProtein: number;
    dailyCarbs: number;
    dailyFats: number;
    dailyFiber: number;
    dailyWater: number;
    mealsPerDay: number;
  };
}

export interface UserQuestionnaire {
  mealsPerDay: number;
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFats: number;
  dailyFiber: number;
  dailyWater: number;
}

export type TimePeriod = "today" | "week" | "month";
export type ChartType = "overview" | "macros" | "trends";
export interface TimeFilterOption {
  key: TimePeriod;
  label: string;
}

export interface ProductData {
  barcode?: string;
  name: string;
  brand?: string;
  category: string;
  nutrition_per_100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    saturated_fat?: number;
    trans_fat?: number;
    cholesterol?: number;
    potassium?: number;
    calcium?: number;
    iron?: number;
    vitamin_c?: number;
    vitamin_d?: number;
  };
  ingredients: string[];
  allergens: string[];
  labels: string[];
  health_score?: number;
  image_url?: string;
  serving_size?: string;
  servings_per_container?: number;
  // AI-calculated pricing from backend
  estimated_price?: number;
  price_per_100g?: number;
  price_confidence?: "high" | "medium" | "low";
  price_range?: string;
}

export interface UserAnalysis {
  compatibility_score: number;
  daily_contribution: {
    calories_percent: number;
    protein_percent: number;
    carbs_percent: number;
    fat_percent: number;
  };
  alerts: string[];
  recommendations: string[];
  health_assessment: string;
}

export interface ScanResult {
  product: ProductData;
  user_analysis: UserAnalysis;
}

export interface PriceEstimate {
  estimated_price: number;
  price_range: string;
  currency: string;
  confidence: string;
  market_context: string;
}
