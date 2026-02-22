import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Dimensions,
  Animated,
  Easing,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Camera } from "expo-camera";
import {
  ScanLine,
  Search,
  Package,
  QrCode,
  Camera as CameraIcon,
  History,
  Sparkles,
  ChevronRight,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { api } from "@/src/services/api";
import LoadingScreen from "@/components/LoadingScreen";
import { ToastService } from "@/src/services/totastService";
import { useTheme } from "@/src/context/ThemeContext";
import ScannedProducts from "@/components/ScannedProducts";
import { PriceEstimate, ProductData, ScanResult } from "@/src/types/statistics";

import ScannerCamera from "@/components/FoodScanner/components/ScannerCamera";
import ProductDetails from "@/components/FoodScanner/components/ProductDetails";
import ProductSearchModal from "@/components/FoodScanner/components/ProductSearchModal";
import ScanHistoryModal from "@/components/FoodScanner/components/ScanHistoryModal";

const { width } = Dimensions.get("window");

export default function FoodScannerScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { theme, colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(
    null,
  );
  const [showResults, setShowResults] = useState(false);

  const [barcodeInput, setBarcodeInput] = useState("");
  const [quantity, setQuantity] = useState(100);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showProductsGallery, setShowProductsGallery] = useState(false);

  const [showManualSearch, setShowManualSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const isScanningRef = useRef(false);

  const slideAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const topSlide = useRef(new Animated.Value(-50)).current;
  const bottomSlide = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    getCameraPermissions();
    loadScanHistory();

    Animated.parallel([
      Animated.timing(slideAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(topSlide, {
        toValue: 0,
        tension: 70,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.spring(bottomSlide, {
        toValue: 0,
        tension: 70,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();

    startScanAnimation();
  }, []);

  const startScanAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnimation, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const getCameraPermissions = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
      if (status !== "granted") {
        ToastService.error(
          t("common.permissionRequired"),
          t("foodScanner.cameraPermissionNeeded"),
        );
      }
    } catch (error) {
      console.error("Camera permission error:", error);
      setHasPermission(false);
      ToastService.error(
        t("foodScanner.scanError"),
        "Could not access camera. Please check your device settings.",
      );
    }
  };

  const loadScanHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await api.get("/food-scanner/history");
      if (response.data?.success && Array.isArray(response.data.data)) {
        setScanHistory(response.data.data);
      }
    } catch (error) {
      console.error("Error loading scan history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const saveProductToHistory = async (product: ProductData) => {
    try {
      console.log("💾 Attempting to save product:", product.name);
      const response = await api.post("/food-scanner/search/save", { product });
      console.log("📡 Save response:", response.data);
      if (response.data.success) {
        console.log("✅ Product saved to scan history!");
        await loadScanHistory();
        ToastService.success(
          t("foodScanner.productSaved"),
          `${product.name} ${t("foodScanner.addedToHistory")}`,
        );
      } else {
        console.error("❌ Failed to save:", response.data);
      }
    } catch (error: any) {
      console.error("❌ Error saving product to history:", error);
      ToastService.error(
        t("foodScanner.scanError"),
        error?.response?.data?.error || t("common.tryAgain"),
      );
    }
  };

  const buildPriceEstimateFromProduct = (
    productData: ProductData,
    quantityGrams: number,
  ): PriceEstimate | null => {
    const hasPrice =
      productData.estimated_price !== undefined &&
      productData.estimated_price > 0;
    const hasPricePer100g =
      productData.price_per_100g !== undefined &&
      productData.price_per_100g > 0;

    if (hasPrice || hasPricePer100g) {
      const basePricePer100g = hasPricePer100g
        ? productData.price_per_100g!
        : productData.estimated_price!;
      const priceForQuantity = Math.round(
        (basePricePer100g * quantityGrams) / 100,
      );
      const lowPrice = Math.round(priceForQuantity * 0.85);
      const highPrice = Math.round(priceForQuantity * 1.15);

      return {
        estimated_price:
          priceForQuantity > 0
            ? priceForQuantity
            : productData.estimated_price!,
        price_range: productData.price_range || `₪${lowPrice}-${highPrice}`,
        currency: "ILS",
        confidence: productData.price_confidence || "medium",
        market_context: t("foodScanner.aiPriceEstimate"),
      };
    }

    console.warn(
      "⚠️ No AI pricing received from backend for:",
      productData.name,
    );
    return null;
  };

  const handleBarcodeSearch = async () => {
    if (!barcodeInput.trim()) {
      ToastService.error(
        t("foodScanner.scanError"),
        t("foodScanner.pleaseEnterBarcode"),
      );
      return;
    }
    setIsLoading(true);
    setLoadingText(t("foodScanner.scanning"));
    try {
      const response = await api.post("/food-scanner/barcode", {
        barcode: barcodeInput.trim(),
      });
      if (response.data?.success && response.data.data) {
        setScanResult(response.data.data);
        setPriceEstimate(
          buildPriceEstimateFromProduct(response.data.data.product, quantity),
        );
        animateResultAppearance();
        setShowResults(true);
        await loadScanHistory();
      } else {
        ToastService.error(
          t("foodScanner.scanError"),
          response.data?.error || t("foodScanner.productNotFound"),
        );
      }
    } catch (error: any) {
      console.error("Barcode scan error:", error);
      ToastService.error(
        t("foodScanner.scanError"),
        error?.response?.data?.error || t("foodScanner.productNotFound"),
      );
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  const handleBarcodeScan = async (scanningResult: any) => {
    if (isScanningRef.current || isLoading) return;
    const barcodeData = scanningResult?.data;
    if (!barcodeData) return;

    isScanningRef.current = true;
    setIsLoading(true);
    setLoadingText(t("foodScanner.analyzing"));
    try {
      const response = await api.post("/food-scanner/barcode", {
        barcode: barcodeData,
      });
      if (response.data?.success && response.data.data) {
        setScanResult(response.data.data);
        setPriceEstimate(
          buildPriceEstimateFromProduct(response.data.data.product, quantity),
        );
        animateResultAppearance();
        setShowResults(true);
        await loadScanHistory();
      } else {
        ToastService.error(
          t("foodScanner.scanError"),
          response.data?.error || t("foodScanner.productNotFound"),
        );
      }
    } catch (error: any) {
      console.error("Barcode scan error:", error);
      ToastService.error(
        t("foodScanner.scanError"),
        error?.response?.data?.error || t("foodScanner.productNotFound"),
      );
    } finally {
      setIsLoading(false);
      setLoadingText("");
      setTimeout(() => {
        isScanningRef.current = false;
      }, 2000);
    }
  };

  const animateResultAppearance = () => {
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleAddToShoppingList = async () => {
    if (!scanResult?.product) return;
    setIsLoading(true);
    try {
      const response = await api.post("/shopping-lists", {
        name: scanResult.product.name || "Unknown product",
        quantity,
        unit: t("home.nutrition.units.grams"),
        category: scanResult.product.category || "other",
        added_from: "scanner",
        product_barcode: scanResult.product.barcode,
        estimated_price: priceEstimate?.estimated_price,
      });
      if (response.data?.success) {
        ToastService.success(
          t("foodScanner.shoppingListUpdated"),
          t("foodScanner.addedToShoppingList", {
            product: scanResult.product.name,
          }),
        );
      } else {
        ToastService.error(
          t("foodScanner.scanError"),
          response.data?.error || "Failed to add to shopping list.",
        );
      }
    } catch (error: any) {
      console.error("Add to shopping list error:", error);
      ToastService.error(
        t("foodScanner.scanError"),
        error?.response?.data?.error ||
          "Failed to add to shopping list. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToMealHistory = async () => {
    if (!scanResult?.product) return;
    setIsLoading(true);
    try {
      const response = await api.post("/food-scanner/add-to-meal", {
        productData: scanResult.product,
        quantity,
        mealTiming: "SNACK",
      });
      if (response.data?.success) {
        ToastService.mealAdded(scanResult.product.name);
      } else {
        ToastService.error(
          t("foodScanner.scanError"),
          response.data?.error || "Failed to log meal.",
        );
      }
    } catch (error: any) {
      console.error("Add to meal history error:", error);
      ToastService.error(
        t("foodScanner.scanError"),
        error?.response?.data?.error || "Failed to log meal. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRescan = () => {
    setScanResult(null);
    setPriceEstimate(null);
    setShowResults(false);
    setBarcodeInput("");
    setQuantity(100);
  };

  const handleProductSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      ToastService.error(
        t("foodScanner.searchError"),
        t("foodScanner.searchQueryTooShort"),
      );
      return;
    }
    setIsSearching(true);
    try {
      const response = await api.get("/food-scanner/search", {
        params: { q: searchQuery.trim() },
      });
      if (response.data?.success && Array.isArray(response.data.data)) {
        setSearchResults(response.data.data);
        if (response.data.data.length === 0)
          ToastService.info(
            t("foodScanner.noResults"),
            t("foodScanner.tryDifferentSearch"),
          );
      }
    } catch (error: any) {
      console.error("Product search error:", error);
      ToastService.error(
        t("foodScanner.searchError") || "Search Error",
        error?.response?.data?.error || "Search failed. Please try again.",
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = async (product: any) => {
    setIsLoading(true);
    setLoadingText(t("foodScanner.loadingProduct"));
    try {
      console.log("🔍 Selected product:", product);
      await saveProductToHistory(product);
      const scanData = {
        product: {
          ...product,
          nutrition_per_100g: product.nutrition_per_100g || {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          },
        },
        user_analysis: {
          compatibility_score: 70,
          daily_contribution: {
            calories_percent: 0,
            protein_percent: 0,
            carbs_percent: 0,
            fat_percent: 0,
          },
          alerts: [],
          recommendations: [],
          health_assessment: t("foodScanner.productSelected"),
        },
      };
      setScanResult(scanData);
      setPriceEstimate(
        buildPriceEstimateFromProduct(scanData.product, quantity),
      );
      setShowManualSearch(false);
      setSearchQuery("");
      setSearchResults([]);
      animateResultAppearance();
      setShowResults(true);
    } catch (error: any) {
      console.error("Error selecting product:", error);
      ToastService.error(
        t("foodScanner.scanError"),
        error?.response?.data?.error || t("common.tryAgain"),
      );
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  if (hasPermission === null) {
    return (
      <LoadingScreen text={t("foodScanner.requestingCameraPermissions")} />
    );
  }

  if (hasPermission === false) {
    return (
      <View
        style={[
          styles.noPermissionContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <View
          style={[
            styles.noPermIconWrap,
            {
              backgroundColor: colors.primary + "15",
              borderColor: colors.primary + "30",
            },
          ]}
        >
          <CameraIcon size={36} color={colors.primary} strokeWidth={2} />
        </View>
        <Text
          style={[styles.noPermissionText, { color: colors.textSecondary }]}
        >
          {t("foodScanner.cameraPermissionRequired")}
        </Text>
        <TouchableOpacity
          style={[styles.permissionButton, { backgroundColor: colors.primary }]}
          onPress={getCameraPermissions}
          activeOpacity={0.85}
        >
          <Text
            style={[styles.permissionButtonText, { color: colors.onPrimary }]}
          >
            {t("common.grantPermission")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showResults && scanResult) {
    return (
      <ProductDetails
        scanResult={scanResult}
        quantity={quantity}
        priceEstimate={priceEstimate}
        onBack={handleRescan}
        onShowHistory={() => setShowHistoryModal(true)}
        onAddToMeal={handleAddToMealHistory}
        onAddToShoppingList={handleAddToShoppingList}
      />
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar
        translucent
        barStyle="light-content"
        backgroundColor="transparent"
      />

      {/* Full-screen camera — no black borders */}
      <ScannerCamera
        scanMode="barcode"
        onBarcodeScan={handleBarcodeScan}
        onImageScan={() => {}}
        scanLineAnimation={scanLineAnimation}
        pulseAnimation={pulseAnimation}
      />

      {/* ── FLOATING TOP BAR ── */}
      <Animated.View
        style={[
          styles.topBar,
          {
            top: insets.top + 10,
            opacity: fadeAnimation,
            transform: [{ translateY: topSlide }],
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.topBarLeft}>
          <LinearGradient
            colors={[colors.primary, colors.primary + "BB"]}
            style={styles.logoBox}
          >
            <ScanLine size={18} color="#fff" strokeWidth={2.5} />
          </LinearGradient>
          <View>
            <Text style={styles.appName}>{t("foodScanner.title")}</Text>
            <View style={styles.liveRow}>
              <View
                style={[styles.liveDot, { backgroundColor: colors.primary }]}
              />
              <Text style={[styles.liveLabel, { color: colors.primary }]}>
                LIVE
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.glassBtn}
            onPress={() => setShowHistoryModal(true)}
            activeOpacity={0.8}
          >
            <History size={18} color="#fff" strokeWidth={2} />
            {scanHistory.length > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeText}>
                  {Math.min(scanHistory.length, 9)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.glassBtn}
            onPress={() => setShowManualSearch(true)}
            activeOpacity={0.8}
          >
            <Search size={18} color="#fff" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.glassBtn}
            onPress={() => setShowProductsGallery(true)}
            activeOpacity={0.8}
          >
            <Package size={18} color="#fff" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── FLOATING BOTTOM PANEL ── */}
      <Animated.View
        style={[
          styles.bottomPanel,
          {
            bottom: insets.bottom + 14,
            opacity: fadeAnimation,
            transform: [{ translateY: bottomSlide }],
          },
        ]}
        pointerEvents="box-none"
      >
        {/* Barcode manual input */}
        <View style={styles.inputCard} pointerEvents="box-none">
          <QrCode size={15} color="rgba(255,255,255,0.38)" strokeWidth={2} />
          <TextInput
            style={styles.textInput}
            placeholder={t("foodScanner.enterBarcode")}
            placeholderTextColor="rgba(255,255,255,0.28)"
            value={barcodeInput}
            onChangeText={setBarcodeInput}
            keyboardType="numeric"
            selectionColor={colors.primary}
            returnKeyType="search"
            onSubmitEditing={handleBarcodeSearch}
          />
          <TouchableOpacity
            style={[
              styles.goBtn,
              {
                backgroundColor: isLoading
                  ? colors.primary + "55"
                  : colors.primary,
              },
            ]}
            onPress={handleBarcodeSearch}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ChevronRight size={17} color="#fff" strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        </View>

        {/* Hint */}
        <View style={styles.hintRow}>
          <Sparkles size={11} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.hintText, { color: colors.primary }]}>
            {t("foodScanner.alignFood")}
          </Text>
        </View>
      </Animated.View>

      {/* Loading modal */}
      {isLoading && (
        <Modal visible={isLoading} transparent animationType="fade">
          <View style={styles.loadingOverlay}>
            <View
              style={[
                styles.loadingContent,
                { backgroundColor: colors.surface },
              ]}
            >
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.text }]}>
                {loadingText}
              </Text>
            </View>
          </View>
        </Modal>
      )}

      <ScanHistoryModal
        visible={showHistoryModal}
        scanHistory={scanHistory}
        isLoading={isLoadingHistory}
        onClose={() => setShowHistoryModal(false)}
      />
      <ScannedProducts
        visible={showProductsGallery}
        onClose={() => setShowProductsGallery(false)}
      />
      <ProductSearchModal
        visible={showManualSearch}
        searchQuery={searchQuery}
        searchResults={searchResults}
        isSearching={isSearching}
        onClose={() => setShowManualSearch(false)}
        onSearchQueryChange={setSearchQuery}
        onSearch={handleProductSearch}
        onSelectProduct={handleSelectSearchResult}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },

  // ── TOP BAR ──
  topBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  appName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  liveLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  topBarRight: {
    flexDirection: "row",
    gap: 8,
  },
  glassBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#fff",
  },

  // ── BOTTOM PANEL ──
  bottomPanel: {
    position: "absolute",
    left: 16,
    right: 16,
    gap: 10,
  },
  inputCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: "#fff",
    paddingVertical: 13,
  },
  goBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  hintText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // ── LOADING ──
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    padding: 36,
    borderRadius: 28,
    alignItems: "center",
    minWidth: 180,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
  },

  // ── NO PERMISSION ──
  noPermissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 20,
  },
  noPermIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noPermissionText: {
    fontSize: 17,
    textAlign: "center",
    lineHeight: 26,
    fontWeight: "500",
  },
  permissionButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  permissionButtonText: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
