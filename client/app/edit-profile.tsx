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
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/src/store";
import { updateUser, signOut } from "@/src/store/authSlice";
import {
  ChevronLeft,
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
  Camera,
  Crown,
} from "lucide-react-native";
import { userAPI } from "@/src/services/api";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "@/src/context/ThemeContext";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ToastService } from "@/src/services/totastService";

const PLAN_GRADIENT: Record<string, [string, string]> = {
  FREE: ["#6B7280", "#4B5563"],
  PREMIUM: ["#F59E0B", "#D97706"],
  GOLD: ["#EF4444", "#DC2626"],
};

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const planType = user?.subscription_type ?? "FREE";
  const planGradient = PLAN_GRADIENT[planType] ?? PLAN_GRADIENT.FREE;

  // ── Profile state ──────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    birth_date: user?.birth_date || "",
  });
  const [date, setDate] = useState(
    profile.birth_date ? new Date(profile.birth_date) : new Date(),
  );
  const [showPicker, setShowPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

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

  const onChangeDate = (_: any, selectedDate?: Date) => {
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
      dispatch(
        updateUser({
          name: profile.name,
          email: profile.email,
          birth_date: profile.birth_date,
        }),
      );
      ToastService.success(t("common.success"), t("profile.profile_updated"));
      router.back();
    } catch (error: any) {
      Alert.alert(
        t("common.error"),
        error.message || t("profile.update_failed"),
      );
    } finally {
      setIsSaving(false);
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
  };

  const handleChooseFromGallery = async () => {
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

  const handleRequestPasswordChange = async () => {
    try {
      setIsRequestingCode(true);
      const response = await userAPI.requestPasswordChange();
      if (response.success) {
        setCodeRequested(true);
        Alert.alert(
          t("common.success"),
          t("auth.reset_password.reset_link_sent"),
          [{ text: t("common.ok") }],
        );
      } else {
        throw new Error(
          response.error || t("auth.reset_password.reset_failed"),
        );
      }
    } catch (error: any) {
      Alert.alert(
        t("common.error"),
        error.message || t("auth.reset_password.reset_failed"),
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
        t("auth.reset_password.password_too_short"),
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(
        t("common.error"),
        t("auth.reset_password.passwords_dont_match"),
      );
      return;
    }
    try {
      setIsChangingPassword(true);
      const response = await userAPI.changePassword(
        verificationCode,
        newPassword,
      );
      if (response.success) {
        Alert.alert(
          t("common.success"),
          t("auth.reset_password.reset_successful"),
          [
            {
              text: t("common.ok"),
              onPress: () => dispatch(signOut() as any),
            },
          ],
        );
      } else {
        throw new Error(
          response.error || t("auth.reset_password.reset_failed"),
        );
      }
    } catch (error: any) {
      Alert.alert(
        t("common.error"),
        error.message || t("auth.reset_password.reset_failed"),
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      Alert.alert(
        t("common.error"),
        `${t("common.type")} "DELETE" ${t("common.to_confirm")}`,
      );
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

  // ── Shared input style ─────────────────────────────────────────────────────
  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.card,
      color: colors.text,
      borderColor: colors.border,
    },
  ];

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={isDark ? ["#004D59", "#001A22"] : ["#00B4C8", "#006070"]}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* decorative blobs */}
        <View style={styles.blob1} />
        <View style={styles.blob2} />

        {/* toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.75}
          >
            <ChevronLeft size={22} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.toolbarTitle}>{t("profile.edit_profile")}</Text>

          <TouchableOpacity
            style={[styles.saveHeroBtn, { opacity: isSaving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Check size={14} color="#fff" />
                <Text style={styles.saveHeroBtnText}>{t("common.save")}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* avatar */}
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={handleAvatarPress}
          disabled={isUploadingAvatar}
          activeOpacity={0.85}
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
              <Camera size={13} color="#FFF" />
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.heroName}>{user?.name || t("profile.name")}</Text>
        <Text style={styles.heroEmail}>
          {user?.email || t("profile.email")}
        </Text>

        <LinearGradient
          colors={planGradient}
          style={styles.planBadge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Crown size={11} color="#fff" />
          <Text style={styles.planBadgeText}>{t(`profile.${planType}`)}</Text>
        </LinearGradient>
      </LinearGradient>

      {/* ─── BODY ─────────────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── PERSONAL INFORMATION ─────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <View
              style={[styles.sectionBar, { backgroundColor: colors.primary }]}
            />
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {t("profile.personal_info").toUpperCase()}
            </Text>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {/* Name */}
            <View style={styles.field}>
              <View style={styles.fieldHeader}>
                <View
                  style={[
                    styles.fieldIconBox,
                    { backgroundColor: `${colors.primary}18` },
                  ]}
                >
                  <User size={14} color={colors.primary} />
                </View>
                <Text
                  style={[styles.fieldLabel, { color: colors.textSecondary }]}
                >
                  {t("profile.name")}
                </Text>
              </View>
              <TextInput
                style={inputStyle}
                value={profile.name}
                onChangeText={(text) => setProfile({ ...profile, name: text })}
                placeholder={t("auth.name")}
                placeholderTextColor={colors.muted}
              />
            </View>

            <View
              style={[
                styles.fieldDivider,
                { backgroundColor: colors.border },
              ]}
            />

            {/* Email */}
            <View style={styles.field}>
              <View style={styles.fieldHeader}>
                <View
                  style={[
                    styles.fieldIconBox,
                    { backgroundColor: `${colors.primary}18` },
                  ]}
                >
                  <Mail size={14} color={colors.primary} />
                </View>
                <Text
                  style={[styles.fieldLabel, { color: colors.textSecondary }]}
                >
                  {t("auth.email")}
                </Text>
              </View>
              <TextInput
                style={inputStyle}
                value={profile.email}
                onChangeText={(text) =>
                  setProfile({ ...profile, email: text })
                }
                placeholder={t("auth.enter_email")}
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View
              style={[
                styles.fieldDivider,
                { backgroundColor: colors.border },
              ]}
            />

            {/* Birth date */}
            <View style={styles.field}>
              <View style={styles.fieldHeader}>
                <View
                  style={[
                    styles.fieldIconBox,
                    { backgroundColor: `${colors.primary}18` },
                  ]}
                >
                  <Calendar size={14} color={colors.primary} />
                </View>
                <Text
                  style={[styles.fieldLabel, { color: colors.textSecondary }]}
                >
                  {t("auth.birth_date")}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.datePicker,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setShowPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dateValue, { color: colors.text }]}>
                  {date.toLocaleDateString()}
                </Text>
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

        {/* ── SAVE BUTTON ────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 },
          ]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Check size={18} color="#fff" />
              <Text style={styles.saveBtnText}>{t("common.save")}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── PASSWORD ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionLabelRow}
            onPress={() => setShowPasswordSection(!showPasswordSection)}
            activeOpacity={0.7}
          >
            <View style={[styles.sectionBar, { backgroundColor: "#F59E0B" }]} />
            <Text
              style={[
                styles.sectionLabel,
                { color: colors.textSecondary, flex: 1 },
              ]}
            >
              {t("auth.reset_password.title").toUpperCase()}
            </Text>
            <ChevronDown
              size={16}
              color={colors.muted}
              style={{
                transform: [
                  { rotate: showPasswordSection ? "180deg" : "0deg" },
                ],
              }}
            />
          </TouchableOpacity>

          {showPasswordSection && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              {!codeRequested ? (
                <View style={styles.pwWrap}>
                  <View
                    style={[
                      styles.infoBanner,
                      {
                        backgroundColor: "rgba(245,158,11,0.1)",
                        borderColor: "rgba(245,158,11,0.3)",
                      },
                    ]}
                  >
                    <Lock size={16} color="#F59E0B" />
                    <Text
                      style={[
                        styles.infoBannerText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("auth.reset_password.subtitle")}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#F59E0B" }]}
                    onPress={handleRequestPasswordChange}
                    disabled={isRequestingCode}
                    activeOpacity={0.85}
                  >
                    {isRequestingCode ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Mail size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>
                          {t("auth.reset_password.send_reset_link")}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.pwWrap}>
                  <View
                    style={[
                      styles.infoBanner,
                      {
                        backgroundColor: "rgba(16,185,129,0.1)",
                        borderColor: "rgba(16,185,129,0.3)",
                      },
                    ]}
                  >
                    <Shield size={16} color="#10B981" />
                    <Text
                      style={[
                        styles.infoBannerText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("auth.reset_password_verify.enter_code")}
                    </Text>
                  </View>

                  <View style={styles.field}>
                    <Text
                      style={[
                        styles.fieldLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
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

                  <View style={styles.field}>
                    <Text
                      style={[
                        styles.fieldLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("auth.reset_password.new_password")}
                    </Text>
                    <View style={styles.pwRow}>
                      <TextInput
                        style={[
                          inputStyle,
                          {
                            flex: 1,
                            borderRightWidth: 0,
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0,
                          },
                        ]}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder={t(
                          "auth.reset_password.enter_new_password",
                        )}
                        placeholderTextColor={colors.muted}
                        secureTextEntry={!showNewPw}
                      />
                      <TouchableOpacity
                        style={[
                          styles.eyeBtn,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => setShowNewPw(!showNewPw)}
                      >
                        {showNewPw ? (
                          <Eye size={16} color={colors.muted} />
                        ) : (
                          <EyeOff size={16} color={colors.muted} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.field}>
                    <Text
                      style={[
                        styles.fieldLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("auth.reset_password.confirm_new_password")}
                    </Text>
                    <View style={styles.pwRow}>
                      <TextInput
                        style={[
                          inputStyle,
                          {
                            flex: 1,
                            borderRightWidth: 0,
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0,
                          },
                        ]}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder={t(
                          "auth.reset_password.confirm_new_password",
                        )}
                        placeholderTextColor={colors.muted}
                        secureTextEntry={!showConfirmPw}
                      />
                      <TouchableOpacity
                        style={[
                          styles.eyeBtn,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => setShowConfirmPw(!showConfirmPw)}
                      >
                        {showConfirmPw ? (
                          <Eye size={16} color={colors.muted} />
                        ) : (
                          <EyeOff size={16} color={colors.muted} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={[
                        styles.outlineBtn,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.card,
                        },
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
                          styles.outlineBtnText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {t("common.cancel")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        { backgroundColor: "#F59E0B", flex: 1 },
                      ]}
                      onPress={handleChangePassword}
                      disabled={isChangingPassword}
                      activeOpacity={0.85}
                    >
                      {isChangingPassword ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <KeyRound size={16} color="#fff" />
                          <Text style={styles.actionBtnText}>
                            {t("common.update")}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── DANGER ZONE ────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <View
              style={[styles.sectionBar, { backgroundColor: "#EF4444" }]}
            />
            <Text style={[styles.sectionLabel, { color: "#EF4444" }]}>
              {t("profile.dangerZone").toUpperCase()}
            </Text>
          </View>

          <View
            style={[
              styles.dangerCard,
              {
                borderColor: "rgba(239,68,68,0.35)",
                backgroundColor: isDark
                  ? "rgba(239,68,68,0.08)"
                  : "rgba(239,68,68,0.04)",
              },
            ]}
          >
            {!showDeleteConfirm ? (
              <TouchableOpacity
                style={[
                  styles.dangerBtn,
                  { borderColor: "rgba(239,68,68,0.4)" },
                ]}
                onPress={() => setShowDeleteConfirm(true)}
                activeOpacity={0.75}
              >
                <Trash2 size={18} color="#EF4444" />
                <Text style={styles.dangerBtnText}>
                  {t("profile.deleteAccount")}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.deleteWrap}>
                <View
                  style={[
                    styles.warningBanner,
                    {
                      borderColor: "rgba(239,68,68,0.5)",
                      backgroundColor: "rgba(239,68,68,0.08)",
                    },
                  ]}
                >
                  <AlertCircle size={18} color="#EF4444" />
                  <Text style={styles.warningText}>
                    {t("common.warning")}: {t("common.type")} "DELETE"{" "}
                    {t("common.to_confirm")}
                  </Text>
                </View>
                <TextInput
                  style={[
                    styles.input,
                    {
                      margin: 16,
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: "#EF4444",
                      borderWidth: 2,
                    },
                  ]}
                  value={deleteConfirmText}
                  onChangeText={setDeleteConfirmText}
                  placeholder="DELETE"
                  placeholderTextColor="rgba(239,68,68,0.4)"
                  autoCapitalize="characters"
                />
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={[
                      styles.outlineBtn,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                      },
                    ]}
                    onPress={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText("");
                    }}
                  >
                    <Text
                      style={[
                        styles.outlineBtnText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("common.cancel")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      { backgroundColor: "#EF4444", flex: 1 },
                    ]}
                    onPress={handleDeleteAccount}
                    activeOpacity={0.85}
                  >
                    <Trash2 size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>
                      {t("profile.confirmDelete")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  /* ── Hero ── */
  hero: {
    paddingBottom: 36,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  blob1: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  blob2: {
    position: "absolute",
    bottom: -50,
    left: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  /* ── Toolbar ── */
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  toolbarTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  saveHeroBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  saveHeroBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  /* ── Avatar ── */
  avatarWrap: { position: "relative", marginBottom: 14 },
  avatarRingOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarRingInner: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImg: { width: 84, height: 84, borderRadius: 42 },
  avatarFallback: {
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: { fontSize: 36, fontWeight: "800", color: "#fff" },
  cameraBtn: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 2,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  heroName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroEmail: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
    marginBottom: 12,
  },

  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
  },
  planBadgeText: { fontSize: 11, fontWeight: "800", color: "#fff", letterSpacing: 1 },

  /* ── Body ── */
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 20, paddingTop: 24 },

  /* ── Section ── */
  section: { marginBottom: 22 },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionBar: { width: 3, height: 14, borderRadius: 2 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.9 },

  /* ── Card ── */
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },

  /* ── Field ── */
  field: { padding: 16, gap: 9 },
  fieldDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  fieldHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  fieldIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  fieldLabel: { fontSize: 13, fontWeight: "600", letterSpacing: -0.1 },

  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: "500",
  },

  datePicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dateValue: { fontSize: 15, fontWeight: "500" },

  /* ── Save button ── */
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 22,
  },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  /* ── Info banner ── */
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    margin: 16,
    marginBottom: 0,
  },
  infoBannerText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "500" },

  /* ── Password ── */
  pwWrap: { paddingBottom: 16, gap: 0 },
  pwRow: { flexDirection: "row" },
  eyeBtn: {
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  /* ── Action button ── */
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 14,
  },
  actionBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  outlineBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtnText: { fontSize: 15, fontWeight: "600" },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 14,
  },

  /* ── Danger zone ── */
  dangerCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  dangerBtnText: { fontSize: 15, fontWeight: "700", color: "#EF4444" },
  deleteWrap: { paddingBottom: 16 },
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    margin: 16,
    marginBottom: 0,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#EF4444",
    lineHeight: 18,
  },
});
