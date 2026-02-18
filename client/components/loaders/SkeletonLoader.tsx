import React, { useEffect, useRef } from "react";
import { StyleSheet, Dimensions } from "react-native";
import { Animated, Easing, View } from "react-native";
import { useTheme } from "@/src/context/ThemeContext";

const { width } = Dimensions.get("window");

// Base skeleton pulse animation component
export const SkeletonPulse = React.memo(({ style }: { style?: any }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return <Animated.View style={[style, { opacity: pulseAnim }]} />;
});

// Menu Card Skeleton
export const MenuCardSkeleton = React.memo(({ colors }: { colors: any }) => (
  <View style={[styles.skeletonCard, { backgroundColor: colors.card }]}>
    <View style={styles.skeletonHeader}>
      <SkeletonPulse
        style={[styles.skeletonIcon, { backgroundColor: colors.border }]}
      />
      <View style={styles.skeletonBadges}>
        <SkeletonPulse
          style={[styles.skeletonBadge, { backgroundColor: colors.border }]}
        />
        <SkeletonPulse
          style={[styles.skeletonBadge, { backgroundColor: colors.border }]}
        />
      </View>
    </View>
    <SkeletonPulse
      style={[styles.skeletonTitle, { backgroundColor: colors.border }]}
    />
    <SkeletonPulse
      style={[styles.skeletonSubtitle, { backgroundColor: colors.border }]}
    />
    <View style={styles.skeletonStats}>
      {[1, 2, 3].map((i) => (
        <SkeletonPulse
          key={i}
          style={[styles.skeletonStat, { backgroundColor: colors.border }]}
        />
      ))}
    </View>
    <View style={styles.skeletonActions}>
      <SkeletonPulse
        style={[styles.skeletonButton, { backgroundColor: colors.border }]}
      />
      <SkeletonPulse
        style={[styles.skeletonButton, { backgroundColor: colors.border }]}
      />
    </View>
  </View>
));

// Meal Card Skeleton
export const MealCardSkeleton = React.memo(({ colors }: { colors: any }) => (
  <View style={[styles.mealCard, { backgroundColor: colors.card }]}>
    <View style={styles.mealCardContent}>
      <SkeletonPulse
        style={[styles.mealImage, { backgroundColor: colors.border }]}
      />
      <View style={styles.mealInfo}>
        <SkeletonPulse
          style={[styles.mealTitle, { backgroundColor: colors.border }]}
        />
        <SkeletonPulse
          style={[styles.mealSubtitle, { backgroundColor: colors.border }]}
        />
        <View style={styles.mealMacros}>
          <SkeletonPulse
            style={[styles.macroChip, { backgroundColor: colors.border }]}
          />
          <SkeletonPulse
            style={[styles.macroChip, { backgroundColor: colors.border }]}
          />
          <SkeletonPulse
            style={[styles.macroChip, { backgroundColor: colors.border }]}
          />
        </View>
      </View>
    </View>
    <View style={styles.mealActions}>
      <SkeletonPulse
        style={[styles.mealActionBtn, { backgroundColor: colors.border }]}
      />
      <SkeletonPulse
        style={[styles.mealActionBtn, { backgroundColor: colors.border }]}
      />
      <SkeletonPulse
        style={[styles.mealActionBtn, { backgroundColor: colors.border }]}
      />
    </View>
  </View>
));

