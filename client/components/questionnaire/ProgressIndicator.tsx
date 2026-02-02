import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTranslation } from "react-i18next";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import {
  User,
  Target,
  Activity,
  Heart,
  Utensils,
  Leaf,
  Moon,
  Settings,
  Check,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const STEP_ICONS = [User, Target, Activity, Heart, Utensils, Leaf, Moon, Settings];

const STEP_KEYS = [
  "personal",
  "goals",
  "activity",
  "health",
  "means",
  "dietary",
  "lifestyle",
  "preferences",
];

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const isRTL = currentLanguage === "he";
  const progressPercentage = (currentStep / totalSteps) * 100;

  const getStepTitle = (step: number): string => {
    const key = STEP_KEYS[step - 1];
    return t(`questionnaire.steps.${key}.title`, { defaultValue: key });
  };

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      {/* Step Title */}
      <View style={styles.titleRow}>
        <Text style={[styles.stepLabel, { color: colors.textSecondary }]}>
          {t("questionnaire.step", { defaultValue: "Step" })} {currentStep}
        </Text>
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          {getStepTitle(currentStep)}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            { backgroundColor: isDark ? colors.border : "#E5E7EB" },
          ]}
        >
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: `${progressPercentage}%`,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          {currentStep}/{totalSteps}
        </Text>
      </View>

      {/* Step Dots */}
      <View style={[styles.dotsContainer, isRTL && styles.dotsContainerRTL]}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          const Icon = STEP_ICONS[index];

          return (
            <View key={stepNum} style={styles.dotWrapper}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isCompleted
                      ? colors.primary
                      : isCurrent
                      ? colors.primary
                      : isDark
                      ? colors.border
                      : "#E5E7EB",
                    borderWidth: isCurrent ? 2 : 0,
                    borderColor: colors.primary,
                    transform: [{ scale: isCurrent ? 1.2 : 1 }],
                  },
                ]}
              >
                {isCompleted ? (
                  <Check size={10} color="white" strokeWidth={3} />
                ) : isCurrent ? (
                  <Icon size={12} color="white" />
                ) : (
                  <View
                    style={[
                      styles.dotInner,
                      {
                        backgroundColor: isDark ? "#374151" : "#9CA3AF",
                      },
                    ]}
                  />
                )}
              </View>
              {index < totalSteps - 1 && (
                <View
                  style={[
                    styles.connector,
                    {
                      backgroundColor: isCompleted
                        ? colors.primary
                        : isDark
                        ? colors.border
                        : "#E5E7EB",
                    },
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  titleRow: {
    alignItems: "center",
    marginBottom: 16,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    fontWeight: "600",
    minWidth: 32,
    textAlign: "right",
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  dotsContainerRTL: {
    flexDirection: "row-reverse",
  },
  dotWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  dotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connector: {
    width: (width - 48 - 22 * 8) / 7,
    height: 2,
    marginHorizontal: 2,
  },
});

export default ProgressIndicator;
