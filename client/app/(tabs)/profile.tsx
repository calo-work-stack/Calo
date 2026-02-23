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
  User,
  Bell,
  Shield,
  CircleHelp as HelpCircle,
  LogOut,
  CreditCard as Edit,
  Target,
  Scale,
  Activity,
  Globe,
  Moon,
  ChevronRight,
  Camera,
  Star,
  Flame,
  Trophy,
  Zap,
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

const { width } = Dimensions.get("window");

const SECTION_BG_COLORS = [
  "rgba(0,158,173,0.13)",
  "rgba(245,158,11,0.13)",
  "rgba(139,92,246,0.13)",
  "rgba(59,130,246,0.13)",
  "rgba(16,185,129,0.13)",
  "rgba(239,68,68,0.13)",
];

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { isDark, toggleTheme, colors } = useTheme();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
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
        { text: t("profile.avatar.choose_gallery"), onPress: handleChooseFromGallery },
      ]
    );
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("profile.avatar.permission_needed"), t("profile.avatar.camera_permission"));
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
    } catch {
      Alert.alert(t("common.error"), t("profile.avatar.upload_error"));
    }
  };

  const handleChooseFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("profile.avatar.permission_needed"), t("profile.avatar.gallery_permission"));
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
    } catch {
      Alert.alert(t("common.error"), t("profile.avatar.upload_error"));
    }
  };

  const uploadAvatar = async (base64: string) => {
    try {
      setIsUploadingAvatar(true);
      const response = await userAPI.uploadAvatar(`data:image/jpeg;base64,${base64}`);
      if (response.success) {
        dispatch(updateUser({ avatar_url: response.avatar_url }));
        Alert.alert(t("common.success"), t("profile.avatar.upload_success"));
      } else {
        throw new Error(response.error || t("profile.avatar.upload_error"));
      }
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message || t("profile.avatar.upload_error"));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const getSubscriptionBadge = (type: string) => {
    switch (type) {
      case "PREMIUM":
        return { color: "#FFD700", text: t("profile.PREMIUM") };
      case "GOLD":
        return { color: "#FF6B35", text: t("profile.GOLD") };
      default:
        return { color: "rgba(255,255,255,0.25)", text: t("profile.FREE") };
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return t("profile.status.not_set");
    return new Date(dateString).toLocaleDateString();
  };

  const menuSections: MenuSection[] = [
    {
      title: t("profile.personal_info"),
      items: [
        {
          id: "editProfile",
          title: t("profile.edit_profile"),
          icon: <Edit size={20} color="#009EAD" />,
          onPress: () => handleMenuPress("editProfile"),
        },
        {
          id: "changeAvatar",
          title: t("profile.change_avatar"),
          icon: <Camera size={20} color="#009EAD" />,
          onPress: handleAvatarPress,
        },
        {
          id: "personalData",
          title: t("profile.personal_data"),
          icon: <Target size={20} color="#009EAD" />,
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
          icon: <Edit size={20} color="#F59E0B" />,
          onPress: handleChangePlan,
          subtitle: `${t("profile.current")}: ${t(`profile.${user?.subscription_type}`)}`,
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
          icon: <Bell size={20} color="#8B5CF6" />,
          rightComponent: (
            <Switch
              value={notificationSettings.pushNotifications}
              onValueChange={() => handleNotificationToggle("pushNotifications")}
              trackColor={{ false: colors.muted, true: "#8B5CF6" }}
              thumbColor={colors.surface}
            />
          ),
        },
        {
          id: "darkMode",
          title: t("profile.dark_mode"),
          icon: <Moon size={20} color="#8B5CF6" />,
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
          icon: <Globe size={20} color="#8B5CF6" />,
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
          icon: <HelpCircle size={20} color="#3B82F6" />,
          onPress: () => handleMenuPress("support"),
        },
        {
          id: "about",
          title: t("profile.about"),
          icon: <User size={20} color="#3B82F6" />,
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
          icon: <Shield size={20} color="#10B981" />,
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
          <View style={styles.expandedInner}>
            <Text style={[styles.expandedTitle, { color: colors.text }]}>
              {t("profile.notification_settings.title")}
            </Text>
            {Object.entries(notificationSettings).map(([key, value]) => (
              <View key={key} style={[styles.notifRow, { borderBottomColor: colors.border }]}>
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
            <Text style={[styles.expandedBody, { color: colors.textSecondary }]}>
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
            <Text style={[styles.expandedBody, { color: colors.textSecondary }]}>
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

  const badge = getSubscriptionBadge(user?.subscription_type ?? "");

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Hero gradient ── */}
        <LinearGradient
          colors={isDark ? ["#005F6B", "#001E26"] : ["#009EAD", "#006070"]}
          style={styles.heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroDecor1} />
          <View style={styles.heroDecor2} />

          <TouchableOpacity
            style={styles.heroAvatarWrap}
            onPress={handleAvatarPress}
            disabled={isUploadingAvatar}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.4)", "rgba(255,255,255,0.1)"]}
              style={styles.heroAvatarRing}
            >
              {user?.avatar_url && user.avatar_url.trim() !== "" ? (
                <Image source={{ uri: user.avatar_url }} style={styles.heroAvatarImg} />
              ) : (
                <View style={[styles.heroAvatarImg, styles.heroAvatarFallback]}>
                  <Text style={styles.heroAvatarLetter}>
                    {(user?.name || "U").charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </LinearGradient>
            <View style={styles.heroEditDot}>
              {isUploadingAvatar ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Camera size={13} color="#FFF" />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.heroName}>{user?.name || t("profile.name")}</Text>
          <Text style={styles.heroEmail}>{user?.email || t("profile.email")}</Text>

          <View style={[styles.heroPlanBadge, { backgroundColor: badge.color }]}>
            <Text style={styles.heroPlanText}>{badge.text}</Text>
          </View>
        </LinearGradient>

        {/* ── Floating stats strip ── */}
        <View style={[styles.statsStrip, { backgroundColor: colors.surface }]}>
          <View style={styles.stripStat}>
            <Star size={20} color="#FFD700" fill="#FFD700" strokeWidth={0} />
            <Text style={[styles.stripValue, { color: colors.text }]}>{user?.level || 1}</Text>
            <Text style={[styles.stripLabel, { color: colors.muted }]}>{t("home.level")}</Text>
          </View>
          <View style={[styles.stripDivider, { backgroundColor: colors.border }]} />
          <View style={styles.stripStat}>
            <Flame size={20} color="#FF6B6B" />
            <Text style={[styles.stripValue, { color: colors.text }]}>{user?.current_streak || 0}</Text>
            <Text style={[styles.stripLabel, { color: colors.muted }]}>{t("home.streak")}</Text>
          </View>
          <View style={[styles.stripDivider, { backgroundColor: colors.border }]} />
          <View style={styles.stripStat}>
            <Trophy size={20} color="#FF9500" />
            <Text style={[styles.stripValue, { color: colors.text }]}>{(user?.total_points || 0).toLocaleString()}</Text>
            <Text style={[styles.stripLabel, { color: colors.muted }]}>{t("home.totalXP")}</Text>
          </View>
        </View>

        {/* ── Account info grid ── */}
        <View style={styles.infoSection}>
          <View style={styles.infoGrid}>
            <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.infoIconBox, { backgroundColor: "rgba(239,68,68,0.12)" }]}>
                <Zap size={18} color="#EF4444" />
              </View>
              <Text style={[styles.infoValue, { color: colors.text }]}>{user?.ai_requests_count || 0}</Text>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>{t("profile.lable.ai_requests")}</Text>
            </View>
            <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.infoIconBox, { backgroundColor: "rgba(245,158,11,0.12)" }]}>
                <Scale size={18} color="#F59E0B" />
              </View>
              <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatDate(user?.created_at ?? "")}
              </Text>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>{t("profile.lable.member_since")}</Text>
            </View>
            <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.infoIconBox, { backgroundColor: "rgba(16,185,129,0.12)" }]}>
                <Activity size={18} color="#10B981" />
              </View>
              <Text style={[styles.infoValue, { color: user?.is_questionnaire_completed ? "#10B981" : "#EF4444" }]}>
                {user?.is_questionnaire_completed ? t("profile.complete") : t("profile.incomplete")}
              </Text>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>{t("profile.lable.profile_status")}</Text>
            </View>
          </View>
        </View>

        {/* ── Menu sections ── */}
        {menuSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.menuSection}>
            <Text style={[styles.menuSectionLabel, { color: colors.muted }]}>
              {section.title.toUpperCase()}
            </Text>
            <View style={[styles.menuCard, { backgroundColor: colors.surface }]}>
              {section.items.map((item, itemIndex) => (
                <View key={itemIndex}>
                  <TouchableOpacity
                    style={[
                      styles.menuRow,
                      itemIndex < section.items.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      },
                      activeSection === item.id && {
                        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                      },
                    ]}
                    onPress={item.onPress}
                    activeOpacity={0.7}
                  >
                    <View style={styles.menuRowLeft}>
                      <View
                        style={[
                          styles.menuIconBox,
                          {
                            backgroundColor: item.danger
                              ? "rgba(239,68,68,0.12)"
                              : SECTION_BG_COLORS[sectionIndex] || "rgba(0,158,173,0.12)",
                          },
                        ]}
                      >
                        {item.icon}
                      </View>
                      <View style={styles.menuTexts}>
                        <Text style={[styles.menuItemTitle, { color: item.danger ? colors.error : colors.text }]}>
                          {item.title}
                        </Text>
                        {item.subtitle && (
                          <Text style={[styles.menuItemSubtitle, { color: colors.muted }]}>
                            {item.subtitle}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.menuRowRight}>
                      {item.rightComponent || <ChevronRight size={17} color={colors.muted} />}
                    </View>
                  </TouchableOpacity>

                  {activeSection === item.id && (
                    <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
                      {renderSectionContent()}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <LanguageSelector showModal={showLanguageModal} onToggleModal={() => setShowLanguageModal(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* ── Hero ── */
  heroGradient: {
    paddingTop: 60,
    paddingBottom: 56,
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  heroDecor1: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  heroDecor2: {
    position: "absolute",
    bottom: -50,
    left: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  heroAvatarWrap: {
    position: "relative",
    marginBottom: 18,
  },
  heroAvatarRing: {
    width: 106,
    height: 106,
    borderRadius: 53,
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  heroAvatarImg: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  heroAvatarFallback: {
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroAvatarLetter: {
    fontSize: 40,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroEditDot: {
    position: "absolute",
    bottom: 3,
    right: 3,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 2,
    borderColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  heroName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 5,
  },
  heroEmail: {
    fontSize: 14,
    color: "rgba(255,255,255,0.78)",
    fontWeight: "500",
    marginBottom: 18,
  },
  heroPlanBadge: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
  },
  heroPlanText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.8,
  },

  /* ── Stats strip ── */
  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginTop: -30,
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 20,
    elevation: 10,
  },
  stripStat: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  stripValue: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 3,
  },
  stripLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stripDivider: {
    width: 1,
    height: 46,
  },

  /* ── Info grid ── */
  infoSection: {
    paddingHorizontal: 24,
    marginTop: 26,
    marginBottom: 4,
  },
  infoGrid: {
    flexDirection: "row",
    gap: 12,
  },
  infoCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  infoIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    textAlign: "center",
  },

  /* ── Menu ── */
  menuSection: {
    paddingHorizontal: 24,
    marginTop: 26,
  },
  menuSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.9,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  menuCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  menuRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 14,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  menuTexts: {
    flex: 1,
    gap: 2,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  menuItemSubtitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  menuRowRight: {
    marginLeft: 8,
  },

  /* ── Expanded content ── */
  expandedSection: {
    borderTopWidth: 1,
  },
  expandedInner: {
    padding: 18,
  },
  expandedTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 14,
  },
  expandedBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  notifRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  notifLabel: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },

  bottomSpacing: { height: 52 },
});