// Home Screen Skeleton
export const HomeScreenSkeleton = React.memo(({ colors: colorsProp }: { colors?: any } = {}) => {
  const { colors: themeColors } = useTheme();
  const colors = colorsProp || themeColors;
  return (
  <View style={styles.homeContainer}>
    {/* Greeting Card */}
    <SkeletonPulse
      style={[styles.greetingCard, { backgroundColor: colors.border }]}
    />

    {/* Active Menu Card */}
    <SkeletonPulse
      style={[styles.activeMenuCard, { backgroundColor: colors.card }]}
    />

    {/* Circular Progress */}
    <View style={[styles.progressSection, { backgroundColor: colors.card }]}>
      <SkeletonPulse
        style={[styles.circularProgress, { backgroundColor: colors.border }]}
      />
      <View style={styles.macroProgressRow}>
        {[1, 2, 3].map((i) => (
          <SkeletonPulse
            key={i}
            style={[styles.macroProgress, { backgroundColor: colors.border }]}
          />
        ))}
      </View>
    </View>

    {/* Water Intake */}
    <View style={[styles.waterCard, { backgroundColor: colors.card }]}>
      <SkeletonPulse
        style={[styles.waterHeader, { backgroundColor: colors.border }]}
      />
      <View style={styles.waterCups}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonPulse
            key={i}
            style={[styles.waterCup, { backgroundColor: colors.border }]}
          />
        ))}
      </View>
    </View>

    {/* Stats Grid */}
    <View style={styles.statsGrid}>
      <SkeletonPulse
        style={[styles.statCardSkeleton, { backgroundColor: colors.card }]}
      />
      <SkeletonPulse
        style={[styles.statCardSkeleton, { backgroundColor: colors.card }]}
      />
    </View>

    {/* Quick Actions */}
    <View style={styles.actionsGrid}>
      {[1, 2, 3, 4].map((i) => (
        <SkeletonPulse
          key={i}
          style={[styles.actionCardSkeleton, { backgroundColor: colors.card }]}
        />
      ))}
    </View>
  </View>
  );
});

// History Screen Skeleton
export const HistoryScreenSkeleton = React.memo(({ colors: colorsProp }: { colors?: any } = {}) => {
  const { colors: themeColors } = useTheme();
  const colors = colorsProp || themeColors;
  return (
    <View style={styles.historyContainer}>
      {/* Header */}
      <View style={styles.historyHeader}>
        <SkeletonPulse
          style={[styles.historyTitle, { backgroundColor: colors.border }]}
        />
        <SkeletonPulse
          style={[styles.historySubtitle, { backgroundColor: colors.border }]}
        />
      </View>

      {/* Search Bar */}
      <SkeletonPulse
        style={[styles.searchBar, { backgroundColor: colors.card }]}
      />

      {/* Insights Card */}
      <View style={[styles.insightsCard, { backgroundColor: colors.card }]}>
        <View style={styles.insightsRow}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.insightItem}>
              <SkeletonPulse
                style={[styles.insightValue, { backgroundColor: colors.border }]}
              />
              <SkeletonPulse
                style={[styles.insightLabel, { backgroundColor: colors.border }]}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Meal Cards */}
      {[1, 2, 3].map((i) => (
        <MealCardSkeleton key={i} colors={colors} />
      ))}
    </View>
  );
});

// Statistics Screen Skeleton
export const StatisticsScreenSkeleton = React.memo(({ colors: colorsProp }: { colors?: any } = {}) => {
  const { colors: themeColors } = useTheme();
  const colors = colorsProp || themeColors;
  return (
    <View style={styles.statsContainer}>
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonPulse
            key={i}
            style={[styles.periodTab, { backgroundColor: colors.border }]}
          />
        ))}
      </View>

      {/* Chart Card */}
      <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
        <SkeletonPulse
          style={[styles.chartTitle, { backgroundColor: colors.border }]}
        />
        <SkeletonPulse
          style={[styles.chart, { backgroundColor: colors.border }]}
        />
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <SkeletonPulse
              style={[styles.summaryIcon, { backgroundColor: colors.border }]}
            />
            <SkeletonPulse
              style={[styles.summaryValue, { backgroundColor: colors.border }]}
            />
            <SkeletonPulse
              style={[styles.summaryLabel, { backgroundColor: colors.border }]}
            />
          </View>
        ))}
      </View>

      {/* Achievements */}
      <View style={[styles.achievementsCard, { backgroundColor: colors.card }]}>
        <SkeletonPulse
          style={[styles.sectionTitle, { backgroundColor: colors.border }]}
        />
        <View style={styles.achievementsList}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.achievementItem}>
              <SkeletonPulse
                style={[styles.achievementIcon, { backgroundColor: colors.border }]}
              />
              <View style={styles.achievementInfo}>
                <SkeletonPulse
                  style={[styles.achievementTitle, { backgroundColor: colors.border }]}
                />
                <SkeletonPulse
                  style={[styles.achievementDesc, { backgroundColor: colors.border }]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
});

