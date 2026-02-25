import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Switch,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import {
  Bell,
  Shield,
  CircleHelp as HelpCircle,
  LogOut,
  CreditCard as Edit,
  Target,
  Globe,
  Moon,
  ChevronRight,
  Camera,
  Star,
  Flame,
  Trophy,
  Zap,
  Crown,
  Settings,
  Sun,
  Info,
  CheckCircle,
  XCircle,
} from "lucide-react-native";
import EditProfile from "@/components/EditProfile";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/store";
import { signOut, updateUser } from "@/src/store/authSlice";
import { router } from "expo-router";
import { userAPI, api } from "@/src/services/api";
import * as ImagePicker from "expo-image-picker";
import { ToastService } from "@/src/services/totastService";
import { useTheme } from "@/src/context/ThemeContext";

const { width } = Dimensions.get("window");

const PLAN_GRADIENT: Record<string, [string, string]> = {
  FREE: ["#6B7280", "#4B5563"],
  PREMIUM: ["#F59E0B", "#D97706"],
  GOLD: ["#EF4444", "#DC2626"],
};

interface MenuItem {
  id: string;
  title: string;
  icon: React.ReactElement;
  onPress?: () => void;
  subtitle?: string;
  danger?: boolean;
  rightComponent?: React.ReactElement;
}

