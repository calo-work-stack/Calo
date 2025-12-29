import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Modal,
  Animated,
  Platform,
  Dimensions,
} from "react-native";
import {
  Search,
  X,
  ChevronDown,
  Package,
  AlertTriangle,
  CheckCircle2,
  Info,
  Zap,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import { api } from "@/src/services/api";
import { ToastService } from "@/src/services/totastService";

const { width } = Dimensions.get("window");

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  saturated_fat?: number;
  trans_fat?: number;
  cholesterol?: number;
  potassium?: number;
  calcium?: number;
  iron?: number;
  vitamin_c?: number;
  vitamin_d?: number;
}

interface ScannedProduct {
  id: string;
  barcode?: string;
  name: string;
  brand?: string;
  category: string;
  nutrition_per_100g: NutritionData;
  ingredients: string[];
  allergens: string[];
  labels: string[];
  health_score?: number;
  image_url?: string;
  serving_size?: string;
  servings_per_container?: number;
  created_at: string;
  scan_type: string;
  product_name?: string;
}

interface ScannedProductsGalleryProps {
  visible: boolean;
  onClose: () => void;
}

export default function ScannedProductsGallery({
  visible,
  onClose,
}: ScannedProductsGalleryProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { colors, isDark } = useTheme();

  const [products, setProducts] = useState<ScannedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ScannedProduct | null>(
    null
  );
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      loadProducts();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/food-scanner/food_scanner");
      if (response.data.success && response.data.data) {
        setProducts(response.data.data);
      }
    } catch (error) {
      console.error("Error loading products:", error);
      ToastService.handleError(error, "Load Products");
    } finally {
      setIsLoading(false);
    }
  };

  const groupedProducts = useMemo(() => {
    let filtered = [...products];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name?.toLowerCase().includes(query) ||
          product.brand?.toLowerCase().includes(query) ||
          product.category?.toLowerCase().includes(query)
      );
    }

    if (selectedFilter !== "all") {
      if (selectedFilter === "high_score") {
        filtered = filtered.filter((p) => (p.health_score || 0) >= 70);
      } else if (selectedFilter === "low_score") {
        filtered = filtered.filter((p) => (p.health_score || 0) < 50);
      } else if (selectedFilter === "has_allergens") {
        filtered = filtered.filter(
          (p) => p.allergens && p.allergens.length > 0
        );
      }
    }

    const grouped: { [key: string]: ScannedProduct[] } = {};
    filtered.forEach((product) => {
      const category = product.category || "Other";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(product);
    });

    return grouped;
  }, [products, searchQuery, selectedFilter]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getHealthIndicator = (score?: number) => {
    if (!score) return { color: colors.textTertiary, label: "N/A", icon: Info };
    if (score >= 70)
      return { color: "#22C55E", label: "Great", icon: CheckCircle2 };
    if (score >= 50)
      return { color: "#F59E0B", label: "OK", icon: AlertTriangle };
    return { color: "#EF4444", label: "Poor", icon: AlertTriangle };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays}d ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
    return date.toLocaleDateString();
  };

  const renderProductItem = (product: ScannedProduct) => {
    const healthInfo = getHealthIndicator(product.health_score);
    const HealthIcon = healthInfo.icon;

    return (
      <TouchableOpacity
        key={product.id}
        style={[
          styles.listItem,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
        onPress={() => setSelectedProduct(product)}
        activeOpacity={0.6}
      >
        <View style={styles.listItemLeft}>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={styles.listItemImage}
            />
          ) : (
            <View
              style={[
                styles.listItemImagePlaceholder,
                { backgroundColor: colors.surfaceVariant },
              ]}
            >
              <Package size={24} color={colors.textSecondary} />
            </View>
          )}

          <View style={styles.listItemInfo}>
            <Text
              style={[styles.listItemName, { color: colors.text }]}
              numberOfLines={1}
            >
              {product.name || product.product_name}
            </Text>
            {product.brand && (
              <Text
                style={[styles.listItemBrand, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {product.brand}
              </Text>
            )}
            <View style={styles.listItemStats}>
              <Text
                style={[styles.listItemStat, { color: colors.textTertiary }]}
              >
                {product.nutrition_per_100g?.calories || 0} cal
              </Text>
              <View style={styles.listItemDot} />
              <Text
                style={[styles.listItemStat, { color: colors.textTertiary }]}
              >
                {formatDate(product.created_at)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.listItemRight}>
          <View
            style={[
              styles.healthBadge,
              { backgroundColor: healthInfo.color + "15" },
            ]}
          >
            <HealthIcon size={14} color={healthInfo.color} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedProduct) return null;
    const healthInfo = getHealthIndicator(selectedProduct.health_score);

    return (
      <Modal
        visible={!!selectedProduct}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedProduct(null)}
      >
        <View
          style={[
            styles.detailContainer,
            { backgroundColor: colors.background },
          ]}
        >
          {/* Simple Header */}
          <View
            style={[
              styles.detailHeader,
              {
                backgroundColor: colors.background,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setSelectedProduct(null)}
              style={styles.detailCloseButton}
            >
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.detailHeaderTitle, { color: colors.text }]}>
              {t("food_scanner.meal_details")}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            style={styles.detailScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Product Header */}
            <View style={styles.detailProductHeader}>
              {selectedProduct.image_url ? (
                <Image
                  source={{ uri: selectedProduct.image_url }}
                  style={styles.detailProductImage}
                />
              ) : (
                <View
                  style={[
                    styles.detailProductImagePlaceholder,
                    { backgroundColor: colors.surfaceVariant },
                  ]}
                >
                  <Package size={48} color={colors.textSecondary} />
                </View>
              )}

              <Text style={[styles.detailProductName, { color: colors.text }]}>
                {selectedProduct.name || selectedProduct.product_name}
              </Text>
              {selectedProduct.brand && (
                <Text
                  style={[
                    styles.detailProductBrand,
                    { color: colors.textSecondary },
                  ]}
                >
                  {selectedProduct.brand}
                </Text>
              )}

              {/* Health Score */}
              {selectedProduct.health_score && (
                <View
                  style={[
                    styles.detailHealthCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.detailHealthLeft}>
                    <Text
                      style={[
                        styles.detailHealthLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("food_scanner.health_score")}
                    </Text>
                    <Text
                      style={[
                        styles.detailHealthValue,
                        { color: healthInfo.color },
                      ]}
                    >
                      {selectedProduct.health_score}/100
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.detailHealthBadge,
                      { backgroundColor: healthInfo.color },
                    ]}
                  >
                    <Text style={styles.detailHealthBadgeText}>
                      {healthInfo.label}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Nutrition Facts */}
            <View
              style={[
                styles.detailSection,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                {t("food_scanner.nutrition_info")}
              </Text>

              <View style={styles.detailNutritionRow}>
                <Text
                  style={[
                    styles.detailNutritionLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("meals.calories")}
                </Text>
                <Text
                  style={[styles.detailNutritionValue, { color: colors.text }]}
                >
                  {selectedProduct.nutrition_per_100g?.calories || 0}{" "}
                  {t("meals.kcal")}
                </Text>
              </View>
              <View
                style={[
                  styles.detailNutritionDivider,
                  { backgroundColor: colors.border },
                ]}
              />

              <View style={styles.detailNutritionRow}>
                <Text
                  style={[
                    styles.detailNutritionLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("meals.protein")}
                </Text>
                <Text
                  style={[styles.detailNutritionValue, { color: colors.text }]}
                >
                  {selectedProduct.nutrition_per_100g?.protein || 0}g
                </Text>
              </View>
              <View
                style={[
                  styles.detailNutritionDivider,
                  { backgroundColor: colors.border },
                ]}
              />

              <View style={styles.detailNutritionRow}>
                <Text
                  style={[
                    styles.detailNutritionLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("meals.carbs")}
                </Text>
                <Text
                  style={[styles.detailNutritionValue, { color: colors.text }]}
                >
                  {selectedProduct.nutrition_per_100g?.carbs || 0}g
                </Text>
              </View>
              <View
                style={[
                  styles.detailNutritionDivider,
                  { backgroundColor: colors.border },
                ]}
              />

              <View style={styles.detailNutritionRow}>
                <Text
                  style={[
                    styles.detailNutritionLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("meals.fat")}
                </Text>
                <Text
                  style={[styles.detailNutritionValue, { color: colors.text }]}
                >
                  {selectedProduct.nutrition_per_100g?.fat || 0}g
                </Text>
              </View>

              {selectedProduct.nutrition_per_100g?.fiber !== undefined && (
                <>
                  <View
                    style={[
                      styles.detailNutritionDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <View style={styles.detailNutritionRow}>
                    <Text
                      style={[
                        styles.detailNutritionLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("meals.fiber")}
                    </Text>
                    <Text
                      style={[
                        styles.detailNutritionValue,
                        { color: colors.text },
                      ]}
                    >
                      {selectedProduct.nutrition_per_100g.fiber}g
                    </Text>
                  </View>
                </>
              )}

              {selectedProduct.nutrition_per_100g?.sugar !== undefined && (
                <>
                  <View
                    style={[
                      styles.detailNutritionDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <View style={styles.detailNutritionRow}>
                    <Text
                      style={[
                        styles.detailNutritionLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("meals.sugar")}
                    </Text>
                    <Text
                      style={[
                        styles.detailNutritionValue,
                        { color: colors.text },
                      ]}
                    >
                      {selectedProduct.nutrition_per_100g.sugar}g
                    </Text>
                  </View>
                </>
              )}

              {selectedProduct.nutrition_per_100g?.sodium !== undefined && (
                <>
                  <View
                    style={[
                      styles.detailNutritionDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <View style={styles.detailNutritionRow}>
                    <Text
                      style={[
                        styles.detailNutritionLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("meals.sodium")}
                    </Text>
                    <Text
                      style={[
                        styles.detailNutritionValue,
                        { color: colors.text },
                      ]}
                    >
                      {selectedProduct.nutrition_per_100g.sodium}mg
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Ingredients */}
            {selectedProduct.ingredients &&
              selectedProduct.ingredients.length > 0 && (
                <View
                  style={[
                    styles.detailSection,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.detailSectionTitle, { color: colors.text }]}
                  >
                    {t("food_scanner.ingredients")}
                  </Text>
                  <Text
                    style={[
                      styles.detailIngredientsText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {selectedProduct.ingredients.join(", ")}
                  </Text>
                </View>
              )}

            {/* Allergens */}
            {selectedProduct.allergens &&
              selectedProduct.allergens.length > 0 && (
                <View
                  style={[
                    styles.detailSection,
                    styles.detailAllergenSection,
                    { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" },
                  ]}
                >
                  <View style={styles.detailAllergenHeader}>
                    <AlertTriangle size={20} color="#DC2626" />
                    <Text
                      style={[
                        styles.detailSectionTitle,
                        { color: "#DC2626", marginBottom: 0 },
                      ]}
                    >
                      {t("food_scanner.allergens")}
                    </Text>
                  </View>
                  <View style={styles.detailAllergensList}>
                    {selectedProduct.allergens.map((allergen, index) => (
                      <View key={index} style={styles.detailAllergenItem}>
                        <View style={styles.detailAllergenDot} />
                        <Text style={styles.detailAllergenText}>
                          {allergen}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

            {/* Labels */}
            {selectedProduct.labels && selectedProduct.labels.length > 0 && (
              <View
                style={[
                  styles.detailSection,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[styles.detailSectionTitle, { color: colors.text }]}
                >
                  Certifications
                </Text>
                <View style={styles.detailLabelsList}>
                  {selectedProduct.labels.map((label, index) => (
                    <View
                      key={index}
                      style={[
                        styles.detailLabelItem,
                        { backgroundColor: colors.surfaceVariant },
                      ]}
                    >
                      <CheckCircle2 size={14} color="#22C55E" />
                      <Text
                        style={[styles.detailLabelText, { color: colors.text }]}
                      >
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Minimal Header - NO COLORS, just black/white */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t("food_scanner.scanned_products")}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Search */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.surfaceVariant,
                borderColor: colors.border,
              },
            ]}
          >
            <Search size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t("common.search")}
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
          >
            {[
              { key: "all", label: t("common.all") },
              { key: "high_score", label: t("statistics.excellent") },
              { key: "low_score", label: t("statistics.warning") },
              { key: "has_allergens", label: t("food_scanner.allergens") },
            ].map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor:
                      selectedFilter === filter.key ? colors.text : colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setSelectedFilter(filter.key)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    {
                      color:
                        selectedFilter === filter.key
                          ? colors.background
                          : colors.text,
                    },
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.text} />
            <Text style={[styles.centerText, { color: colors.textSecondary }]}>
              {t("common.loading")}
            </Text>
          </View>
        ) : Object.keys(groupedProducts).length === 0 ? (
          <View style={styles.centerContainer}>
            <Package size={56} color={colors.textTertiary} />
            <Text style={[styles.centerTitle, { color: colors.text }]}>
              {searchQuery
                ? t("food_scanner.product_not_found")
                : t("food_scanner.no_food_scanner")}
            </Text>
            <Text style={[styles.centerText, { color: colors.textSecondary }]}>
              {searchQuery
                ? t("common.try_again")
                : t("food_scanner.food_scanner_empty")}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.listContainer}
            showsVerticalScrollIndicator={false}
          >
            {Object.entries(groupedProducts).map(
              ([category, categoryProducts]) => (
                <View key={category}>
                  <TouchableOpacity
                    style={[
                      styles.categoryHeader,
                      { backgroundColor: colors.surfaceVariant },
                    ]}
                    onPress={() => toggleCategory(category)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categoryHeaderLeft}>
                      <Text
                        style={[styles.categoryTitle, { color: colors.text }]}
                      >
                        {category}
                      </Text>
                      <View
                        style={[
                          styles.categoryCount,
                          { backgroundColor: colors.text },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryCountText,
                            { color: colors.background },
                          ]}
                        >
                          {categoryProducts.length}
                        </Text>
                      </View>
                    </View>
                    <ChevronDown
                      size={20}
                      color={colors.textSecondary}
                      style={{
                        transform: [
                          {
                            rotate: expandedCategories.has(category)
                              ? "180deg"
                              : "0deg",
                          },
                        ],
                      }}
                    />
                  </TouchableOpacity>

                  {(expandedCategories.size === 0 ||
                    expandedCategories.has(category)) &&
                    categoryProducts.map(renderProductItem)}
                </View>
              )
            )}
            <View style={{ height: 20 }} />
          </ScrollView>
        )}

        {renderDetailModal()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  filtersContent: {
    paddingVertical: 4,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  centerTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
  },
  centerText: {
    fontSize: 15,
    textAlign: "center",
  },
  listContainer: {
    flex: 1,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  categoryCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryCountText: {
    fontSize: 12,
    fontWeight: "700",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  listItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  listItemImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  listItemImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  listItemInfo: {
    flex: 1,
    gap: 4,
  },
  listItemName: {
    fontSize: 15,
    fontWeight: "600",
  },
  listItemBrand: {
    fontSize: 13,
    fontWeight: "500",
  },
  listItemStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  listItemStat: {
    fontSize: 12,
    fontWeight: "500",
  },
  listItemDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#9CA3AF",
  },
  listItemRight: {
    marginLeft: 12,
  },
  healthBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  // Detail Modal
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  detailCloseButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  detailHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  detailScroll: {
    flex: 1,
  },
  detailProductHeader: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  detailProductImage: {
    width: 120,
    height: 120,
    borderRadius: 16,
    marginBottom: 20,
  },
  detailProductImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  detailProductName: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  detailProductBrand: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 20,
  },
  detailHealthCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  detailHealthLeft: {
    gap: 4,
  },
  detailHealthLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  detailHealthValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  detailHealthBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  detailHealthBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  detailSection: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  detailNutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  detailNutritionLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  detailNutritionValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  detailNutritionDivider: {
    height: 1,
  },
  detailIngredientsText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
  },
  detailAllergenSection: {
    borderWidth: 2,
  },
  detailAllergenHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  detailAllergensList: {
    gap: 8,
  },
  detailAllergenItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailAllergenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#DC2626",
  },
  detailAllergenText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DC2626",
  },
  detailLabelsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  detailLabelItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  detailLabelText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
