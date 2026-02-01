import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react-native";

interface DaysRemainingBadgeProps {
  startDate: string | Date;
  endDate: string | Date;
  variant?: "default" | "compact" | "large";
  showIcon?: boolean;
}

type BadgeStatus = "active" | "urgent" | "complete" | "expired";

function getDaysRemaining(endDate: string | Date): number {
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

function getBadgeStatus(daysRemaining: number): BadgeStatus {
  if (daysRemaining < 0) return "expired";
  if (daysRemaining === 0) return "complete";
  if (daysRemaining <= 2) return "urgent";
  return "active";
}

export const DaysRemainingBadge: React.FC<DaysRemainingBadgeProps> = ({
  startDate,
  endDate,
  variant = "default",
  showIcon = true,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const daysRemaining = getDaysRemaining(endDate);
  const status = getBadgeStatus(daysRemaining);

  const getStatusConfig = () => {
    switch (status) {
      case "complete":
        return {
          backgroundColor: colors.emerald500 + "20",
          textColor: colors.emerald500,
          icon: CheckCircle2,
          label: t("menu.complete", "Complete"),
        };
      case "expired":
        return {
          backgroundColor: colors.icon + "20",
          textColor: colors.icon,
          icon: CheckCircle2,
          label: t("menu.ended", "Ended"),
        };
      case "urgent":
        return {
          backgroundColor: (colors.error || "#ef4444") + "20",
          textColor: colors.error || "#ef4444",
          icon: AlertCircle,
          label:
            daysRemaining === 1
              ? t("menu.last_day", "Last day!")
              : t("menu.days_remaining", "{{count}} days left", { count: daysRemaining }),
        };
      default:
        return {
          backgroundColor: colors.emerald500 + "20",
          textColor: colors.emerald500,
          icon: Clock,
          label: t("menu.days_remaining", "{{count}} days left", { count: daysRemaining }),
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  const isCompact = variant === "compact";
  const isLarge = variant === "large";

  return (
    <View
      style={[
        styles.badge,
        isCompact && styles.badgeCompact,
        isLarge && styles.badgeLarge,
        { backgroundColor: config.backgroundColor },
      ]}
    >
      {showIcon && (
        <IconComponent
          size={isCompact ? 12 : isLarge ? 18 : 14}
          color={config.textColor}
        />
      )}
      <Text
        style={[
          styles.badgeText,
          isCompact && styles.badgeTextCompact,
          isLarge && styles.badgeTextLarge,
          { color: config.textColor },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
};

export const DaysRemainingText: React.FC<{
  startDate: string | Date;
  endDate: string | Date;
  totalDays: number;
}> = ({ startDate, endDate, totalDays }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const daysRemaining = getDaysRemaining(endDate);
  const currentDay = totalDays - daysRemaining;
  const status = getBadgeStatus(daysRemaining);

  const textColor =
    status === "urgent" ? colors.error || "#ef4444" : colors.icon;

  return (
    <Text style={[styles.daysText, { color: textColor }]}>
      {daysRemaining > 0
        ? t("menu.day_progress", "{{current}} of {{total}} days", {
            current: Math.max(1, currentDay),
            total: totalDays,
          })
        : t("menu.complete", "Complete")}
      {daysRemaining > 0 && ` | ${daysRemaining} ${t("menu.remaining", "remaining")}`}
    </Text>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
  },
  badgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeLarge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  badgeTextCompact: {
    fontSize: 10,
  },
  badgeTextLarge: {
    fontSize: 14,
  },
  daysText: {
    fontSize: 13,
    fontWeight: "500",
  },
});

export default DaysRemainingBadge;
