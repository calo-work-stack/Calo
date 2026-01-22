import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Send,
  Bot,
  User,
  AlertTriangle,
  Shield,
  Trash2,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { chatAPI, nutritionAPI, questionnaireAPI } from "@/src/services/api";
import i18n from "@/src/i18n";
import LoadingScreen from "@/components/LoadingScreen";
import { errorMessageIncludes } from "@/src/utils/errorHandler";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import { useTheme } from "@/src/context/ThemeContext";
import { AIChatScreenProps, Message, UserProfile } from "@/src/types/ai-chat";

const { width } = Dimensions.get("window");

export default function AIChatScreen({
  onClose,
  onMinimize,
}: AIChatScreenProps = {}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useSelector((state: RootState) => state.auth);
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    allergies: [],
    medicalConditions: [],
    dietaryPreferences: [],
    goals: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const isRTL = language === "he";
  const { colors, emeraldSpectrum } = useTheme();

  const getCommonQuestions = () => [
    t("ai_chat.common_questions.weight_loss"),
    t("ai_chat.common_questions.protein_intake"),
    t("ai_chat.common_questions.vitamin_C"),
    t("ai_chat.common_questions.vegetarian_menu"),
    t("ai_chat.common_questions.keto_diet"),
  ];

  useEffect(() => {
    const checkAccess = async () => {
      try {
        if (!user || user.subscription_type === "FREE") {
          Alert.alert(
            t("common.upgradeRequired") || "Upgrade Required",
            t("ai_chat.upgrade_message") ||
              "AI Chat is not available on the Free plan.",
            [
              {
                text: t("common.cancel") || "Cancel",
                onPress: () => router.replace("/(tabs)"),
              },
              {
                text: t("common.upgradePlan") || "Upgrade",
                onPress: () => router.replace("/payment-plan"),
              },
            ]
          );
          router.replace("/(tabs)");
          return;
        }

        const stats = await nutritionAPI.getUsageStats();
        if (stats.subscriptionType === "FREE") {
          Alert.alert(
            t("common.upgradeRequired") || "Upgrade Required",
            t("ai_chat.upgrade_message") ||
              "AI Chat is not available on the Free plan.",
            [
              {
                text: t("common.cancel") || "Cancel",
                onPress: () => router.replace("/(tabs)"),
              },
              {
                text: t("common.upgradePlan") || "Upgrade",
                onPress: () => router.replace("/payment-plan"),
              },
            ]
          );
          router.replace("/(tabs)");
          return;
        }

        loadUserProfile();
        loadChatHistory();
      } catch (error) {
        console.error("Failed to check AI chat access:", error);
        router.replace("/(tabs)");
      }
    };
    checkAccess();
  }, [user]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const loadUserProfile = async () => {
    try {
      const response = await questionnaireAPI.getQuestionnaire();
      if (response.success && response.data) {
        const q = response.data;
        setUserProfile({
          allergies: Array.isArray(q.allergies)
            ? q.allergies
            : q.allergies_text || [],
          medicalConditions: Array.isArray(q.medical_conditions_text)
            ? q.medical_conditions_text
            : [],
          dietaryPreferences: q.dietary_style ? [q.dietary_style] : [],
          goals: q.main_goal ? [q.main_goal] : [],
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChatHistory = async () => {
    try {
      const response = await chatAPI.getChatHistory(20);
      if (response?.success && response.data?.length > 0) {
        const chatMessages: Message[] = response.data
          .map((msg: any) => [
            {
              id: `user-${msg.message_id}`,
              type: "user" as const,
              content: msg.user_message,
              timestamp: new Date(msg.created_at),
            },
            {
              id: `bot-${msg.message_id}`,
              type: "bot" as const,
              content: msg.ai_response,
              timestamp: new Date(msg.created_at),
              hasWarning: checkForAllergens(msg.ai_response).length > 0,
              allergenWarning: checkForAllergens(msg.ai_response),
            },
          ])
          .flat();
        setMessages(chatMessages);
      } else {
        setMessages([
          {
            id: "welcome",
            type: "bot",
            content: t("ai_chat.welcome_message"),
            timestamp: new Date(),
            suggestions: getCommonQuestions(),
          },
        ]);
      }
    } catch (error) {
      setMessages([
        {
          id: "welcome",
          type: "bot",
          content: t("ai_chat.welcome_message"),
          timestamp: new Date(),
          suggestions: getCommonQuestions(),
        },
      ]);
    }
  };

  const checkForAllergens = (content: string): string[] => {
    if (!userProfile.allergies?.length) return [];
    const map: Record<string, string[]> = {
      nuts: ["אגוזים", "בוטנים", "nuts", "peanuts", "almonds"],
      dairy: ["חלב", "גבינה", "dairy", "milk", "cheese"],
      gluten: ["חיטה", "קמח", "wheat", "flour"],
      eggs: ["ביצים", "eggs"],
      fish: ["דג", "fish", "salmon"],
    };
    const found: string[] = [];
    userProfile.allergies.forEach((a) => {
      if (content.toLowerCase().includes(a.toLowerCase())) found.push(a);
      else if (
        map[a.toLowerCase()]?.some((k) => content.toLowerCase().includes(k))
      )
        found.push(a);
    });
    return found;
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((p) => [...p, userMsg]);
    const msg = inputText.trim();
    setInputText("");
    setIsTyping(true);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await chatAPI.sendMessage(
        msg,
        language === "he" ? "hebrew" : "english"
      );

      // Clear timeout immediately after successful response
      clearTimeout(timeoutId);

      console.log("AI Chat full response:", JSON.stringify(res, null, 2));

      // Extract AI content with clearer logic
      let aiContent = "";

      // Handle the expected server format first: { success: true, response: { response: "...", messageId: "..." } }
      if (res && res.success && res.response) {
        if (typeof res.response === "string") {
          aiContent = res.response;
        } else if (typeof res.response === "object" && res.response.response) {
          // This is your expected format
          aiContent = res.response.response;
        } else if (typeof res.response === "object") {
          // Fallback: try other common fields
          aiContent =
            res.response.message ||
            res.response.content ||
            res.response.text ||
            "";
        }
      }
      // Fallback: try other response formats
      else if (res && typeof res === "string") {
        aiContent = res;
      } else if (res && res.data) {
        if (typeof res.data === "string") {
          aiContent = res.data;
        } else if (res.data.response) {
          aiContent =
            typeof res.data.response === "string"
              ? res.data.response
              : res.data.response.response || res.data.response.message || "";
        }
      } else if (res && res.message) {
        aiContent = res.message;
      }

      console.log("AI Chat extracted content length:", aiContent?.length);
      console.log(
        "AI Chat extracted content preview:",
        aiContent?.substring(0, 150)
      );

      // Clean up the content
      if (aiContent && typeof aiContent === "string") {
        aiContent = aiContent.trim();

        // If it looks like JSON, try to extract the message
        if (
          (aiContent.startsWith("{") || aiContent.startsWith("[")) &&
          aiContent.length > 50
        ) {
          try {
            const parsed = JSON.parse(aiContent);
            const extracted =
              parsed.response ||
              parsed.message ||
              parsed.content ||
              parsed.text;
            if (extracted && typeof extracted === "string") {
              aiContent = extracted;
            }
          } catch (parseError) {
            // Keep original if JSON parsing fails
            console.log(
              "AI Chat: Content looks like JSON but couldn't parse, keeping as-is"
            );
          }
        }
      }

      // Final validation - ensure we have actual content
      if (!aiContent || !aiContent.trim() || aiContent.length < 3) {
        console.error("AI Chat: Empty or invalid response", {
          hasContent: !!aiContent,
          length: aiContent?.length,
          response: res,
        });
        throw new Error("Empty response from AI");
      }

      // Success - add the AI message
      const allergens = checkForAllergens(aiContent);
      const aiMsg: Message = {
        id: `bot-${Date.now()}`,
        type: "bot",
        content: aiContent,
        timestamp: new Date(),
        hasWarning: allergens.length > 0,
        allergenWarning: allergens.length ? allergens : undefined,
        suggestions:
          Math.random() > 0.7 ? getCommonQuestions().slice(0, 3) : undefined,
      };

      setMessages((p) => [...p, aiMsg]);
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error("AI Chat error details:", {
        name: error?.name,
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });

      // Determine error type for better user feedback
      let errorMessage =
        t("ai_chat.error.serverError") ||
        "Sorry, I couldn't process your message. Please try again.";

      if (error?.name === "AbortError" || errorMessageIncludes(error, "timeout")) {
        errorMessage =
          t("ai_chat.error.timeout") ||
          "The request took too long. Please try again.";
      } else if (
        errorMessageIncludes(error, "Network") ||
        error?.code === "ERR_NETWORK" ||
        !error?.response
      ) {
        errorMessage =
          t("ai_chat.error.network") ||
          "Network error. Please check your connection and try again.";
      } else if (error?.response?.status === 429) {
        errorMessage =
          t("ai_chat.error.rateLimit") ||
          "Too many requests. Please wait a moment and try again.";
      } else if (error?.response?.status >= 500) {
        errorMessage =
          t("ai_chat.error.serverError") ||
          "Server error. Please try again later.";
      } else if (errorMessageIncludes(error, "Empty response")) {
        errorMessage =
          t("ai_chat.error.emptyResponse") ||
          "Received an empty response. Please try again.";
      }

      setMessages((p) => [
        ...p,
        {
          id: `error-${Date.now()}`,
          type: "bot",
          content: errorMessage,
          timestamp: new Date(),
          hasWarning: false,
          isError: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };
  const clearChat = () => {
    Alert.alert(t("ai_chat.clearChat.title"), t("ai_chat.clearChat.message"), [
      { text: t("ai_chat.clearChat.cancel"), style: "cancel" },
      {
        text: t("ai_chat.clearChat.confirm"),
        style: "destructive",
        onPress: async () => {
          try {
            await chatAPI.clearHistory();
            setMessages([
              {
                id: "welcome",
                type: "bot",
                content: t("ai_chat.welcome_message"),
                timestamp: new Date(),
                suggestions: getCommonQuestions(),
              },
            ]);
          } catch (e) {
            console.error(e);
          }
        },
      },
    ]);
  };

  const renderMessage = (msg: Message) => {
    const isUser = msg.type === "user";
    return (
      <Animated.View
        entering={FadeInDown.delay(50).duration(300)}
        key={msg.id}
        style={s.msgContainer}
      >
        <View
          style={[
            s.msgRow,
            isUser && (isRTL ? s.userRTL : s.userLTR),
            !isUser && isRTL && s.botRTL,
          ]}
        >
          {!isUser && (
            <View style={[s.botIcon, { backgroundColor: colors.card }]}>
              <Bot size={16} color={emeraldSpectrum.emerald500} />
            </View>
          )}
          <View style={s.msgContent}>
            <View
              style={[
                s.bubble,
                { backgroundColor: isUser ? colors.card : colors.surface },
                msg.hasWarning &&
                  msg.allergenWarning &&
                  msg.allergenWarning.length > 0 &&
                  s.warnBubble,
              ]}
            >
              {msg.hasWarning &&
                msg.allergenWarning &&
                msg.allergenWarning.length > 0 && (
                  <View
                    style={[s.warnBanner, { borderBottomColor: colors.error }]}
                  >
                    <AlertTriangle size={12} color={colors.error} />
                    <Text style={[s.warnText, { color: colors.error }]}>
                      {t("ai_chat.allergen_warning")}:{" "}
                      {msg.allergenWarning.join(", ")}
                    </Text>
                  </View>
                )}
              <Text
                style={[
                  s.msgText,
                  { color: colors.text, textAlign: isRTL ? "right" : "left" },
                ]}
              >
                {msg.content}
              </Text>
              <Text
                style={[
                  s.time,
                  {
                    color: colors.textTertiary,
                    textAlign:
                      isRTL && isUser
                        ? "left"
                        : isRTL
                        ? "right"
                        : isUser
                        ? "right"
                        : "left",
                  },
                ]}
              >
                {msg.timestamp.toLocaleTimeString(
                  language === "he" ? "he-IL" : "en-US",
                  { hour: "2-digit", minute: "2-digit" }
                )}
              </Text>
            </View>
            {msg.suggestions && (
              <View style={s.suggests}>
                <Text
                  style={[
                    s.sugLabel,
                    {
                      color: colors.textSecondary,
                      textAlign: isRTL ? "right" : "left",
                    },
                  ]}
                >
                  {t("ai_chat.ask_anything")}
                </Text>
                <View style={s.sugGrid}>
                  {msg.suggestions.map((sug, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        s.sugBtn,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => setInputText(sug)}
                    >
                      <Text
                        style={[s.sugBtnText, { color: colors.textSecondary }]}
                      >
                        {sug}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
          {isUser && (
            <View
              style={[s.userIcon, { backgroundColor: colors.surfaceVariant }]}
            >
              {user?.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={s.profImg} />
              ) : (
                <User size={16} color={colors.text} />
              )}
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  if (isLoading) return <LoadingScreen text={t("loading.loading","loading.ai_chat")} />;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View
          style={[
            s.header,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={[s.hContent, isRTL && s.hContentRTL]}>
            <View style={[s.hLeft, isRTL && s.hLeftRTL]}>
              <View style={[s.iconWrap, { backgroundColor: colors.card }]}>
                <Bot size={18} color={emeraldSpectrum.emerald500} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    s.hTitle,
                    { color: colors.text, textAlign: isRTL ? "right" : "left" },
                  ]}
                >
                  {t("ai_chat.title")}
                </Text>
                <Text
                  style={[
                    s.hSub,
                    {
                      color: colors.textSecondary,
                      textAlign: isRTL ? "right" : "left",
                    },
                  ]}
                >
                  {t("ai_chat.subtitle")}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[s.clearBtn, { backgroundColor: colors.card }]}
              onPress={clearChat}
            >
              <Trash2 size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
          {(userProfile.allergies.length > 0 ||
            userProfile.medicalConditions.length > 0) && (
            <View style={[s.profCard, { backgroundColor: colors.card }]}>
              <View
                style={[s.profHdr, isRTL && { flexDirection: "row-reverse" }]}
              >
                <Shield size={14} color={emeraldSpectrum.emerald500} />
                <Text style={[s.profTitle, { color: colors.text }]}>
                  {t("ai_chat.safety_profile.title")}
                </Text>
              </View>
              <View style={{ gap: 8 }}>
                {userProfile.allergies.length > 0 && (
                  <View
                    style={[
                      s.profSec,
                      isRTL && { flexDirection: "row-reverse" },
                    ]}
                  >
                    <Text style={[s.profLbl, { color: colors.textSecondary }]}>
                      {t("ai_chat.safety_profile.allergies")}
                    </Text>
                    <View style={s.tags}>
                      {userProfile.allergies.map((a, i) => (
                        <View
                          key={i}
                          style={[
                            s.allergyTag,
                            {
                              borderColor: colors.error,
                              backgroundColor: colors.error + "20",
                            },
                          ]}
                        >
                          <Text style={[s.allergyTxt, { color: colors.error }]}>
                            {a}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {userProfile.medicalConditions.length > 0 && (
                  <View
                    style={[
                      s.profSec,
                      isRTL && { flexDirection: "row-reverse" },
                    ]}
                  >
                    <Text style={[s.profLbl, { color: colors.textSecondary }]}>
                      {t("ai_chat.safety_profile.medical")}
                    </Text>
                    <View style={s.tags}>
                      {userProfile.medicalConditions.map((c, i) => (
                        <View
                          key={i}
                          style={[
                            s.medTag,
                            {
                              borderColor: colors.warning,
                              backgroundColor: colors.warning + "20",
                            },
                          ]}
                        >
                          <Text style={[s.medTxt, { color: colors.warning }]}>
                            {c}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingTop: 12,
            paddingBottom: 16,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map(renderMessage)}
          {isTyping && (
            <View style={{ marginBottom: 12 }}>
              <View
                style={[
                  { flexDirection: "row", alignItems: "center", gap: 8 },
                  isRTL && { flexDirection: "row-reverse" },
                ]}
              >
                <View style={[s.botIcon, { backgroundColor: colors.card }]}>
                  <Bot size={16} color={emeraldSpectrum.emerald500} />
                </View>
                <View
                  style={[s.typeBubble, { backgroundColor: colors.surface }]}
                >
                  <ActivityIndicator
                    size="small"
                    color={emeraldSpectrum.emerald500}
                  />
                  <Text style={[s.typeText, { color: colors.textSecondary }]}>
                    {t("ai_chat.typing")}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
        <View style={[s.inputArea, { backgroundColor: colors.background }]}>
          <View style={[s.inputCont, { backgroundColor: colors.card }]}>
            <TextInput
              style={[
                s.input,
                { color: colors.text, textAlign: isRTL ? "right" : "left" },
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder={t("ai_chat.type_message")}
              placeholderTextColor={colors.textTertiary}
              multiline
            />
            <TouchableOpacity style={s.sendBtn} onPress={sendMessage}>
              <LinearGradient
                colors={[
                  emeraldSpectrum.emerald400,
                  emeraldSpectrum.emerald600,
                ]}
                start={[0, 0]}
                end={[1, 1]}
                style={s.sendGradient}
              >
                <Send size={16} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingBottom: 8 },
  hContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    padding: 12,
  },
  hContentRTL: { flexDirection: "row-reverse" },
  hLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  hLeftRTL: { flexDirection: "row-reverse" },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  hTitle: { fontWeight: "700", fontSize: 16 },
  hSub: { fontSize: 12 },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  profCard: { marginTop: 12, borderRadius: 12, padding: 12 },
  profHdr: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  profTitle: { fontWeight: "600", fontSize: 14 },
  profSec: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    flexWrap: "wrap",
  },
  profLbl: { fontSize: 12, fontWeight: "500" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  allergyTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: 8,
  },
  allergyTxt: { fontSize: 10 },
  medTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: 8,
  },
  medTxt: { fontSize: 10 },
  msgContainer: { marginVertical: 4 },
  msgRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  botIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  userIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  profImg: { width: 28, height: 28, borderRadius: 14 },
  msgContent: { flex: 1 },
  bubble: { padding: 10, borderRadius: 12 },
  warnBubble: { borderWidth: 1, borderColor: "#FF0000" },
  warnBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
    borderBottomWidth: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  warnText: { fontSize: 10, marginLeft: 4 },
  msgText: { fontSize: 14 },
  time: { fontSize: 10, marginTop: 4 },
  suggests: { marginTop: 6 },
  sugLabel: { fontSize: 12, marginBottom: 4 },
  sugGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  sugBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 8,
  },
  sugBtnText: { fontSize: 12 },
  typeBubble: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typeText: { fontSize: 12 },
  inputArea: { padding: 12 },
  inputCont: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    paddingHorizontal: 12,
  },
  input: { flex: 1, maxHeight: 100, fontSize: 14 },
  sendBtn: { marginLeft: 8 },
  sendGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  userLTR: { justifyContent: "flex-end" },
  userRTL: { justifyContent: "flex-start" },
  botRTL: { flexDirection: "row-reverse" },
});
