import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Dimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { ChevronRight, Languages, X, CheckCircle } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width: screenWidth } = Dimensions.get("window");

interface LanguageSelectorProps {
  showModal?: boolean;
  onToggleModal?: () => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  showModal = false,
  onToggleModal,
}) => {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, isRTL } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(screenWidth));

  const languages = [
    {
      code: "en",
      name: t("language.english") || "English",
      flag: "🇺🇸",
      nativeName: "English",
    },
    {
      code: "he",
      name: t("language.hebrew") || "עברית",
      flag: "🇮🇱",
      nativeName: "עברית",
    },
  ];

  const currentLang = languages.find((lang) => lang.code === currentLanguage);

  const handleLanguageSelect = async (languageCode: string) => {
    await changeLanguage(languageCode);
    closeModal();
  };

  const openModal = () => {
    const isVisible = showModal || modalVisible;
    if (!isVisible) {
      setModalVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  };

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: screenWidth,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      onToggleModal?.();
    });
  };

  const isVisible = showModal || modalVisible;

  return (
    <View style={styles.container}>
      {/* Language Toggle Button */}
      <TouchableOpacity
        style={[styles.languageButton, isRTL && styles.languageButtonRTL]}
        onPress={openModal}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={["#f8f9fa", "#e9ecef"]}
          style={styles.buttonGradient}
        >
          <View style={styles.flagContainer}>
            <Text style={styles.flagEmoji}>{currentLang?.flag}</Text>
          </View>
          <View
            style={[styles.textContainer, isRTL && styles.textContainerRTL]}
          >
            <Text style={[styles.languageLabel, isRTL && styles.textRTL]}>
              {t("profile.language") || "Language"}
            </Text>
            <Text style={[styles.currentLanguage, isRTL && styles.textRTL]}>
              {currentLang?.nativeName}
            </Text>
          </View>
          <ChevronRight
            size={20}
            color="#6c757d"
            style={[isRTL && { transform: [{ scaleX: -1 }] }]}
          />
        </LinearGradient>
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isVisible}
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.backdrop} onPress={closeModal} />

          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [{ translateX: slideAnim }],
              },
              isRTL && styles.modalContainerRTL,
            ]}
          >
            <LinearGradient
              colors={["#ffffff", "#f8f9fa"]}
              style={styles.modalContent}
            >
              {/* Header */}
              <View
                style={[styles.modalHeader, isRTL && styles.modalHeaderRTL]}
              >
                <View style={styles.headerTitleContainer}>
                  <Languages size={24} color="#007AFF" />
                  <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>
                    {t("language.select") || "Select Language"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={closeModal}
                  style={styles.closeButton}
                  activeOpacity={0.7}
                >
                  <X size={28} color="#6c757d" />
                </TouchableOpacity>
              </View>

              {/* Language Options */}
              <View style={styles.languageList}>
                {languages.map((language) => (
                  <TouchableOpacity
                    key={language.code}
                    style={[
                      styles.languageOption,
                      currentLanguage === language.code &&
                        styles.selectedLanguage,
                      isRTL && styles.languageOptionRTL,
                    ]}
                    onPress={() => handleLanguageSelect(language.code)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={
                        currentLanguage === language.code
                          ? ["#007AFF15", "#007AFF08"]
                          : ["transparent", "transparent"]
                      }
                      style={styles.languageOptionGradient}
                    >
                      <View
                        style={[
                          styles.languageInfo,
                          isRTL && styles.languageInfoRTL,
                        ]}
                      >
                        <View style={styles.flagCircle}>
                          <Text style={styles.flag}>{language.flag}</Text>
                        </View>
                        <View style={styles.languageTextInfo}>
                          <Text
                            style={[
                              styles.languageName,
                              isRTL && styles.textRTL,
                            ]}
                          >
                            {language.nativeName}
                          </Text>
                          <Text
                            style={[
                              styles.languageSubname,
                              isRTL && styles.textRTL,
                            ]}
                          >
                            {language.name}
                          </Text>
                        </View>
                      </View>

                      {currentLanguage === language.code && (
                        <View style={styles.checkmarkContainer}>
                          <CheckCircle
                            size={24}
                            color="#007AFF"
                          />
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Footer */}
              <View style={styles.modalFooter}>
                <Text style={[styles.footerText, isRTL && styles.textRTL]}>
                  {t("language.change_note")}
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  languageButton: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  languageButtonRTL: {
    // RTL specific button styles if needed
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  flagContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  flagEmoji: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  textContainerRTL: {
    alignItems: "flex-end",
  },
  languageLabel: {
    fontSize: 14,
    color: "#6c757d",
    fontWeight: "500",
    marginBottom: 2,
  },
  currentLanguage: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  textRTL: {
    textAlign: "right",
    writingDirection: "rtl",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  backdrop: {
    flex: 1,
  },
  modalContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: screenWidth * 0.85,
    maxWidth: 400,
  },
  modalContainerRTL: {
    right: undefined,
    left: 0,
  },
  modalContent: {
    flex: 1,
    paddingTop: 50,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  modalHeaderRTL: {
    flexDirection: "row-reverse",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 12,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
  },

  // Language List
  languageList: {
    flex: 1,
    paddingTop: 12,
  },
  languageOption: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 16,
    overflow: "hidden",
  },
  languageOptionRTL: {
    // RTL specific option styles if needed
  },
  selectedLanguage: {
    // Additional styles for selected language if needed
  },
  languageOptionGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  languageInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  languageInfoRTL: {
    flexDirection: "row-reverse",
  },
  flagCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  flag: {
    fontSize: 24,
  },
  languageTextInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  languageSubname: {
    fontSize: 14,
    color: "#6c757d",
    fontWeight: "400",
  },
  checkmarkContainer: {
    marginLeft: 16,
  },

  // Footer
  modalFooter: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    backgroundColor: "#f8f9fa",
  },
  footerText: {
    fontSize: 12,
    color: "#6c757d",
    textAlign: "center",
    fontStyle: "italic",
  },
});

export default LanguageSelector;
