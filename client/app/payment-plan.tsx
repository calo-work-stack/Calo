import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
  Dimensions,
} from "react-native";
import { ToastService } from "@/src/services/totastService";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/store";
import { userAPI } from "@/src/services/api";
import { Ionicons } from "@expo/vector-icons";
import {
  CreditCard,
  Lock,
  X,
  Check,
  Star,
  Zap,
  Crown,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width: screenWidth } = Dimensions.get("window");

type PlanType = "FREE" | "GOLD" | "PREMIUM";

interface Plan {
  id: PlanType;
  name: string;
  price: string;
  features: string[];
  color: string;
  gradient: string[];
  icon: React.ComponentType<any>;
  recommended?: boolean;
  description: string;
  savings?: string;
}

const plans: Plan[] = [
  {
    id: "FREE",
    name: "תוכנית חינמית",
    price: "חינם",
    description: "מושלם להתחלה",
    features: [
      "5 ניתוחי ארוחות בחודש",
      "שאלון תזונה בסיסי (נשמר 7 ימים)",
      "מעקב קלוריות",
      "גישה למאגר מתכונים",
      "ללא גישה לצ'אט AI",
    ],
    color: "#4CAF50",
    gradient: ["#4CAF50", "#66BB6A"],
    icon: Check,
  },
  {
    id: "GOLD",
    name: "תוכנית זהב",
    price: "₪99",
    description: "הבחירה הפופולרית",
    features: [
      "100 ניתוחי ארוחות בחודש",
      "שאלון תזונה מלא",
      "עד 100 הודעות בצ'אט AI בחודש",
      "מעקב מפורט אחר מקרו וויטמינים",
      "המלצות AI מותאמות אישית",
      "גישה לכל המתכונים",
    ],
    color: "#FF9800",
    gradient: ["#FF9800", "#FFB74D"],
    icon: Crown,
    recommended: true,
    savings: "המלצת המערכת",
  },
  {
    id: "PREMIUM",
    name: "תוכנית פלטינום",
    price: "₪49",
    description: "חוויית AI מתקדמת",
    features: [
      "50 ניתוחי ארוחות בחודש",
      "שאלון תזונה מלא",
      "1000 טוקנים לצ'אט AI בחודש (כ-20 הודעות)",
      "תפריט מותאם אישית עם AI מתקדם",
      "מעקב בריאותי מלא",
      "ייעוץ תזונתי אישי",
      "תמיכה עדיפות גבוהה",
    ],
    color: "#2196F3",
    gradient: ["#2196F3", "#42A5F5"],
    icon: Zap,
  },
];

