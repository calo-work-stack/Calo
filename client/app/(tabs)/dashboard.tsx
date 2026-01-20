import React, { useState, useEffect } from "react";
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
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import axios from "axios";
import {
  Shield,
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  UserPlus,
  LogIn,
  ShoppingCart,
  Calendar,
  Award,
  Search,
  Filter,
  X,
  Eye,
  Trash2,
  BarChart3,
  PieChart,
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
  };
  subscriptions: Record<string, number>;
  revenue: {
    total: number;
    transactions: number;
  };
  recentActivity: any[];
  userGrowth: any[];
}

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useSelector((state: RootState) => state.auth);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "analytics"
  >("overview");

  useEffect(() => {
    // Check if user has admin privileges (either through is_admin/is_super_admin flags or ADMIN subscription)
    const hasAdminAccess =
      user?.is_admin || user?.is_super_admin || user?.subscription_type === ADMIN_PLAN;

    if (!hasAdminAccess) {
      Alert.alert("Access Denied", "Admin privileges required");
      router.replace("/(tabs)");
      return;
    }
    loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/admin/stats");
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
      Alert.alert("Error", "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const renderStatCard = (
    title: string,
    value: string | number,
    icon: any,
    color: string
  ) => (
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <View
        style={[styles.statIconContainer, { backgroundColor: color + "20" }]}
      >
        {icon}
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.textSecondary }]}>
        {title}
      </Text>
    </View>
  );

  const renderOverview = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Overview
      </Text>

      <View style={styles.statsGrid}>
        {renderStatCard(
          "Total Users",
          stats?.overview.totalUsers.toLocaleString() || "0",
          <Users size={24} color="#10B981" />,
          "#10B981"
        )}
        {renderStatCard(
          "Today's Signups",
          stats?.overview.todaySignups || "0",
          <UserPlus size={24} color="#3B82F6" />,
          "#3B82F6"
        )}
        {renderStatCard(
          "Today's Logins",
          stats?.overview.todayLogins || "0",
          <LogIn size={24} color="#8B5CF6" />,
          "#8B5CF6"
        )}
        {renderStatCard(
          "Total Meals",
          stats?.overview.totalMeals.toLocaleString() || "0",
          <ShoppingCart size={24} color="#F59E0B" />,
          "#F59E0B"
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Subscriptions
        </Text>
        <View style={styles.subscriptionsGrid}>
          {stats?.subscriptions &&
            Object.entries(stats.subscriptions).map(([plan, count]) => (
              <View key={plan} style={styles.subscriptionItem}>
                <View
                  style={[
                    styles.planBadge,
                    { backgroundColor: getPlanColor(plan) + "20" },
                  ]}
                >
                  <Text
                    style={[styles.planName, { color: getPlanColor(plan) }]}
                  >
                    {plan}
                  </Text>
                </View>
                <Text style={[styles.planCount, { color: colors.text }]}>
                  {count}
                </Text>
              </View>
            ))}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Revenue</Text>
        <View style={styles.revenueContainer}>
          <View style={styles.revenueItem}>
            <DollarSign size={32} color="#10B981" />
            <Text style={[styles.revenueValue, { color: colors.text }]}>
              ${stats?.revenue.total.toLocaleString() || "0"}
            </Text>
            <Text
              style={[styles.revenueLabel, { color: colors.textSecondary }]}
            >
              Total Revenue
            </Text>
          </View>
          <View style={styles.revenueItem}>
            <Activity size={32} color="#3B82F6" />
            <Text style={[styles.revenueValue, { color: colors.text }]}>
              {stats?.revenue.transactions.toLocaleString() || "0"}
            </Text>
            <Text
              style={[styles.revenueLabel, { color: colors.textSecondary }]}
            >
              Transactions
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const getPlanColor = (plan: string) => {
    switch (plan.toUpperCase()) {
      case "PLATINUM":
        return "#8B5CF6";
      case "GOLD":
        return "#F59E0B";
      case "FREE":
        return "#6B7280";
      case "ADMIN":
        return "#EF4444";
      default:
        return "#10B981";
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color="#10B981" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <LinearGradient
        colors={["#10B981", "#059669", "#047857"]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <Shield size={32} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              System Overview & Management
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "overview" && styles.activeTab]}
          onPress={() => setActiveTab("overview")}
        >
          <BarChart3
            size={20}
            color={activeTab === "overview" ? "#10B981" : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "overview" ? "#10B981" : colors.textSecondary,
              },
            ]}
          >
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "users" && styles.activeTab]}
          onPress={() => setActiveTab("users")}
        >
          <Users
            size={20}
            color={activeTab === "users" ? "#10B981" : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === "users" ? "#10B981" : colors.textSecondary,
              },
            ]}
          >
            Users
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "analytics" && styles.activeTab]}
          onPress={() => setActiveTab("analytics")}
        >
          <PieChart
            size={20}
            color={activeTab === "analytics" ? "#10B981" : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "analytics" ? "#10B981" : colors.textSecondary,
              },
            ]}
          >
            Analytics
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#10B981"]}
            tintColor="#10B981"
          />
        }
      >
        {activeTab === "overview" && renderOverview()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: "#10B98115",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: (width - 52) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    textAlign: "center",
  },
  card: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  subscriptionsGrid: {
    gap: 12,
  },
  subscriptionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  planName: {
    fontSize: 14,
    fontWeight: "600",
  },
  planCount: {
    fontSize: 18,
    fontWeight: "700",
  },
  revenueContainer: {
    flexDirection: "row",
    gap: 16,
  },
  revenueItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
  },
  revenueValue: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 8,
  },
  revenueLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
