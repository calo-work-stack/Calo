import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
  Dimensions,
  Animated,
  Platform,
  Image,
  Switch,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Camera, CameraType, CameraView } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import {
  QrCode,
  Camera as CameraIcon,
  Sparkles,
  Plus,
  Check,
  X,
  AlertTriangle,
  Shield,
  Heart,
  Leaf,
  Zap,
  Apple,
  Clock,
  BarChart3,
  Info,
  Star,
  Trash2,
  History,
  Wheat,
  Droplet,
  CircleDot,
  ShoppingCart,
  Scale,
  DollarSign,
  Package,
  Utensils,
  Eye,
  RotateCcw,
  ArrowLeft,
  ChevronRight,
  CheckCircle,
  ScanLine,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { api } from "@/src/services/api";
import { Ionicons } from "@expo/vector-icons";
import LoadingScreen from "@/components/LoadingScreen";
import ElementLoader from "@/components/ElementLoader";
import ButtonLoader from "@/components/ButtonLoader";
import { ToastService } from "@/src/services/totastService";
import { useTheme } from "@/src/context/ThemeContext";

const { width, height } = Dimensions.get("window");

interface ProductData {
  barcode?: string;
  name: string;
  brand?: string;
  category: string;
  nutrition_per_100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    saturated_fat?: number;
    trans_fat?: number;
    cholesterol?: number;
    potassium?: number;
    calcium?: number;
    iron?: number;
    vitamin_c?: number;
    vitamin_d?: number;
  };
  ingredients: string[];
  allergens: string[];
  labels: string[];
  health_score?: number;
  image_url?: string;
  serving_size?: string;
  servings_per_container?: number;
}

interface UserAnalysis {
  compatibility_score: number;
  daily_contribution: {
    calories_percent: number;
    protein_percent: number;
    carbs_percent: number;
    fat_percent: number;
  };
  alerts: string[];
  recommendations: string[];
  health_assessment: string;
}

interface ScanResult {
  product: ProductData;
  user_analysis: UserAnalysis;
}

interface PriceEstimate {
  estimated_price: number;
  price_range: string;
  currency: string;
  confidence: string;
  market_context: string;
}