// Profile Screen Skeleton
export const ProfileScreenSkeleton = React.memo(({ colors }: { colors: any }) => (
  <View style={styles.profileContainer}>
    {/* Avatar */}
    <View style={styles.profileHeader}>
      <SkeletonPulse
        style={[styles.avatar, { backgroundColor: colors.border }]}
      />
      <SkeletonPulse
        style={[styles.profileName, { backgroundColor: colors.border }]}
      />
      <SkeletonPulse
        style={[styles.profileEmail, { backgroundColor: colors.border }]}
      />
    </View>

    {/* Stats Row */}
    <View style={[styles.profileStatsRow, { backgroundColor: colors.card }]}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.profileStatItem}>
          <SkeletonPulse
            style={[styles.profileStatValue, { backgroundColor: colors.border }]}
          />
          <SkeletonPulse
            style={[styles.profileStatLabel, { backgroundColor: colors.border }]}
          />
        </View>
      ))}
    </View>

    {/* Menu Items */}
    <View style={[styles.menuSection, { backgroundColor: colors.card }]}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.menuItem}>
          <SkeletonPulse
            style={[styles.menuIcon, { backgroundColor: colors.border }]}
          />
          <SkeletonPulse
            style={[styles.menuLabel, { backgroundColor: colors.border }]}
          />
        </View>
      ))}
    </View>
  </View>
));

// Chat Message Skeleton
export const ChatMessageSkeleton = React.memo(({ colors: colorsProp, isUser = false }: { colors?: any; isUser?: boolean } = {}) => {
  const { colors: themeColors } = useTheme();
  const colors = colorsProp || themeColors;
  return (
    <View style={[styles.chatMessage, isUser && styles.chatMessageUser]}>
      {!isUser && (
        <SkeletonPulse
          style={[styles.chatAvatar, { backgroundColor: colors.border }]}
        />
      )}
      <View style={[styles.chatBubble, { backgroundColor: colors.card }]}>
        <SkeletonPulse
          style={[styles.chatLine, { backgroundColor: colors.border, width: "100%" }]}
        />
        <SkeletonPulse
          style={[styles.chatLine, { backgroundColor: colors.border, width: "80%" }]}
        />
        <SkeletonPulse
          style={[styles.chatLine, { backgroundColor: colors.border, width: "60%" }]}
        />
      </View>
      {isUser && (
        <SkeletonPulse
          style={[styles.chatAvatar, { backgroundColor: colors.border }]}
        />
      )}
    </View>
  );
});

// List Item Skeleton
export const ListItemSkeleton = React.memo(({ colors }: { colors: any }) => (
  <View style={[styles.listItem, { backgroundColor: colors.card }]}>
    <SkeletonPulse
      style={[styles.listIcon, { backgroundColor: colors.border }]}
    />
    <View style={styles.listContent}>
      <SkeletonPulse
        style={[styles.listTitle, { backgroundColor: colors.border }]}
      />
      <SkeletonPulse
        style={[styles.listSubtitle, { backgroundColor: colors.border }]}
      />
    </View>
    <SkeletonPulse
      style={[styles.listAction, { backgroundColor: colors.border }]}
    />
  </View>
));

