import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
} from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronDown,
  ChevronUp,
  Check,
  RefreshCw,
  Pencil,
} from "lucide-react-native";
import { NutritionPills } from "./shared/NutritionPills";
import { useMealTypeConfig } from "./shared/MealTypeIcon";
import { InstructionSteps } from "./shared/InstructionSteps";
import { IngredientList } from "./shared/IngredientList";

type MealStatus = "completed" | "current" | "upcoming";

interface Ingredient {
  ingredient_id: string;
  name: string;
  quantity: number | string;
  unit?: string;
  category?: string;
  estimated_cost?: number;
  checked?: boolean;
}

interface MealData {
  meal_id: string;
  name: string;
  meal_type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: Ingredient[];
  instructions?: string;
  image_url?: string;
  is_completed?: boolean;
  is_generating?: boolean;
}

interface TimelineMealCardProps {
  meal: MealData;
  status: MealStatus;
  timeLabel: string;
  isExpanded: boolean;
  onToggle: () => void;
  onComplete: () => void;
  onSwap?: () => void;
  onEdit?: () => void;
  checkedIngredients: Set<string>;
  onToggleIngredient: (ingredientId: string, mealId: string) => void;
}

export const TimelineMealCard = React.memo(
  ({
    meal,
    status,
    timeLabel,
    isExpanded,
    onToggle,
    onComplete,
    onSwap,
    onEdit,
    checkedIngredients,
    onToggleIngredient,
  }: TimelineMealCardProps) => {
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();
    const { getMealTypeConfig } = useMealTypeConfig();
    const config = getMealTypeConfig(meal.meal_type);

    const isCompleted = status === "completed" || meal.is_completed;
    const isCurrent = status === "current";
    const isGenerating = meal.is_generating;

    return (
      <View style={styles.container}>
        {/* Timeline dot + line */}
        <View style={styles.timelineCol}>
          <View style={[
            styles.timelineDot,
            {
              backgroundColor: isCompleted
                ? colors.success
                : isCurrent
                  ? colors.warmOrange
                  : isGenerating
                    ? colors.border
                    : colors.border,
              borderColor: isCompleted
                ? colors.success + "40"
                : isCurrent
                  ? colors.warmOrange + "40"
                  : "transparent",
            },
          ]}>
            {isCompleted && <Check size={10} color="#fff" strokeWidth={3} />}
          </View>
          <View style={[styles.timelineLine, { backgroundColor: colors.border + "40" }]} />
        </View>

        {/* Meal card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: isGenerating
                ? (isDark ? colors.surface : "#F9FAFB")
                : colors.card,
              borderColor: isCurrent
                ? colors.warmOrange
                : isCompleted
                  ? colors.success + "30"
                  : isDark ? colors.border + "60" : colors.border + "80",
              borderWidth: isCurrent ? 2 : 1,
              shadowColor: isCurrent ? colors.warmOrange : "#000",
              shadowOpacity: isCurrent ? 0.15 : 0.04,
              shadowOffset: { width: 0, height: isCurrent ? 4 : 2 },
              shadowRadius: isCurrent ? 12 : 6,
              elevation: isCurrent ? 6 : 2,
            },
            isCompleted && { opacity: 0.7 },
          ]}
        >
          {/* Current meal accent strip */}
          {isCurrent && (
            <LinearGradient
              colors={[colors.warmOrange, "#D97706"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accentStrip}
            />
          )}

          {/* Header */}
          <Pressable onPress={onToggle} style={styles.header}>
            {/* Meal image/emoji */}
            <View style={styles.imageWrap}>
              {meal.image_url ? (
                <Image source={{ uri: meal.image_url }} style={styles.mealImage} />
              ) : (
                <View style={[styles.emojiWrap, { backgroundColor: config.color + "15" }]}>
                  <Text style={styles.emoji}>{config.emoji}</Text>
                </View>
              )}
              {isCompleted && (
                <View style={[styles.completedBadge, { backgroundColor: colors.success }]}>
                  <Check size={9} color="#fff" strokeWidth={3.5} />
                </View>
              )}
            </View>

            {/* Info */}
            <View style={styles.info}>
              {/* Time + type */}
              <View style={styles.metaRow}>
                <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                  {timeLabel}
                </Text>
                <View style={[styles.dot, { backgroundColor: colors.border }]} />
                <Text style={[styles.typeText, { color: config.color }]}>
                  {config.label}
                </Text>
                {isCurrent && (
                  <View style={[styles.currentPill, { backgroundColor: colors.warmOrange }]}>
                    <Text style={styles.currentPillText}>
                      {t("timeline.now", "Now")}
                    </Text>
                  </View>
                )}
              </View>

              {/* Meal name */}
              <Text style={[styles.mealName, { color: colors.text }]} numberOfLines={2}>
                {meal.name}
              </Text>

              {/* Nutrition pills */}
              <NutritionPills
                calories={meal.calories}
                protein={meal.protein}
                carbs={meal.carbs}
                fat={meal.fat}
                compact
              />

              {isGenerating && (
                <Text style={[styles.generatingHint, { color: colors.warmOrange }]}>
                  {t("active_menu.generating_meal", "Creating recipe...")}
                </Text>
              )}
            </View>

            {/* Expand button */}
            <View style={[styles.expandBtn, { backgroundColor: isDark ? colors.surface : "#F3F4F6" }]}>
              {isExpanded ? (
                <ChevronUp size={16} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={16} color={colors.textSecondary} />
              )}
            </View>
          </Pressable>

          {/* Mark as Done button */}
          {isCurrent && !isCompleted && !isGenerating && (
            <Pressable onPress={onComplete} style={styles.doneWrapper}>
              <LinearGradient
                colors={[colors.warmOrange, "#D97706"]}
                style={styles.doneButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.doneText}>
                  {t("active_meal.mark_done", "Mark as Done")}
                </Text>
              </LinearGradient>
            </Pressable>
          )}

          {/* Expanded content */}
          {isExpanded && (
            <View style={[styles.expandedContent, { borderTopColor: colors.border + "40" }]}>
              {/* Action buttons */}
              <View style={styles.actionRow}>
                {onSwap && !isCompleted && (
                  <Pressable
                    onPress={onSwap}
                    style={[styles.actionBtn, { backgroundColor: colors.warmOrange + "10", borderColor: colors.warmOrange + "25", borderWidth: 1 }]}
                  >
                    <RefreshCw size={13} color={colors.warmOrange} />
                    <Text style={[styles.actionBtnText, { color: colors.warmOrange }]}>
                      {t("menu.swap", "Swap")}
                    </Text>
                  </Pressable>
                )}
                {onEdit && (
                  <Pressable
                    onPress={onEdit}
                    style={[styles.actionBtn, { backgroundColor: colors.textSecondary + "08", borderColor: colors.border, borderWidth: 1 }]}
                  >
                    <Pencil size={13} color={colors.textSecondary} />
                    <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>
                      {t("menu_crud.edit_meal", "Edit")}
                    </Text>
                  </Pressable>
                )}
                {!isCompleted && status !== "current" && (
                  <Pressable
                    onPress={onComplete}
                    style={[styles.actionBtn, { backgroundColor: colors.success + "10", borderColor: colors.success + "25", borderWidth: 1 }]}
                  >
                    <Check size={13} color={colors.success} />
                    <Text style={[styles.actionBtnText, { color: colors.success }]}>
                      {t("active_meal.mark_done", "Done")}
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Ingredients */}
              {meal.ingredients.length > 0 && (
                <IngredientList
                  ingredients={meal.ingredients}
                  showPrices
                  checkable
                  checkedIds={checkedIngredients}
                  onToggle={onToggleIngredient}
                  mealId={meal.meal_id}
                />
              )}

              {/* Instructions */}
              {meal.instructions && !meal.instructions.includes("AI is generating") && (
                <InstructionSteps instructions={meal.instructions} />
              )}
            </View>
          )}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  timelineCol: {
    width: 28,
    alignItems: "center",
    paddingTop: 18,
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: -1,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    marginLeft: 12,
    marginBottom: 8,
  },
  accentStrip: {
    height: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    paddingRight: 10,
  },
  imageWrap: {
    marginRight: 12,
    position: "relative",
  },
  mealImage: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  emojiWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  emoji: {
    fontSize: 26,
  },
  completedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  currentPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 2,
  },
  currentPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mealName: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 21,
  },
  generatingHint: {
    fontSize: 11,
    fontWeight: "600",
    fontStyle: "italic",
  },
  expandBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  doneWrapper: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  doneButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  doneText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  expandedContent: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 16,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