export default function PaymentPlan() {
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
  });
  const [cardType, setCardType] = useState("");
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { mode, currentPlan } = useLocalSearchParams();

  // Check if user has completed questionnaire
  useEffect(() => {
    if (user && !user.is_questionnaire_completed && mode !== "change") {
      ToastService.warning(
        "Complete Questionnaire",
        "Please complete the questionnaire before selecting a plan"
      );
      router.replace("/questionnaire");
    }
  }, [user, mode, router]);

  // Filter plans based on mode
  const availablePlans = useMemo(() => {
    if (mode === "change" && currentPlan) {
      return plans.filter((plan) => plan.id !== currentPlan);
    }
    return plans;
  }, [mode, currentPlan]);

  const detectCardType = (cardNumber: string) => {
    const number = cardNumber.replace(/\s/g, "");

    if (number.startsWith("4")) return "Visa";
    if (
      number.startsWith("5") ||
      (number.startsWith("2") &&
        number.length >= 2 &&
        parseInt(number.substring(0, 2)) >= 22 &&
        parseInt(number.substring(0, 2)) <= 27)
    )
      return "Mastercard";
    if (number.startsWith("3")) return "American Express";
    if (number.startsWith("6")) return "Discover";

    return "";
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, "");
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(" ") : cleaned;
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + "/" + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const validatePaymentData = () => {
    const { cardNumber, expiryDate, cvv, cardholderName } = paymentData;

    if (!cardNumber || cardNumber.replace(/\s/g, "").length < 13) {
      Alert.alert("שגיאה", "מספר כרטיס אשראי לא תקין");
      return false;
    }

    if (!expiryDate || expiryDate.length !== 5) {
      Alert.alert("שגיאה", "תאריך תפוגה לא תקין");
      return false;
    }

    if (!cvv || cvv.length < 3) {
      Alert.alert("שגיאה", "קוד CVV לא תקין");
      return false;
    }

    if (!cardholderName.trim()) {
      Alert.alert("שגיאה", "שם בעל הכרטיס נדרש");
      return false;
    }

    return true;
  };

  const handlePayment = async (planId: PlanType) => {
    if (planId === "FREE") {
      return handlePlanSelection(planId);
    }

    // Get plan details
    const selectedPlan = plans.find((p) => p.id === planId);

    // Navigate to payment page with plan details
    router.push({
      pathname: "/payment",
      params: {
        planType: planId,
        planName: selectedPlan?.name || "",
        planPrice: selectedPlan?.price || "",
      },
    });
  };

  const processPayment = async () => {
    if (!validatePaymentData() || !selectedPlan) return;

    try {
      setIsLoading(true);

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Process the plan selection
      await handlePlanSelection(selectedPlan);

      setShowPaymentModal(false);
      setPaymentData({
        cardNumber: "",
        expiryDate: "",
        cvv: "",
        cardholderName: "",
      });
    } catch (error) {
      Alert.alert("שגיאה", "התשלום נכשל. אנא נסה שוב.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelection = async (planId: PlanType) => {
    try {
      // Check if user is authenticated
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("🔄 Updating subscription to:", planId);
      const response = await userAPI.updateSubscription(planId);
      console.log("✅ Subscription update response:", response);

      if (!response.success) {
        throw new Error(response.error || "Failed to update subscription");
      }

      // Update Redux state
      dispatch({
        type: "auth/updateSubscription",
        payload: { subscription_type: planId },
      });

      // Add small delay to prevent re-render conflicts
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Navigate to main app after plan selection
      // All users (FREE and paid) go to tabs after selecting a plan
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("Plan selection error:", error);
      Alert.alert("שגיאה", error.message || "נכשל בעדכון התוכנית");
    }
  };

  // Fixed handleGoBack function in payment-plan.tsx
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const handleGoBack = () => {
    if (mode === "change") {
      // Changing subscription from profile
      router.push("/(tabs)/profile");
    } else if (!user || !isAuthenticated) {
      // Not authenticated - go to sign in
      console.log("🔙 Not authenticated - redirecting to sign in");
      router.replace("/(auth)/signin");
    } else if (user.is_questionnaire_completed) {
      // Completed questionnaire - can go back to profile or questionnaire
      router.push("/(tabs)/profile");
    } else {
      // First time - go back to questionnaire
      console.log("🔙 First time user - going back to questionnaire");
      router.push("/questionnaire");
    }
  };

  const renderPlan = (plan: Plan) => {
    // Don't render current plan in change mode
    if (mode === "change" && plan.id === currentPlan) {
      return null;
    }

    const IconComponent = plan.icon;
    const isRecommended = plan.recommended;

    return (
      <View key={plan.id} style={styles.planContainer}>
        {isRecommended && (
          <View style={styles.popularBadge}>
            <Star size={12} color="#FFD700" fill="#FFD700" />
            <Text style={styles.popularText}>הכי פופולרי</Text>
          </View>
        )}

        <View
          style={[
            styles.planCard,
            isRecommended && styles.recommendedCard,
            { borderColor: plan.color },
          ]}
        >
          <LinearGradient
            colors={[plan.color + "15", plan.color + "05"]}
            style={styles.cardGradient}
          >
            <View style={styles.planHeader}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: plan.color + "20" },
                ]}
              >
                <IconComponent size={24} color={plan.color} />
              </View>
              <View style={styles.planTitleContainer}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planDescription}>{plan.description}</Text>
              </View>
            </View>

            <View style={styles.priceContainer}>
              <Text style={[styles.planPrice, { color: plan.color }]}>
                {plan.price}
              </Text>
              {plan.id !== "FREE" && (
                <Text style={styles.priceSubtext}>/חודש</Text>
              )}
            </View>

            {plan.savings && (
              <View
                style={[
                  styles.savingsBadge,
                  { backgroundColor: plan.color + "15" },
                ]}
              >
                <Text style={[styles.savingsText, { color: plan.color }]}>
                  {plan.savings}
                </Text>
              </View>
            )}

            <View style={styles.featuresContainer}>
              {plan.features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <View
                    style={[
                      styles.checkmarkContainer,
                      { backgroundColor: plan.color + "20" },
                    ]}
                  >
                    <Check size={12} color={plan.color} />
                  </View>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.selectButton,
                isRecommended && styles.recommendedButton,
                { backgroundColor: plan.color },
              ]}
              onPress={() => handlePayment(plan.id)}
              accessibilityLabel={`Select ${plan.name} plan`}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  isRecommended
                    ? [plan.color, plan.color + "CC"]
                    : [plan.color, plan.color]
                }
                style={styles.buttonGradient}
              >
                <Text style={styles.selectButtonText}>
                  {plan.id === "FREE" ? "התחל חינם" : "בחר תוכנית"}
                </Text>
                {isRecommended && <Zap size={16} color="white" fill="white" />}
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    );
  };

  const renderPaymentModal = () => (
    <Modal
      visible={showPaymentModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPaymentModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.paymentModal}>
          <LinearGradient
            colors={["#f8f9fa", "#ffffff"]}
            style={styles.modalGradient}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <CreditCard size={24} color="#2196F3" />
                <Text style={styles.modalTitle}>פרטי תשלום</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPaymentModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.planSummary}>
                <LinearGradient
                  colors={["#2196F3", "#42A5F5"]}
                  style={styles.summaryGradient}
                >
                  <Text style={styles.summaryTitle}>
                    {plans.find((p) => p.id === selectedPlan)?.name}
                  </Text>
                  <Text style={styles.summaryPrice}>
                    {plans.find((p) => p.id === selectedPlan)?.price}
                  </Text>
                  <Text style={styles.summarySubtext}>חיוב חודשי</Text>
                </LinearGradient>
              </View>

              <View style={styles.paymentForm}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>מספר כרטיס אשראי</Text>
                  <View style={styles.cardInputContainer}>
                    <TextInput
                      style={styles.cardInput}
                      value={paymentData.cardNumber}
                      onChangeText={(text) => {
                        const formatted = formatCardNumber(text);
                        if (formatted.replace(/\s/g, "").length <= 16) {
                          setPaymentData({
                            ...paymentData,
                            cardNumber: formatted,
                          });
                          setCardType(detectCardType(formatted));
                        }
                      }}
                      placeholder="1234 5678 9012 3456"
                      keyboardType="numeric"
                      maxLength={19}
                    />
                    {cardType && (
                      <View style={styles.cardTypeBadge}>
                        <Text style={styles.cardTypeText}>{cardType}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View
                    style={[
                      styles.inputContainer,
                      { flex: 1, marginRight: 12 },
                    ]}
                  >
                    <Text style={styles.inputLabel}>תאריך תפוגה</Text>
                    <TextInput
                      style={styles.input}
                      value={paymentData.expiryDate}
                      onChangeText={(text) => {
                        const formatted = formatExpiryDate(text);
                        if (formatted.length <= 5) {
                          setPaymentData({
                            ...paymentData,
                            expiryDate: formatted,
                          });
                        }
                      }}
                      placeholder="MM/YY"
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>

                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>CVV</Text>
                    <TextInput
                      style={styles.input}
                      value={paymentData.cvv}
                      onChangeText={(text) => {
                        if (text.length <= 4) {
                          setPaymentData({ ...paymentData, cvv: text });
                        }
                      }}
                      placeholder="123"
                      keyboardType="numeric"
                      maxLength={4}
                      secureTextEntry
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>שם בעל הכרטיס</Text>
                  <TextInput
                    style={styles.input}
                    value={paymentData.cardholderName}
                    onChangeText={(text) =>
                      setPaymentData({ ...paymentData, cardholderName: text })
                    }
                    placeholder="שם מלא כפי שמופיע על הכרטיס"
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.securityNotice}>
                  <Lock size={16} color="#10b981" />
                  <Text style={styles.securityText}>
                    התשלום מאובטח ומוצפן ברמה הגבוהה ביותר
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelPaymentButton}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.cancelPaymentText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.payButton, isLoading && styles.loadingButton]}
                onPress={processPayment}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={["#10b981", "#059669"]}
                  style={styles.payButtonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <CreditCard size={16} color="#ffffff" />
                      <Text style={styles.payButtonText}>שלם עכשיו</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.backButtonContainer}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <LinearGradient
        colors={["#f8f9fa", "#ffffff"]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === "change"
              ? "שנה את התוכנית שלך"
              : "בחר את התוכנית המושלמת"}
          </Text>
          <Text style={styles.subtitle}>
            {mode === "change"
              ? "בחר תוכנית חדשה שמתאימה לך יותר"
              : "התחל במסע התזונתי שלך עם התוכנית המתאימה לך"}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.plansContainer}>
        {availablePlans.map(renderPlan)}
      </View>

      <View style={styles.footer}>
        <View style={styles.guaranteeContainer}>
          <Check size={16} color="#10b981" />
          <Text style={styles.guaranteeText}>
            ללא התחייבות • ביטול בכל עת • החזר כספי מלא תוך 7 ימים
          </Text>
        </View>
        <Text style={styles.footerText}>
          ניתן לשנות או לבטל את המנוי בכל עת מהגדרות החשבון
        </Text>
      </View>

      {renderPaymentModal()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5",
  },
  contentContainer: {
    paddingBottom: 40,
  },
  backButtonContainer: {
    padding: 20,
    paddingTop: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerGradient: {
    marginHorizontal: 20,
    borderRadius: 20,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  header: {
    alignItems: "center",
    padding: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: "#666",
    textAlign: "center",
    lineHeight: 26,
    paddingHorizontal: 10,
  },
  plansContainer: {
    paddingHorizontal: 20,
    gap: 20,
  },
  planContainer: {
    position: "relative",
  },
  popularBadge: {
    position: "absolute",
    top: -8,
    left: 20,
    right: 20,
    backgroundColor: "#FFD700",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    zIndex: 1,
    gap: 4,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  popularText: {
    color: "#1a1a1a",
    fontSize: 12,
    fontWeight: "700",
  },
  planCard: {
    backgroundColor: "white",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  recommendedCard: {
    borderWidth: 3,
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  cardGradient: {
    padding: 24,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  planTitleContainer: {
    flex: 1,
  },
  planName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginBottom: 16,
  },
  planPrice: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
  },
  priceSubtext: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
    marginLeft: 4,
  },
  savingsBadge: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 20,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  featuresContainer: {
    marginBottom: 24,
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkmarkContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: "#444",
    flex: 1,
    fontWeight: "500",
  },
  selectButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  recommendedButton: {
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  selectButtonText: {
    color: "white",
    fontSize: 17,
    fontWeight: "700",
  },
  footer: {
    marginTop: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 16,
  },
  guaranteeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  guaranteeText: {
    fontSize: 13,
    color: "#10b981",
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  paymentModal: {
    height: "95%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  modalGradient: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  planSummary: {
    marginBottom: 32,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  summaryGradient: {
    padding: 24,
    alignItems: "center",
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    marginBottom: 8,
  },
  summaryPrice: {
    fontSize: 32,
    fontWeight: "800",
    color: "white",
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  paymentForm: {
    gap: 20,
  },
  inputContainer: {
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  cardInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  cardInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#fff",
    fontWeight: "500",
  },
  cardTypeBadge: {
    position: "absolute",
    right: 16,
    backgroundColor: "#f0f2f5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cardTypeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  input: {
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#fff",
    fontWeight: "500",
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    padding: 16,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#10b981",
    borderStyle: "dashed",
  },
  securityText: {
    fontSize: 13,
    color: "#10b981",
    flex: 1,
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 12,
    backgroundColor: "white",
  },
  cancelPaymentButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelPaymentText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  payButton: {
    flex: 2,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loadingButton: {
    opacity: 0.7,
  },
  payButtonGradient: {
    flexDirection: "row",
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
});
