import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  X,
  Search,
  Package,
  ChevronRight,
  Flame,
  Wallet,
  Sparkles,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/context/ThemeContext";

interface ProductSearchModalProps {
  visible: boolean;
  searchQuery: string;
  searchResults: any[];
  isSearching: boolean;
  onClose: () => void;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
  onSelectProduct: (product: any) => void;
}

export default function ProductSearchModal({
  visible,
  searchQuery,
  searchResults,
  isSearching,
  onClose,
  onSearchQueryChange,
  onSearch,
  onSelectProduct,
}: ProductSearchModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const getConfidenceColor = (confidence?: string) => {
    switch (confidence) {
      case "high":
        return colors.success || "#10B981";
      case "medium":
        return colors.warning || "#F59E0B";
      default:
        return colors.textSecondary;
    }
  };

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
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: colors.surface }]}
          >
            <X size={20} color={colors.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Sparkles size={18} color={colors.primary} strokeWidth={2.5} />
            <Text style={[styles.title, { color: colors.text }]}>
              {t("foodScanner.searchProducts")}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchInputContainer,
              {
                backgroundColor: colors.surface,
                borderColor: searchQuery ? colors.primary : colors.border,
              },
            ]}
          >
            <Search
              size={20}
              color={searchQuery ? colors.primary : colors.textSecondary}
              strokeWidth={2}
            />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t("foodScanner.searchPlaceholder")}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={onSearchQueryChange}
              onSubmitEditing={onSearch}
              returnKeyType="search"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => onSearchQueryChange("")}
                style={[styles.clearButton, { backgroundColor: colors.border }]}
              >
                <X size={14} color={colors.textSecondary} strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.searchButton,
              { backgroundColor: colors.primary },
              isSearching && { opacity: 0.7 },
            ]}
            onPress={onSearch}
            disabled={isSearching}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Search size={22} color={colors.onPrimary} strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        </View>

        {/* Search Results */}
        <ScrollView
          style={styles.resultsContainer}
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={false}
        >
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <View style={[styles.loadingBox, { backgroundColor: colors.surface }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  {t("foodScanner.searching")}
                </Text>
              </View>
            </View>
          ) : searchResults.length > 0 ? (
            <>
              <View style={styles.resultsHeader}>
                <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
                  {searchResults.length} {t("foodScanner.noResults").includes("found") ? "" : "products"}
                </Text>
                <View style={[styles.aiPricingBadge, { backgroundColor: colors.primary + "15" }]}>
                  <Sparkles size={12} color={colors.primary} strokeWidth={2.5} />
                  <Text style={[styles.aiPricingText, { color: colors.primary }]}>
                    {t("foodScanner.aiPriceEstimate")}
                  </Text>
                </View>
              </View>
              {searchResults.map((product, index) => (
                <TouchableOpacity
                  key={`${product.barcode || index}`}
                  style={[
                    styles.resultItem,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() => onSelectProduct(product)}
                  activeOpacity={0.7}
                >
                  {product.image_url ? (
                    <Image
                      source={{ uri: product.image_url }}
                      style={styles.resultImage}
                    />
                  ) : (
                    <View
                      style={[styles.resultImagePlaceholder, { backgroundColor: colors.border }]}
                    >
                      <Package size={24} color={colors.textTertiary} strokeWidth={1.5} />
                    </View>
                  )}

                  <View style={styles.resultInfo}>
                    <Text
                      style={[styles.resultName, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {product.name}
                    </Text>
                    {product.brand && (
                      <Text
                        style={[styles.resultBrand, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {product.brand}
                      </Text>
                    )}

                    <View style={styles.resultMeta}>
                      <View style={[styles.metaBadge, { backgroundColor: colors.warning + "15" }]}>
                        <Flame size={12} color={colors.warning} strokeWidth={2.5} />
                        <Text style={[styles.metaText, { color: colors.warning }]}>
                          {product.nutrition_per_100g?.calories || 0} {t("foodScanner.kcal")}
                        </Text>
                      </View>

                      {product.estimated_price > 0 && (
                        <View
                          style={[
                            styles.metaBadge,
                            { backgroundColor: getConfidenceColor(product.price_confidence) + "15" },
                          ]}
                        >
                          <Wallet
                            size={12}
                            color={getConfidenceColor(product.price_confidence)}
                            strokeWidth={2.5}
                          />
                          <Text
                            style={[
                              styles.metaText,
                              { color: getConfidenceColor(product.price_confidence) },
                            ]}
                          >
                            ₪{product.estimated_price?.toFixed(0)}/100g
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={[styles.arrowContainer, { backgroundColor: colors.border }]}>
                    <ChevronRight size={18} color={colors.textSecondary} strokeWidth={2.5} />
                  </View>
                </TouchableOpacity>
              ))}
            </>
          ) : searchQuery.length > 0 && !isSearching ? (
            <View style={styles.emptyResults}>
              <View style={[styles.emptyIconBox, { backgroundColor: colors.surface }]}>
                <Package size={40} color={colors.textTertiary} strokeWidth={1.5} />
              </View>
              <Text style={[styles.emptyText, { color: colors.text }]}>
                {t("foodScanner.noResultsFound")}
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
                {t("foodScanner.tryDifferentKeywords")}
              </Text>
            </View>
          ) : (
            <View style={styles.searchHint}>
              <View style={[styles.hintIconBox, { backgroundColor: colors.primary + "15" }]}>
                <Search size={32} color={colors.primary} strokeWidth={1.5} />
              </View>
              <Text style={[styles.hintTitle, { color: colors.text }]}>
                {t("foodScanner.searchProducts")}
              </Text>
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                {t("foodScanner.searchHint")}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  searchButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  resultsContainer: {
    flex: 1,
  },
  resultsContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: "600",
  },
  aiPricingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  aiPricingText: {
    fontSize: 12,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  loadingBox: {
    padding: 32,
    borderRadius: 20,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
  },
  resultImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  resultImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  resultInfo: {
    flex: 1,
    gap: 4,
  },
  resultName: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  resultBrand: {
    fontSize: 13,
  },
  resultMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "600",
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyResults: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyHint: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  searchHint: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  hintIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  hintTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  hintText: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
