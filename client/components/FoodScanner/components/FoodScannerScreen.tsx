import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import {
  ScanLine,
  Search,
  Package,
  QrCode,
  Camera as CameraIcon,
  History,
  Sparkles,
  Zap,
  ChevronRight,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { api } from "@/src/services/api";
import { Ionicons } from "@expo/vector-icons";
import LoadingScreen from "@/components/LoadingScreen";
import { ToastService } from "@/src/services/totastService";
import { useTheme } from "@/src/context/ThemeContext";
import ScannedProducts from "@/components/ScannedProducts";
import { PriceEstimate, ProductData, ScanResult } from "@/src/types/statistics";
import { OperationLoader } from "@/components/loaders/OperationLoader";

import ScannerCamera from "./ScannerCamera";
import ProductDetails from "./ProductDetails";
import ProductSearchModal from "./ProductSearchModal";
import ScanHistoryModal from "./ScanHistoryModal";

const { width } = Dimensions.get("window");

export default function FoodScannerScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { theme, colors, isDark } = useTheme();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanMode, setScanMode] = useState<"barcode" | "image">("barcode");
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

  const slideAnimation = useRef(new Animated.Value(20)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  const lastScanTime = useRef<number>(0);
  const lastScannedBarcode = useRef<string>("");

  useEffect(() => {
    getCameraPermissions();
    loadScanHistory();

    Animated.parallel([
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnimation, {
        toValue: 0,
        tension: 80,
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
          toValue: 1.08,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnimation, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnimation, {
          toValue: 0,
          duration: 80,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === "granted");
    if (status !== "granted") {
      ToastService.error(
        t("common.permissionRequired"),
        t("foodScanner.cameraPermissionNeeded"),
      );
    }
  };

  const loadScanHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await api.get("/food-scanner/history");
      if (response.data.success) setScanHistory(response.data.data);
    } catch (error) {
      console.error("Error loading scan history:", error);
      ToastService.error(t("foodScanner.scanError"), t("common.tryAgain"));
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const saveProductToHistory = async (product: ProductData) => {
    try {
      const response = await api.post("/food-scanner/search/save", { product });
      if (response.data.success) {
        await loadScanHistory();
        ToastService.success(
          t("foodScanner.productSaved"),
          `${product.name} ${t("foodScanner.addedToHistory")}`,
        );
      }
    } catch (error: any) {
      ToastService.error(
        t("foodScanner.scanError"),
        error?.response?.data?.error || t("common.tryAgain"),
      );
    }
  };

  const estimatePrice = async (
    productData: ProductData,
  ): Promise<PriceEstimate | null> => {
    try {
      const basePrice = getBasePriceByCategory(productData.category);
      const sizeMultiplier = quantity > 100 ? 1.5 : 1;
      const estimatedPrice = Math.round(basePrice * sizeMultiplier);
      return {
        estimated_price: estimatedPrice,
        price_range: `${estimatedPrice - 2}-${estimatedPrice + 5} ${t("common.shekels")}`,
        currency: "ILS",
        confidence: "medium",
        market_context: "Estimated based on category and size",
      };
    } catch {
      return null;
    }
  };

  const getBasePriceByCategory = (category: string): number => {
    const c = category.toLowerCase();
    if (c.includes("dairy") || c.includes("milk")) return 8;
    if (c.includes("meat") || c.includes("protein")) return 25;
    if (c.includes("vegetable") || c.includes("fruit")) return 6;
    if (c.includes("snack") || c.includes("candy")) return 5;
    if (c.includes("beverage") || c.includes("drink")) return 4;
    if (c.includes("bread") || c.includes("bakery")) return 7;
    return 10;
  };

  const animateResultAppearance = () => {
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 1.05,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
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
      if (response.data.success) {
        setScanResult(response.data.data);
        const price = await estimatePrice(response.data.data.product);
        setPriceEstimate(price);
        animateResultAppearance();
        setShowResults(true);
        await loadScanHistory();
      } else {
        ToastService.error(
          t("foodScanner.scanError"),
          response.data.error || t("foodScanner.noResults"),
        );
      }
    } catch (error: any) {
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
    if (isLoading || !scanningResult?.data) return;
    const barcode = scanningResult.data;
    const now = Date.now();
    if (
      barcode === lastScannedBarcode.current &&
      now - lastScanTime.current < 2000
    )
      return;
    if (now - lastScanTime.current < 500) return;
    lastScanTime.current = now;
    lastScannedBarcode.current = barcode;
    setIsLoading(true);
    setLoadingText(t("foodScanner.analyzing"));
    try {
      const response = await api.post("/food-scanner/barcode", { barcode });
      if (response.data.success && response.data.data) {
        setScanResult(response.data.data);
        const price = await estimatePrice(response.data.data.product);
        setPriceEstimate(price);
        animateResultAppearance();
        setShowResults(true);
        await loadScanHistory();
      } else {
        ToastService.error(
          t("foodScanner.scanError"),
          t("foodScanner.productNotFound"),
        );
      }
    } catch (error: any) {
      ToastService.error(
        t("foodScanner.scanError"),
        error?.response?.data?.error || t("foodScanner.productNotFound"),
      );
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  const handleImageScan = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        ToastService.error(
          t("common.permissionRequired"),
          t("foodScanner.cameraPermissionNeeded"),
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
        base64: true,
        exif: false,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        if (!asset.base64 || asset.base64.length < 100) {
          ToastService.error(
            t("foodScanner.scanError"),
            t("foodScanner.couldNotIdentifyProduct"),
          );
          return;
        }
        setIsLoading(true);
        setLoadingText(t("foodScanner.analyzing"));
        try {
          const response = await api.post("/food-scanner/image", {
            imageBase64: asset.base64,
          });
          if (response.data.success && response.data.data) {
            setScanResult(response.data.data);
            const price = await estimatePrice(response.data.data.product);
            setPriceEstimate(price);
            animateResultAppearance();
            setShowResults(true);
            await loadScanHistory();
            ToastService.success(
              t("foodScanner.scanSuccess"),
              t("foodScanner.productIdentifiedSuccessfully"),
            );
          } else {
            ToastService.error(
              t("foodScanner.scanError"),
              t("foodScanner.couldNotIdentifyProduct"),
            );
          }
        } catch (error: any) {
          ToastService.error(
            t("foodScanner.scanError"),
            error?.response?.data?.error ||
              t("foodScanner.couldNotIdentifyProduct"),
          );
        } finally {
          setIsLoading(false);
          setLoadingText("");
        }
      }
    } catch {
      setIsLoading(false);
      setLoadingText("");
      ToastService.error(
        t("foodScanner.scanError"),
        t("foodScanner.couldNotOpenCamera"),
      );
    }
  };

  const handleAddToShoppingList = async () => {
    if (!scanResult) return;
    setIsLoading(true);
    try {
      const response = await api.post("/shopping-lists", {
        name: scanResult.product.name,
        quantity,
        unit: t("home.nutrition.units.grams"),
        category: scanResult.product.category,
        added_from: "scanner",
        product_barcode: scanResult.product.barcode,
        estimated_price: priceEstimate?.estimated_price,
      });
      if (response.data.success) {
        ToastService.success(
          t("foodScanner.shoppingListUpdated"),
          t("foodScanner.addedToShoppingList", {
            product: scanResult.product.name,
          }),
        );
      } else {
        ToastService.error(
          t("foodScanner.scanError"),
          response.data.error || t("common.tryAgain"),
        );
      }
    } catch (error: any) {
      ToastService.error(
        t("foodScanner.scanError"),
        error?.response?.data?.error || t("common.tryAgain"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToMealHistory = async () => {
    if (!scanResult) return;
    setIsLoading(true);
    try {
      const response = await api.post("/food-scanner/add-to-meal", {
        productData: scanResult.product,
        quantity,
        mealTiming: "SNACK",
      });
      if (response.data.success) {
        ToastService.mealAdded(scanResult.product.name);
      } else {
        ToastService.error(
          t("foodScanner.scanError"),
          response.data.error || t("common.tryAgain"),
        );
      }
    } catch (error: any) {
      ToastService.error(
        t("foodScanner.scanError"),
        error?.response?.data?.error || t("common.tryAgain"),
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
    lastScannedBarcode.current = "";
    lastScanTime.current = 0;
  };

  const handleProductSearch = async (retryCount: number = 0) => {
    const MAX_RETRIES = 2;
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) {
      ToastService.error(
        t("foodScanner.searchError"),
        t("foodScanner.searchQueryTooShort"),
      );
      return;
    }
    if (retryCount === 0) setSearchResults([]);
    setIsSearching(true);
    try {
      const response = await api.get("/food-scanner/search", {
        params: { q: trimmedQuery },
        timeout: 20000,
      });
      if (response.data.success && response.data.data) {
        setSearchResults(response.data.data);
        if (response.data.data.length === 0)
          ToastService.info(
            t("foodScanner.noResults"),
            t("foodScanner.tryDifferentSearch"),
          );
      } else {
        if (retryCount < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 500 * (retryCount + 1)));
          return handleProductSearch(retryCount + 1);
        }
        ToastService.error(
          t("foodScanner.searchError"),
          response.data.error || t("common.tryAgain"),
        );
      }
    } catch (error: any) {
      const isRetryable =
        !error.response ||
        error.code === "ECONNABORTED" ||
        error.code === "ERR_NETWORK";
      if (isRetryable && retryCount < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 500 * (retryCount + 1)));
        return handleProductSearch(retryCount + 1);
      }
      setSearchResults([]);
      ToastService.error(
        t("foodScanner.scanError"),
        error?.response?.data?.error || t("common.tryAgain"),
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = async (product: any) => {
    if (!product) {
      ToastService.error(t("foodScanner.scanError"), t("common.tryAgain"));
      return;
    }
    setIsLoading(true);
    setLoadingText(t("foodScanner.loadingProduct"));
    try {
      try {
        await saveProductToHistory(product);
      } catch {
        /* silent */
      }
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
      const price = await estimatePrice(scanData.product);
      setPriceEstimate(price);
      setShowManualSearch(false);
      setSearchQuery("");
      setSearchResults([]);
      animateResultAppearance();
      setShowResults(true);
    } catch (error: any) {
      ToastService.error(
        t("foodScanner.scanError"),
        error?.response?.data?.error || t("common.tryAgain"),
      );
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  if (hasPermission === null)
    return (
      <LoadingScreen text={t("foodScanner.requestingCameraPermissions")} />
    );

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
            styles.noPermissionIconWrap,
            {
              backgroundColor: colors.primary + "15",
              borderColor: colors.primary + "30",
            },
          ]}
        >
          <Ionicons name="camera-outline" size={36} color={colors.primary} />
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

  // Header gradient colors
  const headerGradient: [string, string] = isDark
    ? ["#0f172a", "#1a2744"]
    : ["#10b981", "#059669"];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* ── HEADER ── */}
      <LinearGradient
        colors={headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Title row */}
        <View style={styles.headerRow}>
          <View
            style={[
              styles.headerIconBox,
              { backgroundColor: "rgba(255,255,255,0.15)" },
            ]}
          >
            <ScanLine size={22} color="#fff" strokeWidth={2.5} />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{t("foodScanner.title")}</Text>
            <View style={styles.headerSubRow}>
              <Sparkles
                size={10}
                color="rgba(255,255,255,0.75)"
                strokeWidth={2}
              />
              <Text style={styles.headerSubtitle}>
                {t("foodScanner.subtitle")}
              </Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => setShowHistoryModal(true)}
              activeOpacity={0.75}
            >
              <History size={18} color="#fff" strokeWidth={2} />
              {scanHistory.length > 0 && (
                <View style={styles.headerBtnBadge}>
                  <Text style={styles.headerBtnBadgeText}>
                    {Math.min(scanHistory.length, 99)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => setShowManualSearch(true)}
              activeOpacity={0.75}
            >
              <Search size={18} color="#fff" strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => setShowProductsGallery(true)}
              activeOpacity={0.75}
            >
              <Package size={18} color="#fff" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {!showResults ? (
        <Animated.View
          style={[
            styles.body,
            {
              opacity: fadeAnimation,
              transform: [{ translateY: slideAnimation }],
            },
          ]}
        >
          {/* ── MODE TOGGLE ── */}
          <View style={styles.toggleWrapper}>
            <View
              style={[
                styles.toggle,
                { backgroundColor: isDark ? colors.surface : "#F1F5F9" },
              ]}
            >
              {(["barcode", "image"] as const).map((mode) => {
                const active = scanMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.toggleBtn,
                      active && {
                        backgroundColor: colors.primary,
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.35,
                        shadowRadius: 8,
                        elevation: 4,
                      },
                    ]}
                    onPress={() => setScanMode(mode)}
                    activeOpacity={0.8}
                  >
                    {mode === "barcode" ? (
                      <QrCode
                        size={15}
                        color={active ? "#fff" : colors.textSecondary}
                        strokeWidth={2.5}
                      />
                    ) : (
                      <CameraIcon
                        size={15}
                        color={active ? "#fff" : colors.textSecondary}
                        strokeWidth={2.5}
                      />
                    )}
                    <Text
                      style={[
                        styles.toggleBtnText,
                        { color: active ? "#fff" : colors.textSecondary },
                      ]}
                    >
                      {mode === "barcode"
                        ? t("foodScanner.scanFood")
                        : t("foodScanner.takePicture")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── CAMERA ── */}
          <View style={styles.cameraSection}>
            <ScannerCamera
              scanMode={scanMode}
              onBarcodeScan={handleBarcodeScan}
              onImageScan={handleImageScan}
              scanLineAnimation={scanLineAnimation}
              pulseAnimation={pulseAnimation}
            />
          </View>

          {/* ── BARCODE INPUT ── */}
          {scanMode === "barcode" && (
            <View style={styles.inputSection}>
              <View
                style={[
                  styles.inputCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <QrCode
                  size={16}
                  color={colors.textSecondary}
                  strokeWidth={2}
                />
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder={t("foodScanner.enterBarcode")}
                  placeholderTextColor={colors.textSecondary}
                  value={barcodeInput}
                  onChangeText={setBarcodeInput}
                  keyboardType="numeric"
                  selectionColor={colors.primary}
                  returnKeyType="search"
                  onSubmitEditing={handleBarcodeSearch}
                />
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    {
                      backgroundColor: isLoading
                        ? colors.primary + "50"
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
                    <ChevronRight size={18} color="#fff" strokeWidth={2.5} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
      ) : (
        scanResult && (
          <ProductDetails
            scanResult={scanResult}
            quantity={quantity}
            onBack={handleRescan}
            onShowHistory={() => setShowHistoryModal(true)}
            onAddToMeal={handleAddToMealHistory}
            onAddToShoppingList={handleAddToShoppingList}
          />
        )
      )}

      <OperationLoader
        visible={isLoading}
        type="loading"
        message={loadingText}
      />

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1 },

  // ── HEADER ──
  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.4,
  },
  headerSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.72)",
    fontWeight: "500",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerBtnBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#F59E0B",
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  headerBtnBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },

  // ── TOGGLE ──
  toggleWrapper: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  toggle: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // ── CAMERA ──
  cameraSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },

  // ── INPUT ──
  inputSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  inputCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 10,
    overflow: "hidden",
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 13,
  },
  submitBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── NO PERMISSION ──
  noPermissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 18,
  },
  noPermissionIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noPermissionText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  permissionButton: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
  },
  permissionButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
