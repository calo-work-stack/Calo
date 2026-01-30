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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { ScanLine, Search, Package } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { api } from "@/src/services/api";
import { Ionicons } from "@expo/vector-icons";
import LoadingScreen from "@/components/LoadingScreen";
import { ToastService } from "@/src/services/totastService";
import { useTheme } from "@/src/context/ThemeContext";
import ScannedProducts from "@/components/ScannedProducts";
import { PriceEstimate, ProductData, ScanResult } from "@/src/types/statistics";

// Import new components
import ScannerCamera from "@/components/FoodScanner/components/ScannerCamera";
import ProductDetails from "@/components/FoodScanner/components/ProductDetails";
import ProductSearchModal from "@/components/FoodScanner/components/ProductSearchModal";
import ScanHistoryModal from "@/components/FoodScanner/components/ScanHistoryModal";

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
      ToastService.handleError(error, "Load Scan History");
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
    } catch (error) {
      console.error("❌ Error saving product to history:", error);
      ToastService.handleError(error, "Save Product to History");
    }
  };

  /**
   * Build PriceEstimate from backend AI pricing data
   * The backend returns AI-calculated prices in the product data
   */
  const buildPriceEstimateFromProduct = (
    productData: ProductData,
    quantityGrams: number,
  ): PriceEstimate | null => {
    // Check if backend provided AI pricing (use explicit checks for 0)
    const hasPrice = productData.estimated_price !== undefined && productData.estimated_price > 0;
    const hasPricePer100g = productData.price_per_100g !== undefined && productData.price_per_100g > 0;

    if (hasPrice || hasPricePer100g) {
      // Use price_per_100g if available, otherwise use estimated_price as base
      const basePricePer100g = hasPricePer100g
        ? productData.price_per_100g!
        : productData.estimated_price!;

      // Calculate price for the specific quantity
      const priceForQuantity = Math.round((basePricePer100g * quantityGrams) / 100);
      const lowPrice = Math.round(priceForQuantity * 0.85);
      const highPrice = Math.round(priceForQuantity * 1.15);

      return {
        estimated_price: priceForQuantity > 0 ? priceForQuantity : productData.estimated_price!,
        price_range: productData.price_range || `₪${lowPrice}-${highPrice}`,
        currency: "ILS",
        confidence: productData.price_confidence || "medium",
        market_context: t("foodScanner.aiPriceEstimate"),
      };
    }

    // No AI pricing available from backend
    console.warn("⚠️ No AI pricing received from backend for:", productData.name);
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

      if (response.data.success) {
        setScanResult(response.data.data);
        // Use AI pricing from backend response
        const price = buildPriceEstimateFromProduct(response.data.data.product, quantity);
        setPriceEstimate(price);
        animateResultAppearance();
        setShowResults(true);
        await loadScanHistory();
      } else {
        ToastService.handleError(
          response.data.error || t("foodScanner.noResults"),
          "Barcode Search",
        );
      }
    } catch (error) {
      console.error("Barcode scan error:", error);
      ToastService.handleError(error, "Barcode Search");
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  const handleBarcodeScan = async (scanningResult: any) => {
    if (isLoading) return;

    setIsLoading(true);
    setLoadingText(t("foodScanner.analyzing"));

    try {
      const response = await api.post("/food-scanner/barcode", {
        barcode: scanningResult.data,
      });

      if (response.data.success && response.data.data) {
        setScanResult(response.data.data);
        // Use AI pricing from backend response
        const price = buildPriceEstimateFromProduct(response.data.data.product, quantity);
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
    } catch (error) {
      console.error("Barcode scan error:", error);
      ToastService.handleError(error, "Barcode Scan");
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
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setIsLoading(true);
        setLoadingText(t("foodScanner.analyzing"));

        try {
          const response = await api.post("/food-scanner/image", {
            imageBase64: result.assets[0].base64,
          });

          if (response.data.success && response.data.data) {
            setScanResult(response.data.data);
            // Use AI pricing from backend response
            const price = buildPriceEstimateFromProduct(response.data.data.product, quantity);
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
        } catch (error) {
          console.error("Image scan error:", error);
          ToastService.handleError(error, "Image Scan");
        } finally {
          setIsLoading(false);
          setLoadingText("");
        }
      }
    } catch (error) {
      console.error("Camera error:", error);
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
        ToastService.handleError(response.data.error, "Add to Shopping List");
      }
    } catch (error) {
      console.error("Add to shopping list error:", error);
      ToastService.handleError(error, "Add to Shopping List");
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
        ToastService.handleError(response.data.error, "Log Meal");
      }
    } catch (error) {
      console.error("Add to meal history error:", error);
      ToastService.handleError(error, "Log Meal");
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

      if (response.data.success && response.data.data) {
        setSearchResults(response.data.data);
        if (response.data.data.length === 0) {
          ToastService.info(
            t("foodScanner.noResults"),
            t("foodScanner.tryDifferentSearch"),
          );
        }
      }
    } catch (error) {
      console.error("Product search error:", error);
      ToastService.handleError(error, "Product Search");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = async (product: any) => {
    setIsLoading(true);
    setLoadingText(t("foodScanner.loadingProduct"));
    try {
      console.log("🔍 Selected product:", product);

      // Save the selected product to scan history
      await saveProductToHistory(product);

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
      // Use AI pricing from backend response - search results include AI pricing
      const price = buildPriceEstimateFromProduct(scanData.product, quantity);
      setPriceEstimate(price);
      setShowManualSearch(false);
      setSearchQuery("");
      setSearchResults([]);
      animateResultAppearance();
      setShowResults(true);
    } catch (error) {
      console.error("Error selecting product:", error);
      ToastService.handleError(error, "Select Product");
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
            priceEstimate={priceEstimate}
            onBack={handleRescan}
            onShowHistory={() => setShowHistoryModal(true)}
            onAddToMeal={handleAddToMealHistory}
            onAddToShoppingList={handleAddToShoppingList}
          />
        )
      )}

      {/* Loading Overlay */}
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
  scannerContainer: {
    flex: 1,
    paddingTop: 24,
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
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    padding: 28,
    borderRadius: 20,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
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
