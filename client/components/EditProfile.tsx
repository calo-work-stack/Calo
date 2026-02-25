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
import { updateUser } from "@/src/store/authSlice";
import {
  X,
  Lock,
  Mail,
  Shield,
  AlertCircle,
  User,
  Calendar,
  ChevronDown,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Trash2,
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

  // ── Profile state ──────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    birth_date: user?.birth_date || "",
  });
  const [date, setDate] = useState(profile.birth_date ? new Date(profile.birth_date) : new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ── Password state ─────────────────────────────────────────────────────────
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [codeRequested, setCodeRequested] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // ── Danger zone state ──────────────────────────────────────────────────────
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowPicker(Platform.OS === "ios");
    if (selectedDate) {
      setDate(selectedDate);
      setProfile({ ...profile, birth_date: selectedDate.toISOString().split("T")[0] });
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await userAPI.updateProfile(profile);
      dispatch(updateUser({ name: profile.name, email: profile.email, birth_date: profile.birth_date }));
      Alert.alert(t("common.success"), t("profile.profile_updated"), [
        { text: t("common.ok"), onPress: onClose },
      ]);
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message || t("profile.update_failed"));
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
        Alert.alert(t("common.success"), t("auth.reset_password.reset_link_sent"), [{ text: t("common.ok") }]);
        if (response.verificationCode) {
          console.log(`🔐 Code: ${response.verificationCode}`);
        }
      } else {
        throw new Error(response.error || t("auth.reset_password.reset_failed"));
      }
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message || t("auth.reset_password.reset_failed"));
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
      Alert.alert(t("common.error"), t("auth.reset_password.password_too_short"));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t("common.error"), t("auth.reset_password.passwords_dont_match"));
      return;
    }
    try {
      setIsChangingPassword(true);
      const response = await userAPI.changePassword(verificationCode, newPassword);
      if (response.success) {
        Alert.alert(t("common.success"), t("auth.reset_password.reset_successful"), [
          { text: t("common.ok"), onPress: () => dispatch(signOut() as any) },
        ]);
      } else {
        throw new Error(response.error || t("auth.reset_password.reset_failed"));
      }
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message || t("auth.reset_password.reset_failed"));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      Alert.alert(t("common.error"), `${t("common.type")} "DELETE" ${t("common.to_confirm")}`);
      return;
    }
    try {
      const response = await userAPI.deleteAccount();
      if (response.success) {
        Alert.alert(t("common.success"), t("profile.accountDeleted"), [
          { text: t("common.ok"), onPress: () => dispatch(signOut() as any) },
        ]);
      }
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message || t("common.error"));
    }
  };

  // ── Small helpers ──────────────────────────────────────────────────────────

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.border },
  ];

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>

      {/* ─── Header ──────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <X size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t("profile.edit_profile")}</Text>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving
            ? <ActivityIndicator size="small" color="#fff" />
            : <><Check size={15} color="#fff" /><Text style={styles.saveBtnText}>{t("common.save")}</Text></>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

        {/* ─── PERSONAL INFORMATION ────────────────────────── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionLabelRow}>
            <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {t("profile.personal_info").toUpperCase()}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Name */}
            <View style={styles.field}>
              <View style={styles.fieldLabelRow}>
                <User size={14} color={colors.primary} />
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t("profile.name")}</Text>
              </View>
              <TextInput
                style={inputStyle}
                value={profile.name}
                onChangeText={(text) => setProfile({ ...profile, name: text })}
                placeholder={t("auth.name")}
                placeholderTextColor={colors.muted}
              />
            </View>

            <View style={[styles.fieldDivider, { backgroundColor: colors.border }]} />

            {/* Email */}
            <View style={styles.field}>
              <View style={styles.fieldLabelRow}>
                <Mail size={14} color={colors.primary} />
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t("auth.email")}</Text>
              </View>
              <TextInput
                style={inputStyle}
                value={profile.email}
                onChangeText={(text) => setProfile({ ...profile, email: text })}
                placeholder={t("auth.enter_email")}
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={[styles.fieldDivider, { backgroundColor: colors.border }]} />

            {/* Birth date */}
            <View style={styles.field}>
              <View style={styles.fieldLabelRow}>
                <Calendar size={14} color={colors.primary} />
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t("auth.birth_date")}</Text>
              </View>
              <TouchableOpacity
                style={[styles.datePicker, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                onPress={() => setShowPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dateValue, { color: colors.text }]}>{date.toLocaleDateString()}</Text>
                <ChevronDown size={16} color={colors.muted} />
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
        </View>

        {/* ─── PASSWORD ─────────────────────────────────────── */}
        <View style={styles.sectionWrap}>
          <TouchableOpacity
            style={styles.sectionLabelRow}
            onPress={() => setShowPasswordSection(!showPasswordSection)}
            activeOpacity={0.7}
          >
            <View style={[styles.sectionDot, { backgroundColor: "#F59E0B" }]} />
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, flex: 1 }]}>
              {t("auth.reset_password.title").toUpperCase()}
            </Text>
            <ChevronDown
              size={16}
              color={colors.muted}
              style={{ transform: [{ rotate: showPasswordSection ? "180deg" : "0deg" }] }}
            />
          </TouchableOpacity>

          {showPasswordSection && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {!codeRequested ? (
                <View style={styles.pwRequestWrap}>
                  <View style={[styles.infoBanner, { backgroundColor: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.3)" }]}>
                    <Lock size={16} color="#F59E0B" />
                    <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
                      {t("auth.reset_password.subtitle")}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: "#F59E0B" }]}
                    onPress={handleRequestPasswordChange}
                    disabled={isRequestingCode}
                  >
                    {isRequestingCode
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <><Mail size={16} color="#fff" /><Text style={styles.primaryBtnText}>{t("auth.reset_password.send_reset_link")}</Text></>}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.pwChangeWrap}>
                  <View style={[styles.infoBanner, { backgroundColor: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.3)" }]}>
                    <Shield size={16} color="#10B981" />
                    <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
                      {t("auth.reset_password_verify.enter_code")}
                    </Text>
                  </View>

                  {/* Code field */}
                  <View style={styles.field}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      {t("auth.email_verification.verification_code")}
                    </Text>
                    <TextInput
                      style={inputStyle}
                      value={verificationCode}
                      onChangeText={setVerificationCode}
                      placeholder="000000"
                      placeholderTextColor={colors.muted}
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  </View>

                  {/* New password */}
                  <View style={styles.field}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      {t("auth.reset_password.new_password")}
                    </Text>
                    <View style={styles.pwInputWrap}>
                      <TextInput
                        style={[inputStyle, { flex: 1, borderRightWidth: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder={t("auth.reset_password.enter_new_password")}
                        placeholderTextColor={colors.muted}
                        secureTextEntry={!showNewPw}
                      />
                      <TouchableOpacity
                        style={[styles.eyeBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                        onPress={() => setShowNewPw(!showNewPw)}
                      >
                        {showNewPw ? <Eye size={16} color={colors.muted} /> : <EyeOff size={16} color={colors.muted} />}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Confirm password */}
                  <View style={styles.field}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      {t("auth.reset_password.confirm_new_password")}
                    </Text>
                    <View style={styles.pwInputWrap}>
                      <TextInput
                        style={[inputStyle, { flex: 1, borderRightWidth: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder={t("auth.reset_password.confirm_new_password")}
                        placeholderTextColor={colors.muted}
                        secureTextEntry={!showConfirmPw}
                      />
                      <TouchableOpacity
                        style={[styles.eyeBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                        onPress={() => setShowConfirmPw(!showConfirmPw)}
                      >
                        {showConfirmPw ? <Eye size={16} color={colors.muted} /> : <EyeOff size={16} color={colors.muted} />}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surfaceVariant }]}
                      onPress={() => { setCodeRequested(false); setVerificationCode(""); setNewPassword(""); setConfirmPassword(""); }}
                    >
                      <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>{t("common.cancel")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: "#F59E0B", flex: 1 }]}
                      onPress={handleChangePassword}
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <><KeyRound size={16} color="#fff" /><Text style={styles.primaryBtnText}>{t("common.update")}</Text></>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ─── DANGER ZONE ─────────────────────────────────── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionLabelRow}>
            <View style={[styles.sectionDot, { backgroundColor: "#EF4444" }]} />
            <Text style={[styles.sectionLabel, { color: "#EF4444" }]}>
              {t("profile.dangerZone").toUpperCase()}
            </Text>
          </View>

          <View style={[styles.card, styles.dangerCard, { borderColor: "rgba(239,68,68,0.35)", backgroundColor: "rgba(239,68,68,0.05)" }]}>
            {!showDeleteConfirm ? (
              <TouchableOpacity
                style={[styles.dangerBtn, { borderColor: "rgba(239,68,68,0.4)" }]}
                onPress={() => setShowDeleteConfirm(true)}
                activeOpacity={0.75}
              >
                <Trash2 size={18} color="#EF4444" />
                <Text style={styles.dangerBtnText}>{t("profile.deleteAccount")}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.deleteConfirmWrap}>
                <View style={[styles.warningBanner, { borderColor: "rgba(239,68,68,0.5)", backgroundColor: "rgba(239,68,68,0.08)" }]}>
                  <AlertCircle size={18} color="#EF4444" />
                  <Text style={styles.warningBannerText}>
                    {t("common.warning")}: {t("common.type")} "DELETE" {t("common.to_confirm")}
                  </Text>
                </View>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: "#EF4444", borderWidth: 2 }]}
                  value={deleteConfirmText}
                  onChangeText={setDeleteConfirmText}
                  placeholder="DELETE"
                  placeholderTextColor="rgba(239,68,68,0.4)"
                  autoCapitalize="characters"
                />
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surfaceVariant }]}
                    onPress={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                  >
                    <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>{t("common.cancel")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: "#EF4444", flex: 1 }]}
                    onPress={handleDeleteAccount}
                  >
                    <Trash2 size={16} color="#fff" />
                    <Text style={styles.primaryBtnText}>{t("profile.confirmDelete")}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* ── Header ── */
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", textAlign: "center" },
  saveBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 18,
  },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  /* ── Body ── */
  body: { flex: 1, padding: 16 },

  /* ── Section wrap ── */
  sectionWrap: { marginBottom: 20 },
  sectionLabelRow: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10,
  },
  sectionDot: { width: 3, height: 14, borderRadius: 2 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },

  /* ── Card ── */
  card: {
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  dangerCard: { borderWidth: 1.5 },

  /* ── Field ── */
  field: { padding: 16, gap: 8 },
  fieldDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  fieldLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600", letterSpacing: -0.1 },
  input: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, fontWeight: "500",
  },

  /* ── Date picker ── */
  datePicker: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  dateValue: { fontSize: 15, fontWeight: "500" },

  /* ── Info banner ── */
  infoBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    padding: 12, borderRadius: 10, borderWidth: 1, margin: 16, marginBottom: 0,
  },
  infoBannerText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "500" },

  /* ── Password request ── */
  pwRequestWrap: { paddingBottom: 16, gap: 14 },
  pwChangeWrap: { paddingBottom: 16, gap: 0 },
  pwInputWrap: { flexDirection: "row" },
  eyeBtn: {
    borderWidth: 1, borderLeftWidth: 0,
    borderTopRightRadius: 12, borderBottomRightRadius: 12,
    paddingHorizontal: 14, justifyContent: "center", alignItems: "center",
  },

  /* ── Buttons ── */
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 12,
    marginHorizontal: 16, marginTop: 14,
  },
  primaryBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  secondaryBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
  },
  secondaryBtnText: { fontSize: 15, fontWeight: "600" },
  btnRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: 14 },

  /* ── Danger ── */
  dangerBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 15, margin: 16,
    borderRadius: 12, borderWidth: 1.5,
  },
  dangerBtnText: { fontSize: 15, fontWeight: "700", color: "#EF4444" },
  deleteConfirmWrap: { paddingBottom: 16, gap: 0 },
  warningBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    padding: 12, borderRadius: 10, borderWidth: 1, margin: 16,
  },
  warningBannerText: {
    flex: 1, fontSize: 13, fontWeight: "600",
    color: "#EF4444", lineHeight: 18,
  },
});
