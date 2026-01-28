import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X, BarChart3 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/context/ThemeContext";

interface ScanHistoryModalProps {
  visible: boolean;
  scanHistory: any[];
  isLoading: boolean;
  onClose: () => void;
}

export default function ScanHistoryModal({
  visible,
  scanHistory,
  isLoading,
  onClose,
}: ScanHistoryModalProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("foodScanner.history")}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text
                style={[styles.loadingText, { color: colors.textSecondary }]}
              >
                {t("common.loading")}
              </Text>
            </View>
          ) : scanHistory.length > 0 ? (
            scanHistory.map((item, index) => (
              <View
                key={`${item.id || item.scan_id || index}-${item.created_at}`}
                style={[
                  styles.historyItem,
                  {
                    backgroundColor: colors.surface,
                    shadowColor: isDark ? "#000" : "#000",
                  },
                ]}
              >
                <View style={styles.itemContent}>
                  <Text style={[styles.itemName, { color: colors.text }]}>
                    {item.product_name || item.name}
                  </Text>
                  {item.brand && (
                    <Text
                      style={[
                        styles.itemBrand,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {item.brand}
                    </Text>
                  )}
                  <Text
                    style={[styles.itemDate, { color: colors.textTertiary }]}
                  >
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyHistory}>
              <View
                style={[
                  styles.emptyIconContainer,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.03)",
                  },
                ]}
              >
                <BarChart3
                  size={48}
                  color={colors.textTertiary}
                  strokeWidth={1.5}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {t("foodScanner.noScanHistory")}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t("foodScanner.startScanningToSeeHistory")}
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: "500",
  },
  historyItem: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  itemContent: {
    gap: 6,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  itemBrand: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  itemDate: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  emptyHistory: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
});
