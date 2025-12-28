import React, { ReactNode } from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  StyleSheet,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from "@/constants/theme";

export type PageSection =
  | { type: "stats"; data: StatSection }
  | { type: "actions"; data: ActionSection }
  | { type: "calendar"; data: CalendarSection }
  | { type: "metrics"; data: MetricsSection }
  | { type: "custom"; data: CustomSection };

interface StatSection {
  items: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    color?: string;
  }>;
  columns?: 2 | 3 | 4;
}

interface ActionSection {
  items: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    color?: string;
  }>;
  columns?: 2 | 3;
}

interface CalendarSection {
  component: ReactNode;
}

interface MetricsSection {
  items: Array<{
    title: string;
    value: string;
    subtitle?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    color?: string;
  }>;
}

interface CustomSection {
  component: ReactNode;
}

interface PageTemplateProps {
  pageName: string;
  title: string;
  subtitle?: string;
  headerIcon?: keyof typeof Ionicons.glyphMap;
  sections: PageSection[];
  refreshing?: boolean;
  onRefresh?: () => void;
  headerGradient?: string[];
  showBackButton?: boolean;
  onBackPress?: () => void;
  headerRight?: ReactNode;
}

export const PageTemplate: React.FC<PageTemplateProps> = ({
  pageName,
  title,
  subtitle,
  headerIcon,
  sections,
  refreshing = false,
  onRefresh,
  headerGradient = [
    colors.primary[500],
    colors.primary[600],
    colors.primary[700],
  ],
  showBackButton = false,
  onBackPress,
  headerRight,
}) => {
  const renderStatsSection = (section: StatSection) => {
    const columns = section.columns || 2;
    const itemWidth = columns === 2 ? "48%" : columns === 3 ? "31%" : "23%";

    return (
      <View style={styles.statsGrid}>
        {section.items.map((item, index) => (
          <View key={index} style={[styles.statCard, { width: itemWidth }]}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: item.color || colors.primary[100] },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={24}
                color={item.color || colors.primary[600]}
              />
            </View>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderActionsSection = (section: ActionSection) => {
    const columns = section.columns || 2;
    const itemWidth = columns === 2 ? "48%" : "31%";

    return (
      <View style={styles.actionsGrid}>
        {section.items.map((item, index) => (
          <Pressable
            key={index}
            style={[styles.actionCard, { width: itemWidth }]}
            onPress={item.onPress}
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: item.color || colors.primary[100] },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={28}
                color={item.color || colors.primary[600]}
              />
            </View>
            <Text style={styles.actionLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  };

  const renderMetricsSection = (section: MetricsSection) => {
    return (
      <View style={styles.metricsContainer}>
        {section.items.map((item, index) => (
          <View key={index} style={styles.metricCard}>
            {item.icon && (
              <View
                style={[
                  styles.metricIconContainer,
                  { backgroundColor: item.color || colors.primary[100] },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={24}
                  color={item.color || colors.primary[600]}
                />
              </View>
            )}
            <View style={styles.metricContent}>
              <Text style={styles.metricTitle}>{item.title}</Text>
              <Text style={styles.metricValue}>{item.value}</Text>
              {item.subtitle && (
                <Text style={styles.metricSubtitle}>{item.subtitle}</Text>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderSection = (section: PageSection, index: number) => {
    switch (section.type) {
      case "stats":
        return (
          <View key={index} style={styles.section}>
            {renderStatsSection(section.data)}
          </View>
        );
      case "actions":
        return (
          <View key={index} style={styles.section}>
            {renderActionsSection(section.data)}
          </View>
        );
      case "metrics":
        return (
          <View key={index} style={styles.section}>
            {renderMetricsSection(section.data)}
          </View>
        );
      case "calendar":
        return (
          <View key={index} style={styles.section}>
            {section.data.component}
          </View>
        );
      case "custom":
        return (
          <View key={index} style={styles.section}>
            {section.data.component}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={headerGradient} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            {showBackButton && (
              <Pressable onPress={onBackPress} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </Pressable>
            )}
            {headerIcon && (
              <View style={styles.headerIconContainer}>
                <Ionicons name={headerIcon} size={32} color="#fff" />
              </View>
            )}
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{title}</Text>
              {subtitle && (
                <Text style={styles.headerSubtitle}>{subtitle}</Text>
              )}
            </View>
            {headerRight && (
              <View style={styles.headerRight}>{headerRight}</View>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary[500]]}
              tintColor={colors.primary[500]}
            />
          ) : undefined
        }
      >
        {sections.map((section, index) => renderSection(section, index))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing["3xl"],
    paddingHorizontal: spacing.xl,
  },
  headerContent: {
    gap: spacing.lg,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
    color: "#fff",
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.base,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: typography.fontWeight.medium,
  },
  headerRight: {
    marginLeft: "auto",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.xl,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.lg,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    ...shadows.md,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  statValue: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[600],
    textAlign: "center",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  actionCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: "center",
    ...shadows.md,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  actionLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[900],
    textAlign: "center",
  },
  metricsContainer: {
    gap: spacing.md,
  },
  metricCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    ...shadows.md,
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  metricContent: {
    flex: 1,
  },
  metricTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[600],
    marginBottom: spacing.xs,
  },
  metricValue: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[900],
  },
  metricSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[500],
    marginTop: spacing.xs,
  },
});
