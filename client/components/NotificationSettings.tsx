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
  Bell,
  Mail,
  UtensilsCrossed,
  Dumbbell,
  Droplets,
  BarChart3,
  Tag,
  LucideIcon
} from "lucide-react-native";

interface NotificationSettingsProps {
  onClose: () => void;
}

export default function NotificationSettings({
  onClose,
}: NotificationSettingsProps) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const [settings, setSettings] = useState({
    pushNotifications: true,
    emailNotifications: false,
    mealReminders: true,
    exerciseReminders: true,
    waterReminders: false,
    weeklyReports: true,
    promotionalEmails: false,
  });

  const toggleSetting = (key: string) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const notificationOptions: Array<{
    key: string;
    title: string;
    description: string;
    Icon: LucideIcon;
  }> = [
    {
      key: "pushNotifications",
      title: t("profile.pushNotifications"),
      description: t("profile.pushNotificationsDesc"),
      Icon: Bell,
    },
    {
      key: "emailNotifications",
      title: t("profile.emailNotifications"),
      description: t("profile.emailNotificationsDesc"),
      Icon: Mail,
    },
    {
      key: "mealReminders",
      title: t("profile.mealReminders"),
      description: t("profile.mealRemindersDesc"),
      Icon: UtensilsCrossed,
    },
    {
      key: "exerciseReminders",
      title: t("profile.exerciseReminders"),
      description: t("profile.exerciseRemindersDesc"),
      Icon: Dumbbell,
    },
    {
      key: "waterReminders",
      title: t("profile.waterReminders"),
      description: t("profile.waterRemindersDesc"),
      Icon: Droplets,
    },
    {
      key: "weeklyReports",
      title: t("profile.weeklyReports"),
      description: t("profile.weeklyReportsDesc"),
      Icon: BarChart3,
    },
    {
      key: "promotionalEmails",
      title: t("profile.promotionalEmails"),
      description: t("profile.promotionalEmailsDesc"),
      Icon: Tag,
    },
  ];

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity onPress={onClose}>
          <X size={24} color="#666" />
        </TouchableOpacity>
        <Text style={[styles.title, isRTL && styles.titleRTL]}>
          {t("profile.notifications")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {notificationOptions.map((option) => (
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
    direction: "rtl",
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
