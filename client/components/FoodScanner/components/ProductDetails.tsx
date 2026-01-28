import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { ArrowLeft, History, Plus, ShoppingCart, Wallet } from "lucide-react-native";
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surface }]}
          onPress={onBack}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("foodScanner.details")}
        </Text>
        <TouchableOpacity
          style={[styles.historyButton, { backgroundColor: colors.surface }]}
          onPress={onShowHistory}
        >
          <History size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Product Card */}
      <View style={[styles.productCard, { backgroundColor: colors.surface }]}>
        <Image
          source={{
            uri:
              scanResult.product.image_url || "https://via.placeholder.com/120",
          }}
          style={styles.productImage}
        />
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: colors.text }]}>
            {scanResult.product.name}
          </Text>
          <Text
            style={[styles.productCalories, { color: colors.textSecondary }]}
          >
            {Math.round(
              (scanResult.product.nutrition_per_100g.calories * quantity) / 100,
            )}{" "}
            {t("foodScanner.kcal")}
          </Text>
          <Text style={[styles.productWeight, { color: colors.textTertiary }]}>
            {quantity}g
          </Text>
        </View>
      </View>

      {/* Estimated Price Section */}
      {priceEstimate && priceEstimate.estimated_price > 0 && (
        <View style={[styles.priceSection, { backgroundColor: colors.surface }]}>
          <View style={styles.priceSectionHeader}>
            <View style={[styles.priceIconContainer, { backgroundColor: colors.primary + "20" }]}>
              <Wallet size={20} color={colors.primary} />
            </View>
            <Text style={[styles.priceSectionTitle, { color: colors.text }]}>
              {t("foodScanner.estimatedCost")}
            </Text>
          </View>
          <View style={styles.priceContent}>
            <Text style={[styles.priceValue, { color: colors.primary }]}>
              {priceEstimate.price_range}
            </Text>
            {priceEstimate.confidence && (
              <View style={[styles.confidenceBadge, {
                backgroundColor: priceEstimate.confidence === 'high' ? '#10B98120' :
                                 priceEstimate.confidence === 'medium' ? '#F59E0B20' : '#EF444420'
              }]}>
                <Text style={[styles.confidenceText, {
                  color: priceEstimate.confidence === 'high' ? '#10B981' :
                         priceEstimate.confidence === 'medium' ? '#F59E0B' : '#EF4444'
                }]}>
                  {t(`foodScanner.confidence.${priceEstimate.confidence}`)}
                </Text>
              </View>
            )}
          </View>
          {priceEstimate.market_context && (
            <Text style={[styles.marketContext, { color: colors.textSecondary }]}>
              {priceEstimate.market_context}
            </Text>
          )}
        </View>
      )}

      {/* Health Indicators */}
      <HealthIndicators nutrition={scanResult.product.nutrition_per_100g} />

      {/* Nutrition Bars */}
      <NutritionBars
        nutrition={scanResult.product.nutrition_per_100g}
        quantity={quantity}
      />

      {/* Ingredients */}
      {scanResult.product.ingredients.length > 0 && (
        <View
          style={[
            styles.ingredientsSection,
            { backgroundColor: colors.surface },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("foodScanner.ingredientsIdentified")}
          </Text>
          <View style={styles.ingredientsList}>
            {scanResult.product.ingredients
              .slice(0, 2)
              .map((ingredient, index) => (
                <View key={index} style={styles.ingredientItem}>
                  <Image
                    source={{ uri: "https://via.placeholder.com/40" }}
                    style={styles.ingredientImage}
                  />
                  <View style={styles.ingredientInfo}>
                    <Text
                      style={[styles.ingredientName, { color: colors.text }]}
                    >
                      {ingredient}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={onAddToMeal}
        >
          <Plus size={20} color={colors.onPrimary} />
          <Text style={[styles.addButtonText, { color: colors.onPrimary }]}>
            {t("foodScanner.addToMeal")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shopButton, { backgroundColor: colors.surface }]}
          onPress={onAddToShoppingList}
        >
          <ShoppingCart size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={{ height: 100 }} />
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
    padding: 20,
  },
  backButton: {
    borderRadius: 12,
    padding: 8,
  },
  historyButton: {
    borderRadius: 12,
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  productCard: {
    margin: 20,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  productImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
    marginRight: 14,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: "700",
  },
  productCalories: {
    fontSize: 14,
    marginTop: 4,
  },
  productWeight: {
    fontSize: 13,
  },
  priceSection: {
    margin: 20,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
  },
  priceSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  priceIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  priceSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  priceContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: "600",
  },
  marketContext: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: "italic",
  },
  ingredientsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  ingredientsList: {
    gap: 12,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  ingredientImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
  },
  addButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  addButtonText: {
    fontWeight: "700",
    fontSize: 16,
  },
  shopButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});
