import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { api } from "@/src/services/api";
import {
  Shield,
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  UserPlus,
  LogIn,
  Award,
  Search,
  X,
  Trash2,
  BarChart3,
  PieChart,
  Flame,
  Trophy,
  Star,
  CheckCircle,
  XCircle,
  Crown,
  Zap,
  Clock,
  ChevronRight,
  ChevronLeft,
  Database,
  Utensils,
  RefreshCw,
  Calendar,
} from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";

const { width } = Dimensions.get("window");
const ADMIN_PLAN = "ADMIN";

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
    maxStreak: number;
    bestStreak: number;
  };
  topUsers: {
    user_id: string;
    name: string;
    email: string;
    level: number;
    total_points: number;
    current_streak: number;
    subscription_type: string;
  }[];
}

interface AdminUser {
  user_id: string;
  email: string;
  name: string;
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
  questionnaires: any[];
}

interface ActivityData {
  recentMeals: any[];
  recentSignups: any[];
  recentPayments: any[];
}

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user } = useSelector((state: RootState) => state.auth);
  const isSuperAdmin = user?.is_super_admin;

  // ── Core ─────────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "analytics">("overview");

  // ── Users tab ─────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [changingSubUserId, setChangingSubUserId] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Analytics tab ──────────────────────────────────────────────────────────────
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityLoaded, setActivityLoaded] = useState(false);
  const [activitySubTab, setActivitySubTab] = useState<"signups" | "meals" | "payments">("signups");
  const [systemHealth, setSystemHealth] = useState<{ status: string; database: string; timestamp: string } | null>(null);

  // ── Load functions ────────────────────────────────────────────────────────────
  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/stats");
      if (response.data.success) setStats(response.data.data);
    } catch {
      Alert.alert(t("admin.error"), t("admin.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async (page = 1, search = "") => {
    try {
      setUsersLoading(true);
      const response = await api.get("/admin/users", {
        params: { page, limit: 20, search: search || undefined },
      });
      if (response.data.success) {
        setUsers(response.data.data.users);
        setUsersTotalPages(response.data.data.pagination.totalPages);
        setUsersTotal(response.data.data.pagination.total);
        setUsersLoaded(true);
      }
    } catch {
      // silent
    } finally {
      setUsersLoading(false);
    }
  };

  const loadActivity = async () => {
    try {
      setActivityLoading(true);
      const [actRes, healthRes] = await Promise.allSettled([
        api.get("/admin/activity"),
        api.get("/admin/system/health"),
      ]);
      if (actRes.status === "fulfilled" && actRes.value.data.success) {
        setActivity(actRes.value.data.data);
        setActivityLoaded(true);
      }
      if (healthRes.status === "fulfilled" && healthRes.value.data.success) {
        setSystemHealth(healthRes.value.data.data);
      }
    } catch {
      // silent
    } finally {
      setActivityLoading(false);
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    Alert.alert(
      "Delete User",
      `Permanently delete "${userName}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/admin/users/${userId}`);
              setShowUserModal(false);
              setSelectedUser(null);
              loadUsers(usersPage, searchQuery);
              loadStats();
            } catch (error: any) {
              Alert.alert("Error", error?.response?.data?.error || "Failed to delete user");
            }
          },
        },
      ]
    );
  };

  const handleChangeSubscription = async (userId: string, newType: string) => {
    try {
      setChangingSubUserId(userId);
      await api.patch(`/admin/users/${userId}/subscription`, { subscription_type: newType });
      setShowSubModal(false);
      setShowUserModal(false);
      setSelectedUser(null);
      loadUsers(usersPage, searchQuery);
      loadStats();
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.error || "Failed to update subscription");
    } finally {
      setChangingSubUserId(null);
    }
  };

  // ── Effects ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const hasAdminAccess =
      user?.is_admin || user?.is_super_admin || user?.subscription_type === ADMIN_PLAN;
    if (!hasAdminAccess) {
      Alert.alert(t("admin.accessDenied"), t("admin.adminRequired"));
      router.replace("/(tabs)");
      return;
    }
    loadStats();
  }, [user]);

  useEffect(() => {
    if (activeTab === "users" && !usersLoaded) loadUsers(1, "");
    if (activeTab === "analytics" && !activityLoaded) loadActivity();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    if (activeTab === "users") await loadUsers(usersPage, searchQuery);
    if (activeTab === "analytics") await loadActivity();
    setRefreshing(false);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const getPlanColor = (plan: string) => {
    switch ((plan || "").toUpperCase()) {
      case "PLATINUM": return "#8B5CF6";
      case "GOLD":     return "#F59E0B";
      case "FREE":     return "#6B7280";
      case "ADMIN":    return "#EF4444";
      case "PREMIUM":  return "#10B981";
      default:         return "#10B981";
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d ago`;
    if (hrs > 0) return `${hrs}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return "Just now";
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const getInitials = (name: string) =>
    (name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  // ── Render helpers ────────────────────────────────────────────────────────────
  const renderStatCard = (title: string, value: string | number, icon: React.ReactNode, color: string) => (
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + "22" }]}>{icon}</View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
    </View>
  );

  const renderMiniStat = (label: string, value: string | number, color: string) => (
    <View style={[styles.miniStatCard, { backgroundColor: colors.card }]}>
      <View style={[styles.miniStatDot, { backgroundColor: color }]} />
      <Text style={[styles.miniStatValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.miniStatLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );

  // ── Overview tab ──────────────────────────────────────────────────────────────
  const renderOverview = () => {
    const totalSubUsers = Object.values(stats?.subscriptions || {}).reduce((a, b) => a + b, 0);
    const avgRev =
      stats && stats.revenue.transactions > 0
        ? (stats.revenue.total / stats.revenue.transactions).toFixed(2)
        : "0.00";

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Platform Overview</Text>

        {/* Primary 4 stat cards */}
        <View style={styles.statsGrid}>
          {renderStatCard("Total Users", stats?.overview.totalUsers.toLocaleString() || "0", <Users size={24} color="#10B981" />, "#10B981")}
          {renderStatCard("Today Signups", stats?.overview.todaySignups || 0, <UserPlus size={24} color="#3B82F6" />, "#3B82F6")}
          {renderStatCard("Today Logins", stats?.overview.todayLogins || 0, <LogIn size={24} color="#8B5CF6" />, "#8B5CF6")}
          {renderStatCard("Total Meals", stats?.overview.totalMeals.toLocaleString() || "0", <Utensils size={24} color="#F59E0B" />, "#F59E0B")}
        </View>

        {/* Secondary mini stats row 1 */}
        <View style={styles.miniStatsRow}>
          {renderMiniStat("Weekly Signups", stats?.overview.weeklySignups || 0, "#06B6D4")}
          {renderMiniStat("Monthly Signups", stats?.overview.monthlySignups || 0, "#6366F1")}
          {renderMiniStat("Weekly Meals", stats?.overview.weeklyMeals || 0, "#EC4899")}
          {renderMiniStat("Monthly Meals", stats?.overview.monthlyMeals || 0, "#F97316")}
        </View>

        {/* Secondary mini stats row 2 */}
        <View style={[styles.miniStatsRow, { marginBottom: 16 }]}>
          {renderMiniStat("Avg Meals/User", stats?.overview.avgMealsPerUser || 0, "#10B981")}
          {renderMiniStat("Total Menus", stats?.overview.totalMenus || 0, "#8B5CF6")}
        </View>

        {/* Subscription breakdown with progress bars */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Subscription Breakdown</Text>
          {stats?.subscriptions &&
            Object.entries(stats.subscriptions)
              .sort(([, a], [, b]) => b - a)
              .map(([plan, count]) => {
                const pct = totalSubUsers > 0 ? Math.round((count / totalSubUsers) * 100) : 0;
                const color = getPlanColor(plan);
                return (
                  <View key={plan} style={styles.subscriptionRow}>
                    <View style={styles.subRowLeft}>
                      <View style={[styles.planDot, { backgroundColor: color }]} />
                      <Text style={[styles.planLabel, { color: colors.text }]}>{plan}</Text>
                    </View>
                    <View style={styles.subBarWrap}>
                      <View style={[styles.subBarBg, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}>
                        <View style={[styles.subBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
                      </View>
                    </View>
                    <View style={styles.subRowRight}>
                      <Text style={[styles.subCount, { color: colors.text }]}>{count}</Text>
                      <Text style={[styles.subPct, { color: colors.textSecondary }]}>{pct}%</Text>
                    </View>
                  </View>
                );
              })}
        </View>

        {/* Revenue card – 3 metrics */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Revenue</Text>
          <View style={styles.revenueGrid}>
            {[
              { icon: <DollarSign size={22} color="#10B981" />, color: "#10B981", value: `$${stats?.revenue.total.toLocaleString() || 0}`, label: "Total Revenue" },
              { icon: <Activity size={22} color="#3B82F6" />, color: "#3B82F6", value: stats?.revenue.transactions || 0, label: "Transactions" },
              { icon: <TrendingUp size={22} color="#F59E0B" />, color: "#F59E0B", value: `$${avgRev}`, label: "Avg per Sale" },
            ].map((item, i) => (
              <View key={i} style={[styles.revItem, { backgroundColor: item.color + (isDark ? "14" : "0D") }]}>
                <View style={[styles.revIconBg, { backgroundColor: item.color + "25" }]}>{item.icon}</View>
                <Text style={[styles.revValue, { color: colors.text }]}>{item.value}</Text>
                <Text style={[styles.revLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Engagement card – 4 metrics */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>User Engagement</Text>
          <View style={styles.engagementGrid}>
            {[
              { icon: <Flame size={22} color="#FF6B6B" />, bg: "rgba(255,107,107,0.15)", value: stats?.engagement.avgStreak ?? 0, label: "Avg Streak" },
              { icon: <Flame size={22} color="#FF9F0A" />, bg: "rgba(255,159,10,0.15)", value: stats?.engagement.maxStreak ?? 0, label: "Max Streak" },
              { icon: <Award size={22} color="#10B981" />, bg: "rgba(16,185,129,0.15)", value: stats?.engagement.bestStreak ?? 0, label: "Best Streak" },
              { icon: <Calendar size={22} color="#3B82F6" />, bg: "rgba(59,130,246,0.15)", value: stats?.engagement.avgCompleteDays ?? 0, label: "Avg Complete Days" },
            ].map((item, i) => (
              <View key={i} style={styles.engagementItem}>
                <View style={[styles.engagementIconBg, { backgroundColor: item.bg }]}>{item.icon}</View>
                <Text style={[styles.engagementValue, { color: colors.text }]}>{item.value}</Text>
                <Text style={[styles.engagementLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  // ── Users tab ─────────────────────────────────────────────────────────────────
  const renderUsers = () => (
    <View style={styles.section}>
      <View style={styles.usersHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Users</Text>
        <View style={[styles.totalBadge, { backgroundColor: "#10B98120" }]}>
          <Text style={[styles.totalBadgeText, { color: "#10B981" }]}>{usersTotal.toLocaleString()} total</Text>
        </View>
      </View>

      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <Search size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by name or email..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = setTimeout(() => {
              setUsersPage(1);
              loadUsers(1, text);
            }, 500);
          }}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(""); loadUsers(1, ""); }}>
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {usersLoading ? (
        <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} />
      ) : (
        <>
          {users.map((u) => (
            <TouchableOpacity
              key={u.user_id}
              style={[styles.userRow, { backgroundColor: colors.card }]}
              onPress={() => { setSelectedUser(u); setShowUserModal(true); }}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[getPlanColor(u.subscription_type), getPlanColor(u.subscription_type) + "99"]}
                style={styles.userAvatar}
              >
                <Text style={styles.userAvatarText}>{getInitials(u.name)}</Text>
              </LinearGradient>

              <View style={styles.userInfo}>
                <View style={styles.userNameRow}>
                  <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{u.name}</Text>
                  {u.is_super_admin && <Crown size={12} color="#EF4444" style={{ marginLeft: 4 }} />}
                  {u.is_admin && !u.is_super_admin && <Shield size={12} color="#F59E0B" style={{ marginLeft: 4 }} />}
                </View>
                <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>{u.email}</Text>
                <View style={styles.userMetaRow}>
                  <View style={[styles.subBadgeSmall, { backgroundColor: getPlanColor(u.subscription_type) + "20" }]}>
                    <Text style={[styles.subBadgeText, { color: getPlanColor(u.subscription_type) }]}>{u.subscription_type}</Text>
                  </View>
                  <Text style={[styles.metaDot, { color: colors.textSecondary }]}>·</Text>
                  <Star size={10} color="#FFD700" fill="#FFD700" strokeWidth={0} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>Lv {u.level}</Text>
                  <Text style={[styles.metaDot, { color: colors.textSecondary }]}>·</Text>
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>{u._count?.meals || 0} meals</Text>
                </View>
              </View>

              <View style={styles.userRight}>
                {u.current_streak > 0 && (
                  <View style={styles.streakPill}>
                    <Flame size={10} color="#FF6B6B" />
                    <Text style={styles.streakPillText}>{u.current_streak}</Text>
                  </View>
                )}
                <ChevronRight size={16} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          ))}

          {/* Pagination */}
          {usersTotalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageBtn, { backgroundColor: colors.card, opacity: usersPage <= 1 ? 0.4 : 1 }]}
                onPress={() => { const p = Math.max(1, usersPage - 1); setUsersPage(p); loadUsers(p, searchQuery); }}
                disabled={usersPage <= 1}
              >
                <ChevronLeft size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.pageText, { color: colors.text }]}>{usersPage} / {usersTotalPages}</Text>
              <TouchableOpacity
                style={[styles.pageBtn, { backgroundColor: colors.card, opacity: usersPage >= usersTotalPages ? 0.4 : 1 }]}
                onPress={() => { const p = Math.min(usersTotalPages, usersPage + 1); setUsersPage(p); loadUsers(p, searchQuery); }}
                disabled={usersPage >= usersTotalPages}
              >
                <ChevronRight size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          )}

          {users.length === 0 && (
            <View style={styles.emptyState}>
              <Users size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No users found</Text>
            </View>
          )}
        </>
      )}
    </View>
  );

  // ── Analytics tab ──────────────────────────────────────────────────────────────
  const renderAnalytics = () => (
    <View style={styles.section}>
      {/* Top Users Leaderboard */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Users by XP</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {(stats?.topUsers || []).length > 0 ? (
          stats!.topUsers.map((u, i) => (
            <View
              key={u.user_id}
              style={[
                styles.leaderRow,
                i < stats!.topUsers.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" },
              ]}
            >
              <View style={styles.rankWrap}>
                {i === 0 ? <Trophy size={18} color="#FFD700" /> :
                 i === 1 ? <Trophy size={18} color="#C0C0C0" /> :
                 i === 2 ? <Trophy size={18} color="#CD7F32" /> :
                 <Text style={[styles.rankNum, { color: colors.textSecondary }]}>{i + 1}</Text>}
              </View>
              <LinearGradient
                colors={[getPlanColor(u.subscription_type), getPlanColor(u.subscription_type) + "88"]}
                style={styles.leaderAvatar}
              >
                <Text style={styles.leaderAvatarText}>{getInitials(u.name)}</Text>
              </LinearGradient>
              <View style={styles.leaderInfo}>
                <Text style={[styles.leaderName, { color: colors.text }]} numberOfLines={1}>{u.name}</Text>
                <Text style={[styles.leaderEmail, { color: colors.textSecondary }]} numberOfLines={1}>{u.email}</Text>
              </View>
              <View style={styles.leaderStats}>
                <Text style={[styles.leaderXP, { color: "#FFD700" }]}>{(u.total_points || 0).toLocaleString()} XP</Text>
                <View style={styles.leaderStreakRow}>
                  <Flame size={11} color="#FF6B6B" />
                  <Text style={[styles.leaderStreakText, { color: colors.textSecondary }]}>{u.current_streak}d</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: colors.textSecondary, textAlign: "center", paddingVertical: 16 }]}>No data</Text>
        )}
      </View>

      {/* Recent Activity */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
      <View style={[styles.activitySubTabs, { backgroundColor: colors.card }]}>
        {(["signups", "meals", "payments"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.actSubTab, activitySubTab === tab && { backgroundColor: "#10B98120" }]}
            onPress={() => setActivitySubTab(tab)}
          >
            {tab === "signups" && <UserPlus size={13} color={activitySubTab === tab ? "#10B981" : colors.textSecondary} />}
            {tab === "meals" && <Utensils size={13} color={activitySubTab === tab ? "#10B981" : colors.textSecondary} />}
            {tab === "payments" && <DollarSign size={13} color={activitySubTab === tab ? "#10B981" : colors.textSecondary} />}
            <Text style={[styles.actSubTabText, { color: activitySubTab === tab ? "#10B981" : colors.textSecondary }]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activityLoading ? (
        <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 24 }} />
      ) : (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {activitySubTab === "signups" &&
            (activity?.recentSignups || []).slice(0, 15).map((s: any, i: number, arr: any[]) => (
              <View key={s.user_id || i} style={[styles.actItem, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]}>
                <LinearGradient colors={[getPlanColor(s.subscription_type), getPlanColor(s.subscription_type) + "88"]} style={styles.actAvatar}>
                  <Text style={styles.actAvatarText}>{getInitials(s.name)}</Text>
                </LinearGradient>
                <View style={styles.actInfo}>
                  <Text style={[styles.actName, { color: colors.text }]} numberOfLines={1}>{s.name}</Text>
                  <Text style={[styles.actDetail, { color: colors.textSecondary }]} numberOfLines={1}>{s.email}</Text>
                </View>
                <View style={styles.actRight}>
                  <View style={[styles.subBadgeSmall, { backgroundColor: getPlanColor(s.subscription_type) + "20" }]}>
                    <Text style={[styles.subBadgeText, { color: getPlanColor(s.subscription_type) }]}>{s.subscription_type}</Text>
                  </View>
                  <Text style={[styles.actTime, { color: colors.textSecondary }]}>{formatTimeAgo(s.created_at)}</Text>
                </View>
              </View>
            ))}

          {activitySubTab === "meals" &&
            (activity?.recentMeals || []).slice(0, 15).map((m: any, i: number, arr: any[]) => (
              <View key={m.meal_id || i} style={[styles.actItem, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]}>
                <View style={[styles.actIconBg, { backgroundColor: "rgba(245,158,11,0.15)" }]}>
                  <Utensils size={18} color="#F59E0B" />
                </View>
                <View style={styles.actInfo}>
                  <Text style={[styles.actName, { color: colors.text }]} numberOfLines={1}>{m.meal_name || "Unknown Meal"}</Text>
                  <Text style={[styles.actDetail, { color: colors.textSecondary }]} numberOfLines={1}>{m.user?.name || m.user?.email || "—"}</Text>
                </View>
                <View style={styles.actRight}>
                  <Text style={[styles.actCal, { color: "#F59E0B" }]}>{m.calories || 0} kcal</Text>
                  <Text style={[styles.actTime, { color: colors.textSecondary }]}>{formatTimeAgo(m.created_at)}</Text>
                </View>
              </View>
            ))}

          {activitySubTab === "payments" &&
            (activity?.recentPayments || []).slice(0, 15).map((p: any, i: number, arr: any[]) => (
              <View key={p.payment_id || i} style={[styles.actItem, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]}>
                <View style={[styles.actIconBg, { backgroundColor: "rgba(16,185,129,0.15)" }]}>
                  <DollarSign size={18} color="#10B981" />
                </View>
                <View style={styles.actInfo}>
                  <Text style={[styles.actName, { color: colors.text }]} numberOfLines={1}>{p.user?.name || "Unknown"}</Text>
                  <Text style={[styles.actDetail, { color: colors.textSecondary }]} numberOfLines={1}>{p.plan_type}</Text>
                </View>
                <View style={styles.actRight}>
                  <Text style={[styles.actCal, { color: "#10B981" }]}>${p.amount || 0}</Text>
                  <Text style={[styles.actTime, { color: colors.textSecondary }]}>{formatTimeAgo(p.payment_date)}</Text>
                </View>
              </View>
            ))}

          {activitySubTab === "signups" && !(activity?.recentSignups?.length) && (
            <Text style={[styles.emptyText, { color: colors.textSecondary, textAlign: "center", paddingVertical: 20 }]}>No recent signups</Text>
          )}
          {activitySubTab === "meals" && !(activity?.recentMeals?.length) && (
            <Text style={[styles.emptyText, { color: colors.textSecondary, textAlign: "center", paddingVertical: 20 }]}>No recent meals</Text>
          )}
          {activitySubTab === "payments" && !(activity?.recentPayments?.length) && (
            <Text style={[styles.emptyText, { color: colors.textSecondary, textAlign: "center", paddingVertical: 20 }]}>No recent payments</Text>
          )}
        </View>
      )}

      {/* System Health */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>System Health</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {systemHealth ? (
          <View style={styles.healthContent}>
            <View style={[styles.healthIndicator, { backgroundColor: systemHealth.status === "healthy" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)" }]}>
              {systemHealth.status === "healthy"
                ? <CheckCircle size={28} color="#10B981" />
                : <XCircle size={28} color="#EF4444" />}
            </View>
            <View style={styles.healthInfo}>
              <Text style={[styles.healthStatus, { color: systemHealth.status === "healthy" ? "#10B981" : "#EF4444" }]}>
                {systemHealth.status === "healthy" ? "All Systems Operational" : "Issues Detected"}
              </Text>
              <View style={styles.healthRow}>
                <Database size={12} color={colors.textSecondary} />
                <Text style={[styles.healthDetail, { color: colors.textSecondary }]}>DB: {systemHealth.database}</Text>
              </View>
              {systemHealth.timestamp && (
                <View style={styles.healthRow}>
                  <Clock size={12} color={colors.textSecondary} />
                  <Text style={[styles.healthDetail, { color: colors.textSecondary }]}>
                    {new Date(systemHealth.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: "#10B98120" }]} onPress={loadActivity}>
              <RefreshCw size={16} color="#10B981" />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Health status unavailable</Text>
        )}
      </View>
    </View>
  );

  // ── Loading state ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient colors={["#10B981", "#059669", "#047857"]} style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerIconWrap}><Shield size={32} color="#FFFFFF" /></View>
            <Text style={styles.headerTitle}>{t("admin.dashboard")}</Text>
          </View>
        </LinearGradient>
        <ActivityIndicator size="large" color="#10B981" style={styles.loader} />
      </SafeAreaView>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient colors={["#10B981", "#059669", "#047857"]} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconWrap}><Shield size={30} color="#FFFFFF" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{t("admin.dashboard")}</Text>
            <Text style={styles.headerSubtitle}>{t("admin.subtitle")}</Text>
          </View>
          {isSuperAdmin && (
            <View style={styles.superBadge}>
              <Crown size={11} color="#FFD700" />
              <Text style={styles.superBadgeText}>Super Admin</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(["overview", "users", "analytics"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            {tab === "overview" && <BarChart3 size={18} color={activeTab === tab ? "#10B981" : colors.textSecondary} />}
            {tab === "users" && <Users size={18} color={activeTab === tab ? "#10B981" : colors.textSecondary} />}
            {tab === "analytics" && <PieChart size={18} color={activeTab === tab ? "#10B981" : colors.textSecondary} />}
            <Text style={[styles.tabText, { color: activeTab === tab ? "#10B981" : colors.textSecondary }]}>
              {tab === "overview" ? t("admin.overview") : tab === "users" ? t("admin.users") : t("admin.analytics")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#10B981"]} tintColor="#10B981" />}
      >
        {activeTab === "overview" && renderOverview()}
        {activeTab === "users" && renderUsers()}
        {activeTab === "analytics" && renderAnalytics()}
      </ScrollView>

      {/* ── User Detail Modal ──────────────────────────────────────────────────── */}
      <Modal visible={showUserModal} transparent animationType="slide" onRequestClose={() => setShowUserModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedUser && (() => {
                const q = selectedUser.questionnaires?.[0];
                return (
                  <>
                    {/* Gradient header */}
                    <LinearGradient
                      colors={[getPlanColor(selectedUser.subscription_type), getPlanColor(selectedUser.subscription_type) + "BB"]}
                      style={styles.modalGradHeader}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    >
                      <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowUserModal(false)}>
                        <X size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                      <View style={styles.modalAvatarLg}>
                        <Text style={styles.modalAvatarLgText}>{getInitials(selectedUser.name)}</Text>
                      </View>
                      <Text style={styles.modalName}>{selectedUser.name}</Text>
                      <Text style={styles.modalEmail}>{selectedUser.email}</Text>
                      <View style={styles.modalBadgeRow}>
                        <View style={styles.modalBadge}><Text style={styles.modalBadgeText}>{selectedUser.subscription_type}</Text></View>
                        {selectedUser.is_super_admin && (
                          <View style={[styles.modalBadge, { backgroundColor: "rgba(239,68,68,0.35)" }]}>
                            <Crown size={10} color="#FFFFFF" /><Text style={styles.modalBadgeText}>Super Admin</Text>
                          </View>
                        )}
                        {selectedUser.is_admin && !selectedUser.is_super_admin && (
                          <View style={[styles.modalBadge, { backgroundColor: "rgba(245,158,11,0.35)" }]}>
                            <Shield size={10} color="#FFFFFF" /><Text style={styles.modalBadgeText}>Admin</Text>
                          </View>
                        )}
                      </View>
                    </LinearGradient>

                    {/* Floating stats strip */}
                    <View style={[styles.modalStatsStrip, { backgroundColor: colors.card }]}>
                      {[
                        { icon: <Star size={14} color="#FFD700" fill="#FFD700" strokeWidth={0} />, value: selectedUser.level, label: "Level" },
                        { icon: <Trophy size={14} color="#10B981" />, value: (selectedUser.total_points || 0).toLocaleString(), label: "XP" },
                        { icon: <Flame size={14} color="#FF6B6B" />, value: selectedUser.current_streak, label: "Streak" },
                        { icon: <Utensils size={14} color="#F59E0B" />, value: selectedUser._count?.meals || 0, label: "Meals" },
                      ].map((s, i, arr) => (
                        <React.Fragment key={i}>
                          <View style={styles.modalStatItem}>
                            {s.icon}
                            <Text style={[styles.modalStatVal, { color: colors.text }]}>{s.value}</Text>
                            <Text style={[styles.modalStatLbl, { color: colors.textSecondary }]}>{s.label}</Text>
                          </View>
                          {i < arr.length - 1 && <View style={[styles.modalStatDiv, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }]} />}
                        </React.Fragment>
                      ))}
                    </View>

                    {/* Account info */}
                    <View style={[styles.modalSection, { backgroundColor: colors.card }]}>
                      <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Account Info</Text>
                      {[
                        { label: "Member Since", value: formatDate(selectedUser.created_at) },
                        { label: "Email Verified", value: selectedUser.email_verified ? "✓ Verified" : "✗ Unverified", color: selectedUser.email_verified ? "#10B981" : "#EF4444" },
                        { label: "Questionnaire", value: selectedUser.is_questionnaire_completed ? "✓ Completed" : "✗ Pending", color: selectedUser.is_questionnaire_completed ? "#10B981" : "#F59E0B" },
                        { label: "Best Streak", value: `${selectedUser.best_streak} days` },
                        { label: "Complete Days", value: `${selectedUser.total_complete_days} days` },
                        { label: "Menus Created", value: selectedUser._count?.recommendedMenus || 0 },
                      ].map((row, i) => (
                        <View key={i} style={[styles.infoRow, i > 0 && { borderTopWidth: 1, borderTopColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]}>
                          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                          <Text style={[styles.infoValue, { color: (row as any).color || colors.text }]}>{String(row.value)}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Health profile from questionnaire */}
                    {q && (
                      <View style={[styles.modalSection, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Health Profile</Text>
                        {[
                          { label: "Goal", value: q.main_goal },
                          { label: "Diet Style", value: q.dietary_style },
                          { label: "Activity Level", value: q.physical_activity_level },
                          { label: "Age", value: q.age ? `${q.age} yrs` : null },
                          { label: "Weight", value: q.weight_kg ? `${q.weight_kg} kg` : null },
                          { label: "Height", value: q.height_cm ? `${q.height_cm} cm` : null },
                          { label: "Target Weight", value: q.target_weight_kg ? `${q.target_weight_kg} kg` : null },
                          { label: "Gender", value: q.gender },
                          { label: "Kosher", value: q.kosher === true ? "Yes" : q.kosher === false ? "No" : null },
                          { label: "Allergies", value: Array.isArray(q.allergies) && q.allergies.length ? q.allergies.join(", ") : null },
                          { label: "Medical", value: q.medical_conditions_text || (Array.isArray(q.medical_conditions) && q.medical_conditions.length ? q.medical_conditions.join(", ") : null) },
                        ].filter((r) => r.value).map((row, i, arr) => (
                          <View key={i} style={[styles.infoRow, i > 0 && { borderTopWidth: 1, borderTopColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]}>
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                            <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={2}>{String(row.value)}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Super admin actions */}
                    {isSuperAdmin && !selectedUser.is_super_admin && (
                      <View style={styles.modalActions}>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: "#3B82F620" }]}
                          onPress={() => setShowSubModal(true)}
                        >
                          <Zap size={16} color="#3B82F6" />
                          <Text style={[styles.actionBtnText, { color: "#3B82F6" }]}>Change Subscription</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: "#EF444420" }]}
                          onPress={() => handleDeleteUser(selectedUser.user_id, selectedUser.name)}
                        >
                          <Trash2 size={16} color="#EF4444" />
                          <Text style={[styles.actionBtnText, { color: "#EF4444" }]}>Delete User</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <View style={{ height: 32 }} />
                  </>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Subscription Change Modal ──────────────────────────────────────────── */}
      <Modal visible={showSubModal} transparent animationType="fade" onRequestClose={() => setShowSubModal(false)}>
        <View style={styles.subModalOverlay}>
          <View style={[styles.subModalContent, { backgroundColor: colors.background }]}>
            <View style={styles.subModalHeader}>
              <Text style={[styles.subModalTitle, { color: colors.text }]}>Change Subscription</Text>
              <TouchableOpacity onPress={() => setShowSubModal(false)}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.subModalCurrent, { color: colors.textSecondary }]}>
              Current: {selectedUser?.subscription_type}
            </Text>
            {["FREE", "GOLD", "PLATINUM", "PREMIUM"].map((plan) => (
              <TouchableOpacity
                key={plan}
                style={[
                  styles.subOption,
                  { backgroundColor: colors.card },
                  selectedUser?.subscription_type === plan && { borderWidth: 1.5, borderColor: getPlanColor(plan) },
                ]}
                onPress={() => { if (selectedUser) handleChangeSubscription(selectedUser.user_id, plan); }}
                disabled={changingSubUserId !== null}
              >
                <View style={[styles.subOptionDot, { backgroundColor: getPlanColor(plan) }]} />
                <Text style={[styles.subOptionLabel, { color: colors.text }]}>{plan}</Text>
                {changingSubUserId ? (
                  <ActivityIndicator size="small" color={getPlanColor(plan)} />
                ) : (
                  selectedUser?.subscription_type === plan && <CheckCircle size={16} color={getPlanColor(plan)} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { paddingHorizontal: 20, paddingVertical: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIconWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#FFFFFF" },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 1 },
  superBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,215,0,0.2)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  superBadgeText: { fontSize: 10, fontWeight: "700", color: "#FFD700" },

  // Tab bar
  tabBar: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 14, gap: 8 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 11, borderRadius: 12 },
  activeTab: { backgroundColor: "#10B98115" },
  tabText: { fontSize: 13, fontWeight: "600" },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 48 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 19, fontWeight: "800", marginBottom: 14, letterSpacing: -0.3 },

  // Stat cards
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 12 },
  statCard: { width: (width - 52) / 2, padding: 16, borderRadius: 18, alignItems: "center" },
  statIconContainer: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  statValue: { fontSize: 26, fontWeight: "800", marginBottom: 3, letterSpacing: -0.5 },
  statTitle: { fontSize: 11, textAlign: "center", fontWeight: "600" },

  // Mini stats
  miniStatsRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  miniStatCard: { flex: 1, paddingVertical: 14, paddingHorizontal: 10, borderRadius: 14, alignItems: "center", gap: 5 },
  miniStatDot: { width: 8, height: 8, borderRadius: 4 },
  miniStatValue: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  miniStatLabel: { fontSize: 9, fontWeight: "600", textAlign: "center", textTransform: "uppercase", letterSpacing: 0.3 },

  // Cards
  card: { padding: 18, borderRadius: 20, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 14, letterSpacing: -0.2 },

  // Subscription bars
  subscriptionRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
  subRowLeft: { flexDirection: "row", alignItems: "center", gap: 7, width: 84 },
  planDot: { width: 10, height: 10, borderRadius: 5 },
  planLabel: { fontSize: 12, fontWeight: "700" },
  subBarWrap: { flex: 1 },
  subBarBg: { height: 8, borderRadius: 4, overflow: "hidden" },
  subBarFill: { height: "100%", borderRadius: 4 },
  subRowRight: { flexDirection: "row", alignItems: "center", gap: 5, width: 56, justifyContent: "flex-end" },
  subCount: { fontSize: 14, fontWeight: "700" },
  subPct: { fontSize: 10, fontWeight: "500" },

  // Revenue
  revenueGrid: { flexDirection: "row", gap: 8 },
  revItem: { flex: 1, borderRadius: 14, padding: 13, alignItems: "center", gap: 7 },
  revIconBg: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  revValue: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  revLabel: { fontSize: 9, fontWeight: "600", textAlign: "center", textTransform: "uppercase", letterSpacing: 0.3 },

  // Engagement
  engagementGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  engagementItem: { width: (width - 96) / 2, alignItems: "center", gap: 8 },
  engagementIconBg: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  engagementValue: { fontSize: 28, fontWeight: "900", letterSpacing: -1 },
  engagementLabel: { fontSize: 11, fontWeight: "600", textAlign: "center" },

  // Users tab
  usersHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  totalBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  totalBadgeText: { fontSize: 12, fontWeight: "700" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: "500" },
  userRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 16, marginBottom: 8, gap: 12 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  userAvatarText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  userInfo: { flex: 1, gap: 3 },
  userNameRow: { flexDirection: "row", alignItems: "center" },
  userName: { fontSize: 15, fontWeight: "700", letterSpacing: -0.2, flex: 1 },
  userEmail: { fontSize: 12, fontWeight: "500" },
  userMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap", marginTop: 2 },
  subBadgeSmall: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  subBadgeText: { fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.3 },
  metaDot: { fontSize: 12 },
  metaText: { fontSize: 11, fontWeight: "500" },
  userRight: { alignItems: "center", gap: 6 },
  streakPill: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "rgba(255,107,107,0.12)", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 9 },
  streakPillText: { fontSize: 10, fontWeight: "700", color: "#FF6B6B" },

  // Pagination
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 16, marginBottom: 8 },
  pageBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  pageText: { fontSize: 15, fontWeight: "700" },

  // Leaderboard
  leaderRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11, gap: 10 },
  rankWrap: { width: 26, alignItems: "center" },
  rankNum: { fontSize: 14, fontWeight: "800" },
  leaderAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  leaderAvatarText: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" },
  leaderInfo: { flex: 1 },
  leaderName: { fontSize: 14, fontWeight: "700", letterSpacing: -0.2 },
  leaderEmail: { fontSize: 11, fontWeight: "500" },
  leaderStats: { alignItems: "flex-end", gap: 3 },
  leaderXP: { fontSize: 13, fontWeight: "800" },
  leaderStreakRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  leaderStreakText: { fontSize: 11, fontWeight: "600" },

  // Activity
  activitySubTabs: { flexDirection: "row", borderRadius: 14, padding: 4, marginBottom: 8 },
  actSubTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 10 },
  actSubTabText: { fontSize: 12, fontWeight: "700" },
  actItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
  actAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  actAvatarText: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" },
  actIconBg: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  actInfo: { flex: 1 },
  actName: { fontSize: 14, fontWeight: "700", letterSpacing: -0.2 },
  actDetail: { fontSize: 11, fontWeight: "500" },
  actRight: { alignItems: "flex-end", gap: 3 },
  actCal: { fontSize: 13, fontWeight: "800" },
  actTime: { fontSize: 10, fontWeight: "500" },

  // System health
  healthContent: { flexDirection: "row", alignItems: "center", gap: 14 },
  healthIndicator: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  healthInfo: { flex: 1, gap: 4 },
  healthStatus: { fontSize: 15, fontWeight: "700" },
  healthRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  healthDetail: { fontSize: 12, fontWeight: "500" },
  refreshBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },

  // Empty & loader
  emptyState: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, fontWeight: "500" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

  // User detail modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "93%", overflow: "hidden" },
  modalGradHeader: { paddingTop: 52, paddingBottom: 24, paddingHorizontal: 24, alignItems: "center", gap: 6 },
  modalCloseBtn: { position: "absolute", top: 14, right: 14, width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  modalAvatarLg: { width: 76, height: 76, borderRadius: 38, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  modalAvatarLgText: { fontSize: 26, fontWeight: "800", color: "#FFFFFF" },
  modalName: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  modalEmail: { fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: "500" },
  modalBadgeRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  modalBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 11, paddingVertical: 5, borderRadius: 11 },
  modalBadgeText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  modalStatsStrip: { flexDirection: "row", marginHorizontal: 20, marginTop: -18, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 8, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  modalStatItem: { flex: 1, alignItems: "center", gap: 3 },
  modalStatVal: { fontSize: 17, fontWeight: "800", letterSpacing: -0.5 },
  modalStatLbl: { fontSize: 9, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  modalStatDiv: { width: 1, marginVertical: 4 },
  modalSection: { marginHorizontal: 20, marginTop: 12, borderRadius: 18, padding: 16 },
  modalSectionTitle: { fontSize: 14, fontWeight: "700", marginBottom: 10, letterSpacing: -0.1 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  infoLabel: { fontSize: 13, fontWeight: "500" },
  infoValue: { fontSize: 13, fontWeight: "700", textAlign: "right", flex: 1, marginLeft: 12 },
  modalActions: { flexDirection: "row", gap: 10, marginHorizontal: 20, marginTop: 16 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 14 },
  actionBtnText: { fontSize: 13, fontWeight: "700" },

  // Subscription modal
  subModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: 24 },
  subModalContent: { borderRadius: 24, padding: 24 },
  subModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  subModalTitle: { fontSize: 20, fontWeight: "700" },
  subModalCurrent: { fontSize: 13, fontWeight: "500", marginBottom: 16 },
  subOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15, borderRadius: 14, marginBottom: 8 },
  subOptionDot: { width: 12, height: 12, borderRadius: 6 },
  subOptionLabel: { flex: 1, fontSize: 15, fontWeight: "700" },
});
