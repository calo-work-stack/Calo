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
  Grid3x3,
  List,
  ChevronRight,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import { api } from "@/src/services/api";
import { ToastService } from "@/src/services/totastService";
import { LinearGradient } from "expo-linear-gradient";

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

const SCORE_CONFIG = (score: number) => {
  if (score >= 80) return { color: "#10B981", label: "Great", bg: "#EDFAF4" };
  if (score >= 60) return { color: "#3B82F6", label: "Good", bg: "#EFF6FF" };
  if (score >= 40) return { color: "#F59E0B", label: "Fair", bg: "#FFFBEB" };
  return { color: "#EF4444", label: "Poor", bg: "#FEF2F2" };
};

export default function MinimalProductGallery({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { colors, isDark } = useTheme();

  const [products, setProducts] = useState<ScannedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ScannedProduct | null>(null);
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
    } else {
      fadeAnim.setValue(0);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffInDays === 0) return t("date.today");
    if (diffInDays === 1) return t("date.yesterday");
    if (diffInDays < 7) return t("date.daysAgo", { count: diffInDays });
    return date.toLocaleDateString(language, { month: "short", day: "numeric" });
  };

  /* ─── Grid Card ─── */
  const GridCard = ({ product, index }: { product: ScannedProduct; index: number }) => {
    const score = product.health_score;
    const cfg = score ? SCORE_CONFIG(score) : null;

    return (
      <TouchableOpacity
        style={[
          styles.gridCard,
          {
            backgroundColor: isDark ? colors.card : "#FFFFFF",
            shadowColor: "#000",
          },
        ]}
        onPress={() => setSelectedProduct(product)}
        activeOpacity={0.88}
      >
        {/* Image */}
        <View style={[styles.gridImg, { backgroundColor: isDark ? colors.surface : "#F5F5F7" }]}>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
            />
          ) : (
            <Package size={36} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)"} strokeWidth={1.5} />
          )}

          {/* Score pill */}
          {cfg && score && (
            <View style={[styles.gridScorePill, { backgroundColor: cfg.color }]}>
              <Text style={styles.gridScoreText}>{score}</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.gridBody}>
          {(product.brand || product.category) && (
            <Text
              style={[styles.gridBrand, { color: colors.primary }]}
              numberOfLines={1}
            >
              {product.brand || product.category}
            </Text>
          )}
          <Text
            style={[styles.gridName, { color: colors.text }]}
            numberOfLines={2}
          >
            {product.name || product.product_name}
          </Text>

          {/* Mini macros */}
          <View style={styles.gridMacros}>
            <View style={styles.gridMacroItem}>
              <Flame size={10} color="#EF4444" />
              <Text style={[styles.gridMacroVal, { color: colors.textSecondary }]}>
                {Number(product.nutrition_per_100g?.calories || 0).toFixed(0)}
              </Text>
            </View>
            <View style={styles.gridMacroDot} />
            <View style={styles.gridMacroItem}>
              <Activity size={10} color="#10B981" />
              <Text style={[styles.gridMacroVal, { color: colors.textSecondary }]}>
                {Number(product.nutrition_per_100g?.protein || 0).toFixed(1)}g
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /* ─── List Card ─── */
  const ListCard = ({ product }: { product: ScannedProduct }) => {
    const score = product.health_score;
    const cfg = score ? SCORE_CONFIG(score) : null;

    return (
      <TouchableOpacity
        style={[
          styles.listCard,
          {
            backgroundColor: isDark ? colors.card : "#FFFFFF",
            shadowColor: "#000",
          },
        ]}
        onPress={() => setSelectedProduct(product)}
        activeOpacity={0.88}
      >
        {/* Left: image */}
        <View style={[styles.listImg, { backgroundColor: isDark ? colors.surface : "#F5F5F7" }]}>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
            />
          ) : (
            <Package size={24} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)"} strokeWidth={1.5} />
          )}
        </View>

        {/* Middle: info */}
        <View style={styles.listInfo}>
          {(product.brand || product.category) && (
            <Text style={[styles.listBrand, { color: colors.primary }]} numberOfLines={1}>
              {product.brand || product.category}
            </Text>
          )}
          <Text style={[styles.listName, { color: colors.text }]} numberOfLines={1}>
            {product.name || product.product_name}
          </Text>
          <View style={styles.listMacros}>
            <View style={styles.listMacroItem}>
              <Flame size={10} color="#EF4444" />
              <Text style={[styles.listMacroVal, { color: colors.textSecondary }]}>
                {Number(product.nutrition_per_100g?.calories || 0).toFixed(0)} cal
              </Text>
            </View>
            <View style={styles.listMacroDot} />
            <View style={styles.listMacroItem}>
              <Activity size={10} color="#10B981" />
              <Text style={[styles.listMacroVal, { color: colors.textSecondary }]}>
                {Number(product.nutrition_per_100g?.protein || 0).toFixed(1)}g protein
              </Text>
            </View>
          </View>
          <Text style={[styles.listDate, { color: colors.muted }]}>
            {formatDate(product.created_at)}
          </Text>
        </View>

        {/* Right: score + chevron */}
        <View style={styles.listRight}>
          {cfg && score && (
            <View style={[styles.listScoreBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.listScoreNum, { color: cfg.color }]}>{score}</Text>
            </View>
          )}
          <ChevronRight size={16} color={colors.muted} />
        </View>
      </TouchableOpacity>
    );
  };

  /* ─── Detail Modal ─── */
  const DetailModal = () => {
    if (!selectedProduct) return null;
    const score = selectedProduct.health_score;
    const cfg = score ? SCORE_CONFIG(score) : null;

    const macros = [
      { icon: Flame, label: t("statistics.calories"), value: Number(selectedProduct.nutrition_per_100g?.calories || 0).toFixed(1), unit: "", color: "#EF4444", bg: "#FEF2F2" },
      { icon: Activity, label: t("statistics.protein"), value: Number(selectedProduct.nutrition_per_100g?.protein || 0).toFixed(1), unit: "g", color: "#10B981", bg: "#EDFAF4" },
      { icon: Droplets, label: t("foodScanner.carbs"), value: Number(selectedProduct.nutrition_per_100g?.carbs || 0).toFixed(1), unit: "g", color: "#3B82F6", bg: "#EFF6FF" },
      { icon: Wheat, label: t("foodScanner.fat"), value: Number(selectedProduct.nutrition_per_100g?.fat || 0).toFixed(1), unit: "g", color: "#F59E0B", bg: "#FFFBEB" },
    ];

    return (
      <Modal
        visible={!!selectedProduct}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedProduct(null)}
      >
        <View style={[styles.detailContainer, { backgroundColor: colors.background }]}>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Hero */}
            <View style={[styles.detailHero, { backgroundColor: colors.card }]}>
              {/* Close */}
              <TouchableOpacity
                onPress={() => setSelectedProduct(null)}
                style={[styles.detailClose, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }]}
              >
                <X size={20} color={colors.text} strokeWidth={2.5} />
              </TouchableOpacity>

              {/* Image */}
              <View style={styles.detailImgWrap}>
                <View style={[styles.detailImgBg, { backgroundColor: isDark ? colors.surface : "#F5F5F7" }]}>
                  {selectedProduct.image_url ? (
                    <Image
                      source={{ uri: selectedProduct.image_url }}
                      style={styles.detailImg}
                      resizeMode="contain"
                    />
                  ) : (
                    <Package size={80} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"} strokeWidth={1.5} />
                  )}
                </View>

                {/* Floating score */}
                {cfg && score && (
                  <View style={[styles.detailScoreFloat, { backgroundColor: colors.card }]}>
                    <View style={[styles.detailScoreRing, { borderColor: cfg.color }]}>
                      <Text style={[styles.detailScoreNum, { color: cfg.color }]}>{score}</Text>
                    </View>
                    <Text style={[styles.detailScoreLabel, { color: colors.textSecondary }]}>
                      {t("foodScanner.healthScore")}
                    </Text>
                  </View>
                )}
              </View>

              {/* Title */}
              <View style={styles.detailTitle}>
                {(selectedProduct.brand || selectedProduct.category) && (
                  <Text style={[styles.detailBrand, { color: colors.primary }]}>
                    {selectedProduct.brand || selectedProduct.category}
                  </Text>
                )}
                <Text style={[styles.detailName, { color: colors.text }]}>
                  {selectedProduct.name || selectedProduct.product_name}
                </Text>
              </View>

              {/* Quick stats bar */}
              <View style={[styles.detailQuickBar, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }]}>
                {macros.slice(0, 3).map((m, i) => (
                  <React.Fragment key={m.label}>
                    {i > 0 && (
                      <View style={[styles.detailBarDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }]} />
                    )}
                    <View style={styles.detailBarStat}>
                      <m.icon size={14} color={m.color} strokeWidth={2.5} />
                      <Text style={[styles.detailBarVal, { color: colors.text }]}>
                        {m.value}{m.unit}
                      </Text>
                      <Text style={[styles.detailBarLabel, { color: colors.muted }]}>
                        {m.label}
                      </Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </View>

            {/* Nutrition */}
            <View style={styles.detailSection}>
              <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                {t("foodScanner.nutritionValues")}
              </Text>
              <View style={styles.detailMacroGrid}>
                {macros.map((m) => (
                  <View
                    key={m.label}
                    style={[styles.detailMacroCard, { backgroundColor: isDark ? colors.card : "#FFFFFF", shadowColor: m.color }]}
                  >
                    <View style={[styles.detailMacroIcon, { backgroundColor: isDark ? m.color + "20" : m.bg }]}>
                      <m.icon size={18} color={m.color} strokeWidth={2.5} />
                    </View>
                    <Text style={[styles.detailMacroVal, { color: colors.text }]}>
                      {m.value}
                      <Text style={[styles.detailMacroUnit, { color: colors.muted }]}>{m.unit}</Text>
                    </Text>
                    <Text style={[styles.detailMacroLabel, { color: colors.textSecondary }]}>{m.label}</Text>
                  </View>
                ))}
              </View>

              {/* Additional nutrition */}
              {(selectedProduct.nutrition_per_100g?.fiber !== undefined ||
                selectedProduct.nutrition_per_100g?.sugar !== undefined ||
                selectedProduct.nutrition_per_100g?.sodium !== undefined) && (
                <View style={[styles.detailExtra, { backgroundColor: isDark ? colors.card : "#FAFAFA" }]}>
                  {[
                    selectedProduct.nutrition_per_100g?.fiber !== undefined && {
                      label: t("foodScanner.fibers"),
                      value: `${Number(selectedProduct.nutrition_per_100g.fiber).toFixed(1)}g`,
                    },
                    selectedProduct.nutrition_per_100g?.sugar !== undefined && {
                      label: t("foodScanner.sugar"),
                      value: `${Number(selectedProduct.nutrition_per_100g.sugar).toFixed(1)}g`,
                    },
                    selectedProduct.nutrition_per_100g?.sodium !== undefined && {
                      label: t("foodScanner.sodium"),
                      value: `${Number(selectedProduct.nutrition_per_100g.sodium).toFixed(1)}mg`,
                    },
                  ]
                    .filter(Boolean)
                    .map((item: any, i, arr) => (
                      <React.Fragment key={item.label}>
                        <View style={styles.detailExtraRow}>
                          <Text style={[styles.detailExtraLabel, { color: colors.textSecondary }]}>
                            {item.label}
                          </Text>
                          <Text style={[styles.detailExtraVal, { color: colors.text }]}>
                            {item.value}
                          </Text>
                        </View>
                        {i < arr.length - 1 && (
                          <View style={[styles.detailExtraDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]} />
                        )}
                      </React.Fragment>
                    ))}
                </View>
              )}
            </View>

            {/* Ingredients */}
            {selectedProduct.ingredients?.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                  {t("foodScanner.ingredientsIdentified")}
                </Text>
                <View style={[styles.detailIngBox, { backgroundColor: isDark ? colors.card : "#FAFAFA" }]}>
                  <Text style={[styles.detailIngText, { color: colors.textSecondary }]}>
                    {selectedProduct.ingredients.join(", ")}
                  </Text>
                </View>
              </View>
            )}

            {/* Allergens */}
            {selectedProduct.allergens?.length > 0 && (
              <View style={styles.detailSection}>
                <View style={styles.detailAllergenCard}>
                  <View style={styles.detailAllergenHeader}>
                    <View style={styles.detailAllergenIconBox}>
                      <AlertTriangle size={18} color="#DC2626" strokeWidth={2.5} />
                    </View>
                    <Text style={styles.detailAllergenTitle}>{t("foodScanner.allergens")}</Text>
                  </View>
                  <View style={styles.detailTagWrap}>
                    {selectedProduct.allergens.map((a, i) => (
                      <View key={i} style={styles.detailAllergenTag}>
                        <Text style={styles.detailAllergenTagText}>{a}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Certifications */}
            {selectedProduct.labels?.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                  {t("foodScanner.certifications")}
                </Text>
                <View style={styles.detailTagWrap}>
                  {selectedProduct.labels.map((label, i) => (
                    <View key={i} style={styles.certBadge}>
                      <CheckCircle2 size={13} color="#10B981" strokeWidth={2.5} />
                      <Text style={styles.certText}>{label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={{ height: 60 }} />
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
              backgroundColor: isDark ? colors.card : "#FFFFFF",
              borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
            },
          ]}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.headerBtn,
                { backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)" },
              ]}
            >
              <X size={20} color={colors.text} strokeWidth={2.5} />
            </TouchableOpacity>

            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t("loading.history")}
            </Text>

            <TouchableOpacity
              onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              style={[
                styles.headerBtn,
                { backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)" },
              ]}
            >
              {viewMode === "grid" ? (
                <List size={20} color={colors.text} strokeWidth={2.5} />
              ) : (
                <Grid3x3 size={20} color={colors.text} strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View
            style={[
              styles.searchBar,
              { backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)" },
            ]}
          >
            <Search size={18} color={colors.muted} strokeWidth={2} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t("foodScanner.searchProducts")}
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={16} color={colors.muted} strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categories}
          >
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: active
                        ? colors.primary
                        : isDark
                        ? "rgba(255,255,255,0.07)"
                        : "rgba(0,0,0,0.05)",
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text
                    style={[
                      styles.catText,
                      { color: active ? "#FFF" : colors.textSecondary },
                    ]}
                  >
                    {cat === "all" ? t("common.all") : cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Body */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.center}>
            <View style={[styles.emptyIconBox, { backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)" }]}>
              <Package size={44} color={colors.muted} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {searchQuery ? t("common.noResults") : t("foodScanner.noProducts")}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              {searchQuery ? t("common.tryDifferentSearch") : t("foodScanner.startScanning")}
            </Text>
          </View>
        ) : (
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <ScrollView
              contentContainerStyle={viewMode === "grid" ? styles.gridContainer : styles.listContainer}
              showsVerticalScrollIndicator={false}
            >
              {viewMode === "grid"
                ? filteredProducts.map((p, i) => (
                    <GridCard key={`grid-${p.id}-${i}`} product={p} index={i} />
                  ))
                : filteredProducts.map((p, i) => (
                    <ListCard key={`list-${p.id}-${i}`} product={p} />
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
  container: { flex: 1 },

  /* Header */
  header: {
    paddingTop: Platform.OS === "ios" ? 54 : 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    gap: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  categories: {
    paddingHorizontal: 20,
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  catText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.1,
  },

  /* Empty / Center */
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIconBox: {
    width: 88,
    height: 88,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  emptySub: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },

  /* Grid layout */
  gridContainer: {
    padding: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  gridCard: {
    width: (width - 46) / 2,
    borderRadius: 18,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  gridImg: {
    height: 150,
    justifyContent: "center",
    alignItems: "center",
  },
  gridScorePill: {
    position: "absolute",
    top: 10,
    right: 10,
    minWidth: 32,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    alignItems: "center",
  },
  gridScoreText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFF",
  },
  gridBody: {
    padding: 12,
    gap: 5,
  },
  gridBrand: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  gridName: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  gridMacros: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  gridMacroItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  gridMacroVal: {
    fontSize: 11,
    fontWeight: "600",
  },
  gridMacroDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(0,0,0,0.15)",
  },

  /* List layout */
  listContainer: {
    padding: 16,
    gap: 10,
  },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 12,
    gap: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  listImg: {
    width: 72,
    height: 72,
    borderRadius: 14,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  listInfo: {
    flex: 1,
    gap: 3,
  },
  listBrand: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  listName: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  listMacros: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  listMacroItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  listMacroVal: {
    fontSize: 11,
    fontWeight: "600",
  },
  listMacroDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  listDate: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  listRight: {
    alignItems: "center",
    gap: 8,
  },
  listScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: "center",
  },
  listScoreNum: {
    fontSize: 13,
    fontWeight: "800",
  },

  /* Detail Modal */
  detailContainer: { flex: 1 },
  detailHero: {
    paddingTop: Platform.OS === "ios" ? 60 : 30,
    paddingBottom: 28,
  },
  detailClose: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 30,
    right: 20,
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  detailImgWrap: {
    alignItems: "center",
    marginBottom: 24,
  },
  detailImgBg: {
    width: 200,
    height: 200,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  detailImg: {
    width: "100%",
    height: "100%",
  },
  detailScoreFloat: {
    position: "absolute",
    bottom: -18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  detailScoreRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  detailScoreNum: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  detailScoreLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  detailTitle: {
    alignItems: "center",
    paddingHorizontal: 28,
    gap: 6,
    marginBottom: 18,
  },
  detailBrand: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  detailName: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.6,
    textAlign: "center",
    lineHeight: 30,
  },
  detailQuickBar: {
    flexDirection: "row",
    marginHorizontal: 20,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  detailBarStat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  detailBarVal: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  detailBarLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  detailBarDivider: {
    width: 1,
    height: 20,
  },
  detailSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 14,
  },
  detailMacroGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  detailMacroCard: {
    width: (width - 52) / 2,
    borderRadius: 16,
    padding: 16,
    alignItems: "flex-start",
    gap: 8,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  detailMacroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  detailMacroVal: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  detailMacroUnit: {
    fontSize: 14,
    fontWeight: "600",
  },
  detailMacroLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  detailExtra: {
    marginTop: 14,
    borderRadius: 16,
    padding: 16,
  },
  detailExtraRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  detailExtraLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  detailExtraVal: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  detailExtraDivider: {
    height: 1,
    marginVertical: 6,
  },
  detailIngBox: {
    borderRadius: 16,
    padding: 16,
  },
  detailIngText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
  },
  detailAllergenCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
  },
  detailAllergenHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  detailAllergenIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  detailAllergenTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#DC2626",
    letterSpacing: -0.3,
  },
  detailTagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  detailAllergenTag: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  detailAllergenTagText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
  },
  certBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
  },
  certText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
    letterSpacing: -0.1,
  },
});
