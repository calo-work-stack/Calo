import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { Check, Circle, X, Minus } from "lucide-react-native";

export type DayStatus = "completed" | "in_progress" | "pending";

export interface DayProgress {
  day: number;
  date?: string;
  status: DayStatus;
  caloriesActual?: number;
  caloriesTarget?: number;
  goalMet?: boolean;
}

interface DayProgressRowProps {
  days: DayProgress[];
  currentDay?: number;
  onDayPress?: (day: number) => void;
  compact?: boolean;
  showDayNames?: boolean;
  startDate?: string;
}

export function calculateStreak(days: DayProgress[]): number {
  let streak = 0;
  // Iterate from the most recent completed day backwards
  const completedDays = [...days].filter(
    (d) => d.status === "completed" || d.status === "in_progress"
  );

  for (let i = completedDays.length - 1; i >= 0; i--) {
    if (completedDays[i].goalMet) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export const DayProgressRow: React.FC<DayProgressRowProps> = ({
  days,
  currentDay,
  onDayPress,
  compact = false,
  showDayNames = false,
  startDate,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { language } = useLanguage();

  // Calculate day names from start date
  const getDayName = (dayNumber: number): string => {
    if (!startDate) return "";
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayNumber - 1);
    return date.toLocaleDateString(
      language === "he" ? "he-IL" : "en-US",
      { weekday: "short" }
    );
  };

  const getStatusStyle = (status: DayStatus, goalMet?: boolean) => {
    if (status === "completed") {
      // Clear pass/fail distinction
      if (goalMet) {
        return {
          backgroundColor: colors.emerald500,
          borderColor: colors.emerald500,
          iconColor: "#ffffff",
          icon: Check,
        };
      } else {
        // Goal missed - red X
        return {
          backgroundColor: colors.error || "#ef4444",
          borderColor: colors.error || "#ef4444",
          iconColor: "#ffffff",
          icon: X,
        };
      }
    }
    if (status === "in_progress") {
      return {
        backgroundColor: "transparent",
        borderColor: colors.emerald500,
        iconColor: colors.emerald500,
        icon: Circle,
      };
    }
    return {
      backgroundColor: "transparent",
      borderColor: colors.border,
      iconColor: colors.border,
      icon: Minus,
    };
  };

  const renderDayIndicator = (day: DayProgress, index: number) => {
    const isCurrentDay = currentDay !== undefined && day.day === currentDay;
    const statusStyle = getStatusStyle(day.status, day.goalMet);
    const size = compact ? 28 : 36;
    const iconSize = compact ? 14 : 18;
    const IconComponent = statusStyle.icon;

    return (
      <Pressable
        key={day.day}
        onPress={() => onDayPress?.(day.day)}
        style={({ pressed }) => [
          styles.dayIndicator,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: statusStyle.backgroundColor,
            borderColor: statusStyle.borderColor,
            borderWidth: day.status === "pending" ? 1 : 2,
            opacity: pressed ? 0.7 : 1,
          },
          isCurrentDay && styles.currentDayIndicator,
        ]}
      >
        {day.status === "completed" ? (
          <IconComponent size={iconSize} color={statusStyle.iconColor} strokeWidth={3} />
        ) : day.status === "in_progress" ? (
          <Circle
            size={iconSize - 4}
            color={statusStyle.iconColor}
            fill={statusStyle.iconColor}
          />
        ) : (
          <View
            style={[
              styles.pendingDot,
              {
                width: compact ? 6 : 8,
                height: compact ? 6 : 8,
                backgroundColor: colors.border,
              },
            ]}
          />
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          compact && styles.scrollContentCompact,
        ]}
      >
        {days.map((day, index) => (
          <View key={day.day} style={styles.dayWrapper}>
            {showDayNames && startDate && (
              <Text style={[styles.dayName, { color: colors.icon }]}>
                {getDayName(day.day)}
              </Text>
            )}
            {renderDayIndicator(day, index)}
            {!compact && (
              <Text style={[styles.dayLabel, { color: colors.icon }]}>
                {day.day}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export const DayProgressRowCompact: React.FC<{
  days: DayProgress[];
  maxVisible?: number;
}> = ({ days, maxVisible = 7 }) => {
  const { colors } = useTheme();
  const visibleDays = days.slice(0, maxVisible);

  const getStatusStyle = (status: DayStatus, goalMet?: boolean) => {
    if (status === "completed") {
      // Clear pass/fail - green for met, red for missed
      return goalMet ? colors.emerald500 : (colors.error || "#ef4444");
    }
    if (status === "in_progress") {
      return colors.emerald500;
    }
    return colors.border;
  };

  return (
    <View style={styles.compactContainer}>
      {visibleDays.map((day) => (
        <View
          key={day.day}
          style={[
            styles.compactDot,
            {
              backgroundColor:
                day.status === "pending"
                  ? "transparent"
                  : getStatusStyle(day.status, day.goalMet),
              borderColor: getStatusStyle(day.status, day.goalMet),
              borderWidth: day.status === "pending" ? 1 : 0,
            },
          ]}
        >
          {day.status === "completed" && day.goalMet && (
            <Check size={8} color="#ffffff" strokeWidth={3} />
          )}
          {day.status === "completed" && !day.goalMet && (
            <X size={8} color="#ffffff" strokeWidth={3} />
          )}
        </View>
      ))}
      {days.length > maxVisible && (
        <Text style={[styles.moreText, { color: colors.icon }]}>
          +{days.length - maxVisible}
        </Text>
      )}
    </View>
  );
};

export const StreakBadge: React.FC<{
  streak: number;
  showLabel?: boolean;
}> = ({ streak, showLabel = true }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  // Return empty fragment instead of null to avoid hooks issues
  if (streak === 0) return <></>;

  return (
    <View style={[styles.streakBadge, { backgroundColor: "#f59e0b" + "20" }]}>
      <Text style={styles.streakEmoji}>🔥</Text>
      <Text style={[styles.streakCount, { color: "#f59e0b" }]}>{streak}</Text>
      {showLabel && (
        <Text style={[styles.streakLabel, { color: "#f59e0b" }]}>
          {t("menu.day_streak", "day streak")}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  scrollContentCompact: {
    gap: 8,
    paddingHorizontal: 12,
  },
  dayWrapper: {
    alignItems: "center",
    gap: 6,
  },
  dayIndicator: {
    justifyContent: "center",
    alignItems: "center",
  },
  currentDayIndicator: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  pendingDot: {
    borderRadius: 10,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  dayName: {
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  compactDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  moreText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 2,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  streakEmoji: {
    fontSize: 14,
  },
  streakCount: {
    fontSize: 14,
    fontWeight: "800",
  },
  streakLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
});

export default DayProgressRow;
