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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import {
  User,
  Bell,
  Shield,
  CircleHelp as HelpCircle,
  LogOut,
  ChevronLeft,
  CreditCard as Edit,
  Target,
  Scale,
  Activity,
  Globe,
  Moon,
  ChevronRight,
  Camera,
  Image as ImageIcon,
} from "lucide-react-native";
import EditProfile from "@/components/EditProfile";
import NotificationSettings from "@/components/NotificationSettings";
import PrivacySettings from "@/components/PrivacySettings";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/store";
import { signOut, updateUser } from "@/src/store/authSlice";
import { router } from "expo-router";
import { userAPI } from "@/src/services/api";
import * as ImagePicker from "expo-image-picker";
import { ToastService } from "@/src/services/totastService";
import { useTheme } from "@/src/context/ThemeContext";
import LanguageSelector from "@/components/LanguageSelector";
import { MenuSection } from "@/src/types/profile";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { isDark, toggleTheme, colors } = useTheme();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [notifications, setNotifications] = useState(true);
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

  const handleSignOut = () => {
    Alert.alert(t("profile.signout"), t("profile.signout_confirmation"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.signout"),
        style: "destructive",
        onPress: () => {
          dispatch(signOut());
        },
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
              t("profile.plan.downgrade_message")
            );
          } catch (error: any) {
            ToastService.error(
              t("profile.plan.update_failed"),
              error.message || t("profile.plan.update_error")
            );
          }
        },
      }
    );
  };

  const handleNotificationToggle = (key: string) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
    console.log(
      "🔔 Notification setting changed:",
      key,
      !notificationSettings[key as keyof typeof notificationSettings]
    );
  };

  const handleMenuPress = (itemId: string) => {
    if (itemId === "language") {
      setShowLanguageModal(true);
    } else if (itemId === "personalData") {
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
      ]
    );
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("profile.avatar.permission_needed"),
          t("profile.avatar.camera_permission")
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        await uploadAvatar(result.assets[0].base64);
      }
    } catch (error) {
      console.error("Camera error:", error);
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
          t("profile.avatar.gallery_permission")
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        await uploadAvatar(result.assets[0].base64);
      }
    } catch (error) {
      console.error("Gallery error:", error);
      Alert.alert(t("common.error"), t("profile.avatar.upload_error"));
    }
  };

  const uploadAvatar = async (base64: string) => {
    try {
      setIsUploadingAvatar(true);

      const response = await userAPI.uploadAvatar(
        `data:image/jpeg;base64,${base64}`
      );

      if (response.success) {
        dispatch(
          updateUser({
            avatar_url: response.avatar_url,
          })
        );

        Alert.alert(t("common.success"), t("profile.avatar.upload_success"));
      } else {
        throw new Error(response.error || t("profile.avatar.upload_error"));
      }
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      Alert.alert(
        t("common.error"),
        error.message || t("profile.avatar.upload_error")
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const menuSections: MenuSection[] = [
    {
      title: t("profile.personal_info"),
      items: [
        {
          id: "editProfile",
          title: t("profile.edit_profile"),
          icon: <Edit size={20} color={colors.icon} />,
          onPress: () => handleMenuPress("editProfile"),
        },
        {
          id: "changeAvatar",
          title: t("profile.change_avatar"),
          icon: <Camera size={20} color={colors.icon} />,
          onPress: handleAvatarPress,
        },
        {
          id: "personalData",
          title: t("profile.personal_data"),
          icon: <Target size={20} color={colors.icon} />,
          onPress: () => handleMenuPress("personalData"),
        },
      ],
    },
    {
      title: t("profile.subscription_management"),
      items: [
        {
          id: "changePlan",
          title: t("profile.change_plan"),
          icon: <Edit size={20} color={colors.icon} />,
          onPress: handleChangePlan,
          subtitle: `${t("profile.current")}: ${t(
            `profile.${user?.subscription_type}`
          )}`,
        },
        ...(user?.subscription_type !== "FREE"
          ? [
              {
                id: "exitPlan",
                title: t("profile.exit_plan"),
                icon: <LogOut size={20} color={colors.error} />,
                onPress: handleExitPlan,
                danger: true,
              },
            ]
          : []),
      ],
    },
    {
      title: t("profile.preferences"),
      items: [
        {
          id: "notifications",
          title: t("profile.notifications"),
          icon: <Bell size={20} color={colors.icon} />,
          rightComponent: (
            <Switch
              value={notificationSettings.pushNotifications}
              onValueChange={() =>
                handleNotificationToggle("pushNotifications")
              }
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.surface}
            />
          ),
        },
        {
          id: "darkMode",
          title: t("profile.dark_mode"),
          icon: <Moon size={20} color={colors.icon} />,
          rightComponent: (
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.surface}
            />
          ),
        },
        {
          id: "language",
          title: t("profile.language"),
          icon: <Globe size={20} color={colors.icon} />,
          subtitle: isRTL ? "עברית" : "English",
          onPress: () => setShowLanguageModal(true),
        },
      ],
    },
    {
      title: t("profile.support"),
      items: [
        {
          id: "support",
          title: t("profile.support"),
          icon: <HelpCircle size={20} color={colors.icon} />,
          onPress: () => handleMenuPress("support"),
        },
        {
          id: "about",
          title: t("profile.about"),
          icon: <User size={20} color={colors.icon} />,
          onPress: () => handleMenuPress("about"),
        },
      ],
    },
    {
      title: t("profile.privacy"),
      items: [
        {
          id: "privacy",
          title: t("profile.privacy"),
          icon: <Shield size={20} color={colors.icon} />,
          onPress: () => handleMenuPress("privacy"),
        },
      ],
    },
    {
      title: t("profile.account"),
      items: [
        {
          id: "signOut",
          title: t("profile.signout"),
          icon: <LogOut size={20} color={colors.error} />,
          onPress: handleSignOut,
          danger: true,
        },
      ],
    },
  ];

  const renderSectionContent = () => {
    switch (activeSection) {
      case "editProfile":
        return <EditProfile onClose={() => setActiveSection(null)} />;
      case "notifications":
        return (
          <View
            style={[
              styles.sectionContent,
              { backgroundColor: colors.surfaceVariant },
            ]}
          >
            <Text style={[styles.sectionContentTitle, { color: colors.text }]}>
              {t("profile.notification_settings.title")}
            </Text>
            {Object.entries(notificationSettings).map(([key, value]) => (
              <View
                key={key}
                style={[
                  styles.notificationItem,
                  { borderBottomColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.notificationLabel,
                    { color: colors.onSurface },
                  ]}
                >
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
      case "privacy":
        return (
          <View
            style={[
              styles.sectionContent,
              { backgroundColor: colors.surfaceVariant },
            ]}
          >
            <Text style={[styles.sectionContentTitle, { color: colors.text }]}>
              {t("profile.privacy_settings.title")}
            </Text>
            <Text
              style={[
                styles.sectionContentText,
                { color: colors.textSecondary },
              ]}
            >
              {t("profile.privacy_settings.description")}
              {"\n\n"}• {t("profile.privacy_settings.data_export")}
              {"\n"}• {t("profile.privacy_settings.privacy_preferences")}
              {"\n"}• {t("profile.privacy_settings.cookie_settings")}
              {"\n"}• {t("profile.privacy_settings.third_party")}
            </Text>
          </View>
        );
      case "support":
        return (
          <View
            style={[
              styles.sectionContent,
              { backgroundColor: colors.surfaceVariant },
            ]}
          >
            <Text style={[styles.sectionContentTitle, { color: colors.text }]}>
              {t("profile.help_support.title")}
            </Text>
            <Text
              style={[
                styles.sectionContentText,
                { color: colors.textSecondary },
              ]}
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
          <View
            style={[
              styles.sectionContent,
              { backgroundColor: colors.surfaceVariant },
            ]}
          >
            <Text style={[styles.sectionContentTitle, { color: colors.text }]}>
              {t("profile.about_app.title")}
            </Text>
            <Text
              style={[
                styles.sectionContentText,
                { color: colors.textSecondary },
              ]}
            >
              {t("profile.about_app.version")}
              {"\n\n"}
              {t("profile.about_app.description")}
              {"\n\n"}
              {t("profile.about_app.features")}
              {"\n"}• {t("profile.about_app.feature_ai")}
              {"\n"}• {t("profile.about_app.feature_tracking")}
              {"\n"}• {t("profile.about_app.feature_goals")}
              {"\n"}• {t("profile.about_app.feature_recommendations")}
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return t("profile.status.not_set");
    return new Date(dateString).toLocaleDateString();
  };

  const getSubscriptionBadge = (type: string) => {
    switch (type) {
      case "PREMIUM":
        return { color: "#FFD700", text: t("profile.PREMIUM") };
      case "GOLD":
        return { color: "#FF6B35", text: t("profile.GOLD") };
      default:
        return { color: colors.tabIconDefault, text: t("profile.FREE") };
    }
  };

  const profileStats = [
    {
      label: t("profile.lable.ai_requests"),
      value: (user?.ai_requests_count || 0).toString(),
      icon: <Target size={20} color={colors.error} />,
    },
    {
      label: t("profile.lable.member_since"),
      value: formatDate(user?.created_at ?? ""),
      icon: <Scale size={20} color={colors.warning} />,
    },
    {
      label: t("profile.lable.profile_status"),
      value: user?.is_questionnaire_completed
        ? t("profile.complete")
        : t("profile.incomplete"),
      icon: <Activity size={20} color={colors.primary} />,
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <View>
            <Text
              style={[
                styles.title,
                { color: colors.text },
                isRTL && styles.titleRTL,
              ]}
            >
              {t("profile.title")}
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: colors.textSecondary },
                isRTL && styles.subtitleRTL,
              ]}
            >
              {t("profile.subtitle")}
            </Text>
          </View>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={[colors.primary, colors.primaryContainer]}
            style={styles.profileGradient}
          >
            <TouchableOpacity
              style={styles.profileAvatar}
              onPress={handleAvatarPress}
              disabled={isUploadingAvatar}
            >
              {user?.avatar_url && user.avatar_url.trim() !== "" ? (
                <Image
                  source={{ uri: user.avatar_url }}
                  style={styles.avatarImage}
                  onError={(error) => {
                    console.warn("Avatar image failed to load:", error);
                  }}
                />
              ) : (
                <View
                  style={[
                    styles.avatarImage,
                    styles.avatarPlaceholder,
                    { backgroundColor: colors.surfaceVariant },
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarPlaceholderText,
                      { color: colors.primary },
                    ]}
                  >
                    {(user?.name || "U").charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.avatarOverlay}>
                {isUploadingAvatar ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Camera size={16} color={colors.onPrimary} />
                )}
              </View>
            </TouchableOpacity>
            <View style={[styles.profileInfo, isRTL && styles.profileInfoRTL]}>
              <Text
                style={[
                  styles.profileName,
                  { color: colors.onPrimary },
                  isRTL && styles.profileNameRTL,
                ]}
              >
                {user?.name || t("profile.name")}
              </Text>
              <Text
                style={[
                  styles.profileEmail,
                  { color: colors.onPrimary },
                  isRTL && styles.profileEmailRTL,
                ]}
              >
                {user?.email || t("profile.email")}
              </Text>
              <View
                style={[
                  styles.subscriptionBadge,
                  {
                    backgroundColor: getSubscriptionBadge(
                      user?.subscription_type ?? ""
                    ).color,
                  },
                ]}
              >
                <Text
                  style={[styles.subscriptionText, { color: colors.onPrimary }]}
                >
                  {getSubscriptionBadge(user?.subscription_type ?? "").text}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Profile Stats */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text },
              isRTL && styles.sectionTitleRTL,
            ]}
          >
            {t("profile.stats")}
          </Text>
          <View style={styles.statsContainer}>
            {profileStats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <LinearGradient
                  colors={[colors.card, colors.surface]}
                  style={styles.statGradient}
                >
                  <View style={styles.statHeader}>
                    {stat.icon}
                    <Text
                      style={[
                        styles.statLabel,
                        { color: colors.onSurface },
                        isRTL && styles.statLabelRTL,
                      ]}
                    >
                      {stat.label}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.statValue,
                      { color: colors.success },
                      isRTL && styles.statValueRTL,
                    ]}
                  >
                    {stat.value}
                  </Text>
                </LinearGradient>
              </View>
            ))}
          </View>
        </View>

        {/* Menu Sections */}
        {menuSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text },
                isRTL && styles.sectionTitleRTL,
              ]}
            >
              {section.title}
            </Text>
            <View
              style={[
                styles.menuContainer,
                { backgroundColor: colors.surface },
              ]}
            >
              {section.items.map((item, itemIndex) => (
                <View key={itemIndex}>
                  <TouchableOpacity
                    style={[
                      styles.menuItem,
                      { borderBottomColor: colors.border },
                      activeSection === item.id && {
                        backgroundColor: colors.surfaceVariant,
                      },
                    ]}
                    onPress={item.onPress}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.menuItemLeft,
                        isRTL && styles.menuItemLeftRTL,
                      ]}
                    >
                      <View
                        style={[
                          styles.menuItemIcon,
                          { backgroundColor: colors.card },
                          item.danger && {
                            backgroundColor: colors.error + "20",
                          },
                        ]}
                      >
                        {item.icon}
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.menuItemTitle,
                            { color: colors.text },
                            item.danger && { color: colors.error },
                            isRTL && styles.menuItemTitleRTL,
                          ]}
                        >
                          {item.title}
                        </Text>
                        {item.subtitle && (
                          <Text
                            style={[
                              styles.menuItemSubtitle,
                              { color: colors.textSecondary },
                              isRTL && styles.menuItemSubtitleRTL,
                            ]}
                          >
                            {item.subtitle}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.menuItemRight}>
                      {item.rightComponent ||
                        (isRTL ? (
                          <ChevronRight size={20} color={colors.icon} />
                        ) : (
                          <ChevronLeft size={20} color={colors.icon} />
                        ))}
                    </View>
                  </TouchableOpacity>

                  {/* Render section content */}
                  {activeSection === item.id && (
                    <View style={styles.sectionContent}>
                      {renderSectionContent()}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* ================= HEADER ================= */
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerRTL: {
    alignItems: "flex-end",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  titleRTL: {
    textAlign: "right",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
  },
  subtitleRTL: {
    textAlign: "right",
  },

  /* ================= PROFILE CARD ================= */
  profileCard: {
    marginHorizontal: 20,
    marginBottom: 28,
    borderRadius: 24,
    overflow: "hidden",
  },
  profileGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 22,
  },
  profileAvatar: {
    marginRight: 18,
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.35)",
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: {
    fontSize: 34,
    fontWeight: "800",
  },
  avatarOverlay: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  profileInfo: {
    flex: 1,
  },
  profileInfoRTL: {
    alignItems: "flex-end",
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
  },
  profileNameRTL: {
    textAlign: "right",
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.85,
  },
  profileEmailRTL: {
    textAlign: "right",
  },
  subscriptionBadge: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  subscriptionText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },

  /* ================= SECTIONS ================= */
  section: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
  },
  sectionTitleRTL: {
    textAlign: "right",
  },

  /* ================= STATS ================= */
  statsContainer: {
    gap: 12,
  },
  statCard: {
    borderRadius: 18,
    overflow: "hidden",
  },
  statGradient: {
    padding: 18,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 10,
  },
  statLabelRTL: {
    marginLeft: 0,
    marginRight: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  statValueRTL: {
    textAlign: "right",
  },

  /* ================= MENU ================= */
  menuContainer: {
    borderRadius: 20,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuItemLeftRTL: {
    flexDirection: "row-reverse",
  },
  menuItemIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 14,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  menuItemTitleRTL: {
    textAlign: "right",
  },
  menuItemSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  menuItemSubtitleRTL: {
    textAlign: "right",
  },
  menuItemRight: {
    marginLeft: 10,
  },

  /* ================= EXPANDED CONTENT ================= */
  sectionContent: {
    padding: 18,
    borderTopWidth: 1,
  },
  sectionContentTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 14,
  },
  sectionContentText: {
    fontSize: 14,
    lineHeight: 22,
  },

  /* ================= NOTIFICATIONS ================= */
  notificationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  notificationLabel: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
});
