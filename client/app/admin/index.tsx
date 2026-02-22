import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  ActivityIndicator,
  FlatList,
  Modal,
  Dimensions,
} from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/context/ThemeContext";
import { api } from "@/src/services/api";
import { Ionicons } from "@expo/vector-icons";
import {
  Flame,
  Target,
  Award,
  Users,
  BarChart2,
  Search,
  X,
  AlertCircle,
  Activity,
  Heart,
  Utensils,
  TrendingUp,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Clock,
  CreditCard,
  UserCheck,
  RefreshCw,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserQuestionnaire {
  allergies: string[] | null;
  medical_conditions: string[] | null;
  medical_conditions_text: string[] | null;
  dietary_style: string | null;
  main_goal: string | null;
  physical_activity_level: string | null;
  age: number | null;
  gender: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  target_weight_kg: number | null;
  kosher: boolean | null;
  liked_foods: string[] | null;
  disliked_foods: string[] | null;
}

interface AdminUser {
  user_id: string;
  name: string | null;
  email: string;
  subscription_type: string;
  is_admin: boolean;
  is_super_admin: boolean;
  created_at: string;
  email_verified: boolean;
  is_questionnaire_completed: boolean;
  level: number;
  total_points: number;
  current_streak: number;
  best_streak: number;
  total_complete_days: number;
  _count: { meals: number; recommendedMenus: number };
  questionnaires: UserQuestionnaire[];
}

interface AdminStats {
  overview: {
    totalUsers: number;
    todaySignups: number;
    todayLogins: number;
    totalMeals: number;
    totalMenus: number;
    weeklySignups: number;
    monthlySignups: number;
    weeklyMeals: number;
    monthlyMeals: number;
    avgMealsPerUser: number;
  };
  subscriptions: Record<string, number>;
  revenue: { total: number; transactions: number };
  engagement: {
    avgStreak: number;
    avgCompleteDays: number;
    bestStreak: number;
    maxStreak: number;
  };
  topUsers: {
    user_id: string;
    name: string | null;
    email: string;
    level: number;
    total_points: number;
    current_streak: number;
    subscription_type: string;
  }[];
}

interface ActivityData {
  recentMeals: { meal_id: string; meal_name: string; calories: number; created_at: string; user: { name: string | null; email: string } }[];
  recentSignups: { user_id: string; name: string | null; email: string; subscription_type: string; created_at: string }[];
  recentPayments: { payment_id: number; plan_type: string; amount: number; payment_date: string; user: { name: string | null; email: string } }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SUBSCRIPTION_COLORS: Record<string, string> = {
  FREE: "#94a3b8",
  PREMIUM: "#f59e0b",
  GOLD: "#eab308",
  PLATINUM: "#8b5cf6",
};
const SUBSCRIPTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  FREE: "person-outline",
  PREMIUM: "star-outline",
  GOLD: "trophy-outline",
  PLATINUM: "diamond-outline",
};
const SUBSCRIPTION_TYPES = ["FREE", "GOLD", "PLATINUM", "PREMIUM"];

// ─── StatCard ─────────────────────────────────────────────────────────────────
const StatCard = ({
  icon,
  value,
  label,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
  bgColor: string;
}) => (
  <View style={[styles.statCard, { backgroundColor: bgColor }]}>
    <View style={[styles.statIconWrap, { backgroundColor: color + "22" }]}>{icon}</View>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ─── UserDetailModal ──────────────────────────────────────────────────────────
const UserDetailModal = ({
  user,
  visible,
  onClose,
  colors,
  isSuperAdmin,
  onSubscriptionChange,
  onRoleChange,
}: {
  user: AdminUser | null;
  visible: boolean;
  onClose: () => void;
  colors: any;
  isSuperAdmin: boolean;
  onSubscriptionChange: (userId: string, newType: string) => Promise<void>;
  onRoleChange: (userId: string, changes: { is_admin?: boolean; is_super_admin?: boolean }) => Promise<void>;
}) => {
  const [savingSubscription, setSavingSubscription] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [selectedSub, setSelectedSub] = useState(user?.subscription_type ?? "FREE");

  useEffect(() => {
    if (user) setSelectedSub(user.subscription_type);
  }, [user]);

  if (!user) return null;
  const q = user.questionnaires?.[0];
  const subColor = SUBSCRIPTION_COLORS[user.subscription_type] ?? "#94a3b8";

  const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) =>
    value ? (
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
      </View>
    ) : null;

  const TagList = ({
    label,
    items,
    tagColor,
  }: {
    label: string;
    items: string[] | null | undefined;
    tagColor: string;
  }) => {
    if (!items || items.length === 0) return null;
    return (
      <View style={styles.tagSection}>
        <Text style={[styles.tagSectionLabel, { color: colors.textSecondary }]}>{label}</Text>
        <View style={styles.tagRow}>
          {items.map((item, i) => (
            <View key={i} style={[styles.tag, { backgroundColor: tagColor + "20", borderColor: tagColor + "50" }]}>
              <Text style={[styles.tagText, { color: tagColor }]}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const handleSaveSubscription = async () => {
    if (selectedSub === user.subscription_type) return;
    Alert.alert(
      "Change Subscription",
      `Change ${user.name ?? user.email}'s subscription from ${user.subscription_type} to ${selectedSub}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: async () => {
            setSavingSubscription(true);
            try {
              await onSubscriptionChange(user.user_id, selectedSub);
              Alert.alert("Success", "Subscription updated");
            } catch {
              Alert.alert("Error", "Failed to update subscription");
            } finally {
              setSavingSubscription(false);
            }
          },
        },
      ]
    );
  };

  const handleToggleAdmin = () => {
    const newIsAdmin = !user.is_admin;
    const action = newIsAdmin ? "Grant admin access" : "Revoke admin access";
    Alert.alert(
      action,
      `${action} for ${user.name ?? user.email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: async () => {
            setSavingRole(true);
            try {
              await onRoleChange(user.user_id, { is_admin: newIsAdmin, is_super_admin: newIsAdmin ? user.is_super_admin : false });
              Alert.alert("Success", `Admin access ${newIsAdmin ? "granted" : "revoked"}`);
            } catch (e: any) {
              Alert.alert("Error", e?.response?.data?.error ?? "Failed to update role");
            } finally {
              setSavingRole(false);
            }
          },
        },
      ]
    );
  };

  const handleToggleSuperAdmin = () => {
    const newIsSuperAdmin = !user.is_super_admin;
    const action = newIsSuperAdmin ? "Grant super admin" : "Revoke super admin";
    Alert.alert(
      action,
      `${action} for ${user.name ?? user.email}? This is a highly privileged operation.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: async () => {
            setSavingRole(true);
            try {
              await onRoleChange(user.user_id, { is_admin: true, is_super_admin: newIsSuperAdmin });
              Alert.alert("Success", `Super admin ${newIsSuperAdmin ? "granted" : "revoked"}`);
            } catch (e: any) {
              Alert.alert("Error", e?.response?.data?.error ?? "Failed to update role");
            } finally {
              setSavingRole(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.modalHeaderLeft}>
              <View style={[styles.avatarCircle, { backgroundColor: subColor + "20" }]}>
                <Text style={[styles.avatarLetter, { color: subColor }]}>
                  {(user.name ?? user.email)[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalName, { color: colors.text }]} numberOfLines={1}>
                  {user.name ?? "No name"}
                </Text>
                <Text style={[styles.modalEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Role badges */}
            <View style={styles.badgesRow}>
              <View style={[styles.subBadgeLarge, { backgroundColor: subColor + "20", borderColor: subColor }]}>
                <Ionicons name={SUBSCRIPTION_ICONS[user.subscription_type] ?? "person-outline"} size={16} color={subColor} />
                <Text style={[styles.subBadgeLargeText, { color: subColor }]}>{user.subscription_type}</Text>
              </View>
              {user.is_super_admin && (
                <View style={[styles.roleBadge, { backgroundColor: "#dc262620", borderColor: "#dc2626" }]}>
                  <ShieldAlert size={14} color="#dc2626" />
                  <Text style={[styles.roleBadgeText, { color: "#dc2626" }]}>SUPER ADMIN</Text>
                </View>
              )}
              {user.is_admin && !user.is_super_admin && (
                <View style={[styles.roleBadge, { backgroundColor: "#f59e0b20", borderColor: "#f59e0b" }]}>
                  <Shield size={14} color="#f59e0b" />
                  <Text style={[styles.roleBadgeText, { color: "#f59e0b" }]}>ADMIN</Text>
                </View>
              )}
            </View>

            {/* Stats row */}
            <View style={styles.modalStatsRow}>
              {[
                { label: "Level", value: user.level, icon: "🏆" },
                { label: "Points", value: user.total_points, icon: "⭐" },
                { label: "Streak", value: user.current_streak, icon: "🔥" },
                { label: "Meals", value: user._count.meals, icon: "🍽️" },
              ].map((s) => (
                <View key={s.label} style={[styles.modalStatItem, { backgroundColor: colors.surface }]}>
                  <Text style={styles.modalStatEmoji}>{s.icon}</Text>
                  <Text style={[styles.modalStatValue, { color: colors.text }]}>{s.value}</Text>
                  <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* ── Role Management (Super Admin only) ── */}
            {isSuperAdmin && (
              <View style={[styles.roleSection, { backgroundColor: colors.surface, borderColor: "#dc262640" }]}>
                <View style={styles.roleSectionHeader}>
                  <ShieldCheck size={18} color="#dc2626" />
                  <Text style={[styles.roleSectionTitle, { color: colors.text }]}>Role Management</Text>
                </View>
                <Text style={[styles.roleWarning, { color: colors.textSecondary }]}>
                  Changes take effect on the user's next login.
                </Text>

                {savingRole && (
                  <ActivityIndicator size="small" color="#dc2626" style={{ marginVertical: 8 }} />
                )}

                <View style={styles.roleToggles}>
                  <TouchableOpacity
                    onPress={handleToggleAdmin}
                    disabled={savingRole}
                    style={[
                      styles.roleToggleBtn,
                      {
                        backgroundColor: user.is_admin ? "#f59e0b20" : colors.background,
                        borderColor: user.is_admin ? "#f59e0b" : colors.border,
                      },
                    ]}
                  >
                    <Shield size={16} color={user.is_admin ? "#f59e0b" : colors.textSecondary} />
                    <Text style={[styles.roleToggleText, { color: user.is_admin ? "#f59e0b" : colors.textSecondary }]}>
                      {user.is_admin ? "Revoke Admin" : "Grant Admin"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleToggleSuperAdmin}
                    disabled={savingRole}
                    style={[
                      styles.roleToggleBtn,
                      {
                        backgroundColor: user.is_super_admin ? "#dc262620" : colors.background,
                        borderColor: user.is_super_admin ? "#dc2626" : colors.border,
                      },
                    ]}
                  >
                    <ShieldAlert size={16} color={user.is_super_admin ? "#dc2626" : colors.textSecondary} />
                    <Text style={[styles.roleToggleText, { color: user.is_super_admin ? "#dc2626" : colors.textSecondary }]}>
                      {user.is_super_admin ? "Revoke Super Admin" : "Grant Super Admin"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── Subscription Change (Super Admin only) ── */}
            {isSuperAdmin && (
              <View style={[styles.healthSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Change Subscription</Text>
                <View style={styles.subPickerRow}>
                  {SUBSCRIPTION_TYPES.map((type) => {
                    const tc = SUBSCRIPTION_COLORS[type] ?? "#94a3b8";
                    const isSelected = selectedSub === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setSelectedSub(type)}
                        style={[
                          styles.subPickerChip,
                          {
                            backgroundColor: isSelected ? tc + "30" : colors.background,
                            borderColor: isSelected ? tc : colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.subPickerText, { color: isSelected ? tc : colors.textSecondary }]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {selectedSub !== user.subscription_type && (
                  <TouchableOpacity
                    onPress={handleSaveSubscription}
                    disabled={savingSubscription}
                    style={[styles.saveSubBtn, { backgroundColor: SUBSCRIPTION_COLORS[selectedSub] ?? "#6d28d9" }]}
                  >
                    {savingSubscription ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.saveSubBtnText}>
                        Save → {selectedSub}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Health & Profile */}
            {q && (
              <View style={[styles.healthSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Health & Profile</Text>
                {q.age && q.gender && (
                  <InfoRow label="Demographics" value={`${q.gender}, ${q.age} years old`} />
                )}
                {q.weight_kg && (
                  <InfoRow label="Weight / Target" value={`${q.weight_kg}kg → ${q.target_weight_kg ?? "?"}kg`} />
                )}
                {q.height_cm && <InfoRow label="Height" value={`${q.height_cm} cm`} />}
                <InfoRow label="Main Goal" value={q.main_goal?.replace(/_/g, " ")} />
                <InfoRow label="Activity Level" value={q.physical_activity_level?.replace(/_/g, " ")} />
                <InfoRow label="Dietary Style" value={q.dietary_style} />
                <InfoRow label="Kosher" value={q.kosher ? "Yes" : q.kosher === false ? "No" : null} />
                <TagList label="Allergies" items={q.allergies as string[]} tagColor="#ef4444" />
                <TagList
                  label="Medical Conditions"
                  items={[...((q.medical_conditions as string[]) ?? []), ...((q.medical_conditions_text as string[]) ?? [])]}
                  tagColor="#f59e0b"
                />
                <TagList label="Liked Foods" items={(q.liked_foods as string[])?.slice(0, 8)} tagColor="#22c55e" />
                <TagList label="Disliked Foods" items={(q.disliked_foods as string[])?.slice(0, 8)} tagColor="#94a3b8" />
              </View>
            )}

            {/* Activity stats */}
            <View style={[styles.healthSection, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Activity</Text>
              <InfoRow label="Menus Created" value={String(user._count.recommendedMenus)} />
              <InfoRow label="Best Streak" value={`${user.best_streak} days`} />
              <InfoRow label="Complete Days" value={String(user.total_complete_days)} />
              <InfoRow label="Member Since" value={new Date(user.created_at).toLocaleDateString()} />
              <InfoRow label="Email Verified" value={user.email_verified ? "Yes" : "No"} />
              <InfoRow label="Questionnaire" value={user.is_questionnaire_completed ? "Completed" : "Incomplete"} />
            </View>

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── UserRow ──────────────────────────────────────────────────────────────────
const UserRow = ({
  user,
  onPress,
  colors,
}: {
  user: AdminUser;
  onPress: () => void;
  colors: any;
}) => {
  const q = user.questionnaires?.[0];
  const subColor = SUBSCRIPTION_COLORS[user.subscription_type] ?? "#94a3b8";
  const allergies = (q?.allergies as string[]) ?? [];
  const medicalConditions = [
    ...((q?.medical_conditions as string[]) ?? []),
    ...((q?.medical_conditions_text as string[]) ?? []),
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.userRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
      activeOpacity={0.7}
    >
      <View style={styles.userRowTop}>
        <View style={[styles.userAvatar, { backgroundColor: subColor + "20" }]}>
          <Text style={[styles.userAvatarText, { color: subColor }]}>
            {(user.name ?? user.email)[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.userRowMain}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
              {user.name ?? user.email}
            </Text>
            {user.is_super_admin && <ShieldAlert size={12} color="#dc2626" />}
            {user.is_admin && !user.is_super_admin && <Shield size={12} color="#f59e0b" />}
          </View>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>
            {user.email}
          </Text>
        </View>
        <View style={[styles.subBadge, { backgroundColor: subColor + "20" }]}>
          <Text style={[styles.subBadgeText, { color: subColor }]}>{user.subscription_type}</Text>
        </View>
      </View>

      <View style={styles.userRowMeta}>
        <View style={styles.metaChip}>
          <Text style={styles.metaEmoji}>🔥</Text>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>{user.current_streak}d</Text>
        </View>
        <View style={styles.metaChip}>
          <Text style={styles.metaEmoji}>🍽️</Text>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>{user._count.meals}</Text>
        </View>
        <View style={styles.metaChip}>
          <Text style={styles.metaEmoji}>⭐</Text>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>Lv {user.level}</Text>
        </View>
        {q?.dietary_style && (
          <View style={styles.metaChip}>
            <Text style={styles.metaEmoji}>🥗</Text>
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{q.dietary_style}</Text>
          </View>
        )}
      </View>

      {allergies.length > 0 && (
        <View style={styles.inlineTagRow}>
          <AlertCircle size={12} color="#ef4444" />
          <Text style={styles.inlineTagLabel}>Allergies: </Text>
          <Text style={styles.inlineTagValue} numberOfLines={1}>{allergies.join(", ")}</Text>
        </View>
      )}
      {medicalConditions.length > 0 && (
        <View style={styles.inlineTagRow}>
          <Heart size={12} color="#f59e0b" />
          <Text style={styles.inlineTagLabel}>Medical: </Text>
          <Text style={styles.inlineTagValue} numberOfLines={1}>{medicalConditions.join(", ")}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── ActivityFeed ─────────────────────────────────────────────────────────────
const ActivityFeed = ({
  activity,
  loading,
  colors,
  onRefresh,
}: {
  activity: ActivityData | null;
  loading: boolean;
  colors: any;
  onRefresh: () => void;
}) => {
  const [activeSection, setActiveSection] = useState<"signups" | "meals" | "payments">("signups");

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const sections = [
    { key: "signups", label: "Signups", icon: <UserCheck size={14} color={activeSection === "signups" ? colors.primary : colors.textSecondary} /> },
    { key: "meals", label: "Meals", icon: <Utensils size={14} color={activeSection === "meals" ? colors.primary : colors.textSecondary} /> },
    { key: "payments", label: "Payments", icon: <CreditCard size={14} color={activeSection === "payments" ? colors.primary : colors.textSecondary} /> },
  ] as const;

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Sub-tabs */}
      <View style={[styles.activityTabs, { borderColor: colors.border }]}>
        {sections.map((s) => (
          <TouchableOpacity
            key={s.key}
            onPress={() => setActiveSection(s.key)}
            style={[styles.activityTab, activeSection === s.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            {s.icon}
            <Text style={[styles.activityTabLabel, { color: activeSection === s.key ? colors.primary : colors.textSecondary }]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={onRefresh} style={[styles.activityTab, { flex: 0, paddingHorizontal: 12 }]}>
          <RefreshCw size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
        {activeSection === "signups" &&
          (activity?.recentSignups ?? []).map((u) => (
            <View key={u.user_id} style={[styles.activityItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.activityDot, { backgroundColor: "#22c55e" }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.activityTitle, { color: colors.text }]} numberOfLines={1}>
                  {u.name ?? u.email}
                </Text>
                <Text style={[styles.activitySub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {u.email} · {u.subscription_type}
                </Text>
              </View>
              <View style={styles.activityTime}>
                <Clock size={11} color={colors.textSecondary} />
                <Text style={[styles.activityTimeText, { color: colors.textSecondary }]}>{formatTime(u.created_at)}</Text>
              </View>
            </View>
          ))}

        {activeSection === "meals" &&
          (activity?.recentMeals ?? []).map((m) => (
            <View key={m.meal_id} style={[styles.activityItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.activityDot, { backgroundColor: "#f59e0b" }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.activityTitle, { color: colors.text }]} numberOfLines={1}>
                  {m.meal_name}
                </Text>
                <Text style={[styles.activitySub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {m.user.name ?? m.user.email} · {m.calories} kcal
                </Text>
              </View>
              <View style={styles.activityTime}>
                <Clock size={11} color={colors.textSecondary} />
                <Text style={[styles.activityTimeText, { color: colors.textSecondary }]}>{formatTime(m.created_at)}</Text>
              </View>
            </View>
          ))}

        {activeSection === "payments" &&
          (activity?.recentPayments ?? []).map((p) => (
            <View key={p.payment_id} style={[styles.activityItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.activityDot, { backgroundColor: "#6d28d9" }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.activityTitle, { color: colors.text }]} numberOfLines={1}>
                  {p.user.name ?? p.user.email}
                </Text>
                <Text style={[styles.activitySub, { color: colors.textSecondary }]}>
                  {p.plan_type} · ₪{p.amount.toFixed(2)}
                </Text>
              </View>
              <View style={styles.activityTime}>
                <Clock size={11} color={colors.textSecondary} />
                <Text style={[styles.activityTimeText, { color: colors.textSecondary }]}>{formatTime(p.payment_date)}</Text>
              </View>
            </View>
          ))}

        {!activity && (
          <View style={styles.emptyState}>
            <Activity size={40} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No recent activity</Text>
          </View>
        )}
      </View>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const isSuperAdmin = !!(user?.is_super_admin);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "activity">("overview");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userPage, setUserPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);

  useEffect(() => {
    if (!user || (!user.is_admin && !user.is_super_admin)) {
      Alert.alert("Access Denied", "You don't have permission to view this page.", [
        { text: "OK", onPress: () => router.replace("/(tabs)") },
      ]);
      return;
    }
    fetchAdminData();
    fetchUsers(1, "");
  }, [user]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const response = await api.get("/admin/stats", { timeout: 30000 });
      if (response.data.success) {
        setStats(response.data.data);
      } else {
        setLoadError(response.data.error ?? "Failed to load stats");
      }
    } catch (error: any) {
      const msg =
        error?.response?.data?.error ??
        error?.message ??
        "Failed to connect to server. Check your network.";
      setLoadError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUsers = async (page: number, search: string) => {
    try {
      setUsersLoading(true);
      const response = await api.get("/admin/users", {
        params: { page, limit: 20, search: search || undefined },
      });
      if (response.data.success) {
        const { users: newUsers, pagination } = response.data.data;
        if (page === 1) setUsers(newUsers);
        else setUsers((prev) => [...prev, ...newUsers]);
        setTotalUsers(pagination.total);
        setHasMoreUsers(page < pagination.totalPages);
        setUserPage(page);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchActivity = async () => {
    try {
      setActivityLoading(true);
      const response = await api.get("/admin/activity");
      if (response.data.success) setActivity(response.data.data);
    } catch (error) {
      console.error("Failed to fetch activity:", error);
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "activity" && !activity && !activityLoading) {
      fetchActivity();
    }
  }, [activeTab]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAdminData();
    fetchUsers(1, searchQuery);
    if (activeTab === "activity") fetchActivity();
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    fetchUsers(1, query);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!usersLoading && hasMoreUsers) {
      fetchUsers(userPage + 1, searchQuery);
    }
  }, [usersLoading, hasMoreUsers, userPage, searchQuery]);

  const handleSubscriptionChange = async (userId: string, newType: string) => {
    await api.patch(`/admin/users/${userId}/subscription`, { subscription_type: newType });
    // Refresh user in list
    setUsers((prev) =>
      prev.map((u) =>
        u.user_id === userId ? { ...u, subscription_type: newType } : u
      )
    );
    if (selectedUser?.user_id === userId) {
      setSelectedUser((prev) => prev ? { ...prev, subscription_type: newType } : prev);
    }
  };

  const handleRoleChange = async (userId: string, changes: { is_admin?: boolean; is_super_admin?: boolean }) => {
    await api.patch(`/admin/users/${userId}/role`, { ...changes, reason: "Admin dashboard action" });
    // Refresh user in list
    setUsers((prev) =>
      prev.map((u) => (u.user_id === userId ? { ...u, ...changes } : u))
    );
    if (selectedUser?.user_id === userId) {
      setSelectedUser((prev) => prev ? { ...prev, ...changes } : prev);
    }
  };

  const overviewCards = useMemo(() => {
    if (!stats) return [];
    return [
      { icon: <Ionicons name="people" size={22} color="#1976D2" />, value: stats.overview.totalUsers, label: "Total Users", color: "#1976D2", bgColor: "#E3F2FD" },
      { icon: <Ionicons name="person-add" size={22} color="#388E3C" />, value: stats.overview.todaySignups, label: "Today Signups", color: "#388E3C", bgColor: "#E8F5E9" },
      { icon: <Ionicons name="log-in" size={22} color="#F57C00" />, value: stats.overview.todayLogins, label: "Today Logins", color: "#F57C00", bgColor: "#FFF3E0" },
      { icon: <Ionicons name="restaurant" size={22} color="#C2185B" />, value: stats.overview.totalMeals, label: "Total Meals", color: "#C2185B", bgColor: "#FCE4EC" },
      { icon: <Ionicons name="calendar" size={22} color="#7B1FA2" />, value: stats.overview.totalMenus, label: "Total Menus", color: "#7B1FA2", bgColor: "#F3E5F5" },
      { icon: <TrendingUp size={22} color="#00796B" />, value: stats.overview.weeklySignups, label: "Weekly Signups", color: "#00796B", bgColor: "#E0F2F1" },
      { icon: <Utensils size={22} color="#E64A19" />, value: stats.overview.weeklyMeals, label: "Weekly Meals", color: "#E64A19", bgColor: "#FBE9E7" },
      { icon: <Activity size={22} color="#1565C0" />, value: stats.overview.avgMealsPerUser, label: "Avg Meals/User", color: "#1565C0", bgColor: "#E3F2FD" },
    ];
  }, [stats]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading dashboard…</Text>
      </View>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (loadError && !stats) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background, padding: 32 }]}>
        <AlertCircle size={52} color="#ef4444" />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Dashboard unavailable</Text>
        <Text style={[styles.errorMsg, { color: colors.textSecondary }]}>{loadError}</Text>
        <TouchableOpacity
          onPress={() => { setLoadError(null); fetchAdminData(); fetchUsers(1, ""); }}
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tabs = [
    { key: "overview", label: "Overview", icon: <BarChart2 size={15} color={activeTab === "overview" ? colors.primary : colors.textSecondary} /> },
    { key: "users", label: `Users (${totalUsers})`, icon: <Users size={15} color={activeTab === "users" ? colors.primary : colors.textSecondary} /> },
    { key: "activity", label: "Activity", icon: <Activity size={15} color={activeTab === "activity" ? colors.primary : colors.textSecondary} /> },
  ] as const;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? ["#1a1a2e", "#16213e"] : ["#ff6b35", "#f7931e"]}
        style={styles.header}
      >
        <View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            {stats
              ? `${stats.overview.totalUsers} users · ₪${(stats.revenue.total ?? 0).toFixed(0)} revenue`
              : "Loading…"}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {isSuperAdmin && (
            <TouchableOpacity onPress={() => router.push("/admin/settings")} style={styles.headerBtn}>
              <Ionicons name="settings-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleRefresh} style={styles.headerBtn}>
            <Ionicons name="refresh" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            <Text style={[styles.tabLabel, { color: activeTab === tab.key ? colors.primary : colors.textSecondary }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Overview ── */}
      {activeTab === "overview" && (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Platform Overview</Text>
          <View style={styles.cardsGrid}>
            {overviewCards.map((c, i) => <StatCard key={i} {...c} />)}
          </View>

          {stats && (
            <View style={[styles.revenueCard, { backgroundColor: "#6d28d9" }]}>
              <Ionicons name="cash" size={28} color="#fff" />
              <Text style={styles.revenueValue}>₪{(stats.revenue.total ?? 0).toFixed(2)}</Text>
              <Text style={styles.revenueLabel}>Total Revenue · {stats.revenue.transactions} transactions</Text>
            </View>
          )}

          {stats && (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Subscriptions</Text>
              {Object.entries(stats.subscriptions).map(([type, count]) => {
                const sc = SUBSCRIPTION_COLORS[type] ?? colors.primary;
                const pct = stats.overview.totalUsers > 0
                  ? Math.round((count / stats.overview.totalUsers) * 100)
                  : 0;
                return (
                  <View key={type} style={styles.subRow}>
                    <View style={styles.subRowLeft}>
                      <View style={[styles.subDot, { backgroundColor: sc }]} />
                      <Text style={[styles.subType, { color: colors.text }]}>{type}</Text>
                    </View>
                    <View style={styles.subRowRight}>
                      <View style={[styles.subBar, { backgroundColor: colors.border }]}>
                        <View style={[styles.subBarFill, { width: `${pct}%`, backgroundColor: sc }]} />
                      </View>
                      <Text style={[styles.subCount, { color: sc }]}>{count} ({pct}%)</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {stats && (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Engagement</Text>
              <View style={styles.engagementRow}>
                {[
                  { icon: <Flame size={24} color="#ef4444" />, value: stats.engagement.avgStreak, label: "Avg Streak" },
                  { icon: <Target size={24} color="#f59e0b" />, value: stats.engagement.avgCompleteDays, label: "Avg Complete Days" },
                  { icon: <Award size={24} color="#6d28d9" />, value: stats.engagement.bestStreak, label: "Best Streak Ever" },
                  { icon: <Activity size={24} color="#0ea5e9" />, value: stats.engagement.maxStreak, label: "Max Active Streak" },
                ].map((e) => (
                  <View key={e.label} style={[styles.engagementItem, { backgroundColor: colors.background }]}>
                    {e.icon}
                    <Text style={[styles.engagementValue, { color: colors.text }]}>{e.value}</Text>
                    <Text style={[styles.engagementLabel, { color: colors.textSecondary }]}>{e.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {stats && stats.topUsers.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Top Users by Points</Text>
              {stats.topUsers.map((u, i) => {
                const sc = SUBSCRIPTION_COLORS[u.subscription_type] ?? "#94a3b8";
                return (
                  <View key={u.user_id} style={[styles.topUserRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.rankNum, { color: i < 3 ? "#f59e0b" : colors.textSecondary }]}>#{i + 1}</Text>
                    <View style={[styles.topUserAvatar, { backgroundColor: sc + "20" }]}>
                      <Text style={[styles.topUserAvatarText, { color: sc }]}>
                        {(u.name ?? u.email)[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.topUserInfo}>
                      <Text style={[styles.topUserName, { color: colors.text }]} numberOfLines={1}>
                        {u.name ?? u.email}
                      </Text>
                      <Text style={[styles.topUserMeta, { color: colors.textSecondary }]}>
                        Lv {u.level} · {u.total_points} pts · 🔥{u.current_streak}
                      </Text>
                    </View>
                    <View style={[styles.subBadge, { backgroundColor: sc + "20" }]}>
                      <Text style={[styles.subBadgeText, { color: sc }]}>{u.subscription_type}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* ── Users ── */}
      {activeTab === "users" && (
        <View style={styles.usersContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Search size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search by name or email…"
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={handleSearch}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={users}
            keyExtractor={(item) => item.user_id}
            renderItem={({ item }) => (
              <UserRow user={item} onPress={() => setSelectedUser(item)} colors={colors} />
            )}
            contentContainerStyle={styles.usersList}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              usersLoading ? <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} /> : null
            }
            ListEmptyComponent={
              !usersLoading ? (
                <View style={styles.emptyState}>
                  <Users size={48} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {searchQuery ? "No users found" : "No users yet"}
                  </Text>
                </View>
              ) : null
            }
          />
        </View>
      )}

      {/* ── Activity ── */}
      {activeTab === "activity" && (
        <ActivityFeed
          activity={activity}
          loading={activityLoading}
          colors={colors}
          onRefresh={fetchActivity}
        />
      )}

      {/* User Detail Modal */}
      <UserDetailModal
        user={selectedUser}
        visible={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        colors={colors}
        isSuperAdmin={isSuperAdmin}
        onSubscriptionChange={handleSubscriptionChange}
        onRoleChange={handleRoleChange}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 16 },
  errorTitle: { fontSize: 20, fontWeight: "800", marginTop: 16 },
  errorMsg: { fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20 },
  retryBtn: { paddingHorizontal: 32, paddingVertical: 13, borderRadius: 14, marginTop: 24 },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFF", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 3 },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },

  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 13, gap: 5,
    borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabLabel: { fontSize: 13, fontWeight: "600" },

  sectionTitle: {
    fontSize: 18, fontWeight: "700",
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12,
  },

  cardsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 10 },
  statCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    padding: 16, borderRadius: 16, alignItems: "center", gap: 6,
  },
  statIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 12, color: "#666", textAlign: "center" },

  revenueCard: { margin: 16, borderRadius: 20, padding: 24, alignItems: "center", gap: 8 },
  revenueValue: { fontSize: 36, fontWeight: "900", color: "#FFF" },
  revenueLabel: { fontSize: 14, color: "rgba(255,255,255,0.8)" },

  card: { marginHorizontal: 16, marginBottom: 16, borderRadius: 20, padding: 20 },
  cardTitle: { fontSize: 17, fontWeight: "700", marginBottom: 16 },

  subRow: { marginBottom: 12 },
  subRowLeft: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  subRowRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  subDot: { width: 10, height: 10, borderRadius: 5 },
  subType: { fontSize: 15, fontWeight: "600" },
  subBar: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  subBarFill: { height: "100%", borderRadius: 3 },
  subCount: { fontSize: 13, fontWeight: "700", minWidth: 70 },

  engagementRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  engagementItem: { flex: 1, minWidth: "45%", padding: 16, borderRadius: 16, alignItems: "center", gap: 6 },
  engagementValue: { fontSize: 24, fontWeight: "800" },
  engagementLabel: { fontSize: 12, textAlign: "center" },

  topUserRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  rankNum: { fontSize: 16, fontWeight: "800", width: 32 },
  topUserAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  topUserAvatarText: { fontSize: 16, fontWeight: "700" },
  topUserInfo: { flex: 1 },
  topUserName: { fontSize: 15, fontWeight: "600" },
  topUserMeta: { fontSize: 12, marginTop: 2 },

  subBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  subBadgeText: { fontSize: 10, fontWeight: "700" },

  usersContainer: { flex: 1 },
  searchBar: {
    flexDirection: "row", alignItems: "center",
    margin: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15 },
  usersList: { paddingHorizontal: 12, paddingBottom: 32 },

  userRow: { borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, gap: 8 },
  userRowTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  userAvatarText: { fontSize: 16, fontWeight: "700" },
  userRowMain: { flex: 1 },
  userName: { fontSize: 15, fontWeight: "600" },
  userEmail: { fontSize: 12, marginTop: 1 },
  userRowMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaEmoji: { fontSize: 12 },
  metaText: { fontSize: 12 },
  inlineTagRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  inlineTagLabel: { fontSize: 12, fontWeight: "600", color: "#888" },
  inlineTagValue: { fontSize: 12, color: "#666", flex: 1 },

  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: "600" },

  // Activity feed
  activityTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginHorizontal: 0,
  },
  activityTab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 12, gap: 5,
    borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  activityTabLabel: { fontSize: 12, fontWeight: "600" },
  activityItem: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, gap: 10,
  },
  activityDot: { width: 8, height: 8, borderRadius: 4 },
  activityTitle: { fontSize: 14, fontWeight: "600" },
  activitySub: { fontSize: 12, marginTop: 2 },
  activityTime: { flexDirection: "row", alignItems: "center", gap: 3 },
  activityTimeText: { fontSize: 11 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "94%" },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 20, borderBottomWidth: 1,
  },
  modalHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatarCircle: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontSize: 22, fontWeight: "800" },
  modalName: { fontSize: 18, fontWeight: "700" },
  modalEmail: { fontSize: 13, marginTop: 2 },
  closeBtn: { padding: 8 },
  modalBody: { paddingHorizontal: 20 },

  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16, marginBottom: 4 },
  subBadgeLarge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  subBadgeLargeText: { fontSize: 13, fontWeight: "700" },
  roleBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  roleBadgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },

  modalStatsRow: { flexDirection: "row", gap: 10, marginTop: 14, marginBottom: 16 },
  modalStatItem: { flex: 1, padding: 12, borderRadius: 16, alignItems: "center", gap: 4 },
  modalStatEmoji: { fontSize: 20 },
  modalStatValue: { fontSize: 18, fontWeight: "800" },
  modalStatLabel: { fontSize: 11 },

  // Role section
  roleSection: {
    borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1.5,
  },
  roleSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  roleSectionTitle: { fontSize: 16, fontWeight: "700" },
  roleWarning: { fontSize: 12, marginBottom: 14, lineHeight: 16 },
  roleToggles: { flexDirection: "row", gap: 10 },
  roleToggleBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  roleToggleText: { fontSize: 13, fontWeight: "600" },

  // Subscription picker
  subPickerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  subPickerChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
  },
  subPickerText: { fontSize: 13, fontWeight: "700" },
  saveSubBtn: {
    paddingVertical: 12, borderRadius: 14, alignItems: "center", marginTop: 4,
  },
  saveSubBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  healthSection: { borderRadius: 20, padding: 16, marginBottom: 12, gap: 4 },
  modalSectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  infoRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)",
  },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: "600", textAlign: "right", maxWidth: "60%" },

  tagSection: { marginTop: 10 },
  tagSectionLabel: { fontSize: 13, marginBottom: 6 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  tagText: { fontSize: 12, fontWeight: "600" },
});
