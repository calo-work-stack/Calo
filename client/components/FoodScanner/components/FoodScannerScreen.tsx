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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { ScanLine, Search, Package, QrCode, Camera as CameraIcon } from "lucide-react-native";
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

// Import new components
import ScannerCamera from "./ScannerCamera";
import ProductDetails from "./ProductDetails";
import ProductSearchModal from "./ProductSearchModal";
import ScanHistoryModal from "./ScanHistoryModal";

const { width } = Dimensions.get("window");

export default function FoodScannerScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { theme, colors, isDark } = useTheme();

  // Camera and scanning states
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanMode, setScanMode] = useState<"barcode" | "image">("barcode");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  // Product and analysis states
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(
    null,
  );
  const [showResults, setShowResults] = useState(false);

  // Input states
  const [barcodeInput, setBarcodeInput] = useState("");
  const [quantity, setQuantity] = useState(100);

  // UI states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showProductsGallery, setShowProductsGallery] = useState(false);

  // Manual product search states
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Animation values
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  // Debounce ref to prevent multiple rapid barcode scans
  const lastScanTime = useRef<number>(0);
  const lastScannedBarcode = useRef<string>("");

  useEffect(() => {
    getCameraPermissions();
    loadScanHistory();

    // Animate screen entrance
    Animated.parallel([
      Animated.timing(slideAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Start scanning animation
    startScanAnimation();
  }, []);

  const startScanAnimation = () => {
    // Pulse animation
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

    // Scan line animation
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
      if (response.data.success) {
        setScanHistory(response.data.data);
      }
    } catch (error) {
      console.error("Error loading scan history:", error);
      ToastService.error(
        t("foodScanner.scanError"),
        t("common.tryAgain"),
      );
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const saveProductToHistory = async (product: ProductData) => {
    try {
      console.log("💾 Attempting to save product:", product.name);

      const response = await api.post("/food-scanner/search/save", {
        product: product,
      });

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
      const serverMessage = error?.response?.data?.error;
      ToastService.error(
        t("foodScanner.scanError"),
        serverMessage || t("common.tryAgain"),
      );
    }
  };

  const estimatePrice = async (
    productData: ProductData,
  ): Promise<PriceEstimate | null> => {
    try {
      setLoadingText(t("foodScanner.estimatingPrice"));
      const basePrice = getBasePriceByCategory(productData.category);
      const sizeMultiplier = quantity > 100 ? 1.5 : 1;
      const estimatedPrice = Math.round(basePrice * sizeMultiplier);

      return {
        estimated_price: estimatedPrice,
        price_range: `${estimatedPrice - 2}-${estimatedPrice + 5} ${t(
          "common.shekels",
        )}`,
        currency: "ILS",
        confidence: "medium",
        market_context: "Estimated based on category and size",
      };
    } catch (error: any) {
      console.error("Price estimation error:", error);
    }
    return null;
  };

  const getBasePriceByCategory = (category: string): number => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes("dairy") || lowerCategory.includes("milk"))
      return 8;
    if (lowerCategory.includes("meat") || lowerCategory.includes("protein"))
      return 25;
    if (lowerCategory.includes("vegetable") || lowerCategory.includes("fruit"))
      return 6;
    if (lowerCategory.includes("snack") || lowerCategory.includes("candy"))
      return 5;
    if (lowerCategory.includes("beverage") || lowerCategory.includes("drink"))
      return 4;
    if (lowerCategory.includes("bread") || lowerCategory.includes("bakery"))
      return 7;
    return 10;
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
      console.error("Barcode scan error:", error);
      const serverMessage = error?.response?.data?.error;
      ToastService.error(
        t("foodScanner.scanError"),
        serverMessage || t("foodScanner.productNotFound"),
      );
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  const handleBarcodeScan = async (scanningResult: any) => {
    // Prevent processing if already loading
    if (isLoading) return;

    // Validate scan result
    if (!scanningResult?.data) {
      console.warn("Invalid barcode scan result");
      return;
    }

    const barcode = scanningResult.data;
    const now = Date.now();

    // Debounce: ignore if same barcode scanned within 2 seconds
    if (
      barcode === lastScannedBarcode.current &&
      now - lastScanTime.current < 2000
    ) {
      return;
    }

    // Debounce: ignore any scan within 500ms of the last scan
    if (now - lastScanTime.current < 500) {
      return;
    }

    lastScanTime.current = now;
    lastScannedBarcode.current = barcode;

    setIsLoading(true);
    setLoadingText(t("foodScanner.analyzing"));

    try {
      const response = await api.post("/food-scanner/barcode", {
        barcode: barcode,
      });

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
      console.error("Barcode scan error:", error);
      const serverMessage = error?.response?.data?.error;
      ToastService.error(
        t("foodScanner.scanError"),
        serverMessage || t("foodScanner.productNotFound"),
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
        allowsEditing: false, // Disabled to prevent cropping
        quality: 0.85,
        base64: true,
        exif: false, // Reduce data size
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];

        // Validate we have valid image data
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
          console.error("Image scan error:", error);
          const serverMessage = error?.response?.data?.error;
          ToastService.error(
            t("foodScanner.scanError"),
            serverMessage || t("foodScanner.couldNotIdentifyProduct"),
          );
        } finally {
          setIsLoading(false);
          setLoadingText("");
        }
      }
    } catch (error) {
      console.error("Camera error:", error);
      setIsLoading(false);
      setLoadingText("");
      ToastService.error(
        t("foodScanner.scanError"),
        t("foodScanner.couldNotOpenCamera"),
      );
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
    if (!scanResult) return;

    setIsLoading(true);
    try {
      const response = await api.post("/shopping-lists", {
        name: scanResult.product.name,
        quantity: quantity,
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
      console.error("Add to shopping list error:", error);
      const serverMessage = error?.response?.data?.error;
      ToastService.error(
        t("foodScanner.scanError"),
        serverMessage || t("common.tryAgain"),
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
      console.error("Add to meal history error:", error);
      const serverMessage = error?.response?.data?.error;
      ToastService.error(
        t("foodScanner.scanError"),
        serverMessage || t("common.tryAgain"),
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
    // Reset debounce refs to allow scanning the same barcode again
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

    // Clear previous results and set loading state
    if (retryCount === 0) {
      setSearchResults([]);
    }
    setIsSearching(true);

    try {
      const response = await api.get("/food-scanner/search", {
        params: { q: trimmedQuery },
        timeout: 20000, // 20 second timeout for external API calls
      });

      if (response.data.success && response.data.data) {
        setSearchResults(response.data.data);
        if (response.data.data.length === 0) {
          ToastService.info(
            t("foodScanner.noResults"),
            t("foodScanner.tryDifferentSearch"),
          );
        }
      } else {
        // Handle unsuccessful response
        setSearchResults([]);
        if (retryCount < MAX_RETRIES) {
          console.log(`🔄 Retrying search (attempt ${retryCount + 2}/${MAX_RETRIES + 1})...`);
          await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1)));
          return handleProductSearch(retryCount + 1);
        }
        ToastService.error(
          t("foodScanner.searchError"),
          response.data.error || t("common.tryAgain"),
        );
      }
    } catch (error: any) {
      console.error("Product search error:", error);

      // Retry on network errors or timeouts
      const isRetryable = error.code === "ECONNABORTED" ||
                          error.code === "ERR_NETWORK" ||
                          !error.response;

      if (isRetryable && retryCount < MAX_RETRIES) {
        console.log(`🔄 Retrying search after error (attempt ${retryCount + 2}/${MAX_RETRIES + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1)));
        return handleProductSearch(retryCount + 1);
      }

      // Clear results on final failure
      setSearchResults([]);
      const serverMessage = error?.response?.data?.error;
      ToastService.error(
        t("foodScanner.scanError"),
        serverMessage || t("common.tryAgain"),
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = async (product: any) => {
    if (!product) {
      ToastService.error(
        t("foodScanner.scanError"),
        t("common.tryAgain"),
      );
      return;
    }

    setIsLoading(true);
    setLoadingText(t("foodScanner.loadingProduct"));
    try {
      console.log("🔍 Selected product:", product);

      // Save the selected product to scan history
      try {
        await saveProductToHistory(product);
      } catch (saveError) {
        console.warn("Failed to save product to history:", saveError);
        // Continue even if save fails
      }

      // Create a scan result from the search result
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
      console.error("Error selecting product:", error);
      const serverMessage = error?.response?.data?.error;
      ToastService.error(
        t("foodScanner.scanError"),
        serverMessage || t("common.tryAgain"),
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
        <Ionicons name="camera" size={48} color={colors.textSecondary} />
        <Text
          style={[styles.noPermissionText, { color: colors.textSecondary }]}
        >
          {t("foodScanner.cameraPermissionRequired")}
        </Text>
        <TouchableOpacity
          style={[styles.permissionButton, { backgroundColor: colors.primary }]}
          onPress={getCameraPermissions}
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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.modernHeader}>
        <View style={styles.headerTop}>
          <View
            style={[
              styles.headerIconContainer,
              { backgroundColor: colors.glass },
            ]}
          >
            <ScanLine size={28} color={colors.text} strokeWidth={2.5} />
          </View>

          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t("foodScanner.title")}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                {
                  color: colors.text,
                  opacity: 0.75,
                },
              ]}
            >
              {t("foodScanner.subtitle")}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.galleryButton,
              { backgroundColor: colors.glass, marginRight: 8 },
            ]}
            onPress={() => setShowManualSearch(true)}
            activeOpacity={0.7}
          >
            <Search size={24} color={colors.text} strokeWidth={2.5} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.galleryButton, { backgroundColor: colors.glass }]}
            onPress={() => setShowProductsGallery(true)}
            activeOpacity={0.7}
          >
            <Package size={24} color={colors.text} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {!showResults ? (
        <>
          {/* Scan Mode Toggle */}
          <View style={styles.scanModeToggle}>
            <TouchableOpacity
              style={[
                styles.scanModeBtn,
                scanMode === "barcode" && [styles.scanModeBtnActive, { backgroundColor: colors.primary }],
                scanMode !== "barcode" && { backgroundColor: colors.surface },
              ]}
              onPress={() => setScanMode("barcode")}
              activeOpacity={0.7}
            >
              <QrCode
                size={18}
                color={scanMode === "barcode" ? colors.onPrimary : colors.textSecondary}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.scanModeBtnText,
                  { color: scanMode === "barcode" ? colors.onPrimary : colors.textSecondary },
                ]}
              >
                {t("foodScanner.scanFood")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.scanModeBtn,
                scanMode === "image" && [styles.scanModeBtnActive, { backgroundColor: colors.primary }],
                scanMode !== "image" && { backgroundColor: colors.surface },
              ]}
              onPress={() => setScanMode("image")}
              activeOpacity={0.7}
            >
              <CameraIcon
                size={18}
                color={scanMode === "image" ? colors.onPrimary : colors.textSecondary}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.scanModeBtnText,
                  { color: scanMode === "image" ? colors.onPrimary : colors.textSecondary },
                ]}
              >
                {t("foodScanner.takePicture")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Camera Scanner */}
          <View style={styles.scannerContainer}>
            <ScannerCamera
              scanMode={scanMode}
              onBarcodeScan={handleBarcodeScan}
              onImageScan={handleImageScan}
              scanLineAnimation={scanLineAnimation}
              pulseAnimation={pulseAnimation}
            />

            <Text
              style={[styles.scanInstructions, { color: colors.textSecondary }]}
            >
              {t("foodScanner.alignFood")}
            </Text>
          </View>

          {/* Manual Input */}
          {scanMode === "barcode" && (
            <View style={styles.manualInputContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[
                    styles.barcodeInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder={t("foodScanner.enterBarcode")}
                  placeholderTextColor={colors.textSecondary}
                  value={barcodeInput}
                  onChangeText={setBarcodeInput}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={[
                    styles.scanButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleBarcodeSearch}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                  ) : (
                    <Text
                      style={[
                        styles.scanButtonText,
                        { color: colors.onPrimary },
                      ]}
                    >
                      {t("foodScanner.scan")}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
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

      {/* Loading Overlay */}
      <OperationLoader
        visible={isLoading}
        type="loading"
        message={loadingText}
      />

      {/* History Modal */}
      <ScanHistoryModal
        visible={showHistoryModal}
        scanHistory={scanHistory}
        isLoading={isLoadingHistory}
        onClose={() => setShowHistoryModal(false)}
      />

      {/* Products Gallery */}
      <ScannedProducts
        visible={showProductsGallery}
        onClose={() => setShowProductsGallery(false)}
      />

      {/* Product Search Modal */}
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
  container: {
    flex: 1,
  },
  modernHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  galleryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  scanModeToggle: {
    flexDirection: "row",
    marginHorizontal: 20,
    borderRadius: 14,
    overflow: "hidden",
    gap: 4,
    marginBottom: 4,
  },
  scanModeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  scanModeBtnActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  scanModeBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  scannerContainer: {
    flex: 1,
    paddingTop: 16,
    alignItems: "center",
  },
  scanInstructions: {
    marginTop: 20,
    fontSize: 14,
  },
  manualInputContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: "row",
    gap: 10,
  },
  barcodeInput: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  scanButton: {
    borderRadius: 14,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  scanButtonText: {
    fontWeight: "700",
    fontSize: 16,
  },
  noPermissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  noPermissionText: {
    fontSize: 16,
    textAlign: "center",
    marginVertical: 20,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
