import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Lightbulb, RefreshCw } from "lucide-react-native";

interface NutritionHabitsProps {
  style?: any;
}

const NUTRITION_TIPS = [
  {
    title: "Plate Size Psychology",
    tip: "Use smaller plates to naturally reduce portion sizes. Studies show people eat up to 30% less without feeling deprived when food fills a smaller plate.",
    icon: "🍽️",
  },
  {
    title: "Mindful Eating",
    tip: "Chew each bite 20-30 times. This simple practice helps you eat slower, improves digestion, and allows your brain to register fullness signals.",
    icon: "🧘",
  },
  {
    title: "Color Variety",
    tip: "Aim for 5 different colors on your plate. Colorful meals are naturally more nutritious and visually satisfying, reducing cravings later.",
    icon: "🌈",
  },
  {
    title: "The 20-Minute Rule",
    tip: "Wait 20 minutes before getting seconds. It takes this long for your brain to receive fullness signals from your stomach.",
    icon: "⏰",
  },
  {
    title: "Water First",
    tip: "Drink a glass of water 10 minutes before meals. This helps distinguish true hunger from thirst and naturally reduces overeating.",
    icon: "💧",
  },
  {
    title: "Eat Without Distractions",
    tip: "Turn off screens during meals. Mindful eating helps you recognize fullness cues and increases meal satisfaction by 40%.",
    icon: "📵",
  },
  {
    title: "Start with Vegetables",
    tip: "Eat your vegetables first when you're most hungry. This ensures you get essential nutrients and naturally reduces space for less nutritious foods.",
    icon: "🥗",
  },
  {
    title: "The Hand Measure",
    tip: "Use your palm for protein portions, fist for carbs, and thumb for fats. This simple visual guide prevents overeating without complex measuring.",
    icon: "✋",
  },
  {
    title: "Intermeal Spacing",
    tip: "Wait 4-5 hours between meals. This allows complete digestion and helps maintain stable blood sugar levels throughout the day.",
    icon: "⏱️",
  },
  {
    title: "Left-Hand Technique",
    tip: "If right-handed, try eating with your left hand (or vice versa). This slows down eating pace and increases awareness of each bite.",
    icon: "🥄",
  },
  {
    title: "Pre-Meal Ritual",
    tip: "Take 3 deep breaths before eating. This activates your rest-and-digest response, improving nutrient absorption and preventing stress eating.",
    icon: "🌬️",
  },
  {
    title: "Flavor Satisfaction",
    tip: "Include all taste profiles in meals: sweet, salty, sour, bitter, umami. Balanced flavors create psychological satisfaction and reduce post-meal cravings.",
    icon: "😋",
  },
  {
    title: "Visual Prep",
    tip: "Spend a moment looking at your meal before eating. Visual anticipation enhances satiety signals and makes you feel more satisfied with less food.",
    icon: "👁️",
  },
  {
    title: "Strategic Seating",
    tip: "Sit at a table for meals, never standing or walking. This creates a psychological meal boundary and prevents unconscious overeating.",
    icon: "🪑",
  },
  {
    title: "Portion Precommitment",
    tip: "Serve your portion and immediately store leftovers. Seeing available food triggers unconscious eating, even when full.",
    icon: "📦",
  },
];

export function NutritionHabits({ style }: NutritionHabitsProps) {
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    // Rotate tips daily
    const today = new Date().getDate();
    setCurrentTip(today % NUTRITION_TIPS.length);
  }, []);

  const handleRefresh = () => {
    setCurrentTip((prev) => (prev + 1) % NUTRITION_TIPS.length);
  };

  const tip = NUTRITION_TIPS[currentTip];

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Lightbulb size={20} color="#10B981" fill="#10B981" />
          <Text style={styles.headerTitle}>Nutrition Habit</Text>
        </View>
        <TouchableOpacity
          onPress={handleRefresh}
          style={styles.refreshButton}
          activeOpacity={0.7}
        >
          <RefreshCw size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Tip Card */}
      <View style={styles.tipCard}>
        <View style={styles.tipHeader}>
          <Text style={styles.tipIcon}>{tip.icon}</Text>
          <Text style={styles.tipTitle}>{tip.title}</Text>
        </View>
        <Text style={styles.tipText}>{tip.tip}</Text>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {NUTRITION_TIPS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index === currentTip && styles.progressDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  refreshButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  tipCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#10B981",
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  tipIcon: {
    fontSize: 20,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#065F46",
    flex: 1,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#047857",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
  },
  progressDotActive: {
    width: 20,
    backgroundColor: "#10B981",
  },
});
