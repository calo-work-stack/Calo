import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import {
  X,
  Sparkles,
  TrendingUp,
  Zap,
  Heart,
  ShoppingBag,
  Plus,
  Minus,
  Info,
  Flame,
  Activity,
  Award,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/context/ThemeContext";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { ScanResult, PriceEstimate } from "@/src/types/statistics";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ProductDetailsProps {
  scanResult: ScanResult;
  quantity: number;
  priceEstimate?: PriceEstimate | null;
  onBack: () => void;
  onShowHistory: () => void;
  onAddToMeal: () => void;
  onAddToShoppingList: () => void;
}

export default function ProductDetails({
  scanResult,
  quantity,
  priceEstimate,
  onBack,
  onShowHistory,
  onAddToMeal,
  onAddToShoppingList,
}: ProductDetailsProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { isRTL } = useLanguage();
  const [selectedQuantity, setSelectedQuantity] = useState(quantity);
  const [showAllIngredients, setShowAllIngredients] = useState(false);

  const product = scanResult?.product;
  const nutrition = product?.nutrition_per_100g;

  const calories = Math.round(
    ((nutrition?.calories || 0) * selectedQuantity) / 100,
  );
  const protein = (
    (parseFloat(nutrition?.protein?.toString() || "0") * selectedQuantity) /
    100
  ).toFixed(1);
  const carbs = (
    (parseFloat(nutrition?.carbs?.toString() || "0") * selectedQuantity) /
    100
  ).toFixed(1);
  const fat = (
    (parseFloat(nutrition?.fat?.toString() || "0") * selectedQuantity) /
    100
  ).toFixed(1);
  const fiber = nutrition?.fiber
    ? (
        (parseFloat(nutrition.fiber.toString()) * selectedQuantity) /
        100
      ).toFixed(1)
    : "0";
  const sugar = nutrition?.sugar
    ? (
        (parseFloat(nutrition.sugar.toString()) * selectedQuantity) /
        100
      ).toFixed(1)
    : "0";
  const sodium = Math.round(
    ((nutrition?.sodium || 0) * selectedQuantity) / 100,
  );

  const estimatedPrice = product?.estimated_price
    ? ((product.estimated_price * selectedQuantity) / 100).toFixed(2)
    : null;

  // Calculate macro percentages for visual bars
  const totalMacros = parseFloat(protein) + parseFloat(carbs) + parseFloat(fat);
  const proteinPercent =
    totalMacros > 0 ? (parseFloat(protein) / totalMacros) * 100 : 0;
  const carbsPercent =
    totalMacros > 0 ? (parseFloat(carbs) / totalMacros) * 100 : 0;
  const fatPercent =
    totalMacros > 0 ? (parseFloat(fat) / totalMacros) * 100 : 0;

  // Health indicators
  const isHighProtein = parseFloat(protein) > 15;
  const isHighFiber = parseFloat(fiber) > 3;
  const isHighSugar = parseFloat(sugar) > 10;
  const isHighSodium = sodium > 400;

  const handleQuantityChange = (change: number) => {
    const newQuantity = Math.max(10, Math.min(1000, selectedQuantity + change));
    setSelectedQuantity(newQuantity);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Enhanced Close Button */}
      <TouchableOpacity
        style={[styles.closeButton, { backgroundColor: colors.surface }]}
        onPress={onBack}
        activeOpacity={0.8}
      >
        <X size={24} color={colors.text} strokeWidth={2.5} />
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Image + Title Merged */}
        <View
          style={[styles.heroImageCard, { backgroundColor: colors.surface }]}
        >
          {product?.image_url ? (
            <>
              <Image
                source={{ uri: product.image_url }}
                style={styles.heroImage}
                resizeMode="contain"
              />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.7)"]}
                style={styles.imageGradient}
              />
            </>
          ) : (
            <View
              style={[
                styles.imagePlaceholder,
                { backgroundColor: colors.background },
              ]}
            >
              <ShoppingBag
                size={60}
                color={colors.textSecondary}
                strokeWidth={1.5}
              />
            </View>
          )}

          {/* Floating Price Tag with Confidence */}
          {estimatedPrice && (
            <View style={styles.priceFloatingTag}>
              <LinearGradient
                colors={["#10B981", "#059669"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.priceGradient}
              >
                <Text style={styles.priceFloatingText}>
                  {t("foodScanner.currency")}
                  {estimatedPrice}
                </Text>
                {priceEstimate?.confidence && (
                  <Text style={styles.priceConfidence}>
                    {t(`foodScanner.confidence.${priceEstimate.confidence}`)}
                  </Text>
                )}
              </LinearGradient>
            </View>
          )}

          {/* Product name + brand overlaying bottom of image */}
          <View style={styles.heroOverlayText}>
            <Text style={styles.heroProductTitle}>
              {product?.name || t("foodScanner.unknownProduct")}
            </Text>
            <View style={styles.heroBadgeRow}>
              {product?.brand && (
                <View style={styles.brandFloatingBadge}>
                  <Sparkles
                    size={12}
                    color="#FFD700"
                    strokeWidth={2}
                    fill="#FFD700"
                  />
                  <Text style={styles.brandFloatingText}>{product.brand}</Text>
                </View>
              )}
              {product?.category && (
                <View style={styles.categoryBadge}>
                  <Award size={12} color="#10B981" strokeWidth={2.5} />
                  <Text style={styles.categoryBadgeText}>
                    {product.category}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Energy Overview with inline quantity selector */}
        <View style={[styles.energyCard, { backgroundColor: colors.surface }]}>
          <View style={styles.energyHeader}>
            <LinearGradient
              colors={["#FF6B6B", "#EE5A6F"]}
              style={styles.energyIconBg}
            >
              <Flame size={24} color="#FFF" strokeWidth={2.5} fill="#FFF" />
            </LinearGradient>
            <Text style={[styles.energyTitle, { color: colors.text }]}>
              {t("foodScanner.nutritionValues")}
            </Text>
            {/* Inline quantity selector */}
            <View style={styles.inlineQuantity}>
              <TouchableOpacity
                style={[styles.inlineQtyBtn, { backgroundColor: colors.border + '40' }]}
                onPress={() => handleQuantityChange(-10)}
                activeOpacity={0.7}
              >
                <Minus size={14} color={colors.text} strokeWidth={3} />
              </TouchableOpacity>
              <Text style={[styles.inlineQtyText, { color: colors.text }]}>
                {selectedQuantity}{t("foodScanner.grams").charAt(0)}
              </Text>
              <TouchableOpacity
                style={[styles.inlineQtyBtn, { backgroundColor: colors.border + '40' }]}
                onPress={() => handleQuantityChange(10)}
                activeOpacity={0.7}
              >
                <Plus size={14} color={colors.text} strokeWidth={3} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.caloriesBigDisplay}>
            <Text style={styles.caloriesBigNumber}>{calories}</Text>
            <Text style={styles.caloriesBigLabel}>
              {t("foodScanner.kcal").toUpperCase()}
            </Text>
          </View>

          <View style={styles.macrosDistribution}>
            <View style={styles.macroDistItem}>
              <View style={styles.macroDistBarContainer}>
                <LinearGradient
                  colors={["#4ECDC4", "#44A08D"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.macroDistBarFill,
                    { width: `${proteinPercent}%` },
                  ]}
                />
              </View>
              <View style={styles.macroDistLabelRow}>
                <View
                  style={[styles.macroDistDot, { backgroundColor: "#4ECDC4" }]}
                />
                <Text style={styles.macroDistLabel}>
                  {protein}g {t("foodScanner.protein")}
                </Text>
                <Text style={styles.macroDistPercent}>
                  {proteinPercent.toFixed(0)}%
                </Text>
              </View>
            </View>

            <View style={styles.macroDistItem}>
              <View style={styles.macroDistBarContainer}>
                <LinearGradient
                  colors={["#FFB84D", "#F77062"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.macroDistBarFill,
                    { width: `${carbsPercent}%` },
                  ]}
                />
              </View>
              <View style={styles.macroDistLabelRow}>
                <View
                  style={[styles.macroDistDot, { backgroundColor: "#FFB84D" }]}
                />
                <Text style={styles.macroDistLabel}>
                  {carbs}g {t("foodScanner.carbs")}
                </Text>
                <Text style={styles.macroDistPercent}>
                  {carbsPercent.toFixed(0)}%
                </Text>
              </View>
            </View>

            <View style={styles.macroDistItem}>
              <View style={styles.macroDistBarContainer}>
                <LinearGradient
                  colors={["#A78BFA", "#8B5CF6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.macroDistBarFill, { width: `${fatPercent}%` }]}
                />
              </View>
              <View style={styles.macroDistLabelRow}>
                <View
                  style={[styles.macroDistDot, { backgroundColor: "#A78BFA" }]}
                />
                <Text style={styles.macroDistLabel}>
                  {fat}g {t("foodScanner.fat")}
                </Text>
                <Text style={styles.macroDistPercent}>
                  {fatPercent.toFixed(0)}%
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Nutrition Facts Grid - Modern Cards */}
        <View style={styles.nutritionFactsGrid}>
          <Text style={[styles.gridTitle, { color: colors.text }]}>
            {t("foodScanner.nutritionFacts")}
          </Text>

          <View style={styles.factsRow}>
            <View style={[styles.factCard, { backgroundColor: isDark ? "#4ECDC4" + "15" : "#E8F5F4" }]}>
              <View style={styles.factCardTop}>
                <Text style={[styles.factValue, { color: "#4ECDC4" }]}>
                  {protein}
                </Text>
                <Text style={[styles.factUnit, { color: "#4ECDC4" }]}>g</Text>
              </View>
              <Text style={[styles.factLabel, { color: isDark ? colors.textSecondary : "#64748B" }]}>{t("foodScanner.protein")}</Text>
              <View
                style={[styles.factIndicator, { backgroundColor: "#4ECDC4" }]}
              />
            </View>

            <View style={[styles.factCard, { backgroundColor: isDark ? "#FFB84D" + "15" : "#FFF4E6" }]}>
              <View style={styles.factCardTop}>
                <Text style={[styles.factValue, { color: "#FFB84D" }]}>
                  {carbs}
                </Text>
                <Text style={[styles.factUnit, { color: "#FFB84D" }]}>g</Text>
              </View>
              <Text style={[styles.factLabel, { color: isDark ? colors.textSecondary : "#64748B" }]}>{t("foodScanner.carbs")}</Text>
              <View
                style={[styles.factIndicator, { backgroundColor: "#FFB84D" }]}
              />
            </View>
          </View>

          <View style={styles.factsRow}>
            <View style={[styles.factCard, { backgroundColor: isDark ? "#A78BFA" + "15" : "#F3F0FF" }]}>
              <View style={styles.factCardTop}>
                <Text style={[styles.factValue, { color: "#A78BFA" }]}>
                  {fat}
                </Text>
                <Text style={[styles.factUnit, { color: "#A78BFA" }]}>g</Text>
              </View>
              <Text style={[styles.factLabel, { color: isDark ? colors.textSecondary : "#64748B" }]}>{t("foodScanner.fat")}</Text>
              <View
                style={[styles.factIndicator, { backgroundColor: "#A78BFA" }]}
              />
            </View>

            <View style={[styles.factCard, { backgroundColor: isDark ? "#F59E0B" + "15" : "#FEF3C7" }]}>
              <View style={styles.factCardTop}>
                <Text style={[styles.factValue, { color: "#F59E0B" }]}>
                  {fiber}
                </Text>
                <Text style={[styles.factUnit, { color: "#F59E0B" }]}>g</Text>
              </View>
              <Text style={[styles.factLabel, { color: isDark ? colors.textSecondary : "#64748B" }]}>{t("foodScanner.fiber")}</Text>
              <View
                style={[styles.factIndicator, { backgroundColor: "#F59E0B" }]}
              />
            </View>
          </View>

          <View style={styles.factsRow}>
            <View style={[styles.factCard, { backgroundColor: isDark ? "#E74C3C" + "15" : "#FFE8E8" }]}>
              <View style={styles.factCardTop}>
                <Text style={[styles.factValue, { color: "#E74C3C" }]}>
                  {sodium}
                </Text>
                <Text style={[styles.factUnit, { color: "#E74C3C" }]}>mg</Text>
              </View>
              <Text style={[styles.factLabel, { color: isDark ? colors.textSecondary : "#64748B" }]}>{t("foodScanner.sodium")}</Text>
              <View
                style={[styles.factIndicator, { backgroundColor: "#E74C3C" }]}
              />
            </View>

            <View style={[styles.factCard, { backgroundColor: isDark ? "#FB7185" + "15" : "#FFEEF0" }]}>
              <View style={styles.factCardTop}>
                <Text style={[styles.factValue, { color: "#FB7185" }]}>
                  {sugar}
                </Text>
                <Text style={[styles.factUnit, { color: "#FB7185" }]}>g</Text>
              </View>
              <Text style={[styles.factLabel, { color: isDark ? colors.textSecondary : "#64748B" }]}>{t("foodScanner.sugar")}</Text>
              <View
                style={[styles.factIndicator, { backgroundColor: "#FB7185" }]}
              />
            </View>
          </View>
        </View>

        {/* Health Highlights */}
        {(isHighProtein || isHighFiber || isHighSugar || isHighSodium) && (
          <View
            style={[
              styles.healthHighlights,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={styles.healthHighlightsHeader}>
              <Activity size={20} color={colors.emerald500} strokeWidth={2.5} />
              <Text
                style={[styles.healthHighlightsTitle, { color: colors.text }]}
              >
                {t("foodScanner.healthHighlights")}
              </Text>
            </View>

            <View style={styles.highlightsList}>
              {isHighProtein && (
                <View style={styles.highlightItem}>
                  <View
                    style={[
                      styles.highlightBadge,
                      { backgroundColor: "#10B981" + "20" },
                    ]}
                  >
                    <Sparkles size={14} color="#10B981" strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.highlightText, { color: colors.text }]}>
                    {t("foodScanner.richInProteins")}
                  </Text>
                </View>
              )}

              {isHighFiber && (
                <View style={styles.highlightItem}>
                  <View
                    style={[
                      styles.highlightBadge,
                      { backgroundColor: "#F59E0B" + "20" },
                    ]}
                  >
                    <TrendingUp size={14} color="#F59E0B" strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.highlightText, { color: colors.text }]}>
                    {t("foodScanner.richInFiber")}
                  </Text>
                </View>
              )}

              {isHighSugar && (
                <View style={styles.highlightItem}>
                  <View
                    style={[
                      styles.highlightBadge,
                      { backgroundColor: "#EF4444" + "20" },
                    ]}
                  >
                    <AlertCircle size={14} color="#EF4444" strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.highlightText, { color: colors.text }]}>
                    {t("foodScanner.highInSugar")}
                  </Text>
                </View>
              )}

              {isHighSodium && (
                <View style={styles.highlightItem}>
                  <View
                    style={[
                      styles.highlightBadge,
                      { backgroundColor: "#EF4444" + "20" },
                    ]}
                  >
                    <AlertCircle size={14} color="#EF4444" strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.highlightText, { color: colors.text }]}>
                    {t("foodScanner.highInSodium")}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Ingredients Bubble Cloud - Collapsible */}
        {product?.ingredients && product.ingredients.length > 0 && (
          <View
            style={[
              styles.ingredientsCloud,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={styles.ingredientsHeader}>
              <Sparkles size={18} color={colors.emerald500} strokeWidth={2.5} />
              <Text style={[styles.cloudTitle, { color: colors.text }]}>
                {t("foodScanner.ingredients")}
              </Text>
              <View style={styles.ingredientCount}>
                <Text
                  style={[
                    styles.ingredientCountText,
                    { color: colors.emerald500 },
                  ]}
                >
                  {product.ingredients.length}
                </Text>
              </View>
            </View>
            <View style={styles.bubbleContainer}>
              {(showAllIngredients ? product.ingredients : product.ingredients.slice(0, 6)).map((ingredient, index) => {
                const bubbleColors = isDark
                  ? ["#4ECDC4" + "15", "#FFB84D" + "15", "#A78BFA" + "15", "#E74C3C" + "15", "#F59E0B" + "15"]
                  : ["#E8F5F4", "#FFF4E6", "#F3F0FF", "#FFE8E8", "#FEF3C7"];
                return (
                  <View
                    key={index}
                    style={[
                      styles.ingredientBubble,
                      { backgroundColor: bubbleColors[index % 5] },
                    ]}
                  >
                    <Text style={[styles.bubbleText, { color: colors.text }]}>
                      {ingredient}
                    </Text>
                  </View>
                );
              })}
            </View>
            {product.ingredients.length > 6 && (
              <TouchableOpacity
                style={[styles.showMoreBtn, { backgroundColor: colors.border + '20' }]}
                onPress={() => setShowAllIngredients(!showAllIngredients)}
                activeOpacity={0.7}
              >
                {showAllIngredients ? (
                  <ChevronUp size={16} color={colors.textSecondary} strokeWidth={2.5} />
                ) : (
                  <ChevronDown size={16} color={colors.textSecondary} strokeWidth={2.5} />
                )}
                <Text style={[styles.showMoreText, { color: colors.textSecondary }]}>
                  {showAllIngredients
                    ? t("common.showLess")
                    : `+${product.ingredients.length - 6} ${t("foodScanner.ingredients").toLowerCase()}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* AI Price Estimate Note */}
        {estimatedPrice && (
          <View
            style={[styles.aiNoteCard, { backgroundColor: colors.surface }]}
          >
            <Info size={16} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.aiNoteText, { color: colors.textSecondary }]}>
              {t("foodScanner.aiPriceEstimate")}
            </Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Action Buttons */}
      <View style={styles.floatingActions}>
        <TouchableOpacity
          style={styles.cartFloatingButton}
          onPress={onAddToShoppingList}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={["#1F2937", "#111827"]}
            style={styles.cartGradient}
          >
            <ShoppingBag size={24} color="#FFF" strokeWidth={2.5} />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addFloatingButton}
          onPress={onAddToMeal}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={["#FF6B6B", "#EE5A6F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addGradient}
          >
            <Plus size={26} color="#FFF" strokeWidth={3} />
            <Text style={styles.addFloatingText}>
              {t("foodScanner.addToMeal")}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 100,
  },
  heroImageCard: {
    width: "100%",
    height: 280,
    borderRadius: 28,
    overflow: "hidden",
    marginBottom: 20,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  heroOverlayText: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  heroProductTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -0.5,
    marginBottom: 8,
    lineHeight: 30,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  priceFloatingTag: {
    position: "absolute",
    top: 20,
    right: 20,
    borderRadius: 100,
    overflow: "hidden",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  priceGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
  },
  priceFloatingText: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  priceConfidence: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  brandFloatingBadge: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  brandFloatingText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: "rgba(16,185,129,0.25)",
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#10B981",
  },
  inlineQuantity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
  },
  inlineQtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  inlineQtyText: {
    fontSize: 14,
    fontWeight: "800",
    minWidth: 36,
    textAlign: "center",
  },
  energyCard: {
    borderRadius: 28,
    padding: 28,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  energyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  energyIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  energyTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  caloriesBigDisplay: {
    alignItems: "center",
    marginBottom: 32,
  },
  caloriesBigNumber: {
    fontSize: 72,
    fontWeight: "900",
    color: "#FF6B6B",
    letterSpacing: -4,
    lineHeight: 72,
  },
  caloriesBigLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FF6B6B",
    letterSpacing: 3,
    marginTop: 8,
  },
  macrosDistribution: {
    gap: 20,
  },
  macroDistItem: {
    gap: 10,
  },
  macroDistBarContainer: {
    height: 14,
    borderRadius: 100,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
  },
  macroDistBarFill: {
    height: "100%",
    borderRadius: 100,
    minWidth: 8,
  },
  macroDistLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  macroDistDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  macroDistLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
  },
  macroDistPercent: {
    fontSize: 14,
    fontWeight: "800",
    color: "#64748B",
  },
  nutritionFactsGrid: {
    marginBottom: 16,
  },
  gridTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  factsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  factCard: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    position: "relative",
    overflow: "hidden",
  },
  factCardTop: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
    gap: 4,
  },
  factValue: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -1,
  },
  factUnit: {
    fontSize: 14,
    fontWeight: "700",
  },
  factLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  factIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  healthHighlights: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  healthHighlightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  healthHighlightsTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  highlightsList: {
    gap: 12,
  },
  highlightItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  highlightBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  highlightText: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  ingredientsCloud: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  ingredientsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  cloudTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
    flex: 1,
  },
  ingredientCount: {
    backgroundColor: "#10B981" + "20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ingredientCountText: {
    fontSize: 13,
    fontWeight: "800",
  },
  bubbleContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  ingredientBubble: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 100,
  },
  bubbleText: {
    fontSize: 14,
    fontWeight: "700",
  },
  showMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: "600",
  },
  aiNoteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  aiNoteText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },
  floatingActions: {
    position: "absolute",
    bottom: 32,
    left: 20,
    right: 20,
    flexDirection: "row",
    gap: 12,
  },
  cartFloatingButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  cartGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  addFloatingButton: {
    flex: 1,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  addGradient: {
    width: "100%",
    height: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  addFloatingText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
});