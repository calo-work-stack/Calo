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
import { X, Search, Package, ArrowLeft, Flame } from "lucide-react-native";
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
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("foodScanner.searchProducts")}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchInputContainer,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Search size={20} color={colors.textSecondary} />
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
              <TouchableOpacity onPress={() => onSearchQueryChange("")}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: colors.primary }]}
            onPress={onSearch}
            disabled={isSearching}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text
                style={[styles.searchButtonText, { color: colors.onPrimary }]}
              >
                {t("foodScanner.search")}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Results */}
        <ScrollView style={styles.resultsContainer}>
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text
                style={[styles.loadingText, { color: colors.textSecondary }]}
              >
                {t("foodScanner.searching")}
              </Text>
            </View>
          ) : searchResults.length > 0 ? (
            searchResults.map((product, index) => (
              <TouchableOpacity
                key={`${product.barcode || index}`}
                style={[styles.resultItem, { backgroundColor: colors.surface }]}
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
                    style={[
                      styles.resultImagePlaceholder,
                      { backgroundColor: colors.border },
                    ]}
                  >
                    <Package size={24} color={colors.textTertiary} />
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
                      style={[
                        styles.resultBrand,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {product.brand}
                    </Text>
                  )}
                  <View style={styles.resultNutrition}>
                    <View style={styles.nutritionItem}>
                      <Flame size={12} color={colors.warning} />
                      <Text
                        style={[
                          styles.nutritionItemText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {product.nutrition_per_100g?.calories || 0}{" "}
                        {t("foodScanner.kcal")}
                      </Text>
                    </View>
                  </View>
                </View>
                <ArrowLeft
                  size={20}
                  color={colors.textTertiary}
                  style={{ transform: [{ rotate: "180deg" }] }}
                />
              </TouchableOpacity>
            ))
          ) : searchQuery.length > 0 && !isSearching ? (
            <View style={styles.emptyResults}>
              <Package size={48} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t("foodScanner.noResultsFound")}
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
                {t("foodScanner.tryDifferentKeywords")}
              </Text>
            </View>
          ) : (
            <View style={styles.searchHint}>
              <Search size={48} color={colors.muted} />
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
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 10,
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
  searchButton: {
    borderRadius: 14,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  searchButtonText: {
    fontWeight: "700",
    fontSize: 15,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
  },
  resultImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  resultImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 10,
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
  },
  resultBrand: {
    fontSize: 13,
  },
  resultNutrition: {
    flexDirection: "row",
    marginTop: 4,
  },
  nutritionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  nutritionItemText: {
    fontSize: 12,
  },
  emptyResults: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyHint: {
    fontSize: 14,
    textAlign: "center",
  },
  searchHint: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    gap: 16,
  },
  hintText: {
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
