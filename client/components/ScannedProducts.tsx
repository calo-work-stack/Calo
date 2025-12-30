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
  Leaf,
  Award,
  TrendingUp,
  Calendar,
  Filter,
  Grid,
  List,
} from "lucide-react-native";

const { width, height } = Dimensions.get("window");

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

export default function MinimalProductGallery({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { colors, isDark } = useTheme();
  const [products, setProducts] = useState<ScannedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ScannedProduct | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      loadProducts();
      Animated.spring(fadeAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      console.log("🔍 Loading products from /food-scanner/history");
      const response = await api.get("/food-scanner/history");
      
      console.log("📦 Response:", JSON.stringify(response.data, null, 2));
      
      if (response.data.success && response.data.data) {
        console.log("✅ Products loaded:", response.data.data.length);
        setProducts(response.data.data);
      } else {
        setProducts([]);
      }
    } catch (error: any) {
      console.error("❌ Error loading products:", error);
      ToastService.handleError(error, "Load Products");
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
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
          p.category?.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    return filtered;
  }, [products, searchQuery, selectedCategory]);

  const getScoreColor = (score?: number): string => {
    if (!score) return "#999999";
    if (score >= 80) return "#10B981";
    if (score >= 60) return "#3B82F6";
    if (score >= 40) return "#F59E0B";
    return "#EF4444";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const renderGridCard = (product: ScannedProduct) => {
    const scoreColor = getScoreColor(product.health_score);
    
    return (
      <TouchableOpacity
        key={product.id}
        style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setSelectedProduct(product)}
        activeOpacity={0.7}
      >
        <View style={[styles.gridImageContainer, { backgroundColor: colors.surface }]}>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={styles.gridImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.gridImagePlaceholder}>
              <Package size={32} color={colors.textTertiary} strokeWidth={1.5} />
            </View>
          )}
          
          {product.health_score && (
            <View style={[styles.scoreChip, { backgroundColor: scoreColor }]}>
              <Text style={styles.scoreChipText}>{product.health_score}</Text>
            </View>
          )}
        </View>

        <View style={styles.gridContent}>
          <Text style={[styles.gridBrand, { color: colors.textTertiary }]} numberOfLines={1}>
            {product.brand || product.category}
          </Text>
          <Text style={[styles.gridName, { color: colors.text }]} numberOfLines={2}>
            {product.name || product.product_name}
          </Text>
          
          <View style={styles.gridStats}>
            <View style={styles.gridStat}>
              <Flame size={12} color={colors.textSecondary} />
              <Text style={[styles.gridStatText, { color: colors.textSecondary }]}>
                {product.nutrition_per_100g?.calories || 0}
              </Text>
            </View>
            <View style={styles.gridStat}>
              <Activity size={12} color={colors.textSecondary} />
              <Text style={[styles.gridStatText, { color: colors.textSecondary }]}>
                {product.nutrition_per_100g?.protein || 0}g
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderListCard = (product: ScannedProduct) => {
    const scoreColor = getScoreColor(product.health_score);
    
    return (
      <TouchableOpacity
        key={product.id}
        style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setSelectedProduct(product)}
        activeOpacity={0.7}
      >
        <View style={[styles.listImageContainer, { backgroundColor: colors.surface }]}>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={styles.listImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.listImagePlaceholder}>
              <Package size={24} color={colors.textTertiary} strokeWidth={1.5} />
            </View>
          )}
        </View>

        <View style={styles.listContent}>
          <View style={styles.listHeader}>
            <View style={styles.listTitleContainer}>
              <Text style={[styles.listBrand, { color: colors.textTertiary }]} numberOfLines={1}>
                {product.brand || product.category}
              </Text>
              <Text style={[styles.listName, { color: colors.text }]} numberOfLines={1}>
                {product.name || product.product_name}
              </Text>
            </View>
            
            {product.health_score && (
              <View style={[styles.listScore, { backgroundColor: scoreColor }]}>
                <Text style={styles.listScoreText}>{product.health_score}</Text>
              </View>
            )}
          </View>

          <View style={styles.listFooter}>
            <View style={styles.listStats}>
              <Flame size={14} color={colors.textSecondary} />
              <Text style={[styles.listStatText, { color: colors.textSecondary }]}>
                {product.nutrition_per_100g?.calories || 0} cal
              </Text>
              <Text style={[styles.listDivider, { color: colors.border }]}>•</Text>
              <Activity size={14} color={colors.textSecondary} />
              <Text style={[styles.listStatText, { color: colors.textSecondary }]}>
                {product.nutrition_per_100g?.protein || 0}g protein
              </Text>
            </View>
            
            <Text style={[styles.listDate, { color: colors.textTertiary }]}>{formatDate(product.created_at)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedProduct) return null;
    const scoreColor = getScoreColor(selectedProduct.health_score);

    return (
      <Modal
        visible={!!selectedProduct}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedProduct(null)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Simple Header */}
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setSelectedProduct(null)}>
              <View style={styles.modalCloseBtn}>
                <X size={24} color={colors.text} strokeWidth={2} />
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Product Hero */}
            <View style={[styles.modalHero, { backgroundColor: colors.card }]}>
              {selectedProduct.image_url ? (
                <Image
                  source={{ uri: selectedProduct.image_url }}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.modalImagePlaceholder, { backgroundColor: colors.surface }]}>
                  <Package size={64} color={colors.textTertiary} strokeWidth={1.5} />
                </View>
              )}

              <View style={styles.modalProductInfo}>
                <Text style={[styles.modalBrand, { color: colors.textTertiary }]}>
                  {selectedProduct.brand || selectedProduct.category}
                </Text>
                <Text style={[styles.modalName, { color: colors.text }]}>{selectedProduct.name || selectedProduct.product_name}</Text>

                {selectedProduct.health_score && (
                  <View style={styles.modalScoreContainer}>
                    <View style={[styles.modalScoreBadge, { backgroundColor: scoreColor }]}>
                      <Text style={styles.modalScoreValue}>{selectedProduct.health_score}</Text>
                      <Text style={styles.modalScoreLabel}>Health Score</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Nutrition Grid */}
            <View style={[styles.modalSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Nutrition per 100g</Text>
              
              <View style={styles.nutritionGrid}>
                {[
                  { icon: Flame, label: "Calories", value: selectedProduct.nutrition_per_100g?.calories || 0, unit: "", color: "#EF4444" },
                  { icon: Activity, label: "Protein", value: selectedProduct.nutrition_per_100g?.protein || 0, unit: "g", color: "#10B981" },
                  { icon: Droplets, label: "Carbs", value: selectedProduct.nutrition_per_100g?.carbs || 0, unit: "g", color: "#3B82F6" },
                  { icon: Leaf, label: "Fat", value: selectedProduct.nutrition_per_100g?.fat || 0, unit: "g", color: "#F59E0B" },
                ].map((item, index) => (
                  <View key={index} style={[styles.nutritionCard, { backgroundColor: colors.surface }]}>
                    <item.icon size={20} color={item.color} strokeWidth={2} />
                    <Text style={[styles.nutritionValue, { color: colors.text }]}>
                      {item.value}
                      <Text style={[styles.nutritionUnit, { color: colors.textTertiary }]}>{item.unit}</Text>
                    </Text>
                    <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                  </View>
                ))}
              </View>

              {/* Extra Nutrition */}
              {(selectedProduct.nutrition_per_100g?.fiber ||
                selectedProduct.nutrition_per_100g?.sugar) && (
                <View style={styles.extraNutrition}>
                  {selectedProduct.nutrition_per_100g?.fiber !== undefined && (
                    <View style={styles.extraRow}>
                      <Text style={styles.extraLabel}>Fiber</Text>
                      <Text style={styles.extraValue}>
                        {selectedProduct.nutrition_per_100g.fiber}g
                      </Text>
                    </View>
                  )}
                  {selectedProduct.nutrition_per_100g?.sugar !== undefined && (
                    <View style={styles.extraRow}>
                      <Text style={styles.extraLabel}>Sugar</Text>
                      <Text style={styles.extraValue}>
                        {selectedProduct.nutrition_per_100g.sugar}g
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Ingredients */}
            {selectedProduct.ingredients && selectedProduct.ingredients.length > 0 && (
              <View style={[styles.modalSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Ingredients</Text>
                <Text style={[styles.ingredientsText, { color: colors.textSecondary }]}>
                  {selectedProduct.ingredients.join(", ")}
                </Text>
              </View>
            )}

            {/* Allergens */}
            {selectedProduct.allergens && selectedProduct.allergens.length > 0 && (
              <View style={[styles.modalSection, styles.allergenSection]}>
                <View style={styles.allergenHeader}>
                  <AlertTriangle size={20} color="#EF4444" strokeWidth={2} />
                  <Text style={styles.allergenTitle}>Contains Allergens</Text>
                </View>
                <View style={styles.allergenList}>
                  {selectedProduct.allergens.map((allergen, index) => (
                    <Text key={index} style={styles.allergenItem}>
                      • {allergen}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {/* Labels */}
            {selectedProduct.labels && selectedProduct.labels.length > 0 && (
              <View style={[styles.modalSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Certifications</Text>
                <View style={styles.labelsList}>
                  {selectedProduct.labels.map((label, index) => (
                    <View key={index} style={styles.labelChip}>
                      <CheckCircle2 size={14} color="#10B981" strokeWidth={2} />
                      <Text style={styles.labelText}>{label}</Text>
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
        {/* Minimalist Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn}>
              <X size={24} color={colors.text} strokeWidth={2} />
            </TouchableOpacity>
            
            <Text style={[styles.headerTitle, { color: colors.text }]}>Products</Text>
            
            <TouchableOpacity
              onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              style={styles.viewToggle}
            >
              {viewMode === "grid" ? (
                <List size={24} color={colors.text} strokeWidth={2} />
              ) : (
                <Grid size={24} color={colors.text} strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>

          {/* Clean Search */}
          <View style={[styles.searchBar, { backgroundColor: colors.surfaceVariant }]}>
            <Search size={20} color={colors.textTertiary} strokeWidth={2} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search products..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={18} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  { backgroundColor: selectedCategory === cat ? colors.primary : colors.surface },
                  selectedCategory === cat && styles.categoryPillActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    { color: selectedCategory === cat ? "#FFFFFF" : colors.text },
                    selectedCategory === cat && styles.categoryPillTextActive,
                  ]}
                >
                  {cat === "all" ? "All" : cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Package size={64} color={colors.textTertiary} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {searchQuery ? "No results found" : "No products yet"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery
                ? "Try a different search term"
                : "Start scanning to build your collection"}
            </Text>
          </View>
        ) : (
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            {viewMode === "grid" ? (
              <ScrollView
                contentContainerStyle={styles.gridContainer}
                showsVerticalScrollIndicator={false}
              >
                {filteredProducts.map(renderGridCard)}
              </ScrollView>
            ) : (
              <ScrollView
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
              >
                {filteredProducts.map(renderListCard)}
              </ScrollView>
            )}
          </Animated.View>
        )}

        {renderDetailModal()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  viewToggle: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  categoriesScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
  },
  categoryPillActive: {
    backgroundColor: "#1A1A1A",
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666666",
  },
  categoryPillTextActive: {
    color: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1A1A",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    color: "#666666",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  gridImageContainer: {
    position: "relative",
    height: 140,
    backgroundColor: "#F5F5F5",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  gridImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  scoreChip: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  gridContent: {
    padding: 12,
  },
  gridBrand: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  gridName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    lineHeight: 18,
    marginBottom: 8,
    minHeight: 36,
  },
  gridStats: {
    flexDirection: "row",
    gap: 8,
  },
  gridStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  gridStatText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666666",
  },
  listContainer: {
    padding: 20,
    gap: 12,
  },
  listCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  listImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    overflow: "hidden",
  },
  listImage: {
    width: "100%",
    height: "100%",
  },
  listImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  listTitleContainer: {
    flex: 1,
  },
  listBrand: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  listName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  listScore: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  listScoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  listFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  listStatText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666666",
  },
  listDivider: {
    fontSize: 12,
    color: "#CCCCCC",
  },
  listDate: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999999",
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  modalHeader: {
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  modalScroll: {
    flex: 1,
  },
  modalHero: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  modalImage: {
    width: 180,
    height: 180,
    borderRadius: 20,
    marginBottom: 20,
  },
  modalImagePlaceholder: {
    width: 180,
    height: 180,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalProductInfo: {
    width: "100%",
    alignItems: "center",
  },
  modalBrand: {
    fontSize: 13,
    fontWeight: "600",
    color: "#999999",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  modalName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  modalScoreContainer: {
    width: "100%",
  },
  modalScoreBadge: {
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    gap: 4,
  },
  modalScoreValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  modalScoreLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
    opacity: 0.9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalSection: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  nutritionCard: {
    width: (width - 88) / 2,
    backgroundColor: "#F5F5F5",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
  },
  nutritionValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  nutritionUnit: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999999",
  },
  nutritionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666666",
  },
  extraNutrition: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    gap: 12,
  },
  extraRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  extraLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666666",
  },
  extraValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  ingredientsText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#666666",
    fontWeight: "500",
  },
  allergenSection: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    borderWidth: 2,
  },
  allergenHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  allergenTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#DC2626",
  },
  allergenList: {
    gap: 8,
  },
  allergenItem: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DC2626",
    lineHeight: 20,
  },
  labelsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  labelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  labelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#166534",
  },
});