// Calendar Skeleton
export const CalendarSkeleton = React.memo(({ colors: colorsProp }: { colors?: any } = {}) => {
  const { colors: themeColors } = useTheme();
  const colors = colorsProp || themeColors;
  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <SkeletonPulse
          style={[styles.calendarNav, { backgroundColor: colors.border }]}
        />
        <SkeletonPulse
          style={[styles.calendarMonth, { backgroundColor: colors.border }]}
        />
        <SkeletonPulse
          style={[styles.calendarNav, { backgroundColor: colors.border }]}
        />
      </View>
      <View style={styles.calendarDays}>
        {[...Array(7)].map((_, i) => (
          <SkeletonPulse
            key={i}
            style={[styles.calendarDayHeader, { backgroundColor: colors.border }]}
          />
        ))}
      </View>
      <View style={styles.calendarGrid}>
        {[...Array(35)].map((_, i) => (
          <SkeletonPulse
            key={i}
            style={[styles.calendarDay, { backgroundColor: colors.border }]}
          />
        ))}
      </View>
    </View>
  );
});

// Device Card Skeleton
export const DeviceCardSkeleton = React.memo(({ colors: colorsProp }: { colors?: any } = {}) => {
  const { colors: themeColors } = useTheme();
  const colors = colorsProp || themeColors;
  return (
    <View style={[styles.deviceCard, { backgroundColor: colors.card }]}>
      <SkeletonPulse
        style={[styles.deviceIcon, { backgroundColor: colors.border }]}
      />
      <View style={styles.deviceInfo}>
        <SkeletonPulse
          style={[styles.deviceName, { backgroundColor: colors.border }]}
        />
        <SkeletonPulse
          style={[styles.deviceStatus, { backgroundColor: colors.border }]}
        />
      </View>
      <SkeletonPulse
        style={[styles.deviceAction, { backgroundColor: colors.border }]}
      />
    </View>
  );
});

// Active Menu Skeleton (for index.tsx)
export const ActiveMenuSkeleton = React.memo(({ colors: colorsProp }: { colors?: any } = {}) => {
  const { colors: themeColors } = useTheme();
  const colors = colorsProp || themeColors;
  return (
    <View style={styles.activeMenuContainer}>
      <View style={[styles.activeMenuSkeleton, { backgroundColor: colors.warmOrange ? colors.warmOrange + "18" : colors.border + "30" }]}>
        <View style={styles.activeMenuRow}>
          <SkeletonPulse
            style={[styles.activeMenuIcon, { backgroundColor: colors.border }]}
          />
          <View style={styles.activeMenuText}>
            <SkeletonPulse
              style={[{ width: "35%", height: 11, borderRadius: 5, marginBottom: 6 }, { backgroundColor: colors.border }]}
            />
            <SkeletonPulse
              style={[{ width: "65%", height: 16, borderRadius: 8, marginBottom: 8 }, { backgroundColor: colors.border }]}
            />
            <SkeletonPulse
              style={[{ width: "50%", height: 10, borderRadius: 5 }, { backgroundColor: colors.border }]}
            />
          </View>
          <SkeletonPulse
            style={[{ width: 40, height: 40, borderRadius: 20 }, { backgroundColor: colors.border }]}
          />
        </View>
        <SkeletonPulse
          style={[{ width: "100%", height: 4, borderRadius: 2, marginTop: 14 }, { backgroundColor: colors.border }]}
        />
      </View>
    </View>
  );
});

