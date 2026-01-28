import React, { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import { Animated, Easing, View } from "react-native";
const SkeletonPulse = React.memo(({ style }: { style?: any }) => {
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

const styles = StyleSheet.create({
  // Skeleton
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
});
