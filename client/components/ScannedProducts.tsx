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
  Platform,
  Dimensions,
  Animated,
} from "react-native";
import {
  Search,
  X,
  Package,
  AlertTriangle,
  CheckCircle2,
  Flame,
  Activity,
  Droplets,
  Wheat,
  Award,
  Grid3x3,
  List,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import { api } from "@/src/services/api";
import { ToastService } from "@/src/services/totastService";

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
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
  scan_type?: string;
  product_name?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function MinimalProductGallery({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { colors } = useTheme();

  const [products, setProducts] = useState<ScannedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ScannedProduct | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      loadProducts();
      Animated.spring(fadeAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/food-scanner/history");
      if (response.data.success && response.data.data) {
        setProducts(response.data.data);
      }
    } catch (error: any) {
      const serverMessage = error?.response?.data?.error;
      ToastService.error(
        t("errors.loadProducts"),
        serverMessage || t("common.tryAgain"),
      );
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return ["all", ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.brand?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query),
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    return filtered;
  }, [products, searchQuery, selectedCategory]);

  const getScoreColor = (score?: number): string => {
    if (!score) return colors.textTertiary;
    if (score >= 80) return "#10B981";
    if (score >= 60) return "#3B82F6";
    if (score >= 40) return "#F59E0B";
    return "#EF4444";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffInDays === 0) return t("date.today");
    if (diffInDays === 1) return t("date.yesterday");
    if (diffInDays < 7) return t("date.daysAgo", { count: diffInDays });
    return date.toLocaleDateString(language, {
      month: "short",
      day: "numeric",
    });
  };

  const ProductCard = ({
    product,
    index,
  }: {
    product: ScannedProduct;
    index: number;
  }) => {
    const scoreColor = getScoreColor(product.health_score);
    const isGrid = viewMode === "grid";

    return (
      <TouchableOpacity
        key={`${viewMode}-${product.id}-${index}`}
        style={[
          isGrid ? styles.gridCard : styles.listCard,
          { backgroundColor: colors.card, borderColor: colors.border + "30" },
        ]}
        onPress={() => setSelectedProduct(product)}
        activeOpacity={0.7}
      >
        {/* Image Section */}
        <View
          style={[
            isGrid ? styles.gridImage : styles.listImage,
            { backgroundColor: colors.surface },
          ]}
        >
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={[StyleSheet.absoluteFill, { resizeMode: 'contain' }]}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Package
                size={isGrid ? 32 : 24}
                color={colors.textTertiary}
                strokeWidth={1.5}
              />
            </View>
          )}

          {product.health_score && (
            <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
              <Text style={styles.scoreText}>{product.health_score}</Text>
            </View>
          )}
        </View>

        {/* Content Section */}
        <View style={isGrid ? styles.gridContent : styles.listContent}>
          <View style={styles.contentTop}>
            <Text
              style={[styles.brandText, { color: colors.textTertiary }]}
              numberOfLines={1}
            >
              {product.brand || product.category}
            </Text>
            <Text
              style={[styles.nameText, { color: colors.text }]}
              numberOfLines={isGrid ? 2 : 1}
            >
              {product.name || product.product_name}
            </Text>
          </View>

          <View style={styles.contentBottom}>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Flame size={14} color={colors.textSecondary} strokeWidth={2} />
                <Text
                  style={[styles.statText, { color: colors.textSecondary }]}
                >
                  {Number(product.nutrition_per_100g?.calories || 0).toFixed(1)}
                </Text>
              </View>
              <View style={styles.stat}>
                <Activity
                  size={14}
                  color={colors.textSecondary}
                  strokeWidth={2}
                />
                <Text
                  style={[styles.statText, { color: colors.textSecondary }]}
                >
                  {Number(product.nutrition_per_100g?.protein || 0).toFixed(1)}g
                </Text>
              </View>
            </View>

            {!isGrid && (
              <Text style={[styles.dateText, { color: colors.textTertiary }]}>
                {formatDate(product.created_at)}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const DetailModal = () => {
    if (!selectedProduct) return null;
    const scoreColor = getScoreColor(selectedProduct.health_score);

    const nutritionItems = [
      {
        icon: Flame,
        label: t("statistics.calories"),
        value: Number(selectedProduct.nutrition_per_100g?.calories || 0).toFixed(1),
        unit: "",
        color: "#EF4444",
      },
      {
        icon: Activity,
        label: t("statistics.protein"),
        value: Number(selectedProduct.nutrition_per_100g?.protein || 0).toFixed(1),
        unit: "g",
        color: "#10B981",
      },
      {
        icon: Droplets,
        label: t("foodScanner.carbs"),
        value: Number(selectedProduct.nutrition_per_100g?.carbs || 0).toFixed(1),
        unit: "g",
        color: "#3B82F6",
      },
      {
        icon: Wheat,
        label: t("foodScanner.fat"),
        value: Number(selectedProduct.nutrition_per_100g?.fat || 0).toFixed(1),
        unit: "g",
        color: "#F59E0B",
      },
    ];

    return (
      <Modal
        visible={!!selectedProduct}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedProduct(null)}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Premium Hero Section */}
            <View style={[styles.modalHero, { backgroundColor: colors.card }]}>
              {/* Close Button */}
              <TouchableOpacity
                onPress={() => setSelectedProduct(null)}
                style={[styles.modalClose, { backgroundColor: colors.surface }]}
              >
                <X size={22} color={colors.text} strokeWidth={2.5} />
              </TouchableOpacity>

              {/* Product Image with Floating Score */}
              <View style={styles.modalImageSection}>
                <View
                  style={[
                    styles.modalImageWrapper,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  {selectedProduct.image_url ? (
                    <Image
                      source={{ uri: selectedProduct.image_url }}
                      style={styles.modalProductImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Package
                      size={80}
                      color={colors.textTertiary}
                      strokeWidth={1.5}
                    />
                  )}
                </View>

                {/* Floating Health Score Badge */}
                {selectedProduct.health_score && (
                  <View
                    style={[
                      styles.floatingScore,
                      { backgroundColor: colors.card },
                    ]}
                  >
                    <View
                      style={[styles.scoreRing, { borderColor: scoreColor }]}
                    >
                      <Text style={[styles.scoreNumber, { color: scoreColor }]}>
                        {selectedProduct.health_score}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.scoreText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("foodScanner.healthScore")}
                    </Text>
                  </View>
                )}
              </View>

              {/* Product Info */}
              <View style={styles.modalProductInfo}>
                <Text style={[styles.modalCategory, { color: colors.primary }]}>
                  {selectedProduct.brand || selectedProduct.category}
                </Text>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {selectedProduct.name || selectedProduct.product_name}
                </Text>

                {/* Quick Stats Bar */}
                <View
                  style={[
                    styles.quickStats,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <View style={styles.quickStat}>
                    <Flame size={16} color="#EF4444" strokeWidth={2.5} />
                    <Text
                      style={[styles.quickStatValue, { color: colors.text }]}
                    >
                      {Number(
                        selectedProduct.nutrition_per_100g?.calories || 0
                      ).toFixed(1)}
                    </Text>
                    <Text
                      style={[
                        styles.quickStatLabel,
                        { color: colors.textTertiary },
                      ]}
                    >
                      cal
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.quickStatDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <View style={styles.quickStat}>
                    <Activity size={16} color="#10B981" strokeWidth={2.5} />
                    <Text
                      style={[styles.quickStatValue, { color: colors.text }]}
                    >
                      {Number(
                        selectedProduct.nutrition_per_100g?.protein || 0
                      ).toFixed(1)}
                      g
                    </Text>
                    <Text
                      style={[
                        styles.quickStatLabel,
                        { color: colors.textTertiary },
                      ]}
                    >
                      protein
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.quickStatDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <View style={styles.quickStat}>
                    <Droplets size={16} color="#3B82F6" strokeWidth={2.5} />
                    <Text
                      style={[styles.quickStatValue, { color: colors.text }]}
                    >
                      {Number(selectedProduct.nutrition_per_100g?.carbs || 0).toFixed(
                        1,
                      )}
                      g
                    </Text>
                    <Text
                      style={[
                        styles.quickStatLabel,
                        { color: colors.textTertiary },
                      ]}
                    >
                      carbs
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Nutrition Details - Card Grid */}
            <View style={styles.contentSection}>
              <Text style={[styles.contentTitle, { color: colors.text }]}>
                {t("foodScanner.nutritionValues")}
              </Text>

              <View style={styles.nutritionCards}>
                {nutritionItems.map((item, index) => (
                  <View
                    key={index}
                    style={[
                      styles.nutritionBox,
                      {
                        backgroundColor: colors.card,
                        borderColor: item.color + "20",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.nutritionIconCircle,
                        { backgroundColor: item.color + "15" },
                      ]}
                    >
                      <item.icon
                        size={20}
                        color={item.color}
                        strokeWidth={2.5}
                      />
                    </View>
                    <View style={styles.nutritionData}>
                      <Text
                        style={[styles.nutritionAmount, { color: colors.text }]}
                      >
                        {item.value}
                        <Text
                          style={[
                            styles.nutritionMetric,
                            { color: colors.textTertiary },
                          ]}
                        >
                          {item.unit}
                        </Text>
                      </Text>
                      <Text
                        style={[
                          styles.nutritionName,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Additional Nutrition */}
              {(selectedProduct.nutrition_per_100g?.fiber !== undefined ||
                selectedProduct.nutrition_per_100g?.sugar !== undefined ||
                selectedProduct.nutrition_per_100g?.sodium !== undefined) && (
                <View
                  style={[
                    styles.additionalNutrition,
                    { backgroundColor: colors.card },
                  ]}
                >
                  <Text
                    style={[styles.additionalTitle, { color: colors.text }]}
                  >
                    {t("foodScanner.additionalInfo")}
                  </Text>
                  <View style={styles.additionalGrid}>
                    {selectedProduct.nutrition_per_100g?.fiber !==
                      undefined && (
                      <View style={styles.additionalItem}>
                        <Text
                          style={[
                            styles.additionalLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t("foodScanner.fibers")}
                        </Text>
                        <Text
                          style={[
                            styles.additionalValue,
                            { color: colors.text },
                          ]}
                        >
                          {Number(selectedProduct.nutrition_per_100g.fiber || 0).toFixed(1)}g
                        </Text>
                      </View>
                    )}
                    {selectedProduct.nutrition_per_100g?.sugar !==
                      undefined && (
                      <View style={styles.additionalItem}>
                        <Text
                          style={[
                            styles.additionalLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t("foodScanner.sugar")}
                        </Text>
                        <Text
                          style={[
                            styles.additionalValue,
                            { color: colors.text },
                          ]}
                        >
                          {Number(selectedProduct.nutrition_per_100g.sugar || 0).toFixed(1)}g
                        </Text>
                      </View>
                    )}
                    {selectedProduct.nutrition_per_100g?.sodium !==
                      undefined && (
                      <View style={styles.additionalItem}>
                        <Text
                          style={[
                            styles.additionalLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t("foodScanner.sodium")}
                        </Text>
                        <Text
                          style={[
                            styles.additionalValue,
                            { color: colors.text },
                          ]}
                        >
                          {Number(selectedProduct.nutrition_per_100g.sodium || 0).toFixed(1)}
                          mg
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Ingredients */}
            {selectedProduct.ingredients?.length > 0 && (
              <View style={styles.contentSection}>
                <Text style={[styles.contentTitle, { color: colors.text }]}>
                  {t("foodScanner.ingredientsIdentified")}
                </Text>
                <View
                  style={[
                    styles.ingredientsBox,
                    { backgroundColor: colors.card },
                  ]}
                >
                  <Text
                    style={[
                      styles.ingredientsContent,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {selectedProduct.ingredients.join(", ")}
                  </Text>
                </View>
              </View>
            )}

            {/* Allergens Warning */}
            {selectedProduct.allergens?.length > 0 && (
              <View style={styles.contentSection}>
                <View
                  style={[styles.warningCard, { backgroundColor: "#FEF2F2" }]}
                >
                  <View style={styles.warningHeader}>
                    <View style={styles.warningIconBox}>
                      <AlertTriangle
                        size={20}
                        color="#DC2626"
                        strokeWidth={2.5}
                      />
                    </View>
                    <Text style={styles.warningTitle}>
                      {t("foodScanner.allergens")}
                    </Text>
                  </View>
                  <View style={styles.warningContent}>
                    {selectedProduct.allergens.map((allergen, index) => (
                      <View key={index} style={styles.warningTag}>
                        <Text style={styles.warningTagText}>{allergen}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Certifications */}
            {selectedProduct.labels?.length > 0 && (
              <View style={styles.contentSection}>
                <Text style={[styles.contentTitle, { color: colors.text }]}>
                  {t("foodScanner.certifications")}
                </Text>
                <View style={styles.certificationsGrid}>
                  {selectedProduct.labels.map((label, index) => (
                    <View key={index} style={styles.certBadge}>
                      <View style={styles.certIcon}>
                        <CheckCircle2
                          size={16}
                          color="#10B981"
                          strokeWidth={2.5}
                        />
                      </View>
                      <Text style={styles.certLabel}>{label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={{ height: 50 }} />
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
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.card,
              borderBottomColor: colors.border + "20",
            },
          ]}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <X size={24} color={colors.text} strokeWidth={2.5} />
            </TouchableOpacity>

            <Text style={[styles.title, { color: colors.text }]}>
              {t("loading.history")}
            </Text>

            <TouchableOpacity
              onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              style={styles.headerButton}
            >
              {viewMode === "grid" ? (
                <List size={24} color={colors.text} strokeWidth={2.5} />
              ) : (
                <Grid3x3 size={24} color={colors.text} strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
            <Search size={20} color={colors.textTertiary} strokeWidth={2.5} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t("foodScanner.searchProducts")}
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={18} color={colors.textSecondary} strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>

          {/* Categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categories}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor:
                      selectedCategory === cat
                        ? colors.primary
                        : colors.surface,
                  },
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    {
                      color:
                        selectedCategory === cat
                          ? colors.onPrimary
                          : colors.text,
                    },
                  ]}
                >
                  {cat === "all" ? t("common.all") : cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.centerContainer}>
            <View
              style={[styles.emptyIcon, { backgroundColor: colors.surface }]}
            >
              <Package
                size={48}
                color={colors.textTertiary}
                strokeWidth={1.5}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {searchQuery
                ? t("common.noResults")
                : t("foodScanner.noProducts")}
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.textSecondary }]}
            >
              {searchQuery
                ? t("common.tryDifferentSearch")
                : t("foodScanner.startScanning")}
            </Text>
          </View>
        ) : (
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <ScrollView
              contentContainerStyle={
                viewMode === "grid"
                  ? styles.gridContainer
                  : styles.listContainer
              }
              showsVerticalScrollIndicator={false}
            >
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={`${product.id}-${index}`}
                  product={product}
                  index={index}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        <DetailModal />
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
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  categories: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
  gridContainer: {
    padding: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  gridCard: {
    width: (width - 56) / 2,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
  },
  gridImage: {
    height: 160,
    position: "relative",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  gridContent: {
    padding: 14,
    gap: 10,
  },
  listContainer: {
    padding: 20,
    gap: 12,
  },
  listCard: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 14,
    gap: 14,
    borderWidth: 1,
  },
  listImage: {
    width: 90,
    height: 90,
    borderRadius: 18,
    position: "relative",
    overflow: 'hidden',
  },
  listContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  contentTop: {
    gap: 4,
  },
  brandText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  nameText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  contentBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stats: {
    flexDirection: "row",
    gap: 12,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statText: {
    fontSize: 12,
    fontWeight: "700",
  },
  dateText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHero: {
    paddingTop: Platform.OS === "ios" ? 60 : 30,
    paddingBottom: 32,
    position: "relative",
  },
  modalClose: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 30,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  modalImageSection: {
    alignItems: "center",
    marginBottom: 24,
    position: "relative",
  },
  modalImageWrapper: {
    width: 220,
    height: 220,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  modalProductImage: {
    width: "100%",
    height: "100%",
  },
  floatingScore: {
    position: "absolute",
    bottom: -20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  scoreRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreNumber: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  modalProductInfo: {
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 12,
  },
  modalCategory: {
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.7,
    textAlign: "center",
    lineHeight: 34,
  },
  quickStats: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    gap: 16,
    marginTop: 8,
  },
  quickStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    justifyContent: "center",
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  quickStatLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  quickStatDivider: {
    width: 1,
    height: 24,
  },
  contentSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  contentTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  nutritionCards: {
    gap: 12,
  },
  nutritionBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 20,
    gap: 16,
    borderWidth: 2,
  },
  nutritionIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  nutritionData: {
    flex: 1,
  },
  nutritionAmount: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.7,
    marginBottom: 2,
  },
  nutritionMetric: {
    fontSize: 16,
    fontWeight: "700",
  },
  nutritionName: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  additionalNutrition: {
    marginTop: 16,
    padding: 20,
    borderRadius: 20,
  },
  additionalTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  additionalGrid: {
    gap: 14,
  },
  additionalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  additionalLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  additionalValue: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  ingredientsBox: {
    padding: 20,
    borderRadius: 20,
  },
  ingredientsContent: {
    fontSize: 15,
    lineHeight: 26,
    fontWeight: "500",
  },
  warningCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FCA5A5",
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  warningIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#DC2626",
    letterSpacing: -0.4,
  },
  warningContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  warningTag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  warningTagText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },
  certificationsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  certBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#F0FDF4",
    borderWidth: 2,
    borderColor: "#BBF7D0",
  },
  certIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  certLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#166534",
    letterSpacing: -0.2,
  },
});
