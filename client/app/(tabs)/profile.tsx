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

// Define the interface for menu items
interface MenuItem {
  id: string;
  title: string;
  icon: React.ReactElement;
  onPress?: () => void;
  rightComponent?: React.ReactElement;
  subtitle?: string;
  danger?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

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
    Alert.alert(
      t("profile.signout") || "Sign Out",
      t("profile.signout_confirmation") || "Are you sure you want to sign out?",
      [
        { text: t("common.cancel") || "Cancel", style: "cancel" },
        {
          text: t("profile.signout") || "Sign Out",
          style: "destructive",
          onPress: () => {
            dispatch(signOut());
          },
        },
      ]
    );
  };

  const handleChangePlan = () => {
    router.push({
      pathname: "/payment",
      params: {
        mode: "change",
        currentPlan: user?.subscription_type || "FREE",
      },
    });
  };

  const handleExitPlan = () => {
    // Show confirmation toast with action
    ToastService.warning(
      "Confirm Plan Change",
      "Tap again to downgrade to Free plan and lose premium features.",
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
              "Plan Updated",
              "You have been downgraded to the Free plan."
            );
          } catch (error: any) {
            ToastService.error(
              "Update Failed",
              error.message || "Failed to update plan"
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
      "Change Avatar",
      "Choose how you'd like to update your profile picture",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Take Photo", onPress: handleTakePhoto },
        { text: "Choose from Gallery", onPress: handleChooseFromGallery },
      ]
    );
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Camera permission is required");
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
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const handleChooseFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Gallery permission is required");
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
      Alert.alert("Error", "Failed to choose image");
    }
  };

  const uploadAvatar = async (base64: string) => {
    try {
      setIsUploadingAvatar(true);

      const response = await userAPI.uploadAvatar(
        `data:image/jpeg;base64,${base64}`
      );

      if (response.success) {
        // Update user in Redux store
        dispatch(
          updateUser({
            avatar_url: response.avatar_url,
          })
        );

        Alert.alert("Success", "Profile picture updated successfully!");
      } else {
        throw new Error(response.error || "Failed to upload avatar");
      }
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      Alert.alert("Error", error.message || "Failed to upload avatar");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const menuSections: MenuSection[] = [
    {
      title: t("profile.personal_info") || "Personal Information",
      items: [
        {
          id: "editProfile",
          title: t("profile.edit_profile") || "Edit Profile",
          icon: <Edit size={20} color="#2C3E50" />,
          onPress: () => handleMenuPress("editProfile"),
        },
        {
          id: "changeAvatar",
          title: "Change Avatar",
          icon: <Camera size={20} color="#2C3E50" />,
          onPress: handleAvatarPress,
        },
        {
          id: "personalData",
          title: t("profile.personal_data") || "Personal Data",
          icon: <Target size={20} color="#2C3E50" />,
          onPress: () => handleMenuPress("personalData"),
        },
      ],
    },
    {
      title: "Subscription Management",
      items: [
        {
          id: "changePlan",
          title: "Change Plan",
          icon: <Edit size={20} color="#2C3E50" />,
          onPress: handleChangePlan,
          subtitle: `Current: ${user?.subscription_type || "FREE"}`,
        },
        ...(user?.subscription_type !== "FREE"
          ? [
              {
                id: "exitPlan",
                title: "Exit Current Plan",
                icon: <LogOut size={20} color="#E74C3C" />,
                onPress: handleExitPlan,
                danger: true,
              },
            ]
          : []),
      ],
    },
    {
      title: t("profile.preferences") || "Preferences",
      items: [
        {
          id: "notifications",
          title: t("profile.notifications") || "Notifications",
          icon: <Bell size={20} color="#2C3E50" />,
          rightComponent: (
            <Switch
              value={notificationSettings.pushNotifications}
              onValueChange={() =>
                handleNotificationToggle("pushNotifications")
              }
              trackColor={{ false: "#E9ECEF", true: "#16A085" }}
              thumbColor={
                notificationSettings.pushNotifications ? "#FFFFFF" : "#FFFFFF"
              }
            />
          ),
        },
        {
          id: "darkMode",
          title: "Dark Mode",
          icon: <Moon size={20} color="#2C3E50" />,
          rightComponent: (
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: "#E9ECEF", true: "#16A085" }}
              thumbColor={isDark ? "#FFFFFF" : "#FFFFFF"}
            />
          ),
        },
        {
          id: "language",
          title: t("profile.language") || "Language",
          icon: <Globe size={20} color="#2C3E50" />,
          subtitle: isRTL ? "עברית" : "English",
          onPress: () => setShowLanguageModal(true),
        },
      ],
    },
    {
      title: t("profile.support") || "Support",
      items: [
        {
          id: "support",
          title: t("profile.support") || "Help Center",
          icon: <HelpCircle size={20} color="#2C3E50" />,
          onPress: () => handleMenuPress("support"),
        },
        {
          id: "about",
          title: t("profile.about") || "About",
          icon: <User size={20} color="#2C3E50" />,
          onPress: () => handleMenuPress("about"),
        },
      ],
    },
    {
      title: t("profile.privacy") || "Privacy",
      items: [
        {
          id: "privacy",
          title: t("profile.privacy") || "Privacy Policy",
          icon: <Shield size={20} color="#2C3E50" />,
          onPress: () => handleMenuPress("privacy"),
        },
      ],
    },
    {
      title: t("profile.account") || "Account",
      items: [
        {
          id: "signOut",
          title: t("profile.signout") || "Sign Out",
          icon: <LogOut size={20} color="#E74C3C" />,
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
          <View style={styles.sectionContent}>
            <Text style={styles.sectionContentTitle}>
              Notification Settings
            </Text>
            {Object.entries(notificationSettings).map(([key, value]) => (
              <View key={key} style={styles.notificationItem}>
                <Text style={styles.notificationLabel}>
                  {key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (str) => str.toUpperCase())}
                </Text>
                <Switch
                  value={value}
                  onValueChange={() => handleNotificationToggle(key)}
                  trackColor={{ false: "#E9ECEF", true: "#16A085" }}
                  thumbColor={value ? "#FFFFFF" : "#FFFFFF"}
                />
              </View>
            ))}
          </View>
        );
      case "privacy":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionContentTitle}>Privacy Settings</Text>
            <Text style={styles.sectionContentText}>
              Privacy settings and data management options would be displayed
              here.
              {"\n\n"}• Data export and deletion
              {"\n"}• Privacy preferences
              {"\n"}• Cookie settings
              {"\n"}• Third-party data sharing
            </Text>
          </View>
        );
      case "support":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionContentTitle}>Help & Support</Text>
            <Text style={styles.sectionContentText}>
              Welcome to your nutrition tracking app! Here are some helpful
              tips:
              {"\n\n"}• Use the camera to scan your meals for automatic
              nutrition analysis
              {"\n"}• Track your daily water intake to stay hydrated
              {"\n"}• View your progress in the statistics tab
              {"\n"}• Set up your profile in the questionnaire for personalized
              recommendations
            </Text>
          </View>
        );
      case "about":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionContentTitle}>About This App</Text>
            <Text style={styles.sectionContentText}>
              Nutrition Tracker v1.0.0
              {"\n\n"}A comprehensive nutrition tracking application that helps
              you monitor your daily food intake, track your health goals, and
              maintain a balanced diet.
              {"\n\n"}
              Features:
              {"\n"}• AI-powered meal analysis
              {"\n"}• Comprehensive nutrition tracking
              {"\n"}• Goal setting and progress monitoring
              {"\n"}• Personalized recommendations
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  const getSubscriptionBadge = (type: string) => {
    switch (type) {
      case "PREMIUM":
        return { color: "#FFD700", text: "PREMIUM" };
      case "GOLD":
        return { color: "#FF6B35", text: "GOLD" };
      default:
        return { color: "#8E8E93", text: "FREE" };
    }
  };

  const profileStats = [
    {
      label: "AI Requests",
      value: (user?.ai_requests_count || 0).toString(),
      icon: <Target size={20} color="#E74C3C" />,
    },
    {
      label: "Member Since",
      value: formatDate(user?.created_at ?? ""),
      icon: <Scale size={20} color="#9B59B6" />,
    },
    {
      label: "Profile Status",
      value: user?.is_questionnaire_completed ? "Complete" : "Incomplete",
      icon: <Activity size={20} color="#16A085" />,
    },
  ];
  console.log(user);
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
            <Text style={[styles.title, isRTL && styles.titleRTL]}>
              {t("profile.title") || "Profile"}
            </Text>
            <Text style={[styles.subtitle, isRTL && styles.subtitleRTL]}>
              {t("profile.subtitle") || "Manage your account and preferences"}
            </Text>
          </View>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={["#16A085", "#1ABC9C"]}
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
                <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarPlaceholderText}>
                    {(user?.name || "U").charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.avatarOverlay}>
                {isUploadingAvatar ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Camera size={16} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>
            <View style={[styles.profileInfo, isRTL && styles.profileInfoRTL]}>
              <Text
                style={[styles.profileName, isRTL && styles.profileNameRTL]}
              >
                {user?.name || "User Name"}
              </Text>
              <Text
                style={[styles.profileEmail, isRTL && styles.profileEmailRTL]}
              >
                {user?.email || "user@example.com"}
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
                <Text style={styles.subscriptionText}>
                  {getSubscriptionBadge(user?.subscription_type ?? "").text}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Profile Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.sectionTitleRTL]}>
            {t("profile.stats") || "Statistics"}
          </Text>
          <View style={styles.statsContainer}>
            {profileStats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <LinearGradient
                  colors={["#F8F9FA", "#FFFFFF"]}
                  style={styles.statGradient}
                >
                  <View style={styles.statHeader}>
                    {stat.icon}
                    <Text
                      style={[styles.statLabel, isRTL && styles.statLabelRTL]}
                    >
                      {stat.label}
                    </Text>
                  </View>
                  <Text
                    style={[styles.statValue, isRTL && styles.statValueRTL]}
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
              style={[styles.sectionTitle, isRTL && styles.sectionTitleRTL]}
            >
              {section.title}
            </Text>
            <View style={styles.menuContainer}>
              {section.items.map((item, itemIndex) => (
                <View key={itemIndex}>
                  <TouchableOpacity
                    style={[
                      styles.menuItem,
                      activeSection === item.id && styles.menuItemActive,
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
                          item.danger && styles.menuItemIconDanger,
                        ]}
                      >
                        {item.icon}
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.menuItemTitle,
                            item.danger && styles.menuItemTitleDanger,
                            isRTL && styles.menuItemTitleRTL,
                          ]}
                        >
                          {item.title}
                        </Text>
                        {item.subtitle && (
                          <Text
                            style={[
                              styles.menuItemSubtitle,
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
                          <ChevronRight size={20} color="#BDC3C7" />
                        ) : (
                          <ChevronLeft size={20} color="#BDC3C7" />
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
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  titleRTL: {
    textAlign: "right",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
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
    backgroundColor: "#E5E7EB",
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: {
    fontSize: 34,
    fontWeight: "800",
    color: "#16A085",
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
    color: "#FFFFFF",
  },
  profileNameRTL: {
    textAlign: "right",
  },
  profileEmail: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
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
    color: "#FFFFFF",
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
    color: "#0F172A",
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
    color: "#334155",
    marginLeft: 10,
  },
  statLabelRTL: {
    marginLeft: 0,
    marginRight: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#10B981",
  },
  statValueRTL: {
    textAlign: "right",
  },

  /* ================= MENU ================= */
  menuContainer: {
    backgroundColor: "#FFFFFF",
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
    borderBottomColor: "#F1F5F9",
  },
  menuItemActive: {
    backgroundColor: "#F8FAFC",
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
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 14,
  },
  menuItemIconDanger: {
    backgroundColor: "#FEE2E2",
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  menuItemTitleDanger: {
    color: "#DC2626",
  },
  menuItemTitleRTL: {
    textAlign: "right",
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: "#64748B",
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
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  sectionContentTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 14,
  },
  sectionContentText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
  },

  /* ================= NOTIFICATIONS ================= */
  notificationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  notificationLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#334155",
    flex: 1,
  },
});
