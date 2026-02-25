import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Award,
  CheckCircle,
  Target,
} from "lucide-react-native";

interface PendingReview {
  menu_id: string;
  title: string;
  days_count: number;
  start_date: string;
  end_date: string;
  total_meals: number;
  completed_meals: number;
}

interface MenuEndedReviewModalProps {
  visible: boolean;
  pendingReview: PendingReview | null;
  onSubmit: (
    menuId: string,
    data: {
      rating: number;
      liked?: string;
      disliked?: string;
      suggestions?: string;
      wouldRecommend?: boolean;
    },
  ) => Promise<void>;
  onSkip: (menuId: string) => void;
}

export const MenuEndedReviewModal: React.FC<MenuEndedReviewModalProps> = ({
  visible,
  pendingReview,
  onSubmit,
  onSkip,
}) => {
  const { isRTL, language } = useLanguage();
  const { colors } = useTheme();

  const [rating, setRating] = useState(0);
  const [liked, setLiked] = useState("");
  const [disliked, setDisliked] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isHe = language === "he";

  if (!pendingReview) return null;

  const completionPct =
    pendingReview.total_meals > 0
      ? Math.round(
          (pendingReview.completed_meals / pendingReview.total_meals) * 100,
        )
      : 0;

  const resetForm = () => {
    setRating(0);
    setLiked("");
    setDisliked("");
    setSuggestions("");
    setWouldRecommend(false);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert(
        isHe ? "שגיאה" : "Error",
        isHe ? "אנא דרג את התפריט" : "Please rate the menu",
      );
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(pendingReview.menu_id, {
        rating,
        liked: liked || undefined,
        disliked: disliked || undefined,
        suggestions: suggestions || undefined,
        wouldRecommend,
      });
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    resetForm();
    onSkip(pendingReview.menu_id);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View
            style={[styles.header, { backgroundColor: colors.emerald500 }]}
          >
            <CheckCircle size={28} color="#ffffff" />
            <Text style={styles.headerTitle}>
              {isHe ? "התפריט שלך הסתיים!" : "Your menu has ended!"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {pendingReview.title}
            </Text>
          </View>

          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
          >
            {/* Meal completion stats */}
            <View
              style={[
                styles.statsCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={[styles.statRow, isRTL && styles.rtlRow]}>
                <Target size={20} color={colors.emerald500} />
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {isHe ? "ארוחות שהושלמו" : "Meals completed"}
                </Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {pendingReview.completed_meals}/{pendingReview.total_meals}
                </Text>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: colors.emerald500,
                      width: `${completionPct}%` as any,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.completionPct, { color: colors.textSecondary }]}>
                {completionPct}% {isHe ? "הושלם" : "completed"}
              </Text>
            </View>

            <Text
              style={[
                styles.reviewPrompt,
                { color: colors.text },
                isRTL && styles.rtlText,
              ]}
            >
              {isHe
                ? "ספר לנו על החוויה שלך כדי שנוכל לשפר את התפריט הבא"
                : "Tell us about your experience so we can improve your next menu"}
            </Text>

            {/* Star rating */}
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.text },
                  isRTL && styles.rtlText,
                ]}
              >
                {isHe ? "דירוג כללי" : "Overall rating"} *
              </Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    style={styles.starBtn}
                  >
                    <Star
                      size={36}
                      color={star <= rating ? "#fbbf24" : colors.border}
                      fill={star <= rating ? "#fbbf24" : "transparent"}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* What did you like */}
            <View style={styles.section}>
              <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
                <ThumbsUp size={18} color={colors.emerald500} />
                <Text
                  style={[styles.sectionTitle, { color: colors.text }]}
                >
                  {isHe ? "מה אהבת?" : "What did you like?"}
                </Text>
              </View>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                  isRTL && styles.rtlInput,
                ]}
                placeholder={
                  isHe
                    ? "תאר מה אהבת בתפריט..."
                    : "Describe what you liked about the menu..."
                }
                placeholderTextColor={colors.icon}
                value={liked}
                onChangeText={setLiked}
                multiline
                numberOfLines={3}
                textAlign={isRTL ? "right" : "left"}
              />
            </View>

            {/* What didn't you like */}
            <View style={styles.section}>
              <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
                <ThumbsDown size={18} color={colors.icon} />
                <Text
                  style={[styles.sectionTitle, { color: colors.text }]}
                >
                  {isHe ? "מה לא אהבת?" : "What didn't you like?"}
                </Text>
              </View>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                  isRTL && styles.rtlInput,
                ]}
                placeholder={
                  isHe ? "תאר מה לא אהבת..." : "Describe what you didn't like..."
                }
                placeholderTextColor={colors.icon}
                value={disliked}
                onChangeText={setDisliked}
                multiline
                numberOfLines={3}
                textAlign={isRTL ? "right" : "left"}
              />
            </View>

            {/* Suggestions */}
            <View style={styles.section}>
              <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
                <MessageSquare size={18} color={colors.icon} />
                <Text
                  style={[styles.sectionTitle, { color: colors.text }]}
                >
                  {isHe ? "הצעות לשיפור" : "Suggestions for improvement"}
                </Text>
              </View>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                  isRTL && styles.rtlInput,
                ]}
                placeholder={
                  isHe
                    ? "איך נוכל לשפר את התפריט הבא?"
                    : "How can we improve your next menu?"
                }
                placeholderTextColor={colors.icon}
                value={suggestions}
                onChangeText={setSuggestions}
                multiline
                numberOfLines={3}
                textAlign={isRTL ? "right" : "left"}
              />
            </View>

            {/* Would recommend */}
            <View style={styles.section}>
              <TouchableOpacity
                style={[
                  styles.recommendBtn,
                  {
                    backgroundColor: wouldRecommend
                      ? colors.emerald500
                      : colors.surface,
                    borderColor: wouldRecommend
                      ? colors.emerald500
                      : colors.border,
                  },
                ]}
                onPress={() => setWouldRecommend(!wouldRecommend)}
              >
                <Award
                  size={20}
                  color={wouldRecommend ? "#ffffff" : colors.icon}
                />
                <Text
                  style={[
                    styles.recommendText,
                    { color: wouldRecommend ? "#ffffff" : colors.text },
                    isRTL && styles.rtlText,
                  ]}
                >
                  {isHe
                    ? "הייתי ממליץ על התפריט הזה"
                    : "I would recommend this menu"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={[styles.actions, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.skipBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={handleSkip}
              disabled={isSubmitting}
            >
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>
                {isHe ? "דלג" : "Skip"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  backgroundColor:
                    rating > 0 ? colors.emerald500 : colors.border,
                  opacity: isSubmitting ? 0.7 : 1,
                },
              ]}
              onPress={handleSubmit}
              disabled={rating === 0 || isSubmitting}
            >
              <Award size={16} color="#ffffff" />
              <Text style={styles.submitText}>
                {isHe ? "שלח דירוג" : "Submit Review"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
  },
  header: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  statsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  statLabel: {
    flex: 1,
    fontSize: 14,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  completionPct: {
    fontSize: 13,
    textAlign: "right",
  },
  reviewPrompt: {
    fontSize: 15,
    marginBottom: 20,
    lineHeight: 22,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  starRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginVertical: 10,
  },
  starBtn: {
    padding: 4,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 90,
    textAlignVertical: "top",
  },
  recommendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    gap: 10,
  },
  recommendText: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  skipText: {
    fontSize: 15,
    fontWeight: "500",
  },
  submitBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
  rtlText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  rtlInput: {
    textAlign: "right",
  },
  rtlRow: {
    flexDirection: "row-reverse",
  },
});

export default MenuEndedReviewModal;
