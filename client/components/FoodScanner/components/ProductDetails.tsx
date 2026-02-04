import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import {
  ArrowLeft,
  History,
  Plus,
  ShoppingCart,
  Wallet,
  TrendingUp,
  Package,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/context/ThemeContext";
import { ScanResult, PriceEstimate } from "@/src/types/statistics";
import HealthIndicators from "./HealthIndicators";
import NutritionBars from "./NutritionBars";

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
  const { colors } = useTheme();

  const nutrition = scanResult?.product?.nutrition_per_100g;
  const calories = Math.round(
    ((nutrition?.calories || 0) * quantity) / 100,
  );
  const product = scanResult?.product;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: colors.surface }]}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t("foodScanner.details")}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: colors.surface }]}
          onPress={onShowHistory}
          activeOpacity={0.7}
        >
          <History size={22} color={colors.textSecondary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Hero Product Card */}
      <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
        {product?.image_url ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: product.image_url }}
              style={styles.productImage}
            />
            <View
              style={[styles.imageBadge, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.imageBadgeText, { color: colors.onPrimary }]}>
                {quantity}g
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.imageContainer}>
            <View style={[styles.productImage, { backgroundColor: colors.border, justifyContent: "center", alignItems: "center" }]}>
              <Package size={40} color={colors.textSecondary} strokeWidth={1.5} />
            </View>
            <View
              style={[styles.imageBadge, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.imageBadgeText, { color: colors.onPrimary }]}>
                {quantity}g
              </Text>
            </View>
          </View>
        )}

        <View style={styles.productContent}>
          <Text style={[styles.productName, { color: colors.text }]}>
            {product?.name || t("foodScanner.unknownProduct") || "Unknown Product"}
          </Text>

          <View style={styles.caloriesRow}>
            <View
              style={[
                styles.caloriesCard,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Text style={[styles.caloriesNumber, { color: colors.primary }]}>
                {calories}
              </Text>
              <Text style={[styles.caloriesLabel, { color: colors.primary }]}>
                {t("foodScanner.kcal")}
              </Text>
            </View>

            <View
              style={[
                styles.metaInfo,
                { backgroundColor: colors.border + "20" },
              ]}
            >
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {t("foodScanner.perServing")}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Estimated Price Section */}
      {priceEstimate && priceEstimate.estimated_price > 0 && (
        <View style={[styles.priceCard, { backgroundColor: colors.surface }]}>
          <View style={styles.priceHeader}>
            <View style={styles.priceHeaderLeft}>
              <View
                style={[styles.priceIconBox, { backgroundColor: colors.success + "15" }]}
              >
                <Wallet size={20} color={colors.success} strokeWidth={2.5} />
              </View>
              <View>
                <Text style={[styles.priceTitle, { color: colors.text }]}>
                  {t("foodScanner.estimatedCost")}
                </Text>
                {priceEstimate.confidence && (
                  <View style={styles.confidenceRow}>
                    <View
                      style={[
                        styles.confidenceDot,
                        {
                          backgroundColor:
                            priceEstimate.confidence === "high"
                              ? colors.success
                              : priceEstimate.confidence === "medium"
                                ? colors.warning
                                : colors.error,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.confidenceLabel,
                        {
                          color:
                            priceEstimate.confidence === "high"
                              ? colors.success
                              : priceEstimate.confidence === "medium"
                                ? colors.warning
                                : colors.error,
                        },
                      ]}
                    >
                      {t(`foodScanner.confidence.${priceEstimate.confidence}`)}{" "}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.priceValueContainer}>
            <Text style={[styles.priceValue, { color: colors.success }]}>
              {priceEstimate.price_range}
            </Text>
            {priceEstimate.market_context && (
              <View
                style={[
                  styles.contextBox,
                  { backgroundColor: colors.border + "20" },
                ]}
              >
                <TrendingUp
                  size={14}
                  color={colors.textSecondary}
                  strokeWidth={2}
                />
                <Text
                  style={[styles.contextText, { color: colors.textSecondary }]}
                >
                  {priceEstimate.market_context}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Health Indicators */}
      {nutrition && (
        <HealthIndicators nutrition={nutrition} />
      )}

      {/* Nutrition Bars */}
      {nutrition && (
        <NutritionBars
          nutrition={nutrition}
          quantity={quantity}
        />
      )}

      {/* Ingredients */}
      {(product?.ingredients?.length || 0) > 0 && (
        <View
          style={[styles.ingredientsCard, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("foodScanner.ingredientsIdentified")}
          </Text>

          <View style={styles.ingredientsList}>
            {product!.ingredients
              .slice(0, 2)
              .map((ingredient, index) => (
                <View
                  key={index}
                  style={[
                    styles.ingredientItem,
                    { backgroundColor: colors.border + "15" },
                  ]}
                >
                  <View
                    style={[
                      styles.ingredientImageBox,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <Package size={20} color={colors.textSecondary} strokeWidth={1.5} />
                  </View>
                  <Text style={[styles.ingredientName, { color: colors.text }]}>
                    {ingredient}
                  </Text>
                </View>
              ))}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={onAddToMeal}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.buttonIconBox,
              { backgroundColor: colors.onPrimary + "20" },
            ]}
          >
            <Plus size={20} color={colors.onPrimary} strokeWidth={2.5} />
          </View>
          <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>
            {t("foodScanner.addToMeal")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: colors.surface }]}
          onPress={onAddToShoppingList}
          activeOpacity={0.8}
        >
          <ShoppingCart size={22} color={colors.text} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  heroCard: {
    margin: 20,
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  imageContainer: {
    alignSelf: "center",
    position: "relative",
    marginBottom: 20,
  },
  productImage: {
    width: 120,
    height: 120,
    borderRadius: 24,
  },
  imageBadge: {
    position: "absolute",
    bottom: -8,
    right: -8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  imageBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  productContent: {
    gap: 16,
  },
  productName: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
    lineHeight: 30,
  },
  caloriesRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  caloriesCard: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  caloriesNumber: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  caloriesLabel: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  metaInfo: {
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  metaText: {
    fontSize: 13,
    fontWeight: "600",
  },
  priceCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  priceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  priceHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  priceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  priceTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  confidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confidenceLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  priceValueContainer: {
    gap: 12,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  contextBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  contextText: {
    fontSize: 12,
    fontWeight: "600",
  },
  ingredientsCard: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  ingredientsList: {
    gap: 10,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
  },
  ingredientImageBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  ingredientImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
    flex: 1,
  },
  actionSection: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 24,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  secondaryButton: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
});