export default function FoodScannerScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { theme, colors, isDark } = useTheme();
  const isRTL = language === "he";

  // Camera and scanning states
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<"barcode" | "image">("image");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  // Product and analysis states
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(
    null
  );
  const [showResults, setShowResults] = useState(false);

  // Input states
  const [barcodeInput, setBarcodeInput] = useState("");
  const [quantity, setQuantity] = useState(100);
  const [isBeverage, setIsBeverage] = useState(false);

  // UI states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Animation values
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  const texts = {
    title: t("food_scanner.title") || "Food Scanner",
    subtitle: t("food_scanner.subtitle") || "Scan and analyze your food",
    scanBarcode: t("food_scanner.scan_food") || "Scan Barcode",
    scanImage: t("food_scanner.take_picture") || "Scan Image",
    enterBarcode: t("food_scanner.enter_barcode") || "Enter barcode",
    scan: t("food_scanner.scan") || "Scan",
    quantity: t("food_scanner.quantity") || "Quantity",
    isBeverage: t("food_scanner.is_beverage") || "Is Beverage",
    addToShoppingList:
      t("food_scanner.add_to_shopping_list") || "Add to Shopping List",
    addToMealHistory:
      t("food_scanner.add_to_meal_history") || "Add to Meal History",
    rescan: t("food_scanner.rescan") || "Scan Again",
    scanning: t("food_scanner.scanning") || "Scanning...",
    analyzing: t("food_scanner.analyzing") || "Analyzing...",
    estimatingPrice:
      t("food_scanner.estimating_price") || "Estimating price...",
    scanSuccess: t("food_scanner.scan_success") || "Scan successful",
    scanError: t("food_scanner.scan_error") || "Scan failed",
    noResults: t("food_scanner.no_results") || "No results found",
    history: t("food_scanner.history") || "History",
    close: t("food_scanner.close") || "Close",
    added: t("food_scanner.added") || "Added",
    g: t("common.grams") || "g",
    ml: t("common.milliliters") || "ml",
    nis: t("common.shekels") || "₪",
    calories: t("common.calories") || "Calories",
    protein: t("common.protein") || "Protein",
    carbs: t("common.carbs") || "Carbs",
    fat: t("common.fat") || "Fat",
    fiber: t("food_scanner.fiber") || "Fiber",
    sugar: t("food_scanner.sugar") || "Sugar",
    sodium: t("food_scanner.sodium") || "Sodium",
    ingredients: t("food_scanner.ingredients") || "Ingredients",
    allergens: t("food_scanner.allergens") || "Allergens",
    healthScore: t("food_scanner.health_score") || "Health Score",
    priceEstimate: t("food_scanner.price_estimate") || "Price Estimate",
    compatibility: t("food_scanner.compatibility") || "Compatibility",
    productPreview: t("food_scanner.product_preview") || "Product Preview",
    detailedAnalysis:
      t("food_scanner.detailed_analysis") || "Detailed Analysis",
    alignFood: "Please align food with the scanner",
    scanningProgress: "Scanning in progress...",
  };

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
      ])
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
      ])
    ).start();
  };

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === "granted");
    if (status !== "granted") {
      ToastService.error(
        t("common.permission_required") || "Permission Required",
        t("food_scanner.camera_permission_needed") ||
          "Camera permission is needed to scan food"
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

  const estimatePrice = async (
    productData: ProductData
  ): Promise<PriceEstimate | null> => {
    try {
      setLoadingText(texts.estimatingPrice);
      const basePrice = getBasePriceByCategory(productData.category);
      const sizeMultiplier = quantity > 100 ? 1.5 : 1;
      const estimatedPrice = Math.round(basePrice * sizeMultiplier);

      return {
        estimated_price: estimatedPrice,
        price_range: `${estimatedPrice - 2}-${estimatedPrice + 5} ₪`,
        currency: "ILS",
        confidence: "medium",
        market_context: "Estimated based on category and size",
      };
    } catch (error) {
      console.error("Price estimation error:", error);
      ToastService.handleError(error, "Price Estimation");
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
        texts.scanError,
        isRTL ? "אנא הכנס ברקוד" : "Please enter a barcode"
      );
      return;
    }

    setIsLoading(true);
    setLoadingText(texts.scanning);

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
        ToastService.handleError(
          response.data.error || texts.noResults,
          "Barcode Search"
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
    setLoadingText(texts.analyzing);
    setIsScanning(false);

    try {
      const response = await api.post("/food-scanner/barcode", {
        barcode: scanningResult.data,
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
          texts.scanError,
          isRTL ? "מוצר לא נמצא במאגר" : "Product not found"
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
          "Permission Required",
          isRTL ? "נדרשת הרשאת מצלמה" : "Camera permission is required"
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
        setLoadingText(texts.analyzing);

        try {
          const response = await api.post("/food-scanner/image", {
            imageBase64: result.assets[0].base64,
          });

          if (response.data.success && response.data.data) {
            setScanResult(response.data.data);
            const price = await estimatePrice(response.data.data.product);
            setPriceEstimate(price);
            animateResultAppearance();
            setShowResults(true);
            await loadScanHistory();
            ToastService.success(
              texts.scanSuccess,
              isRTL ? "המוצר זוהה בהצלחה" : "Product identified successfully"
            );
          } else {
            ToastService.error(
              texts.scanError,
              isRTL
                ? "לא הצלחנו לזהות את המוצר בתמונה"
                : "Could not identify product in image"
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
        texts.scanError,
        isRTL ? "לא הצלחנו לפתוח את המצלמה" : "Could not open camera"
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
        unit: isBeverage ? "ml" : "g",
        category: scanResult.product.category,
        added_from: "scanner",
        product_barcode: scanResult.product.barcode,
        estimated_price: priceEstimate?.estimated_price,
      });

      if (response.data.success) {
        ToastService.success(
          "Shopping List Updated",
          `${scanResult.product.name} added to shopping list!`
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
    setIsBeverage(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#10B981";
    if (score >= 60) return "#F59E0B";
    if (score >= 40) return "#EF4444";
    return "#DC2626";
  };

  const scanLineTranslateY = scanLineAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  if (hasPermission === null) {
    return (
      <LoadingScreen
        text={
          t("food_scanner.requesting_camera_permissions") ||
          "Requesting camera permissions..."
        }
      />
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
          {t("food_scanner.camera_permission_required") ||
            "Camera permission is required"}
        </Text>
        <TouchableOpacity
          style={[styles.permissionButton, { backgroundColor: colors.primary }]}
          onPress={getCameraPermissions}
        >
          <Text
            style={[styles.permissionButtonText, { color: colors.onPrimary }]}
          >
            {t("common.grant_permission") || "Grant Permission"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <LinearGradient
        colors={["#10B981", "#059669", "#047857"]}
        style={styles.modernHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerIconContainer}>
            <ScanLine size={28} color="#FFFFFF" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: "#FFFFFF" }]}>
              {language === "he" ? "סורק מזון" : "Food Scanner"}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: "rgba(255, 255, 255, 0.9)" },
              ]}
            >
              {language === "he"
                ? "סרוק מזון לניתוח תזונתי"
                : "Scan food for nutritional analysis"}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {!showResults ? (
        <>
          {/* Camera Scanner */}
          <View style={styles.scannerContainer}>
            <View style={styles.cameraWrapper}>
              {scanMode === "image" ? (
                <TouchableOpacity
                  style={styles.cameraView}
                  onPress={handleImageScan}
                >
                  <View style={styles.cameraOverlay}>
                    <View style={styles.scanFrame}>
                      <View style={styles.cornerTopLeft} />
                      <View style={styles.cornerTopRight} />
                      <View style={styles.cornerBottomLeft} />
                      <View style={styles.cornerBottomRight} />

                      <Animated.View
                        style={[
                          styles.scanLine,
                          {
                            transform: [{ translateY: scanLineTranslateY }],
                          },
                        ]}
                      />
                    </View>

                    <Animated.View
                      style={[
                        styles.scanIcon,
                        {
                          transform: [{ scale: pulseAnimation }],
                        },
                      ]}
                    >
                      <CameraIcon size={40} color="#FFFFFF" />
                    </Animated.View>
                  </View>
                </TouchableOpacity>
              ) : (
                <CameraView
                  style={styles.cameraView}
                  onBarcodeScanned={handleBarcodeScan}
                  barcodeScannerSettings={{
                    barcodeTypes: [
                      "ean13",
                      "ean8",
                      "upc_a",
                      "code128",
                      "code39",
                    ],
                  }}
                >
                  <View style={styles.cameraOverlay}>
                    <View style={styles.scanFrame}>
                      <View style={styles.cornerTopLeft} />
                      <View style={styles.cornerTopRight} />
                      <View style={styles.cornerBottomLeft} />
                      <View style={styles.cornerBottomRight} />

                      <Animated.View
                        style={[
                          styles.scanLine,
                          {
                            transform: [{ translateY: scanLineTranslateY }],
                          },
                        ]}
                      />
                    </View>

                    <Animated.View
                      style={[
                        styles.scanIcon,
                        {
                          transform: [{ scale: pulseAnimation }],
                        },
                      ]}
                    >
                      <QrCode size={40} color="#FFFFFF" />
                    </Animated.View>
                  </View>
                </CameraView>
              )}
            </View>

            <Text style={styles.scanInstructions}>{texts.alignFood}</Text>
          </View>

          {/* Mode Switcher */}
          <View style={styles.modeSwitcher}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                scanMode === "image" && styles.modeButtonActive,
              ]}
              onPress={() => setScanMode("image")}
            >
              <CameraIcon
                size={20}
                color={scanMode === "image" ? "#FFFFFF" : "#6B7280"}
              />
              <Text
                style={[
                  styles.modeButtonText,
                  scanMode === "image" && styles.modeButtonTextActive,
                ]}
              >
                {texts.scanImage}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                scanMode === "barcode" && styles.modeButtonActive,
              ]}
              onPress={() => setScanMode("barcode")}
            >
              <QrCode
                size={20}
                color={scanMode === "barcode" ? "#FFFFFF" : "#6B7280"}
              />
              <Text
                style={[
                  styles.modeButtonText,
                  scanMode === "barcode" && styles.modeButtonTextActive,
                ]}
              >
                {texts.scanBarcode}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Manual Input */}
          {scanMode === "barcode" && (
            <View style={styles.manualInputContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.barcodeInput}
                  placeholder={texts.enterBarcode}
                  placeholderTextColor="#9CA3AF"
                  value={barcodeInput}
                  onChangeText={setBarcodeInput}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.scanButton}
                  onPress={handleBarcodeSearch}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.scanButtonText}>{texts.scan}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      ) : (
        <ScrollView style={styles.resultsContainer}>
          {/* Header */}
          <View style={styles.resultsHeader}>
            <TouchableOpacity style={styles.backButton} onPress={handleRescan}>
              <ArrowLeft size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Details</Text>
            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => setShowHistoryModal(true)}
            >
              <History size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Product Card */}
          {scanResult && (
            <View style={styles.productCard}>
              <Image
                source={{
                  uri:
                    scanResult.product.image_url ||
                    "https://via.placeholder.com/120",
                }}
                style={styles.productImage}
              />
              <View style={styles.productInfo}>
                <Text style={styles.productName}>
                  {scanResult.product.name}
                </Text>
                <Text style={styles.productCalories}>
                  {Math.round(
                    (scanResult.product.nutrition_per_100g.calories *
                      quantity) /
                      100
                  )}{" "}
                  Kcal
                </Text>
                <Text style={styles.productWeight}>{quantity} grams</Text>
              </View>
            </View>
          )}

          {/* Health Indicators */}
          {scanResult && (
            <View style={styles.healthIndicators}>
              <View style={styles.healthIndicator}>
                <View
                  style={[styles.healthDot, { backgroundColor: "#10B981" }]}
                />
                <Text style={styles.healthText}>Rich in proteins</Text>
              </View>
              <View style={styles.healthIndicator}>
                <View
                  style={[styles.healthDot, { backgroundColor: "#10B981" }]}
                />
                <Text style={styles.healthText}>
                  Rich in Vitamins & Minerals
                </Text>
              </View>
              <View style={styles.healthIndicator}>
                <View
                  style={[styles.healthDot, { backgroundColor: "#F59E0B" }]}
                />
                <Text style={styles.healthText}>Rich in Anti Oxidants</Text>
              </View>
            </View>
          )}

          {/* Nutrition Values */}
          {scanResult && (
            <View style={styles.nutritionSection}>
              <Text style={styles.sectionTitle}>Nutrition values</Text>
              <View style={styles.nutritionValues}>
                <View style={styles.nutritionRow}>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                  <View style={styles.nutritionBarContainer}>
                    <View
                      style={[
                        styles.nutritionBar,
                        { width: "70%", backgroundColor: "#10B981" },
                      ]}
                    />
                  </View>
                  <Text style={styles.nutritionValue}>
                    {Math.round(
                      (scanResult.product.nutrition_per_100g.protein *
                        quantity) /
                        100
                    )}{" "}
                    gm
                  </Text>
                </View>

                <View style={styles.nutritionRow}>
                  <Text style={styles.nutritionLabel}>Fats</Text>
                  <View style={styles.nutritionBarContainer}>
                    <View
                      style={[
                        styles.nutritionBar,
                        { width: "40%", backgroundColor: "#10B981" },
                      ]}
                    />
                  </View>
                  <Text style={styles.nutritionValue}>
                    {Math.round(
                      (scanResult.product.nutrition_per_100g.fat * quantity) /
                        100
                    )}{" "}
                    gm
                  </Text>
                </View>

                <View style={styles.nutritionRow}>
                  <Text style={styles.nutritionLabel}>Fibers</Text>
                  <View style={styles.nutritionBarContainer}>
                    <View
                      style={[
                        styles.nutritionBar,
                        { width: "30%", backgroundColor: "#10B981" },
                      ]}
                    />
                  </View>
                  <Text style={styles.nutritionValue}>
                    {Math.round(
                      ((scanResult.product.nutrition_per_100g.fiber || 0) *
                        quantity) /
                        100
                    )}{" "}
                    gm
                  </Text>
                </View>

                <View style={styles.nutritionRow}>
                  <Text style={styles.nutritionLabel}>Sugar</Text>
                  <View style={styles.nutritionBarContainer}>
                    <View
                      style={[
                        styles.nutritionBar,
                        { width: "50%", backgroundColor: "#F59E0B" },
                      ]}
                    />
                  </View>
                  <Text style={styles.nutritionValue}>
                    {Math.round(
                      ((scanResult.product.nutrition_per_100g.sugar || 0) *
                        quantity) /
                        100
                    )}{" "}
                    gm
                  </Text>
                </View>

                <View style={styles.nutritionRow}>
                  <Text style={styles.nutritionLabel}>Vitamins</Text>
                  <View style={styles.nutritionBarContainer}>
                    <View
                      style={[
                        styles.nutritionBar,
                        { width: "35%", backgroundColor: "#10B981" },
                      ]}
                    />
                  </View>
                  <Text style={styles.nutritionValue}>4 gm</Text>
                </View>
              </View>
            </View>
          )}

          {/* Ingredients */}
          {scanResult && scanResult.product.ingredients.length > 0 && (
            <View style={styles.ingredientsSection}>
              <Text style={styles.sectionTitle}>Ingredients Identified</Text>
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
                        <Text style={styles.ingredientName}>{ingredient}</Text>
                        <Text style={styles.ingredientDescription}>
                          Rich in Proteins
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
              style={styles.addButton}
              onPress={handleAddToMealHistory}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add to Meal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shopButton}
              onPress={handleAddToShoppingList}
            >
              <ShoppingCart size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <Modal visible={isLoading} transparent animationType="fade">
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.loadingText}>{loadingText}</Text>
            </View>
          </View>
        </Modal>
      )}

      {/* History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
              <X size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{texts.history}</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.historyContent}>
            {isLoadingHistory ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10B981" />
              </View>
            ) : scanHistory.length > 0 ? (
              scanHistory.map((item, index) => (
                <View key={index} style={styles.historyItem}>
                  <View style={styles.historyItemContent}>
                    <Text style={styles.historyItemName}>
                      {item.product_name || item.name}
                    </Text>
                    <Text style={styles.historyItemBrand}>{item.brand}</Text>
                    <Text style={styles.historyItemDate}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyHistory}>
                <BarChart3 size={64} color="#D1D5DB" />
                <Text style={styles.emptyHistoryText}>
                  {t("food_scanner.no_scan_history") || "No scan history"}
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modernHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  historyButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },
  scannerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginTop: -60,
    zIndex: 1,
  },
  cameraWrapper: {
    width: width - 40,
    height: width - 40,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 20,
  },
  cameraView: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  cameraOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  scanFrame: {
    width: 200,
    height: 200,
    position: "relative",
    backgroundColor: "transparent",
  },
  cornerTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#FFFFFF",
  },
  cornerTopRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: "#FFFFFF",
  },
  cornerBottomLeft: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#FFFFFF",
  },
  cornerBottomRight: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: "#FFFFFF",
  },
  scanLine: {
    position: "absolute",
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  scanIcon: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  scanInstructions: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  modeSwitcher: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 3,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: "#10B981",
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  modeButtonTextActive: {
    color: "#FFFFFF",
  },
  manualInputContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: "row",
    gap: 12,
  },
  barcodeInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  scanButton: {
    backgroundColor: "#10B981",
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  scanButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#F8FAFC",
  },
  productCard: {
    flexDirection: "row",
    padding: 20,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  productCalories: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  productWeight: {
    fontSize: 14,
    color: "#6B7280",
  },
  healthIndicators: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  healthIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  healthText: {
    fontSize: 14,
    color: "#374151",
  },
  nutritionSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  nutritionValues: {
    gap: 16,
  },
  nutritionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nutritionLabel: {
    fontSize: 14,
    color: "#374151",
    width: 60,
  },
  nutritionBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: "hidden",
  },
  nutritionBar: {
    height: "100%",
    borderRadius: 4,
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    width: 50,
    textAlign: "right",
  },
  ingredientsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
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
    color: "#1F2937",
    marginBottom: 2,
  },
  ingredientDescription: {
    fontSize: 12,
    color: "#6B7280",
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  addButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  shopButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    minWidth: 200,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#374151",
    textAlign: "center",
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
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  historyContent: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  historyItem: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyItemContent: {
    gap: 4,
  },
  historyItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  historyItemBrand: {
    fontSize: 14,
    color: "#6B7280",
  },
  historyItemDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  emptyHistory: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyHistoryText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
});
