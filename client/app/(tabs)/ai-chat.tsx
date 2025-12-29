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
  Sparkles,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { chatAPI, nutritionAPI, questionnaireAPI } from "@/src/services/api";
import i18n from "@/src/i18n";
import LoadingScreen from "@/components/LoadingScreen";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import { useTheme } from "@/src/context/ThemeContext";

const { width } = Dimensions.get("window");

interface AIChatScreenProps {
  onClose?: () => void;
  onMinimize?: () => void;
}

interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
  hasWarning?: boolean;
  allergenWarning?: string[];
  suggestions?: string[];
}

interface UserProfile {
  allergies: string[];
  medicalConditions: string[];
  dietaryPreferences: string[];
  goals: string[];
}

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
  const isRTL = i18n.language === "he";
  const { theme, colors, isDark } = useTheme();

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
              "AI Chat is not available on the Free plan. Please upgrade to Gold or Platinum plan to access this feature.",
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
              "AI Chat is not available on the Free plan. Please upgrade to Gold or Platinum plan to access this feature.",
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
      console.log("🔄 Loading user profile from questionnaire...");
      const response = await questionnaireAPI.getQuestionnaire();

      if (response.success && response.data) {
        const questionnaire = response.data;

        const profile: UserProfile = {
          allergies: Array.isArray(questionnaire.allergies)
            ? questionnaire.allergies
            : questionnaire.allergies_text || [],
          medicalConditions: Array.isArray(
            questionnaire.medical_conditions_text
          )
            ? questionnaire.medical_conditions_text
            : [],
          dietaryPreferences: questionnaire.dietary_style
            ? [questionnaire.dietary_style]
            : [],
          goals: questionnaire.main_goal ? [questionnaire.main_goal] : [],
        };

        setUserProfile(profile);
        console.log("✅ User profile loaded:", profile);
      } else {
        console.log("⚠️ No questionnaire data found, using empty profile");
      }
    } catch (error) {
      console.error("💥 Error loading user profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChatHistory = async () => {
    try {
      console.log("📜 Loading chat history...");
      const response = await chatAPI.getChatHistory(20);

      if (
        response &&
        response.success &&
        response.data &&
        response.data.length > 0
      ) {
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
        console.log("✅ Loaded", chatMessages.length, "chat messages");
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
      console.error("💥 Error loading chat history:", error);
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

  const checkForAllergens = (messageContent: string): string[] => {
    if (!userProfile.allergies || userProfile.allergies.length === 0) {
      return [];
    }

    const allergenMap: Record<string, string[]> = {
      nuts: [
        "אגוזים",
        "בוטנים",
        "שקדים",
        "אגוז",
        "לוז",
        "nuts",
        "peanuts",
        "almonds",
        "walnuts",
      ],
      dairy: [
        "חלב",
        "גבינה",
        "יוגורט",
        "חמאה",
        "dairy",
        "milk",
        "cheese",
        "yogurt",
        "butter",
      ],
      gluten: [
        "חיטה",
        "קמח",
        "לחם",
        "פסטה",
        "wheat",
        "flour",
        "bread",
        "pasta",
        "gluten",
      ],
      eggs: ["ביצים", "ביצה", "eggs", "egg"],
      fish: ["דג", "דגים", "סלמון", "טונה", "fish", "salmon", "tuna"],
      soy: ["סויה", "טופו", "soy", "tofu"],
      shellfish: [
        "סרטנים",
        "לובסטר",
        "שרימפס",
        "shellfish",
        "crab",
        "lobster",
        "shrimp",
      ],
    };

    const foundAllergens: string[] = [];

    userProfile.allergies.forEach((allergy) => {
      const allergyLower = allergy.toLowerCase();

      if (messageContent.toLowerCase().includes(allergyLower)) {
        foundAllergens.push(allergy);
        return;
      }

      const mappedKeywords = allergenMap[allergyLower];
      if (mappedKeywords) {
        const hasAllergen = mappedKeywords.some((keyword) =>
          messageContent.toLowerCase().includes(keyword.toLowerCase())
        );
        if (hasAllergen) {
          foundAllergens.push(allergy);
        }
      }
    });

    return foundAllergens;
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentMessage = inputText.trim();
    setInputText("");
    setIsTyping(true);

    try {
      console.log("💬 Sending message to AI:", currentMessage);

      const response = await chatAPI.sendMessage(
        currentMessage,
        language === "he" ? "hebrew" : "english"
      );

      console.log("🔍 Full API response structure:", response);

      let aiResponseContent = "";
      let responseData = null;

      if (response.success && response.response) {
        responseData = response.response;
        aiResponseContent = response.response.response || response.response;
      } else if (response.response && response.response.response) {
        responseData = response.response;
        aiResponseContent = response.response.response;
      } else if (response.response && typeof response.response === "string") {
        aiResponseContent = response.response;
      } else if (typeof response === "string") {
        aiResponseContent = response;
      } else {
        console.error("🚨 Unexpected response format:", response);
        throw new Error("Invalid response format from server");
      }

      if (!aiResponseContent || aiResponseContent.trim() === "") {
        throw new Error("Empty response from AI");
      }

      console.log("✅ Extracted AI response content:", aiResponseContent);

      const allergens = checkForAllergens(aiResponseContent);

      const aiMessage: Message = {
        id: `bot-${Date.now()}`,
        type: "bot",
        content: aiResponseContent,
        timestamp: new Date(),
        hasWarning: allergens.length > 0,
        allergenWarning: allergens.length > 0 ? allergens : undefined,
        suggestions:
          Math.random() > 0.7 ? getCommonQuestions().slice(0, 3) : undefined,
      };

      setMessages((prev) => [...prev, aiMessage]);
      console.log("✅ AI response received and displayed successfully");
    } catch (error) {
      console.error("💥 Error sending message:", error);

      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: "bot",
        content: t("ai_chat.error.serverError"),
        timestamp: new Date(),
        hasWarning: true,
      };

      setMessages((prev) => [...prev, errorMessage]);

      Alert.alert(t("ai_chat.error.title"), t("ai_chat.error.networkError"));
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
            console.log("🗑️ Chat history cleared");
          } catch (error) {
            console.error("💥 Error clearing chat:", error);
            console.log("⚠️ Failed to clear chat history, but continuing");
          }
        },
      },
    ]);
  };

  const selectSuggestion = (suggestion: string) => {
    setInputText(suggestion);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(language === "he" ? "he-IL" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderMessage = (message: Message) => {
    const isUser = message.type === "user";

    return (
      <Animated.View
        entering={FadeInDown.delay(50).duration(300)}
        key={message.id}
        style={styles.messageContainer}
      >
        <View style={[styles.messageRow, isUser && styles.userMessageRow]}>
          {!isUser && (
            <View style={styles.botIconContainer}>
              <Bot size={20} color="#16A085" />
            </View>
          )}

          <View style={styles.messageContentContainer}>
            <View
              style={[
                styles.messageBubble,
                isUser ? styles.userBubble : styles.botBubble,
                message.hasWarning && styles.warningBubble,
              ]}
            >
              {message.hasWarning && (
                <View style={styles.warningBanner}>
                  <AlertTriangle size={16} color="#E74C3C" />
                  <Text style={styles.warningText}>
                    {t("ai_chat.allergenWarning")}
                  </Text>
                </View>
              )}

              <Text style={[styles.messageText, isUser && styles.userText]}>
                {message.content}
              </Text>

              <Text style={[styles.timestamp, isUser && styles.userTimestamp]}>
                {formatTime(message.timestamp)}
              </Text>
            </View>

            {message.suggestions && (
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsLabel}>
                  {t("ai_chat.ask_anything")}
                </Text>
                <View style={styles.suggestionsGrid}>
                  {message.suggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionButton}
                      onPress={() => selectSuggestion(suggestion)}
                    >
                      <Text style={styles.suggestionButtonText}>
                        {suggestion}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {isUser && (
            <View style={styles.userIconContainer}>
              <User size={20} color="#FFFFFF" />
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  if (isLoading) {
    return <LoadingScreen text={t("ai_chat.loading")} />;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Fixed Header - Outside KeyboardAvoidingView */}
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.headerTextContainer}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  {t("ai_chat.title")}
                </Text>

                <Text style={[styles.headerSubtitle, { color: colors.text }]}>
                  {t("ai_chat.subtitle")}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.clearButton} onPress={clearChat}>
              <Trash2 size={20} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Scrollable Content with Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Card */}
          {(userProfile.allergies.length > 0 ||
            userProfile.medicalConditions.length > 0) && (
            <View style={styles.profileCard}>
              <View style={styles.profileHeader}>
                <Shield size={18} color="#16A085" />
                <Text style={styles.profileTitle}>
                  {t("ai_chat.safety_profile.title")}
                </Text>
              </View>
              <View style={styles.profileContent}>
                {userProfile.allergies.length > 0 && (
                  <View style={styles.profileSection}>
                    <Text style={styles.profileLabel}>
                      {t("ai_chat.safety_profile.allergies")}
                    </Text>
                    <View style={styles.tagContainer}>
                      {userProfile.allergies.map((allergy, index) => (
                        <View key={index} style={styles.allergyTag}>
                          <Text style={styles.allergyTagText}>{allergy}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {userProfile.medicalConditions.length > 0 && (
                  <View style={styles.profileSection}>
                    <Text style={styles.profileLabel}>
                      {t("ai_chat.safety_profile.medical")}
                    </Text>
                    <View style={styles.tagContainer}>
                      {userProfile.medicalConditions.map((condition, index) => (
                        <View key={index} style={styles.medicalTag}>
                          <Text style={styles.medicalTagText}>{condition}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {messages.map(renderMessage)}

          {isTyping && (
            <View style={styles.typingIndicator}>
              <View style={styles.typingRow}>
                <View style={styles.botIconContainer}>
                  <Bot size={20} color="#16A085" />
                </View>
                <View style={styles.typingBubble}>
                  <ActivityIndicator size="small" color="#16A085" />
                  <Text style={styles.typingText}>{t("ai_chat.typing")}</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputArea}>
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.textInput,
                { textAlign: language === "he" ? "right" : "left" },
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder={t("ai_chat.type_message")}
              placeholderTextColor="#95A5A6"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={sendMessage}
              disabled={!inputText.trim() || isTyping}
            >
              <LinearGradient
                colors={
                  !inputText.trim() || isTyping
                    ? ["#BDC3C7", "#95A5A6"]
                    : ["#16A085", "#1ABC9C"]
                }
                style={styles.sendGradient}
              >
                <Send size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  headerWrapper: {
    zIndex: 10,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
    marginTop: 2,
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
    borderRadius: 18,
    padding: 18,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  profileTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 8,
  },
  profileContent: {
    gap: 12,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  profileLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#7F8C8D",
    marginRight: 12,
    minWidth: 70,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    flex: 1,
  },
  allergyTag: {
    backgroundColor: "#FDEBEA",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E74C3C",
  },
  allergyTagText: {
    fontSize: 12,
    color: "#E74C3C",
    fontWeight: "500",
  },
  medicalTag: {
    backgroundColor: "#F4ECF7",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#9B59B6",
  },
  medicalTagText: {
    fontSize: 12,
    color: "#9B59B6",
    fontWeight: "500",
  },
  messageContainer: {
    marginBottom: 24,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  userMessageRow: {
    flexDirection: "row-reverse",
  },
  botIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F8F5",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  userIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#16A085",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  messageContentContainer: {
    flex: 1,
    maxWidth: width - 120,
  },
  messageBubble: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  userBubble: {
    backgroundColor: "#16A085",
    alignSelf: "flex-end",
    shadowColor: "#16A085",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  botBubble: {
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
  },
  warningBubble: {
    borderLeftWidth: 4,
    borderLeftColor: "#E74C3C",
    backgroundColor: "#FDEBEA",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E74C3C",
  },
  warningText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E74C3C",
    marginLeft: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#2C3E50",
  },
  userText: {
    color: "#FFFFFF",
  },
  timestamp: {
    fontSize: 11,
    color: "#95A5A6",
    marginTop: 6,
  },
  userTimestamp: {
    color: "rgba(255,255,255,0.8)",
    textAlign: "right",
  },
  suggestionsContainer: {
    marginTop: 16,
  },
  suggestionsLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#7F8C8D",
    marginBottom: 8,
  },
  suggestionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionButton: {
    backgroundColor: "#E8F8F5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#16A085",
  },
  suggestionButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#16A085",
  },
  typingIndicator: {
    marginBottom: 24,
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  typingText: {
    fontSize: 14,
    color: "#7F8C8D",
    marginLeft: 8,
  },
  inputArea: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    backgroundColor: "#ffffffff",
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#2C3E50",
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 120,
  },
  sendButton: {
    borderRadius: 20,
    overflow: "hidden",
  },
  sendGradient: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