// AI Chat Screen Skeleton
export const AIChatSkeleton = React.memo(({ colors: colorsProp }: { colors?: any } = {}) => {
  const { colors: themeColors } = useTheme();
  const colors = colorsProp || themeColors;
  return (
    <View style={styles.aiChatContainer}>
      {/* Chat header */}
      <View style={[styles.aiChatHeader, { backgroundColor: colors.card }]}>
        <SkeletonPulse style={[{ width: 40, height: 40, borderRadius: 20 }, { backgroundColor: colors.border }]} />
        <View style={{ flex: 1, gap: 6, marginLeft: 12 }}>
          <SkeletonPulse style={[{ width: "45%", height: 16, borderRadius: 8 }, { backgroundColor: colors.border }]} />
          <SkeletonPulse style={[{ width: "30%", height: 12, borderRadius: 6 }, { backgroundColor: colors.border }]} />
        </View>
      </View>

      {/* Messages area */}
      <View style={styles.aiChatMessages}>
        {/* AI message */}
        <View style={styles.aiMsgRow}>
          <SkeletonPulse style={[{ width: 32, height: 32, borderRadius: 16 }, { backgroundColor: colors.border }]} />
          <View style={[styles.aiChatBubble, { backgroundColor: colors.card }]}>
            <SkeletonPulse style={[{ width: "90%", height: 13, borderRadius: 4 }, { backgroundColor: colors.border }]} />
            <SkeletonPulse style={[{ width: "75%", height: 13, borderRadius: 4 }, { backgroundColor: colors.border }]} />
            <SkeletonPulse style={[{ width: "60%", height: 13, borderRadius: 4 }, { backgroundColor: colors.border }]} />
          </View>
        </View>

        {/* User message */}
        <View style={[styles.aiMsgRow, { justifyContent: "flex-end" }]}>
          <View style={[styles.aiChatBubbleUser, { backgroundColor: colors.border + "40" }]}>
            <SkeletonPulse style={[{ width: "100%", height: 13, borderRadius: 4 }, { backgroundColor: colors.border }]} />
            <SkeletonPulse style={[{ width: "70%", height: 13, borderRadius: 4 }, { backgroundColor: colors.border }]} />
          </View>
        </View>

        {/* AI message */}
        <View style={styles.aiMsgRow}>
          <SkeletonPulse style={[{ width: 32, height: 32, borderRadius: 16 }, { backgroundColor: colors.border }]} />
          <View style={[styles.aiChatBubble, { backgroundColor: colors.card }]}>
            <SkeletonPulse style={[{ width: "85%", height: 13, borderRadius: 4 }, { backgroundColor: colors.border }]} />
            <SkeletonPulse style={[{ width: "95%", height: 13, borderRadius: 4 }, { backgroundColor: colors.border }]} />
            <SkeletonPulse style={[{ width: "45%", height: 13, borderRadius: 4 }, { backgroundColor: colors.border }]} />
          </View>
        </View>
      </View>

      {/* Input bar */}
      <View style={[styles.aiChatInputBar, { backgroundColor: colors.card }]}>
        <SkeletonPulse style={[{ flex: 1, height: 44, borderRadius: 22 }, { backgroundColor: colors.border }]} />
        <SkeletonPulse style={[{ width: 44, height: 44, borderRadius: 22, marginLeft: 10 }, { backgroundColor: colors.border }]} />
      </View>
    </View>
  );
});

// Calendar Daily Summary Skeleton
export const CalendarDailySummarySkeleton = React.memo(({ colors: colorsProp }: { colors?: any } = {}) => {
  const { colors: themeColors } = useTheme();
  const colors = colorsProp || themeColors;
  return (
    <View style={[styles.dailySummaryCard, { backgroundColor: colors.card }]}>
      {/* Nutrition grid */}
      <View style={styles.dailySummaryGrid}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.dailySummaryItem}>
            <SkeletonPulse style={[{ width: 36, height: 36, borderRadius: 18 }, { backgroundColor: colors.border }]} />
            <SkeletonPulse style={[{ width: 40, height: 18, borderRadius: 6, marginTop: 6 }, { backgroundColor: colors.border }]} />
            <SkeletonPulse style={[{ width: 50, height: 11, borderRadius: 4, marginTop: 4 }, { backgroundColor: colors.border }]} />
          </View>
        ))}
      </View>
      {/* Meals list */}
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.dailySummaryMeal}>
          <SkeletonPulse style={[{ width: 42, height: 42, borderRadius: 12 }, { backgroundColor: colors.border }]} />
          <View style={{ flex: 1, gap: 6, marginLeft: 12 }}>
            <SkeletonPulse style={[{ width: "60%", height: 14, borderRadius: 6 }, { backgroundColor: colors.border }]} />
            <SkeletonPulse style={[{ width: "40%", height: 11, borderRadius: 5 }, { backgroundColor: colors.border }]} />
          </View>
          <SkeletonPulse style={[{ width: 50, height: 20, borderRadius: 10 }, { backgroundColor: colors.border }]} />
        </View>
      ))}
    </View>
  );
});

