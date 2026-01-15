import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Linking,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/context/ThemeContext";

interface Subsection {
  title: string;
  content: string;
  items?: string[];
}

const TermsOfServiceScreen = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const isRTL = i18n.language === "he";

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const openExternalLink = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  const sections = [
    "acceptance_of_terms",
    "description_of_service",
    "user_accounts",
    "acceptable_use",
    "subscription_and_payment",
    "intellectual_property",
    "user_content",
    "disclaimers",
    "limitation_of_liability",
    "indemnification",
    "termination",
    "governing_law",
    "changes_to_terms",
    "contact_information",
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 44,
      height: 44,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 22,
      backgroundColor: colors.card,
    },
    headerTitleContainer: {
      flex: 1,
      alignItems: "center",
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.5,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    introSection: {
      backgroundColor: colors.surface,
      margin: 16,
      padding: 24,
      borderRadius: 20,
    },
    introHeader: {
      alignItems: "center",
      marginBottom: 20,
    },
    termsIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: `${colors.primary}15`,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
      borderWidth: 2,
      borderColor: `${colors.primary}30`,
    },
    introTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.5,
      marginBottom: 8,
    },
    introText: {
      fontSize: 16,
      lineHeight: 24,
      color: colors.textSecondary,
      marginBottom: 20,
      textAlign: "center",
    },
    lastUpdatedContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    lastUpdated: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "600",
      marginLeft: 8,
    },
    sectionsContainer: {
      marginHorizontal: 16,
      marginTop: 8,
    },
    sectionContainer: {
      backgroundColor: colors.surface,
      marginBottom: 12,
      borderRadius: 20,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionHeader: {
      padding: 20,
    },
    sectionHeaderContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sectionTitleContainer: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      paddingRight: 12,
    },
    sectionIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: `${colors.primary}15`,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
      letterSpacing: -0.3,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconContainerExpanded: {
      backgroundColor: `${colors.primary}15`,
      borderColor: colors.primary,
    },
    sectionContent: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    contentWrapper: {
      padding: 20,
    },
    sectionText: {
      fontSize: 15,
      lineHeight: 24,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    subsectionsContainer: {
      marginTop: 12,
      gap: 16,
    },
    subsection: {
      paddingLeft: 20,
      paddingRight: 16,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      backgroundColor: isDark ? `${colors.card}80` : `${colors.primary}08`,
      paddingVertical: 16,
      borderRadius: 12,
    },
    subsectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 10,
      letterSpacing: -0.2,
    },
    subsectionText: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    itemsList: {
      marginTop: 8,
      gap: 10,
    },
    listItemContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    bulletPoint: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
      marginTop: 8,
      marginRight: 12,
    },
    listItem: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.textSecondary,
      flex: 1,
    },
    footerSection: {
      backgroundColor: colors.surface,
      margin: 16,
      padding: 24,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    footerTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
      letterSpacing: -0.3,
    },
    footerSubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 20,
      lineHeight: 22,
    },
    linksContainer: {
      gap: 12,
    },
    linkButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    linkContent: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    linkIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${colors.primary}15`,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    linkText: {
      fontSize: 15,
      color: colors.text,
      fontWeight: "500",
      flex: 1,
    },
  });

  const renderSection = (sectionKey: string, hasSubsections = false) => {
    const isExpanded = expandedSections[sectionKey];

    return (
      <View key={sectionKey} style={styles.sectionContainer}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(sectionKey)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderContent}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="document-text"
                  size={18}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.sectionTitle} numberOfLines={2}>
                {t(`terms.sections.${sectionKey}.title`)}
              </Text>
            </View>
            <View
              style={[
                styles.iconContainer,
                isExpanded && styles.iconContainerExpanded,
              ]}
            >
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={isExpanded ? colors.primary : colors.icon}
              />
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.sectionContent}>
            <View style={styles.contentWrapper}>
              <Text style={styles.sectionText}>
                {t(`terms.sections.${sectionKey}.content`)}
              </Text>

              {hasSubsections && (
                <View style={styles.subsectionsContainer}>
                  {(
                    t(`terms.sections.${sectionKey}.subsections`, {
                      returnObjects: true,
                    }) as Subsection[]
                  ).map((subsection: Subsection, index: number) => (
                    <View key={index} style={styles.subsection}>
                      <Text style={styles.subsectionTitle}>
                        {subsection.title}
                      </Text>
                      <Text style={styles.subsectionText}>
                        {subsection.content}
                      </Text>
                      {subsection.items && subsection.items.length > 0 && (
                        <View style={styles.itemsList}>
                          {subsection.items.map(
                            (item: string, itemIndex: number) => (
                              <View
                                key={itemIndex}
                                style={styles.listItemContainer}
                              >
                                <View style={styles.bulletPoint} />
                                <Text style={styles.listItem}>{item}</Text>
                              </View>
                            )
                          )}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.6}
        >
          <Ionicons
            name={isRTL ? "chevron-forward" : "chevron-back"}
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{t("terms.title")}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introSection}>
          <View style={styles.introHeader}>
            <View style={styles.termsIcon}>
              <Ionicons name="document-text" size={40} color={colors.primary} />
            </View>
            <Text style={styles.introTitle}>{t("terms.header")}</Text>
          </View>
          <Text style={styles.introText}>{t("terms.intro")}</Text>
          <View style={styles.lastUpdatedContainer}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={styles.lastUpdated}>
              {t("terms.lastUpdated")}: {t("terms.updateDate")}
            </Text>
          </View>
        </View>

        <View style={styles.sectionsContainer}>
          {sections.map((sectionKey) =>
            renderSection(
              sectionKey,
              [
                "acceptable_use",
                "subscription_and_payment",
                "user_content",
                "disclaimers",
                "limitation_of_liability",
                "termination",
              ].includes(sectionKey)
            )
          )}
        </View>

        <View style={styles.footerSection}>
          <Text style={styles.footerTitle}>{t("terms.footer.title")}</Text>
          <Text style={styles.footerSubtitle}>
            {t("terms.footer.subtitle")}
          </Text>

          <View style={styles.linksContainer}>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push("/privacy-policy")}
              activeOpacity={0.7}
            >
              <View style={styles.linkContent}>
                <View style={styles.linkIconContainer}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.linkText}>
                  {t("terms.footer.privacy_policy_link")}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => openExternalLink("mailto:support@calohealth.com")}
              activeOpacity={0.7}
            >
              <View style={styles.linkContent}>
                <View style={styles.linkIconContainer}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.linkText}>
                  {t("terms.footer.contact_support")}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TermsOfServiceScreen;
