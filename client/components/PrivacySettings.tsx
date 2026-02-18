import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import {
  X,
  Eye,
  Heart,
  BarChart3,
  Radio,
  Trophy,
  Users,
  FileText,
  LucideIcon
} from "lucide-react-native";

interface PrivacySettingsProps {
  onClose: () => void;
}

export default function PrivacySettings({ onClose }: PrivacySettingsProps) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const [settings, setSettings] = useState({
    profileVisibility: true,
    shareHealthData: false,
    allowDataCollection: true,
    showOnlineStatus: false,
    shareAchievements: true,
    allowFriendRequests: true,
    shareProgressReports: false,
  });

  const toggleSetting = (key: string) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const privacyOptions: Array<{
    key: string;
    title: string;
    description: string;
    Icon: LucideIcon;
  }> = [
    {
      key: "profileVisibility",
      title: t("profile.profileVisibility"),
      description: t("profile.profileVisibilityDesc"),
      Icon: Eye,
    },
    {
      key: "shareHealthData",
      title: t("profile.shareHealthData"),
      description: t("profile.shareHealthDataDesc"),
      Icon: Heart,
    },
    {
      key: "allowDataCollection",
      title: t("profile.allowDataCollection"),
      description: t("profile.allowDataCollectionDesc"),
      Icon: BarChart3,
    },
    {
      key: "showOnlineStatus",
      title: t("profile.showOnlineStatus"),
      description: t("profile.showOnlineStatusDesc"),
      Icon: Radio,
    },
    {
      key: "shareAchievements",
      title: t("profile.shareAchievements"),
      description: t("profile.shareAchievementsDesc"),
      Icon: Trophy,
    },
    {
      key: "allowFriendRequests",
      title: t("profile.allowFriendRequests"),
      description: t("profile.allowFriendRequestsDesc"),
      Icon: Users,
    },
    {
      key: "shareProgressReports",
      title: t("profile.shareProgressReports"),
      description: t("profile.shareProgressReportsDesc"),
      Icon: FileText,
    },
  ];

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity onPress={onClose}>
          <X size={24} color="#666" />
        </TouchableOpacity>
        <Text style={[styles.title, isRTL && styles.titleRTL]}>
          {t("profile.privacy")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {privacyOptions.map((option) => (
          <View key={option.key} style={styles.optionItem}>
            <View
              style={[styles.optionContent, isRTL && styles.optionContentRTL]}
            >
              <option.Icon
                size={24}
                color="#666"
                style={[styles.optionIcon, isRTL && styles.optionIconRTL]}
              />
              <View style={[styles.optionText, isRTL && styles.optionTextRTL]}>
                <Text
                  style={[styles.optionTitle, isRTL && styles.optionTitleRTL]}
                >
                  {option.title}
                </Text>
                <Text
                  style={[
                    styles.optionDescription,
                    isRTL && styles.optionDescriptionRTL,
                  ]}
                >
                  {option.description}
                </Text>
              </View>
            </View>
            <Switch
              value={settings[option.key]}
              onValueChange={() => toggleSetting(option.key)}
              trackColor={{ false: "#e9ecef", true: "#007AFF" }}
              thumbColor={settings[option.key] ? "#ffffff" : "#f4f4f4"}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  containerRTL: {
    writingDirection: "rtl",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  headerRTL: {
    flexDirection: "row-reverse",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  titleRTL: {
    textAlign: "right",
  },
  content: {
    flex: 1,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  optionContentRTL: {
    flexDirection: "row-reverse",
  },
  optionIcon: {
    marginRight: 12,
  },
  optionIconRTL: {
    marginRight: 0,
    marginLeft: 12,
  },
  optionText: {
    flex: 1,
  },
  optionTextRTL: {
    alignItems: "flex-end",
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  optionTitleRTL: {
    textAlign: "right",
  },
  optionDescription: {
    fontSize: 14,
    color: "#666",
  },
  optionDescriptionRTL: {
    textAlign: "right",
  },
});
