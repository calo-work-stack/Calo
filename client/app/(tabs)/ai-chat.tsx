import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  FlatList,
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
  BotIcon,
  ChevronRight,
  ArrowLeft,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { chatAPI, nutritionAPI, questionnaireAPI } from "@/src/services/api";
import { AIChatSkeleton } from "@/components/loaders";
import { errorMessageIncludes } from "@/src/utils/errorHandler";
import Animated, {
  FadeInDown,
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import { useTheme } from "@/src/context/ThemeContext";
import { AIChatScreenProps, Message, UserProfile } from "@/src/types/ai-chat";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ==================== TYPING DOTS ====================
const TypingDot = ({ delay, color }: { delay: number; color: string }) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: 0.8 + opacity.value * 0.2 }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 7,
          height: 7,
          borderRadius: 3.5,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
};

// ==================== MAIN COMPONENT ====================

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
  const flatListRef = useRef<FlatList>(null);
  const isRTL = language === "he";
  const { colors, isDark } = useTheme();

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
            t("common.upgradeRequired"),
            t("ai_chat.upgrade_message"),
            [
              {
                text: t("common.cancel"),
                onPress: () => router.replace("/(tabs)"),
              },
              {
                text: t("common.upgradePlan"),
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
            t("common.upgradeRequired"),
            t("ai_chat.upgrade_message"),
            [
              {
                text: t("common.cancel"),
                onPress: () => router.replace("/(tabs)"),
              },
              {
                text: t("common.upgradePlan"),
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

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

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

    try {
      const res = await chatAPI.sendMessage(
        msg,
        language === "he" ? "hebrew" : "english",
      );

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
            if (extracted && typeof extracted === "string")
              aiContent = extracted;
          } catch {}
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
      let errorMessage = t("ai_chat.error.serverError");
      if (
        error?.name === "AbortError" ||
        errorMessageIncludes(error, "timeout")
      ) {
        errorMessage = t("ai_chat.error.timeout");
      } else if (
        errorMessageIncludes(error, "Network") ||
        error?.code === "ERR_NETWORK" ||
        !error?.response
      ) {
        errorMessage = t("ai_chat.error.network");
      } else if (error?.response?.status === 429) {
        errorMessage = t("ai_chat.error.rateLimit");
      } else if (error?.response?.status >= 500) {
        errorMessage = t("ai_chat.error.serverError");
      } else if (errorMessageIncludes(error, "Empty response")) {
        errorMessage = t("ai_chat.error.emptyResponse");
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

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // ==================== RENDER MESSAGE ====================

  const renderMessage = useCallback(
    ({ item: msg, index }: { item: Message; index: number }) => {
      const isUser = msg.type === "user";
      // Only animate the last 2 messages for performance
      const shouldAnimate = index >= messages.length - 2;

      const content = (
        <View style={s.msgContainer}>
          <View
            style={[
              s.msgRow,
              isUser && (isRTL ? s.userRTL : s.userLTR),
              !isUser && isRTL && s.botRTL,
            ]}
          >
            {!isUser && (
              <LinearGradient
                colors={[colors.warmOrange, "#D97706"]}
                style={s.botAvatar}
              >
                <BotIcon size={14} color="#fff" />
              </LinearGradient>
            )}

            <View style={[s.msgContent, isUser && s.userMsgContent]}>
              <View
                style={[
                  s.bubble,
                  isUser
                    ? {
                        backgroundColor: colors.warmOrange,
                        borderBottomRightRadius: 6,
                      }
                    : {
                        backgroundColor: isDark ? colors.surface : "#F8F9FA",
                        borderBottomLeftRadius: 6,
                        borderWidth: 1,
                        borderColor: isDark ? colors.border + "30" : "#E9ECEF",
                      },
                  msg.hasWarning && msg.allergenWarning?.length
                    ? { borderWidth: 1.5, borderColor: "#EF4444" }
                    : undefined,
                  msg.isError
                    ? {
                        borderWidth: 1.5,
                        borderColor: "#EF4444",
                        backgroundColor: isDark
                          ? "rgba(239,68,68,0.08)"
                          : "rgba(239,68,68,0.04)",
                      }
                    : undefined,
                ]}
              >
                {msg.hasWarning && msg.allergenWarning?.length ? (
                  <View style={s.warnBanner}>
                    <AlertTriangle size={13} color="#EF4444" />
                    <Text style={s.warnText}>
                      {t("ai_chat.allergen_warning")}:{" "}
                      {msg.allergenWarning.join(", ")}
                    </Text>
                  </View>
                ) : null}

                <Text
                  style={[
                    s.msgText,
                    isUser
                      ? { color: "#FFFFFF" }
                      : { color: isDark ? colors.text : "#1F2937" },
                    { textAlign: isRTL ? "right" : "left" },
                  ]}
                >
                  {msg.content}
                </Text>
                <Text
                  style={[
                    s.timestamp,
                    isUser
                      ? { color: "rgba(255,255,255,0.65)" }
                      : { color: colors.textSecondary },
                  ]}
                >
                  {formatTime(msg.timestamp)}
                </Text>
              </View>

              {msg.suggestions?.length ? (
                <View style={s.suggestionsWrap}>
                  {msg.suggestions.map((sug, i) => (
                    <Pressable
                      key={i}
                      style={[
                        s.suggestionChip,
                        {
                          backgroundColor: isDark ? colors.surface : "#FFF7ED",
                          borderColor: colors.warmOrange + "25",
                        },
                      ]}
                      onPress={() => setInputText(sug)}
                    >
                      <Text
                        style={[s.suggestionText, { color: colors.warmOrange }]}
                        numberOfLines={2}
                      >
                        {sug}
                      </Text>
                      <ChevronRight size={13} color={colors.warmOrange} />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            {isUser && (
              <View>
                {user?.avatar_url ? (
                  <Image
                    source={{ uri: user.avatar_url }}
                    style={s.userAvatar}
                  />
                ) : (
                  <LinearGradient
                    colors={[colors.warmOrange, "#D97706"]}
                    style={s.userAvatar}
                  >
                    <User size={14} color="#fff" />
                  </LinearGradient>
                )}
              </View>
            )}
          </View>
        </View>
      );

      if (shouldAnimate) {
        return (
          <Animated.View entering={FadeInUp.duration(300).springify()}>
            {content}
          </Animated.View>
        );
      }

      return content;
    },
    [messages.length, colors, isDark, isRTL, user, t],
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  // ==================== LOADING ====================

  if (isLoading) {
    return (
      <SafeAreaView
        style={[s.container, { backgroundColor: colors.background }]}
      >
        <AIChatSkeleton />
      </SafeAreaView>
    );
  }

  // ==================== RENDER ====================

  return (
    <SafeAreaView
      style={[s.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* ===== HEADER ===== */}
        <View
          style={[
            s.header,
            {
              backgroundColor: isDark ? colors.surface : "#FFFFFF",
              borderBottomColor: colors.border + "30",
            },
          ]}
        >
          <Pressable
            style={s.headerBtn}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <ArrowLeft size={20} color={colors.text} />
          </Pressable>

          <View style={s.headerCenter}>
            <LinearGradient
              colors={[colors.warmOrange, "#D97706"]}
              style={s.headerIcon}
            >
              <Bot size={15} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={[s.headerTitle, { color: colors.text }]}>
                {t("ai_chat.title")}
              </Text>
              <View style={s.statusRow}>
                <View style={[s.onlineDot, { backgroundColor: "#10B981" }]} />
                <Text style={[s.statusText, { color: colors.textSecondary }]}>
                  {t("ai_chat.online")}
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            style={[
              s.headerBtn,
              { backgroundColor: isDark ? colors.background : "#F3F4F6" },
            ]}
            onPress={clearChat}
            hitSlop={8}
          >
            <Trash2 size={17} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* ===== SAFETY BANNER ===== */}
        {(userProfile.allergies.length > 0 ||
          userProfile.medicalConditions.length > 0) && (
          <View
            style={[
              s.safetyBanner,
              {
                backgroundColor: isDark ? "rgba(16,185,129,0.08)" : "#ECFDF5",
                borderColor: isDark ? "rgba(16,185,129,0.15)" : "#D1FAE5",
              },
            ]}
          >
            <Shield size={14} color="#10B981" />
            <View style={s.safetyTags}>
              {userProfile.allergies.slice(0, 3).map((a, i) => (
                <View key={`a-${i}`} style={s.allergyChip}>
                  <Text style={s.allergyChipText}>{a}</Text>
                </View>
              ))}
              {userProfile.medicalConditions.slice(0, 2).map((c, i) => (
                <View key={`m-${i}`} style={s.medicalChip}>
                  <Text style={s.medicalChipText}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ===== MESSAGES ===== */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={10}
          onContentSizeChange={scrollToBottom}
          ListFooterComponent={
            isTyping ? (
              <View style={s.typingRow}>
                <LinearGradient
                  colors={[colors.warmOrange, "#D97706"]}
                  style={s.botAvatar}
                >
                  <Bot size={14} color="#fff" />
                </LinearGradient>
                <View
                  style={[
                    s.typingBubble,
                    {
                      backgroundColor: isDark ? colors.surface : "#F8F9FA",
                      borderColor: isDark ? colors.border + "30" : "#E9ECEF",
                    },
                  ]}
                >
                  <View style={s.typingDots}>
                    <TypingDot delay={0} color={colors.warmOrange} />
                    <TypingDot delay={150} color={colors.warmOrange} />
                    <TypingDot delay={300} color={colors.warmOrange} />
                  </View>
                  <Text style={[s.typingText, { color: colors.textSecondary }]}>
                    {t("ai_chat.typing")}
                  </Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* ===== INPUT ===== */}
        <View
          style={[
            s.inputArea,
            {
              borderTopColor: colors.border + "20",
            },
          ]}
        >
          <View
            style={[
              s.inputWrapper,
              {
                backgroundColor: isDark ? colors.card : "#F3F4F6",
                borderColor: inputText.trim()
                  ? colors.warmOrange + "60"
                  : "transparent",
              },
            ]}
          >
            <TextInput
              style={[
                s.input,
                { color: colors.text, textAlign: isRTL ? "right" : "left" },
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder={t("ai_chat.type_message")}
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={1000}
              onSubmitEditing={sendMessage}
            />
            <Pressable
              style={[
                s.sendBtn,
                {
                  backgroundColor: inputText.trim()
                    ? colors.warmOrange
                    : isDark
                      ? colors.surface
                      : "#E5E7EB",
                },
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isTyping}
            >
              <Send
                size={17}
                color={inputText.trim() ? "#FFFFFF" : colors.textSecondary}
                style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================

const s = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 1,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Safety
  safetyBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  safetyTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    flex: 1,
  },
  allergyChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 6,
  },
  allergyChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#DC2626",
  },
  medicalChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(245,158,11,0.1)",
    borderRadius: 6,
  },
  medicalChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#D97706",
  },

  // Messages
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  msgContainer: {
    marginBottom: 12,
  },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  botAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    overflow: "hidden",
  },
  msgContent: {
    flex: 1,
    maxWidth: SCREEN_WIDTH * 0.72,
  },
  userMsgContent: {
    alignItems: "flex-end",
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  warnBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(239,68,68,0.12)",
  },
  warnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#DC2626",
    flex: 1,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: "500",
  },

  // Suggestions
  suggestionsWrap: {
    marginTop: 10,
    gap: 6,
  },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },

  // Typing
  typingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 8,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
  },
  typingDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  typingText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Input
  inputArea: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 120 : 60,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 22,
    paddingLeft: 16,
    paddingRight: 5,
    paddingVertical: 5,
    borderWidth: 1.5,
    minHeight: 46,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 7,
    letterSpacing: -0.1,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },

  // RTL
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
