import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/context/ThemeContext";
import {
  X,
  Calendar,
  Target,
  Dumbbell,
  Wheat,
  Droplets,
  Activity,
  Flame,
  Heart,
  Check,
} from "lucide-react-native";
import { FilterOptions } from "@/src/types/history";

const { width } = Dimensions.get("window");

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
}

const CATEGORIES = [
  { key: "all", label: "history.categories.all", icon: Target, color: "#009EAD" },
  { key: "high_protein", label: "history.categories.highProtein", icon: Dumbbell, color: "#FF3B30" },
  { key: "high_carb", label: "history.categories.highCarb", icon: Wheat, color: "#34C759" },
  { key: "high_fat", label: "history.categories.highFat", icon: Droplets, color: "#05A9B8" },
  { key: "balanced", label: "history.categories.balanced", icon: Activity, color: "#FF9F0A" },
  { key: "low_calorie", label: "history.categories.lowCalorie", icon: Flame, color: "#FF2D55" },
];

const DATE_RANGES = [
  { key: "all", label: "history.timeRanges.all" },
  { key: "today", label: "history.timeRanges.today" },
  { key: "week", label: "history.timeRanges.thisWeek" },
  { key: "month", label: "history.timeRanges.thisMonth" },
];

export default function FilterModal({
  visible,
  onClose,
  filters,
  onFiltersChange,
}: FilterModalProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onFiltersChange({
      category: "all",
      dateRange: "all",
      minCalories: 0,
      maxCalories: 2000,
      showFavoritesOnly: false,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <BlurView intensity={isDark ? 40 : 60} style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t("history.filter.title")}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Categories */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("history.filter.category")}
              </Text>
              <View style={styles.optionsGrid}>
                {CATEGORIES.map((cat) => {
                  const IconComponent = cat.icon;
                  const isSelected = filters.category === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.optionPill,
                        isSelected
                          ? { backgroundColor: cat.color }
                          : { backgroundColor: colors.surfaceVariant, borderColor: colors.border, borderWidth: 1 },
                      ]}
                      onPress={() => updateFilter("category", cat.key)}
                      activeOpacity={0.7}
                    >
                      <IconComponent
                        size={16}
                        color={isSelected ? "#FFF" : cat.color}
                      />
                      <Text
                        style={[
                          styles.optionText,
                          { color: isSelected ? "#FFF" : colors.text },
                        ]}
                      >
                        {t(cat.label)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Date Range */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("history.filter.dateRange")}
              </Text>
              <View style={styles.dateRangeRow}>
                {DATE_RANGES.map((range) => {
                  const isSelected = filters.dateRange === range.key;
                  return (
                    <TouchableOpacity
                      key={range.key}
                      style={[
                        styles.dateRangePill,
                        isSelected
                          ? { backgroundColor: colors.primary }
                          : { backgroundColor: colors.surfaceVariant, borderColor: colors.border, borderWidth: 1 },
                      ]}
                      onPress={() => updateFilter("dateRange", range.key)}
                      activeOpacity={0.7}
                    >
                      <Calendar
                        size={14}
                        color={isSelected ? "#FFF" : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.dateRangeText,
                          { color: isSelected ? "#FFF" : colors.text },
                        ]}
                      >
                        {t(range.label)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Favorites Only */}
            <View style={styles.section}>
              <TouchableOpacity
                style={[
                  styles.favoritesToggle,
                  {
                    backgroundColor: filters.showFavoritesOnly
                      ? "#FF2D5515"
                      : colors.surfaceVariant,
                    borderColor: filters.showFavoritesOnly ? "#FF2D55" : colors.border,
                  },
                ]}
                onPress={() => updateFilter("showFavoritesOnly", !filters.showFavoritesOnly)}
                activeOpacity={0.7}
              >
                <Heart
                  size={20}
                  color="#FF2D55"
                  fill={filters.showFavoritesOnly ? "#FF2D55" : "transparent"}
                />
                <Text style={[styles.favoritesText, { color: colors.text }]}>
                  {t("history.filter.favoritesOnly")}
                </Text>
                {filters.showFavoritesOnly && (
                  <View style={styles.checkIcon}>
                    <Check size={18} color="#FF2D55" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={[styles.actions, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.resetButton, { borderColor: colors.border }]}
              onPress={resetFilters}
              activeOpacity={0.7}
            >
              <Text style={[styles.resetText, { color: colors.text }]}>
                {t("history.filter.reset")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: colors.primary }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.applyText}>{t("history.filter.apply")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  dateRangeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  dateRangePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  dateRangeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  favoritesToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  favoritesText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  resetText: {
    fontSize: 15,
    fontWeight: "600",
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  applyText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFF",
  },
});
