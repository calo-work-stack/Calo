import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Sun,
  UtensilsCrossed,
  Moon,
  Coffee,
  Apple,
  Flame,
  CreditCard,
  Eye,
  Play,
  LucideIcon
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { RecommendedMenu } from "../../types/menu";

interface MenuCardProps {
  menu: RecommendedMenu;
  isRTL: boolean;
  onStart: (menuId: string) => void;
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  index: number;
}

export default function MenuCard({
  menu,
  isRTL,
  onStart,
  fadeAnim,
  slideAnim,
  index,
}: MenuCardProps) {
  const router = useRouter();

  const getMealTypeIcon = (mealType: string): LucideIcon => {
    switch (mealType.toLowerCase()) {
      case "breakfast":
        return Sun;
      case "lunch":
        return UtensilsCrossed;
      case "dinner":
        return Moon;
      case "snack":
        return Coffee;
      default:
        return Apple;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(isRTL ? "he-IL" : "en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Animated.View
      style={[
        styles.menuCard,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 50],
                outputRange: [0, 50 + index * 10],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.cardContainer}>
        {/* Clean Header with Gradient */}
        <LinearGradient
          colors={["#10b981", "#059669"]}
          style={styles.headerGradient}
        >
          <View style={[styles.headerContent, isRTL && styles.rtlRow]}>
            <View style={[styles.headerLeft, isRTL && styles.rtlHeaderLeft]}>
              <View style={styles.headerTextContainer}>
                <Text style={[styles.menuTitle, isRTL && styles.rtlText]}>
                  {menu.title}
                </Text>
                <Text style={[styles.dateText, isRTL && styles.rtlText]}>
                  {formatDate(menu.created_at)}
                </Text>
              </View>
            </View>

            <View style={styles.daysContainer}>
              <Text style={styles.daysNumber}>{menu.days_count}</Text>
              <Text style={styles.daysLabel}>{isRTL ? "ימים" : "Days"}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Content */}
        <View style={styles.contentContainer}>
          {/* Description */}
          {menu.description && (
            <View style={styles.descriptionSection}>
              <Text style={[styles.description, isRTL && styles.rtlText]}>
                {menu.description}
              </Text>
            </View>
          )}

          {/* Clean Nutrition Breakdown */}
          <View style={styles.nutritionSection}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
              {isRTL ? "פירוט תזונתי" : "Nutrition Breakdown"}
            </Text>

            <View style={styles.nutritionContainer}>
              {/* Calories - Main */}
              <View style={styles.caloriesCard}>
                <View style={styles.nutritionIcon}>
                  <Flame size={20} color="#ef4444" />
                </View>
                <Text style={styles.caloriesValue}>{menu.total_calories}</Text>
                <Text style={[styles.caloriesLabel, isRTL && styles.rtlText]}>
                  {isRTL ? "קלוריות" : "Calories"}
                </Text>
              </View>

              {/* Macros Row */}
              <View style={styles.macrosRow}>
                <View style={styles.macroCard}>
                  <Text style={styles.macroValue}>
                    {menu.total_protein || 0}g
                  </Text>
                  <Text style={[styles.macroLabel, isRTL && styles.rtlText]}>
                    {isRTL ? "חלבון" : "Protein"}
                  </Text>
                </View>
                <View style={styles.macroCard}>
                  <Text style={styles.macroValue}>
                    {menu.total_carbs || 0}g
                  </Text>
                  <Text style={[styles.macroLabel, isRTL && styles.rtlText]}>
                    {isRTL ? "פחמימות" : "Carbs"}
                  </Text>
                </View>
                <View style={styles.macroCard}>
                  <Text style={styles.macroValue}>{menu.total_fat || 0}g</Text>
                  <Text style={[styles.macroLabel, isRTL && styles.rtlText]}>
                    {isRTL ? "שומן" : "Fat"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Simple Meals Preview */}
          <View style={styles.mealsSection}>
            <View style={[styles.mealsSectionHeader, isRTL && styles.rtlRow]}>
              <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                {isRTL ? "ארוחות לדוגמה" : "Sample Meals"}
              </Text>
              <Text style={styles.mealsCount}>
                {menu.meals.length} {isRTL ? "ארוחות" : "meals"}
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.mealsScrollContainer,
                isRTL && styles.rtlScrollContent,
              ]}
            >
              {menu.meals
                .slice(0, 5)
                .map(
                  (
                    meal: {
                      meal_id: any;
                      meal_type: string;
                      name:
                        | string
                        | number
                        | bigint
                        | boolean
                        | React.ReactElement<
                            unknown,
                            string | React.JSXElementConstructor<any>
                          >
                        | Iterable<React.ReactNode>
                        | React.ReactPortal
                        | Promise<
                            | string
                            | number
                            | bigint
                            | boolean
                            | React.ReactPortal
                            | React.ReactElement<
                                unknown,
                                string | React.JSXElementConstructor<any>
                              >
                            | Iterable<React.ReactNode>
                            | null
                            | undefined
                          >
                        | null
                        | undefined;
                      calories:
                        | string
                        | number
                        | bigint
                        | boolean
                        | React.ReactElement<
                            unknown,
                            string | React.JSXElementConstructor<any>
                          >
                        | Iterable<React.ReactNode>
                        | React.ReactPortal
                        | Promise<
                            | string
                            | number
                            | bigint
                            | boolean
                            | React.ReactPortal
                            | React.ReactElement<
                                unknown,
                                string | React.JSXElementConstructor<any>
                              >
                            | Iterable<React.ReactNode>
                            | null
                            | undefined
                          >
                        | null
                        | undefined;
                    },
                    mealIndex: any
                  ) => (
                    <View
                      key={`meal-${meal.meal_id}-${mealIndex}`}
                      style={styles.mealCard}
                    >
                      <View style={styles.mealIcon}>
                        {React.createElement(getMealTypeIcon(meal.meal_type), {
                          size: 16,
                          color: "#6b7280"
                        })}
                      </View>
                      <Text
                        style={[styles.mealName, isRTL && styles.rtlText]}
                        numberOfLines={2}
                      >
                        {meal.name}
                      </Text>
                      <Text style={styles.mealCalories}>
                        {meal.calories} {isRTL ? "קלוריות" : "cal"}
                      </Text>
                    </View>
                  )
                )}
            </ScrollView>
          </View>

          {/* Clean Footer */}
          <View style={styles.footerSection}>
            {menu.estimated_cost && (
              <View style={[styles.costInfo, isRTL && styles.rtlRow]}>
                <CreditCard size={16} color="#6b7280" />
                <Text style={[styles.costText, isRTL && styles.rtlText]}>
                  {isRTL ? "עלות משוערת:" : "Estimated cost:"}
                </Text>
                <Text style={styles.costValue}>
                  ₪{menu.estimated_cost.toFixed(0)}
                </Text>
              </View>
            )}

            <View style={[styles.actionButtons, isRTL && styles.rtlRow]}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push(`/menu/${menu.menu_id}`)}
              >
                <Eye size={16} color="#10b981" />
                <Text
                  style={[styles.secondaryButtonText, isRTL && styles.rtlText]}
                >
                  {isRTL ? "צפה בפרטים" : "View Details"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => onStart(menu.menu_id)}
              >
                <Play size={16} color="#ffffff" />
                <Text
                  style={[styles.primaryButtonText, isRTL && styles.rtlText]}
                >
                  {isRTL ? "התחל עכשיו" : "Start Now"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  menuCard: {
    marginBottom: 20,
    marginHorizontal: 4,
  },
  cardContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    overflow: "hidden",
  },

  // Clean Header
  headerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rtlHeaderLeft: {
    flexDirection: "row-reverse",
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 2,
  },
  dateText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  daysContainer: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  daysNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
  },
  daysLabel: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
    textTransform: "uppercase",
  },

  // Content
  contentContainer: {
    padding: 20,
  },

  // Description
  descriptionSection: {
    marginBottom: 20,
  },
  description: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    fontStyle: "italic",
  },

  // Section Titles
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },

  // Clean Nutrition
  nutritionSection: {
    marginBottom: 20,
  },
  nutritionContainer: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
  },
  caloriesCard: {
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginBottom: 16,
  },
  nutritionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  caloriesValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#374151",
    marginBottom: 2,
  },
  caloriesLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  macroCard: {
    alignItems: "center",
    flex: 1,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 2,
  },
  macroLabel: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
    textTransform: "uppercase",
  },

  // Simple Meals
  mealsSection: {
    marginBottom: 20,
  },
  mealsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  mealsCount: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "600",
    backgroundColor: "#f0fdf4",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  mealsScrollContainer: {
    paddingRight: 20,
    gap: 12,
  },
  rtlScrollContent: {
    flexDirection: "row-reverse",
  },
  mealCard: {
    width: 140,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    alignItems: "center",
  },
  mealIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f9fafb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  mealName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    marginBottom: 6,
    lineHeight: 16,
  },
  mealCalories: {
    fontSize: 11,
    color: "#10b981",
    fontWeight: "600",
  },

  // Clean Footer
  footerSection: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 16,
  },
  costInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  costText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
  costValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#10b981",
  },
  primaryButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },

  // RTL Support
  rtlText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  rtlRow: {
    flexDirection: "row-reverse",
  },
});
