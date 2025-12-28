import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/src/store";
import {
  X,
  Lock,
  Mail,
  Shield,
  AlertCircle,
  User,
  Calendar,
  ChevronRight,
} from "lucide-react-native";
import { userAPI } from "@/src/services/api";
import { signOut } from "@/src/store/authSlice";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "@/src/context/ThemeContext";

interface EditProfileProps {
  onClose: () => void;
}

export default function EditProfile({ onClose }: EditProfileProps) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { colors, isDark } = useTheme();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    birth_date: user?.birth_date || "",
  });
  const [date, setDate] = useState(
    profile.birth_date ? new Date(profile.birth_date) : new Date()
  );
  const [showPicker, setShowPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [codeRequested, setCodeRequested] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowPicker(Platform.OS === "ios");
    if (selectedDate) {
      setDate(selectedDate);
      setProfile({
        ...profile,
        birth_date: selectedDate.toISOString().split("T")[0],
      });
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await userAPI.updateProfile(profile);
      Alert.alert(t("common.success"), t("profile.profile_updated"), [
        { text: t("common.ok"), onPress: onClose },
      ]);
    } catch (error: any) {
      Alert.alert(
        t("common.error"),
        error.message || t("profile.update_failed")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestPasswordChange = async () => {
    try {
      setIsRequestingCode(true);
      const response = await userAPI.requestPasswordChange();
      if (response.success) {
        setCodeRequested(true);
        Alert.alert(
          t("common.success"),
          t("auth.reset_password.reset_link_sent"),
          [{ text: t("common.ok") }]
        );
        if (response.verificationCode) {
          console.log(
            `🔐 ${t("auth.email_verification.verification_code")}: ${
              response.verificationCode
            }`
          );
        }
      } else {
        throw new Error(
          response.error || t("auth.reset_password.reset_failed")
        );
      }
    } catch (error: any) {
      Alert.alert(
        t("common.error"),
        error.message || t("auth.reset_password.reset_failed")
      );
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleChangePassword = async () => {
    if (!verificationCode.trim()) {
      Alert.alert(t("common.error"), t("auth.email_verification.enter_code"));
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        t("common.error"),
        t("auth.reset_password.password_too_short")
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        t("common.error"),
        t("auth.reset_password.passwords_dont_match")
      );
      return;
    }

    try {
      setIsChangingPassword(true);
      const response = await userAPI.changePassword(
        verificationCode,
        newPassword
      );
      if (response.success) {
        Alert.alert(
          t("common.success"),
          t("auth.reset_password.reset_successful"),
          [
            {
              text: t("common.ok"),
              onPress: () => {
                dispatch(signOut() as any);
              },
            },
          ]
        );
      } else {
        throw new Error(
          response.error || t("auth.reset_password.reset_failed")
        );
      }
    } catch (error: any) {
      Alert.alert(
        t("common.error"),
        error.message || t("auth.reset_password.reset_failed")
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmWord = "DELETE";
    if (deleteConfirmText !== confirmWord) {
      Alert.alert(
        t("common.error"),
        `${t("common.type")} "${confirmWord}" ${t("common.to_confirm")}`
      );
      return;
    }

    try {
      const response = await userAPI.deleteAccount();
      if (response.success) {
        Alert.alert(t("common.success"), t("profile.accountDeleted"), [
          {
            text: t("common.ok"),
            onPress: () => {
              dispatch(signOut() as any);
            },
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message || t("common.error"));
    }
  };

  return (
    <View >
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Personal Information Section */}
        <View
          style={[
          ]}
        >
          <View style={styles.sectionHeader}>
            <User size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("profile.personal_info")}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("profile.name")}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceVariant,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={profile.name}
              onChangeText={(text) => setProfile({ ...profile, name: text })}
              placeholder={t("auth.name")}
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("auth.email")}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceVariant,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={profile.email}
              onChangeText={(text) => setProfile({ ...profile, email: text })}
              placeholder={t("auth.enter_email")}
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("auth.birth_date")}
            </Text>
            <TouchableOpacity
              style={[
                styles.dateInput,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setShowPicker(true)}
            >
              <Calendar size={20} color={colors.textSecondary} />
              <Text style={[styles.dateText, { color: colors.text }]}>
                {date.toLocaleDateString()}
              </Text>
              <ChevronRight size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            {showPicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onChangeDate}
                maximumDate={new Date()}
              />
            )}
          </View>
        </View>

        {/* Password Section */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setShowPasswordSection(!showPasswordSection)}
          >
            <Lock size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("auth.reset_password.title")}
            </Text>
            <ChevronRight
              size={20}
              color={colors.textSecondary}
              style={{
                transform: [{ rotate: showPasswordSection ? "90deg" : "0deg" }],
              }}
            />
          </TouchableOpacity>

          {showPasswordSection && (
            <View style={styles.sectionContent}>
              {!codeRequested ? (
                <View>
                  <View
                    style={[
                      styles.infoBox,
                      { backgroundColor: colors.primaryContainer },
                    ]}
                  >
                    <Mail size={18} color={colors.onPrimaryContainer} />
                    <Text
                      style={[
                        styles.infoText,
                        { color: colors.onPrimaryContainer },
                      ]}
                    >
                      {t("auth.reset_password.subtitle")}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={handleRequestPasswordChange}
                    disabled={isRequestingCode}
                  >
                    {isRequestingCode ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.onPrimary}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.primaryButtonText,
                          { color: colors.onPrimary },
                        ]}
                      >
                        {t("auth.reset_password.send_reset_link")}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View
                    style={[
                      styles.infoBox,
                      { backgroundColor: colors.primaryContainer },
                    ]}
                  >
                    <Shield size={18} color={colors.onPrimaryContainer} />
                    <Text
                      style={[
                        styles.infoText,
                        { color: colors.onPrimaryContainer },
                      ]}
                    >
                      {t("auth.reset_password_verify.enter_code")}
                    </Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text
                      style={[styles.label, { color: colors.textSecondary }]}
                    >
                      {t("auth.email_verification.verification_code")}
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.surfaceVariant,
                          color: colors.text,
                          borderColor: colors.border,
                        },
                      ]}
                      value={verificationCode}
                      onChangeText={setVerificationCode}
                      placeholder="000000"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text
                      style={[styles.label, { color: colors.textSecondary }]}
                    >
                      {t("auth.reset_password.new_password")}
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.surfaceVariant,
                          color: colors.text,
                          borderColor: colors.border,
                        },
                      ]}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder={t("auth.reset_password.enter_new_password")}
                      placeholderTextColor={colors.textTertiary}
                      secureTextEntry
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text
                      style={[styles.label, { color: colors.textSecondary }]}
                    >
                      {t("auth.reset_password.confirm_new_password")}
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.surfaceVariant,
                          color: colors.text,
                          borderColor: colors.border,
                        },
                      ]}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder={t(
                        "auth.reset_password.confirm_new_password"
                      )}
                      placeholderTextColor={colors.textTertiary}
                      secureTextEntry
                    />
                  </View>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[
                        styles.secondaryButton,
                        { backgroundColor: colors.surfaceVariant },
                      ]}
                      onPress={() => {
                        setCodeRequested(false);
                        setVerificationCode("");
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                    >
                      <Text
                        style={[
                          styles.secondaryButtonText,
                          { color: colors.text },
                        ]}
                      >
                        {t("common.cancel")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.primaryButton,
                        { backgroundColor: colors.primary, flex: 1 },
                      ]}
                      onPress={handleChangePassword}
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.onPrimary}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.primaryButtonText,
                            { color: colors.onPrimary },
                          ]}
                        >
                          {t("common.update")}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Danger Zone */}
        <View
          style={[
            styles.section,
            styles.dangerSection,
            {
              backgroundColor: colors.error + "10",
              borderColor: colors.error + "30",
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <AlertCircle size={20} color={colors.error} />
            <Text style={[styles.sectionTitle, { color: colors.error }]}>
              {t("profile.dangerZone")}
            </Text>
          </View>

          {!showDeleteConfirm ? (
            <TouchableOpacity
              style={[styles.dangerButton, { backgroundColor: colors.error }]}
              onPress={() => setShowDeleteConfirm(true)}
            >
              <Text style={styles.dangerButtonText}>
                {t("profile.deleteAccount")}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.sectionContent}>
              <View
                style={[
                  styles.warningBox,
                  {
                    backgroundColor: colors.error + "20",
                    borderColor: colors.error,
                  },
                ]}
              >
                <AlertCircle size={20} color={colors.error} />
                <Text style={[styles.warningText, { color: colors.error }]}>
                  {t("common.warning")}: {t("common.type")} "DELETE"{" "}
                  {t("common.to_confirm")}
                </Text>
              </View>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.error,
                    borderWidth: 2,
                  },
                ]}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="DELETE"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="characters"
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    { backgroundColor: colors.surfaceVariant },
                  ]}
                  onPress={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                  }}
                >
                  <Text
                    style={[styles.secondaryButtonText, { color: colors.text }]}
                  >
                    {t("common.cancel")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.dangerButton,
                    { backgroundColor: colors.error, flex: 1 },
                  ]}
                  onPress={handleDeleteAccount}
                >
                  <Text style={styles.dangerButtonText}>
                    {t("profile.confirmDelete")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  sectionContent: {
    padding: 16,
    paddingTop: 0,
    gap: 16,
  },
  inputGroup: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    fontWeight: "500",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  primaryButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  dangerSection: {
    borderWidth: 2,
  },
  dangerButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  dangerButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    gap: 10,
    borderWidth: 1,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
});