interface MenuGroup {
  label: string;
  accentColor: string;
  bgColor: string;
  items: MenuItem[];
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { isDark, toggleTheme, colors } = useTheme();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    pushNotifications: true,
    emailNotifications: false,
    mealReminders: true,
    exerciseReminders: true,
    waterReminders: false,
    weeklyReports: true,
    promotionalEmails: false,
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSignOut = () => {
    Alert.alert(t("profile.signout"), t("profile.signout_confirmation"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.signout"),
        style: "destructive",
        onPress: () => dispatch(signOut()),
      },
    ]);
  };

  const handleChangePlan = () => {
    router.push({
      pathname: "/payment",
      params: {
        mode: "change",
        currentPlan: t(`profile.${user?.subscription_type}`),
      },
    });
  };

  const handleExitPlan = () => {
    ToastService.warning(
      t("profile.plan.confirm_change"),
      t("profile.plan.downgrade_warning"),
      {
        duration: 6000,
        onPress: async () => {
          try {
            await userAPI.updateSubscription("FREE");
            dispatch({
              type: "auth/updateSubscription",
              payload: { subscription_type: "FREE" },
            });
            ToastService.success(
              t("profile.plan.update_success"),
              t("profile.plan.downgrade_message"),
            );
          } catch (error: any) {
            ToastService.error(
              t("profile.plan.update_failed"),
              error.message || t("profile.plan.update_error"),
            );
          }
        },
      },
    );
  };

  const handleNotificationToggle = (key: string) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  const handleMenuPress = (itemId: string) => {
    if (itemId === "personalData") {
      router.push("/(tabs)/questionnaire?mode=edit");
    } else if (itemId === "privacy") {
      router.push("/privacy-policy");
    } else {
      setActiveSection(activeSection === itemId ? null : itemId);
    }
  };

  const handleAvatarPress = () => {
    Alert.alert(
      t("profile.avatar.change_title"),
      t("profile.avatar.change_message"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("profile.avatar.take_photo"), onPress: handleTakePhoto },
        {
          text: t("profile.avatar.choose_gallery"),
          onPress: handleChooseFromGallery,
        },
      ],
    );
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("profile.avatar.permission_needed"),
          t("profile.avatar.camera_permission"),
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets[0].base64)
        await uploadAvatar(result.assets[0].base64);
    } catch {
      Alert.alert(t("common.error"), t("profile.avatar.upload_error"));
    }
  };

  const handleChooseFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("profile.avatar.permission_needed"),
          t("profile.avatar.gallery_permission"),
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"] as ImagePicker.MediaType[],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets[0].base64)
        await uploadAvatar(result.assets[0].base64);
    } catch {
      Alert.alert(t("common.error"), t("profile.avatar.upload_error"));
    }
  };

  const uploadAvatar = async (base64: string) => {
    try {
      setIsUploadingAvatar(true);
      const response = await userAPI.uploadAvatar(
        `data:image/jpeg;base64,${base64}`,
      );
      if (response.success) {
        dispatch(updateUser({ avatar_url: response.avatar_url }));
        ToastService.success(
          t("common.success"),
          t("profile.avatar.upload_success"),
        );
      } else {
        throw new Error(response.error || t("profile.avatar.upload_error"));
      }
    } catch (error: any) {
      Alert.alert(
        t("common.error"),
        error.message || t("profile.avatar.upload_error"),
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleLanguageChange = async (lang: "en" | "he") => {
    if (language === lang) return;
    try {
      await changeLanguage(lang);
      const dbLang = lang === "he" ? "HE" : "EN";
      await api.put("/user/profile", { preferred_lang: dbLang });
      dispatch(updateUser({ preferred_lang: dbLang as "HE" | "EN" }));
    } catch {
      ToastService.error(
        t("common.error"),
        t("profile.language_change_failed") ?? "Failed to change language",
      );
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return t("profile.status.not_set");
    return new Date(dateString).toLocaleDateString();
  };

  const planType = user?.subscription_type ?? "FREE";
  const planGradient = PLAN_GRADIENT[planType] ?? PLAN_GRADIENT.FREE;
  const profileComplete = user?.is_questionnaire_completed ?? false;

  // ── Render section content ─────────────────────────────────────────────────

  const renderSectionContent = () => {
    switch (activeSection) {
      case "editProfile":
        return <EditProfile onClose={() => setActiveSection(null)} />;
      case "notifications":
        return (
          <View style={styles.expandedInner}>
            <Text style={[styles.expandedTitle, { color: colors.text }]}>
              {t("profile.notification_settings.title")}
            </Text>
            {Object.entries(notificationSettings).map(([key, value]) => (
              <View
                key={key}
                style={[styles.notifRow, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.notifLabel, { color: colors.text }]}>
                  {t(`profile.notification_settings.${key}`)}
                </Text>
                <Switch
                  value={value}
                  onValueChange={() => handleNotificationToggle(key)}
                  trackColor={{ false: colors.muted, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              </View>
            ))}
          </View>
        );
      case "support":
        return (
          <View style={styles.expandedInner}>
            <Text style={[styles.expandedTitle, { color: colors.text }]}>
              {t("profile.help_support.title")}
            </Text>
            <Text
              style={[styles.expandedBody, { color: colors.textSecondary }]}
            >
              {t("profile.help_support.welcome")}
              {"\n\n"}• {t("profile.help_support.tip_camera")}
              {"\n"}• {t("profile.help_support.tip_water")}
              {"\n"}• {t("profile.help_support.tip_progress")}
              {"\n"}• {t("profile.help_support.tip_profile")}
            </Text>
          </View>
        );
      case "about":
        return (
          <View style={styles.expandedInner}>
            <Text style={[styles.expandedTitle, { color: colors.text }]}>
              {t("profile.about_app.title")}
            </Text>
            <Text
              style={[styles.expandedBody, { color: colors.textSecondary }]}
            >
              {t("profile.about_app.version")}
              {"\n\n"}
              {t("profile.about_app.description")}
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  // ── Language segmented control ─────────────────────────────────────────────

  const LangToggle = () => (
    <View
      style={[
        styles.langSeg,
        {
          backgroundColor: isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(0,0,0,0.06)",
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.langOption,
          language === "en" && { backgroundColor: colors.primary },
        ]}
        onPress={() => handleLanguageChange("en")}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.langOptionText,
            { color: language === "en" ? "#fff" : colors.textSecondary },
          ]}
        >
          EN
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.langOption,
          language === "he" && { backgroundColor: colors.primary },
        ]}
        onPress={() => handleLanguageChange("he")}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.langOptionText,
            { color: language === "he" ? "#fff" : colors.textSecondary },
          ]}
        >
          עב
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ── Menu data ─────────────────────────────────────────────────────────────

  const menuGroups: MenuGroup[] = [
    {
      label: t("profile.personal_info"),
      accentColor: "#009EAD",
      bgColor: "rgba(0,158,173,0.1)",
      items: [
        {
          id: "editProfile",
          title: t("profile.edit_profile"),
          icon: <Edit size={18} color="#009EAD" />,
          onPress: () => handleMenuPress("editProfile"),
        },
        {
          id: "changeAvatar",
          title: t("profile.change_avatar"),
          icon: <Camera size={18} color="#009EAD" />,
          onPress: handleAvatarPress,
        },
        {
          id: "personalData",
          title: t("profile.personal_data"),
          icon: <Target size={18} color="#009EAD" />,
          onPress: () => handleMenuPress("personalData"),
        },
      ],
    },
    {
      label: t("profile.subscription_management"),
      accentColor: "#F59E0B",
      bgColor: "rgba(245,158,11,0.1)",
      items: [
        {
          id: "changePlan",
          title: t("profile.change_plan"),
          subtitle: `${t("profile.current")}: ${t(`profile.${planType}`)}`,
          icon: <Crown size={18} color="#F59E0B" />,
          onPress: handleChangePlan,
        },
        ...(planType !== "FREE"
          ? [
              {
                id: "exitPlan",
                title: t("profile.exit_plan"),
                icon: <LogOut size={18} color="#EF4444" />,
                onPress: handleExitPlan,
                danger: true,
              },
            ]
          : []),
      ],
    },
    {
      label: t("profile.preferences"),
      accentColor: "#8B5CF6",
      bgColor: "rgba(139,92,246,0.1)",
      items: [
        {
          id: "notifications",
          title: t("profile.notifications"),
          icon: <Bell size={18} color="#8B5CF6" />,
          rightComponent: (
            <Switch
              value={notificationSettings.pushNotifications}
              onValueChange={() =>
                handleNotificationToggle("pushNotifications")
              }
              trackColor={{ false: colors.muted, true: "#8B5CF6" }}
              thumbColor={colors.surface}
            />
          ),
        },
        {
          id: "darkMode",
          title: isDark
            ? (t("profile.light_mode") ?? "Light Mode")
            : t("profile.dark_mode"),
          icon: isDark ? (
            <Sun size={18} color="#8B5CF6" />
          ) : (
            <Moon size={18} color="#8B5CF6" />
          ),
          rightComponent: (
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.muted, true: "#8B5CF6" }}
              thumbColor={colors.surface}
            />
          ),
        },
        {
          id: "language",
          title: t("profile.language"),
          icon: <Globe size={18} color="#8B5CF6" />,
          rightComponent: <LangToggle />,
          // no row-level onPress — handled by LangToggle buttons
        },
      ],
    },
    {
      label: t("profile.support"),
      accentColor: "#3B82F6",
      bgColor: "rgba(59,130,246,0.1)",
      items: [
        {
          id: "support",
          title: t("profile.support"),
          icon: <HelpCircle size={18} color="#3B82F6" />,
          onPress: () => handleMenuPress("support"),
        },
        {
          id: "about",
          title: t("profile.about"),
          icon: <Info size={18} color="#3B82F6" />,
          onPress: () => handleMenuPress("about"),
        },
      ],
    },
    {
      label: t("profile.privacy"),
      accentColor: "#10B981",
      bgColor: "rgba(16,185,129,0.1)",
      items: [
        {
          id: "privacy",
          title: t("profile.privacy"),
          icon: <Shield size={18} color="#10B981" />,
          onPress: () => handleMenuPress("privacy"),
        },
      ],
    },
    {
      label: t("profile.account"),
      accentColor: "#EF4444",
      bgColor: "rgba(239,68,68,0.1)",
      items: [
        {
          id: "signOut",
          title: t("profile.signout"),
          icon: <LogOut size={18} color="#EF4444" />,
          onPress: handleSignOut,
          danger: true,
        },
      ],
    },
  ];

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ─── HERO ──────────────────────────────────────────── */}
        <LinearGradient
          colors={isDark ? ["#004D59", "#001A22"] : ["#00B4C8", "#006070"]}
          style={styles.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* decorative blobs */}
          <View style={styles.blob1} />
          <View style={styles.blob2} />
          <View style={styles.blob3} />

          {/* avatar */}
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={handleAvatarPress}
            disabled={isUploadingAvatar}
          >
            <View style={styles.avatarRingOuter}>
              <View style={styles.avatarRingInner}>
                {user?.avatar_url && user.avatar_url.trim() !== "" ? (
                  <Image
                    source={{ uri: user.avatar_url }}
                    style={styles.avatarImg}
                  />
                ) : (
                  <View style={[styles.avatarImg, styles.avatarFallback]}>
                    <Text style={styles.avatarLetter}>
                      {(user?.name || "U").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.cameraBtn}>
              {isUploadingAvatar ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Camera size={14} color="#FFF" />
              )}
            </View>
          </TouchableOpacity>

          {/* name + email */}
          <Text style={styles.heroName}>{user?.name || t("profile.name")}</Text>
          <Text style={styles.heroEmail}>
            {user?.email || t("profile.email")}
          </Text>

          {/* plan badge */}
          <LinearGradient
            colors={planGradient}
            style={styles.planBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Crown size={12} color="#fff" />
            <Text style={styles.planBadgeText}>{t(`profile.${planType}`)}</Text>
          </LinearGradient>

          {/* quick actions */}
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.heroActionBtn}
              onPress={() =>
                setActiveSection(
                  activeSection === "editProfile" ? null : "editProfile",
                )
              }
            >
              <Edit size={15} color="#fff" />
              <Text style={styles.heroActionText}>
                {t("profile.edit_profile")}
              </Text>
            </TouchableOpacity>
            <View style={styles.heroActionDivider} />
            <TouchableOpacity
              style={styles.heroActionBtn}
              onPress={handleAvatarPress}
            >
              <Camera size={15} color="#fff" />
              <Text style={styles.heroActionText}>
                {t("profile.change_avatar")}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ─── STATS STRIP ───────────────────────────────────── */}
        <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
          {/* Level */}
          <View style={styles.stat}>
            <View
              style={[
                styles.statIconRing,
                { backgroundColor: "rgba(255,215,0,0.15)" },
              ]}
            >
              <Star size={18} color="#FFD700" fill="#FFD700" strokeWidth={0} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {user?.level || 1}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t("home.level")}
            </Text>
          </View>

          <View
            style={[styles.statDivider, { backgroundColor: colors.border }]}
          />

          {/* Streak */}
          <View style={styles.stat}>
            <View
              style={[
                styles.statIconRing,
                { backgroundColor: "rgba(255,107,107,0.15)" },
              ]}
            >
              <Flame size={18} color="#FF6B6B" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {user?.current_streak || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t("home.streak")}
            </Text>
          </View>

          <View
            style={[styles.statDivider, { backgroundColor: colors.border }]}
          />

          {/* XP */}
          <View style={styles.stat}>
            <View
              style={[
                styles.statIconRing,
                { backgroundColor: "rgba(255,149,0,0.15)" },
              ]}
            >
              <Trophy size={18} color="#FF9500" />
            </View>
            <Text
              style={[styles.statValue, { color: colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {(user?.total_points || 0).toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t("home.totalXP")}
            </Text>
          </View>
        </View>

        {/* ─── PROFILE SUMMARY ROW ───────────────────────────── */}
        <View style={styles.summaryRow}>
          <View
            style={[styles.summaryCard, { backgroundColor: colors.surface }]}
          >
            <View
              style={[
                styles.summaryIconBox,
                { backgroundColor: "rgba(239,68,68,0.1)" },
              ]}
            >
              <Zap size={16} color="#EF4444" />
            </View>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {user?.ai_requests_count || 0}
            </Text>
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              {t("profile.lable.ai_requests")}
            </Text>
          </View>

          <View
            style={[styles.summaryCard, { backgroundColor: colors.surface }]}
          >
            <View
              style={[
                styles.summaryIconBox,
                { backgroundColor: "rgba(245,158,11,0.1)" },
              ]}
            >
              <Settings size={16} color="#F59E0B" />
            </View>
            <Text
              style={[styles.summaryValue, { color: colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatDate(user?.created_at ?? "")}
            </Text>
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              {t("profile.lable.member_since")}
            </Text>
          </View>

          <View
            style={[styles.summaryCard, { backgroundColor: colors.surface }]}
          >
            <View
              style={[
                styles.summaryIconBox,
                {
                  backgroundColor: profileComplete
                    ? "rgba(16,185,129,0.1)"
                    : "rgba(239,68,68,0.1)",
                },
              ]}
            >
              {profileComplete ? (
                <CheckCircle size={16} color="#10B981" />
              ) : (
                <XCircle size={16} color="#EF4444" />
              )}
            </View>
            <Text
              style={[
                styles.summaryValue,
                { color: profileComplete ? "#10B981" : "#EF4444" },
              ]}
            >
              {profileComplete
                ? t("profile.complete")
                : t("profile.incomplete")}
            </Text>
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              {t("profile.lable.profile_status")}
            </Text>
          </View>
        </View>

        {/* inline edit profile if active */}
        {activeSection === "editProfile" && (
          <View
            style={[
              styles.inlineEdit,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <EditProfile onClose={() => setActiveSection(null)} />
          </View>
        )}

        {/* ─── MENU GROUPS ───────────────────────────────────── */}
        {menuGroups.map((group, gi) => (
          <View key={gi} style={styles.menuGroup}>
            {/* group label */}
            <View style={styles.groupLabelRow}>
              <View
                style={[
                  styles.groupLabelAccent,
                  { backgroundColor: group.accentColor },
                ]}
              />
              <Text
                style={[styles.groupLabel, { color: colors.textSecondary }]}
              >
                {group.label.toUpperCase()}
              </Text>
            </View>

            {/* group card */}
            <View
              style={[styles.groupCard, { backgroundColor: colors.surface }]}
            >
              {group.items.map((item, ii) => (
                <View key={item.id}>
                  <TouchableOpacity
                    style={[
                      styles.menuRow,
                      ii < group.items.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: colors.border,
                      },
                      activeSection === item.id && {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(0,0,0,0.025)",
                      },
                    ]}
                    onPress={item.onPress}
                    activeOpacity={item.onPress ? 0.65 : 1}
                    disabled={!item.onPress && !item.rightComponent}
                  >
                    {/* icon */}
                    <View
                      style={[
                        styles.menuIcon,
                        {
                          backgroundColor: item.danger
                            ? "rgba(239,68,68,0.1)"
                            : group.bgColor,
                        },
                      ]}
                    >
                      {item.icon}
                    </View>

                    {/* texts */}
                    <View style={styles.menuTexts}>
                      <Text
                        style={[
                          styles.menuTitle,
                          { color: item.danger ? "#EF4444" : colors.text },
                        ]}
                      >
                        {item.title}
                      </Text>
                      {item.subtitle && (
                        <Text
                          style={[
                            styles.menuSubtitle,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {item.subtitle}
                        </Text>
                      )}
                    </View>

                    {/* right */}
                    <View style={styles.menuRight}>
                      {item.rightComponent ? (
                        item.rightComponent
                      ) : item.onPress ? (
                        <ChevronRight size={16} color={colors.muted} />
                      ) : null}
                    </View>
                  </TouchableOpacity>

                  {/* expanded content (not editProfile — handled separately above) */}
                  {activeSection === item.id && item.id !== "editProfile" && (
                    <View
                      style={[
                        styles.expanded,
                        { borderTopColor: colors.border },
                      ]}
                    >
                      {renderSectionContent()}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 0 },

  /* ── Hero ── */
  hero: {
    paddingTop: 52,
    paddingBottom: 40,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  blob1: {
    position: "absolute",
    top: -70,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  blob2: {
    position: "absolute",
    bottom: -60,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  blob3: {
    position: "absolute",
    top: 40,
    left: width * 0.3,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  avatarWrap: { position: "relative", marginBottom: 16 },
  avatarRingOuter: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarRingInner: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImg: { width: 100, height: 100, borderRadius: 50 },
  avatarFallback: {
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: { fontSize: 42, fontWeight: "800", color: "#fff" },
  cameraBtn: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 2,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  heroName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
    marginBottom: 5,
  },
  heroEmail: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
    marginBottom: 14,
  },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 22,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1,
  },
  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  heroActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  heroActionText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  heroActionDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
  },

  /* ── Stats card ── */
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: -26,
    borderRadius: 24,
    paddingVertical: 20,
  },
  stat: { flex: 1, alignItems: "center", gap: 6 },
  statIconRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statDivider: { width: 1, height: 48 },

  /* ── Summary row ── */
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    gap: 5,
  },
  summaryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.2,
    textAlign: "center",
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    textAlign: "center",
  },

  /* ── Inline edit ── */
  inlineEdit: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },

  /* ── Menu groups ── */
  menuGroup: { paddingHorizontal: 20, marginTop: 28 },
  groupLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  groupLabelAccent: { width: 3, height: 14, borderRadius: 2 },
  groupLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.9 },
  groupCard: {
    borderRadius: 20,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 14,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  menuTexts: { flex: 1, gap: 2 },
  menuTitle: { fontSize: 15, fontWeight: "600", letterSpacing: -0.1 },
  menuSubtitle: { fontSize: 12, fontWeight: "500" },
  menuRight: { marginLeft: 4, flexShrink: 0 },

  /* ── Language segmented control ── */
  langSeg: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  langOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  langOptionText: { fontSize: 13, fontWeight: "700", letterSpacing: 0.2 },

  /* ── Expanded content ── */
  expanded: { borderTopWidth: 1 },
  expandedInner: { padding: 18 },
  expandedTitle: { fontSize: 16, fontWeight: "700", marginBottom: 14 },
  expandedBody: { fontSize: 14, lineHeight: 22 },
  notifRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  notifLabel: { fontSize: 14, fontWeight: "500", flex: 1 },
});