// Meal Image Placeholder (sleek gradient placeholder for meals without images)
export const MealImagePlaceholder = React.memo(({
  colors: colorsProp,
  size = 80,
  borderRadius = 16,
}: { colors?: any; size?: number; borderRadius?: number } = {}) => {
  const { colors: themeColors } = useTheme();
  const colors = colorsProp || themeColors;
  return (
    <View style={[{
      width: size,
      height: size,
      borderRadius,
      backgroundColor: colors.border + "25",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    }]}>
      <View style={{
        width: size * 0.45,
        height: size * 0.45,
        borderRadius: size * 0.225,
        backgroundColor: colors.border + "30",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <View style={{
          width: size * 0.2,
          height: size * 0.2,
          borderRadius: size * 0.1,
          backgroundColor: colors.border + "50",
        }} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  // Menu Card Skeleton
  skeletonList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  skeletonCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 8,
  },
  skeletonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  skeletonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  skeletonBadges: {
    flexDirection: "row",
    gap: 8,
  },
  skeletonBadge: {
    width: 60,
    height: 24,
    borderRadius: 12,
  },
  skeletonTitle: {
    height: 24,
    width: "70%",
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonSubtitle: {
    height: 16,
    width: "50%",
    borderRadius: 6,
    marginBottom: 16,
  },
  skeletonStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  skeletonStat: {
    width: "30%",
    height: 60,
    borderRadius: 12,
  },
  skeletonActions: {
    flexDirection: "row",
    gap: 12,
  },
  skeletonButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
  },

  // Meal Card Skeleton
  mealCard: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  mealCardContent: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  mealImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  mealInfo: {
    flex: 1,
    gap: 8,
  },
  mealTitle: {
    height: 20,
    width: "80%",
    borderRadius: 6,
  },
  mealSubtitle: {
    height: 14,
    width: "60%",
    borderRadius: 4,
  },
  mealMacros: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  macroChip: {
    width: 50,
    height: 22,
    borderRadius: 11,
  },
  mealActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  mealActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },

  // Home Screen Skeleton
  homeContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  greetingCard: {
    height: 120,
    borderRadius: 24,
    marginBottom: 20,
  },
  activeMenuCard: {
    height: 140,
    borderRadius: 20,
    marginBottom: 20,
  },
  progressSection: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  circularProgress: {
    width: 180,
    height: 180,
    borderRadius: 90,
    marginBottom: 20,
  },
  macroProgressRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  macroProgress: {
    flex: 1,
    height: 60,
    borderRadius: 12,
  },
  waterCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  waterHeader: {
    height: 24,
    width: "40%",
    borderRadius: 8,
    marginBottom: 16,
  },
  waterCups: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  waterCup: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCardSkeleton: {
    flex: 1,
    height: 120,
    borderRadius: 20,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionCardSkeleton: {
    width: (width - 52) / 2,
    height: 100,
    borderRadius: 20,
  },

  // History Screen Skeleton
  historyContainer: {
    paddingTop: 8,
  },
  historyHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  historyTitle: {
    height: 32,
    width: "50%",
    borderRadius: 8,
    marginBottom: 8,
  },
  historySubtitle: {
    height: 16,
    width: "30%",
    borderRadius: 6,
  },
  searchBar: {
    height: 52,
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  insightsCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  insightsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  insightItem: {
    alignItems: "center",
    gap: 6,
  },
  insightValue: {
    width: 40,
    height: 24,
    borderRadius: 6,
  },
  insightLabel: {
    width: 50,
    height: 12,
    borderRadius: 4,
  },

  // Statistics Screen Skeleton
  statsContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  periodSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  periodTab: {
    flex: 1,
    height: 40,
    borderRadius: 12,
  },
  chartCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  chartTitle: {
    height: 20,
    width: "40%",
    borderRadius: 6,
    marginBottom: 16,
  },
  chart: {
    height: 200,
    borderRadius: 12,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    width: (width - 52) / 2,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  summaryValue: {
    width: 60,
    height: 28,
    borderRadius: 6,
  },
  summaryLabel: {
    width: 80,
    height: 14,
    borderRadius: 4,
  },
  achievementsCard: {
    borderRadius: 20,
    padding: 20,
  },
  sectionTitle: {
    height: 20,
    width: "50%",
    borderRadius: 6,
    marginBottom: 16,
  },
  achievementsList: {
    gap: 16,
  },
  achievementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  achievementInfo: {
    flex: 1,
    gap: 6,
  },
  achievementTitle: {
    height: 16,
    width: "70%",
    borderRadius: 4,
  },
  achievementDesc: {
    height: 12,
    width: "50%",
    borderRadius: 4,
  },

  // Profile Screen Skeleton
  profileContainer: {
    paddingTop: 20,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  profileName: {
    width: 150,
    height: 24,
    borderRadius: 6,
    marginBottom: 8,
  },
  profileEmail: {
    width: 200,
    height: 16,
    borderRadius: 4,
  },
  profileStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  profileStatItem: {
    alignItems: "center",
    gap: 6,
  },
  profileStatValue: {
    width: 50,
    height: 28,
    borderRadius: 6,
  },
  profileStatLabel: {
    width: 60,
    height: 12,
    borderRadius: 4,
  },
  menuSection: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 16,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  menuLabel: {
    flex: 1,
    height: 18,
    borderRadius: 6,
  },

  // Chat Message Skeleton
  chatMessage: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  chatMessageUser: {
    flexDirection: "row-reverse",
  },
  chatAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  chatBubble: {
    flex: 1,
    maxWidth: "70%",
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  chatLine: {
    height: 14,
    borderRadius: 4,
  },

  // List Item Skeleton
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    gap: 12,
  },
  listIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  listContent: {
    flex: 1,
    gap: 6,
  },
  listTitle: {
    height: 18,
    width: "70%",
    borderRadius: 6,
  },
  listSubtitle: {
    height: 14,
    width: "50%",
    borderRadius: 4,
  },
  listAction: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },

  // Calendar Skeleton
  calendarContainer: {
    padding: 20,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  calendarNav: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  calendarMonth: {
    width: 120,
    height: 24,
    borderRadius: 6,
  },
  calendarDays: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calendarDayHeader: {
    width: 36,
    height: 16,
    borderRadius: 4,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  calendarDay: {
    width: (width - 80) / 7,
    height: 36,
    borderRadius: 8,
  },

  // Device Card Skeleton
  deviceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    gap: 16,
  },
  deviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  deviceInfo: {
    flex: 1,
    gap: 6,
  },
  deviceName: {
    width: "70%",
    height: 18,
    borderRadius: 6,
  },
  deviceStatus: {
    width: "40%",
    height: 14,
    borderRadius: 4,
  },
  deviceAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },

  // Active Menu Skeleton
  activeMenuContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  activeMenuSkeleton: {
    borderRadius: 20,
    padding: 18,
  },
  activeMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  activeMenuIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  activeMenuText: {
    flex: 1,
    gap: 6,
  },

  // AI Chat Skeleton
  aiChatContainer: {
    flex: 1,
  },
  aiChatHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  aiChatMessages: {
    flex: 1,
    padding: 16,
    gap: 20,
  },
  aiMsgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  aiChatBubble: {
    flex: 1,
    maxWidth: "75%",
    borderRadius: 20,
    borderTopLeftRadius: 4,
    padding: 16,
    gap: 10,
  },
  aiChatBubbleUser: {
    maxWidth: "65%",
    borderRadius: 20,
    borderTopRightRadius: 4,
    padding: 16,
    gap: 10,
  },
  aiChatInputBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },

  // Calendar Daily Summary Skeleton
  dailySummaryCard: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 16,
  },
  dailySummaryGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  dailySummaryItem: {
    alignItems: "center",
  },
  dailySummaryMeal: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.04)",
  },
});
