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

const { width, height } = Dimensions.get("window");

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
            ],
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
            ],
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await chatAPI.sendMessage(
        msg,
        language === "he" ? "hebrew" : "english",
      );

      clearTimeout(timeoutId);

      let aiContent = "";

      if (res && res.success && res.response) {
        if (typeof res.response === "string") {
          aiContent = res.response;
        } else if (typeof res.response === "object" && res.response.response) {
          aiContent = res.response.response;
        } else if (typeof res.response === "object") {
          aiContent =
            res.response.message ||
            res.response.content ||
            res.response.text ||
            "";
        }
      } else if (res && typeof res === "string") {
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

      if (aiContent && typeof aiContent === "string") {
        aiContent = aiContent.trim();

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
            console.log("Content looks like JSON but couldn't parse");
          }
        }
      }

      if (!aiContent || !aiContent.trim() || aiContent.length < 3) {
        throw new Error("Empty response from AI");
      }

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
      console.error("AI Chat error details:", error);

      let errorMessage =
        t("ai_chat.error.serverError") ||
        "Sorry, I couldn't process your message. Please try again.";

      if (
        error?.name === "AbortError" ||
        errorMessageIncludes(error, "timeout")
      ) {
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
            <View style={s.botIconContainer}>
              <Bot size={18} color="#fff" />
            </View>
          )}
          <View style={s.msgContent}>
            <View
              style={[
                s.bubble,
                isUser ? s.userBubble : s.botBubble,
                msg.hasWarning &&
                  msg.allergenWarning &&
                  msg.allergenWarning.length > 0 &&
                  s.warnBubble,
              ]}
            >
              {msg.hasWarning &&
                msg.allergenWarning &&
                msg.allergenWarning.length > 0 && (
                  <View style={s.warnBanner}>
                    <AlertTriangle size={12} color="#FF6B6B" />
                    <Text style={s.warnText}>
                      {t("ai_chat.allergen_warning")}:{" "}
                      {msg.allergenWarning.join(", ")}
                    </Text>
                  </View>
                )}
              <Text
                style={[
                  s.msgText,
                  isUser && s.userMsgText,
                  { textAlign: isRTL ? "right" : "left" },
                ]}
              >
                {msg.content}
              </Text>
            </View>
            {msg.suggestions && (
              <View style={s.suggests}>
                <View style={s.sugGrid}>
                  {msg.suggestions.map((sug, i) => (
                    <TouchableOpacity
                      key={i}
                      style={s.sugBtn}
                      onPress={() => setInputText(sug)}
                    >
                      <Text style={s.sugBtnText}>{sug}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
          {isUser && (
            <View style={s.userIconContainer}>
              {user?.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={s.profImg} />
              ) : (
                <User size={18} color="#fff" />
              )}
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  if (isLoading)
    return <LoadingScreen text={t("loading.loading", "loading.ai_chat")} />;

  return (
    <View style={s.container}>
      <View
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={s.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          {/* Header */}
          <View style={s.header}>
            <View style={[s.hContent, isRTL && s.hContentRTL]}>
              <View style={[s.hLeft, isRTL && s.hLeftRTL]}>
                <Text style={s.onlineStatus}>{t("ai_chat.title")}</Text>
              </View>
              <TouchableOpacity style={s.clearBtn} onPress={clearChat}>
                <Trash2 size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            {(userProfile.allergies.length > 0 ||
              userProfile.medicalConditions.length > 0) && (
              <View style={s.profCard}>
                <View
                  style={[s.profHdr, isRTL && { flexDirection: "row-reverse" }]}
                >
                  <Shield size={14} color="#fff" />
                  <Text style={s.profTitle}>
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
                      <Text style={s.profLbl}>
                        {t("ai_chat.safety_profile.allergies")}
                      </Text>
                      <View style={s.tags}>
                        {userProfile.allergies.map((a, i) => (
                          <View key={i} style={s.allergyTag}>
                            <Text style={s.allergyTxt}>{a}</Text>
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
                      <Text style={s.profLbl}>
                        {t("ai_chat.safety_profile.medical")}
                      </Text>
                      <View style={s.tags}>
                        {userProfile.medicalConditions.map((c, i) => (
                          <View key={i} style={s.medTag}>
                            <Text style={s.medTxt}>{c}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={s.scrollView}
            contentContainerStyle={s.scrollContent}
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
                  <View style={s.botIconContainer}>
                    <Bot size={18} color="#fff" />
                  </View>
                  <View style={s.typeBubble}>
                    <ActivityIndicator size="small" color="#9B7EDE" />
                    <Text style={s.typeText}>{t("ai_chat.typing")}</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input Area */}
          <View style={s.inputArea}>
            <View style={s.inputCont}>
              <TextInput
                style={[s.input, { textAlign: isRTL ? "right" : "left" }]}
                value={inputText}
                onChangeText={setInputText}
                placeholder={t("ai_chat.type_message") || "Enter message"}
                placeholderTextColor="#999"
                multiline
              />
              <TouchableOpacity
                style={s.sendBtn}
                onPress={sendMessage}
                disabled={!inputText.trim()}
              >
                <Send size={18} color="#999" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingTop: 12,
  },
  hContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  hContentRTL: {
    flexDirection: "row-reverse",
  },
  hLeft: {
    flex: 1,
  },
  hLeftRTL: {
    alignItems: "flex-end",
  },
  onlineStatus: {
    color: "#fff",
    fontSize: 12,
    opacity: 0.8,
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  profCard: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 12,
    backdropFilter: "blur(10px)",
  },
  profHdr: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  profTitle: {
    fontWeight: "600",
    fontSize: 13,
    color: "#fff",
  },
  profSec: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    flexWrap: "wrap",
  },
  profLbl: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.9)",
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  allergyTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(255, 107, 107, 0.2)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.3)",
  },
  allergyTxt: {
    fontSize: 10,
    color: "#FFB3B3",
  },
  medTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(255, 193, 7, 0.2)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 193, 7, 0.3)",
  },
  medTxt: {
    fontSize: 10,
    color: "#FFE082",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  msgContainer: {
    marginBottom: 16,
  },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  botIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  userIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  profImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  msgContent: {
    flex: 1,
    maxWidth: width * 0.75,
  },
  bubble: {
    padding: 16,
    borderRadius: 20,
  },
  botBubble: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderBottomRightRadius: 4,
  },
  warnBubble: {
    borderWidth: 1.5,
    borderColor: "#FF6B6B",
  },
  warnBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 107, 107, 0.2)",
  },
  warnText: {
    fontSize: 10,
    marginLeft: 4,
    color: "#FF6B6B",
  },
  msgText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333",
  },
  userMsgText: {
    color: "#fff",
  },
  suggests: {
    marginTop: 12,
    gap: 8,
  },
  sugGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sugBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sugBtnText: {
    fontSize: 13,
    color: "#8B5CF6",
    fontWeight: "500",
  },
  typeBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typeText: {
    fontSize: 14,
    color: "#666",
  },
  inputArea: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
  },
  inputCont: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  iconBtn: {
    padding: 4,
    marginRight: 4,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    fontSize: 15,
    color: "#333",
    paddingVertical: 8,
  },
  sendBtn: {
    padding: 6,
    marginLeft: 4,
  },
  userLTR: {
    justifyContent: "flex-end",
  },
  userRTL: {
    justifyContent: "flex-start",
    flexDirection: "row-reverse",
  },
  botRTL: {
    flexDirection: "row-reverse",
  },
});
