import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  RefreshCw,
  Footprints,
  Flame,
  Clock,
  Heart,
  ArrowDown,
  ArrowUp,
  BarChart3,
  X,
  PlusCircle,
  Activity,
  Watch,
  Smartphone,
  LucideIcon,
} from "lucide-react-native";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import {
  deviceAPI,
  ConnectedDevice,
  DailyBalance,
} from "../../src/services/deviceAPI";
import { HealthData } from "../../src/services/healthKit";
import { DeviceCardSkeleton } from "@/components/loaders";
import ErrorBoundary from "@/components/ErrorBoundary";
import axios from "axios";

const getApiBaseUrl = () => {
  if (__DEV__) {
    return "http://127.0.0.1:3000/api";
  }
  return "https://your-production-api.com/api";
};

interface DeviceConfig {
  type: string;
  name: string;
  Icon: LucideIcon;
  color: string;
  available: boolean;
  description: string;
}

const SUPPORTED_DEVICES: DeviceConfig[] = [
  {
    type: "APPLE_HEALTH",
    name: "Apple Health",
    Icon: Smartphone,
    color: "#000000",
    available: Platform.OS === "ios",
    description: "Sync steps, calories, heart rate, and more from Apple Health",
  },
  {
    type: "GOOGLE_FIT",
    name: "Google Fit",
    Icon: Activity,
    color: "#4285F4",
    available: true,
    description:
      "Connect your Google Fit data for comprehensive activity tracking",
  },
  {
    type: "FITBIT",
    name: "Fitbit",
    Icon: Watch,
    color: "#00B0B9",
    available: true,
    description: "Sync your Fitbit device data including sleep and activity",
  },
  {
    type: "GARMIN",
    name: "Garmin",
    Icon: Watch,
    color: "#007CC3",
    available: true,
    description: "Connect Garmin devices for detailed fitness metrics",
  },
  {
    type: "WHOOP",
    name: "Whoop",
    Icon: Activity,
    color: "#FF6B35",
    available: true,
    description: "Track recovery, strain, and sleep with Whoop integration",
  },
  {
    type: "POLAR",
    name: "Polar",
    Icon: Heart,
    color: "#0066CC",
    available: true,
    description: "Sync Polar heart rate and training data",
  },
  {
    type: "SAMSUNG_HEALTH",
    name: "Samsung Health",
    Icon: Heart,
    color: "#1428A0",
    available: Platform.OS === "android",
    description: "Connect Samsung Health for comprehensive health tracking",
  },
];

export default function DevicesScreen() {
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);

  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>(
    []
  );
  const [dailyBalance, setDailyBalance] = useState<DailyBalance | null>(null);
  const [activityData, setActivityData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingDevices, setSyncingDevices] = useState<Set<string>>(new Set());
  const [connectingDevices, setConnectingDevices] = useState<Set<string>>(
    new Set()
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check subscription access
    if (!user || user.subscription_type === "FREE") {
      Alert.alert(
        t("devices.upgrade_required"),
        t("devices.upgrade_required_message"),
        [
          {
            text: t("devices.cancel"),
            onPress: () => router.replace("/(tabs)"),
            style: "cancel",
          },
          {
            text: t("devices.upgrade"),
            onPress: () => router.replace("/payment-plan"),
          },
        ]
      );
      setTimeout(() => router.replace("/(tabs)"), 100);
      return;
    }

    loadDeviceData();
  }, [user]);

  const loadDeviceData = async () => {
    try {
      console.log("📱 Loading device data...");
      setIsLoading(true);
      setError(null);

      const devices = await deviceAPI.getConnectedDevices();
      setConnectedDevices(devices);

      if (devices.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const [activity, balance] = await Promise.all([
          deviceAPI.getActivityData(today),
          deviceAPI.getDailyBalance(today),
        ]);
        setActivityData(activity);
        setDailyBalance(balance);
      } else {
        setActivityData(null);
        setDailyBalance(null);
      }
    } catch (error) {
      console.error("💥 Failed to load device data:", error);
      setError(t("devices.load_failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDeviceData();
    setRefreshing(false);
  };

  const handleConnectDevice = async (deviceType: string) => {
    console.log("🔍 handleConnectDevice called with:", deviceType);

    const deviceInfo = SUPPORTED_DEVICES.find((d) => d.type === deviceType);
    console.log("📱 Device info found:", deviceInfo);

    if (!deviceInfo) {
      console.log("❌ Device info not found for type:", deviceType);
      Alert.alert(t("devices.error"), t("devices.device_not_found"));
      return;
    }

    if (!deviceInfo.available) {
      console.log("❌ Device not available:", deviceInfo.name);
      Alert.alert(
        t("devices.not_available"),
        `${deviceInfo.name} ${t("devices.not_available_message")}`
      );
      return;
    }

    if (deviceType === "GOOGLE_FIT") {
      const clientSecret = process.env.EXPO_PUBLIC_GOOGLE_FIT_CLIENT_SECRET;
      if (!clientSecret) {
        Alert.alert(
          t("devices.configuration_required"),
          t("devices.configuration_required_message"),
          [{ text: "OK" }]
        );
        return;
      }

      Alert.alert(
        t("devices.connect_device"),
        `${deviceInfo.name}?\n\n${deviceInfo.description}\n\n${t("devices.connect_device_message")}`,
        [
          { text: t("devices.cancel"), style: "cancel" },
          {
            text: t("devices.connect"),
            onPress: async () => {
              console.log("🔄 User pressed Connect for Google Fit");
              setConnectingDevices((prev) => new Set(prev).add(deviceType));
              setError(null);

              try {
                const { deviceConnectionService } = await import(
                  "../../src/services/deviceConnections"
                );
                const result = await deviceConnectionService.connectDevice(
                  deviceType
                );

                if (result.success) {
                  try {
                    const deviceAxios = axios.create({
                      baseURL: getApiBaseUrl(),
                      timeout: 30000,
                    });

                    await deviceAxios.post("/devices/connect", {
                      deviceType: "GOOGLE_FIT",
                      deviceName: "Google Fit",
                      accessToken: result.accessToken,
                      refreshToken: result.refreshToken,
                    });
                  } catch (serverError) {
                    console.warn(
                      "⚠️ Failed to register with server:",
                      serverError
                    );
                  }

                  Alert.alert(
                    t("devices.success"),
                    `${deviceInfo.name} ${t("devices.connected_success")}`
                  );
                  await loadDeviceData();
                } else {
                  Alert.alert(
                    t("devices.connection_failed"),
                    `${deviceInfo.name}: ${result.error}`
                  );
                }
              } catch (error) {
                console.error("💥 Connection error:", error);
                setError(t("devices.connection_failed_message"));
              } finally {
                setConnectingDevices((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(deviceType);
                  return newSet;
                });
              }
            },
          },
        ]
      );
      return;
    }

    Alert.alert(
      t("devices.connect_device"),
      `${deviceInfo.name}?\n\n${deviceInfo.description}\n\n${t("devices.connect_device_message")}`,
      [
        { text: t("devices.cancel"), style: "cancel" },
        {
          text: t("devices.connect"),
          onPress: async () => {
            console.log("🔄 User pressed Connect for:", deviceType);
            setConnectingDevices((prev) => new Set(prev).add(deviceType));
            setError(null);

            try {
              console.log(
                "📡 Calling deviceAPI.connectDevice with:",
                deviceType
              );
              const success = await deviceAPI.connectDevice(deviceType);
              console.log("📡 deviceAPI.connectDevice result:", success);

              if (success) {
                Alert.alert(
                  t("devices.success"),
                  `${deviceInfo.name} ${t("devices.connected_success")}`
                );
                await loadDeviceData();
              } else {
                Alert.alert(
                  t("devices.connection_failed"),
                  t("devices.connection_failed_message")
                );
              }
            } catch (error) {
              console.error("💥 Connection error:", error);
              setError(t("devices.connection_failed_message"));
            } finally {
              setConnectingDevices((prev) => {
                const newSet = new Set(prev);
                newSet.delete(deviceType);
                return newSet;
              });
            }
          },
        },
      ]
    );
  };

  const handleDisconnectDevice = async (deviceId: string) => {
    const device = connectedDevices.find((d) => d.id === deviceId);
    if (!device) return;

    Alert.alert(
      t("devices.disconnect_device"),
      `${device.name}: ${t("devices.disconnect_device_message")}`,
      [
        { text: t("devices.cancel"), style: "cancel" },
        {
          text: t("devices.disconnect"),
          style: "destructive",
          onPress: async () => {
            try {
              const success = await deviceAPI.disconnectDevice(deviceId);
              if (success) {
                Alert.alert(t("devices.success"), t("devices.disconnected_success"));
                await loadDeviceData();
              } else {
                Alert.alert(t("devices.error"), t("devices.sync_failed"));
              }
            } catch (error) {
              console.error("💥 Disconnect error:", error);
              Alert.alert(t("devices.error"), t("devices.sync_failed"));
            }
          },
        },
      ]
    );
  };

  const handleSyncDevice = async (deviceId: string) => {
    setSyncingDevices((prev) => new Set(prev).add(deviceId));

    try {
      const success = await deviceAPI.syncDevice(deviceId);
      if (success) {
        Alert.alert(t("devices.success"), t("devices.sync_successful"));
        await loadDeviceData();
      } else {
        Alert.alert(t("devices.error"), t("devices.sync_failed_message"));
      }
    } catch (error) {
      console.error("💥 Sync error:", error);
      Alert.alert(t("devices.error"), t("devices.sync_failed"));
    } finally {
      setSyncingDevices((prev) => {
        const newSet = new Set(prev);
        newSet.delete(deviceId);
        return newSet;
      });
    }
  };

  const handleSyncAllDevices = async () => {
    if (connectedDevices.length === 0) {
      Alert.alert(t("devices.no_devices"), t("devices.no_devices_message"));
      return;
    }

    try {
      const result = await deviceAPI.syncAllDevices();
      if (result.success > 0) {
        Alert.alert(
          t("devices.sync_complete"),
          `${t("devices.sync_complete_message")} ${result.success}${
            result.failed > 0 ? `, ${result.failed} failed` : ""
          }`
        );
        await loadDeviceData();
      } else {
        Alert.alert(t("devices.sync_failed"), t("devices.sync_failed_message"));
      }
    } catch (error) {
      console.error("💥 Sync all error:", error);
      Alert.alert(t("devices.error"), t("devices.sync_failed"));
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ padding: 16, gap: 12 }}>
          <DeviceCardSkeleton />
          <DeviceCardSkeleton />
          <DeviceCardSkeleton />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.errorContainer, { backgroundColor: colors.background }]}
      >
        <AlertTriangle
          size={64}
          color={colors.error || "#ef4444"}
        />
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          {t("devices.oops")}
        </Text>
        <Text style={[styles.errorText, { color: colors.subtext }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[
            styles.retryButton,
            { backgroundColor: colors.primary || "#10b981" },
          ]}
          onPress={() => {
            setError(null);
            loadDeviceData();
          }}
        >
          <RefreshCw size={20} color="#ffffff" />
          <Text style={styles.retryButtonText}>{t("devices.try_again")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View
          colors={
            isDark
              ? [colors.emerald700, colors.emerald600]
              : [colors.emerald500, colors.emerald600]
          }
          style={styles.header}
        >
          <Text
            style={[
              styles.headerTitle,
              { color: colors.onPrimary },
              isRTL && styles.rtlText,
            ]}
          >
            {t("devices.title")}
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              { color: colors.onPrimary },
              isRTL && styles.rtlText,
            ]}
          >
            {t("devices.subtitle")}
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Daily Balance Section */}
          {dailyBalance && (
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("devices.todays_calorie_balance")}
              </Text>
              <View style={styles.balanceContainer}>
                <View style={styles.balanceItem}>
                  <ArrowDown size={24} color="#10b981" />
                  <Text style={[styles.balanceValue, { color: colors.text }]}>
                    {dailyBalance.caloriesIn}
                  </Text>
                  <Text
                    style={[styles.balanceLabel, { color: colors.subtext }]}
                  >
                    {t("devices.calories_in")}
                  </Text>
                </View>
                <View style={styles.balanceItem}>
                  <ArrowUp size={24} color="#ef4444" />
                  <Text style={[styles.balanceValue, { color: colors.text }]}>
                    {dailyBalance.caloriesOut}
                  </Text>
                  <Text
                    style={[styles.balanceLabel, { color: colors.subtext }]}
                  >
                    {t("devices.calories_out")}
                  </Text>
                </View>
                <View style={styles.balanceItem}>
                  <BarChart3 size={24} color="#6366f1" />
                  <Text style={[styles.balanceValue, { color: colors.text }]}>
                    {dailyBalance.balance > 0 ? "+" : ""}
                    {dailyBalance.balance}
                  </Text>
                  <Text
                    style={[styles.balanceLabel, { color: colors.subtext }]}
                  >
                    {t("devices.net_balance")}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Activity Data Section */}
          {activityData && (
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("devices.todays_activity")}
              </Text>
              <View style={styles.activityGrid}>
                <View
                  style={[
                    styles.activityCard,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <Footprints size={28} color="#10b981" />
                  <Text style={[styles.activityValue, { color: colors.text }]}>
                    {activityData.steps.toLocaleString()}
                  </Text>
                  <Text
                    style={[styles.activityLabel, { color: colors.subtext }]}
                  >
                    {t("devices.steps")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.activityCard,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <Flame size={28} color="#ef4444" />
                  <Text style={[styles.activityValue, { color: colors.text }]}>
                    {activityData.caloriesBurned}
                  </Text>
                  <Text
                    style={[styles.activityLabel, { color: colors.subtext }]}
                  >
                    {t("devices.calories_burned")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.activityCard,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <Clock size={28} color="#3b82f6" />
                  <Text style={[styles.activityValue, { color: colors.text }]}>
                    {activityData.activeMinutes}
                  </Text>
                  <Text
                    style={[styles.activityLabel, { color: colors.subtext }]}
                  >
                    {t("devices.active_minutes")}
                  </Text>
                </View>
                {activityData.heartRate && (
                  <View
                    style={[
                      styles.activityCard,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    <Heart size={28} color="#e91e63" />
                    <Text
                      style={[styles.activityValue, { color: colors.text }]}
                    >
                      {activityData.heartRate}
                    </Text>
                    <Text
                      style={[styles.activityLabel, { color: colors.subtext }]}
                    >
                      {t("devices.avg_heart_rate")}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Connected Devices */}
          {connectedDevices.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("devices.connected_devices")}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.syncAllButton,
                    { backgroundColor: colors.primary || "#10b981" },
                  ]}
                  onPress={handleSyncAllDevices}
                >
                  <RefreshCw size={16} color="#ffffff" />
                  <Text style={styles.syncAllText}>{t("devices.sync_all")}</Text>
                </TouchableOpacity>
              </View>

              {connectedDevices.map((device) => {
                const deviceInfo = SUPPORTED_DEVICES.find(
                  (d) => d.type === device.type
                );
                const isSyncing = syncingDevices.has(device.id);
                const DeviceIcon = deviceInfo?.Icon || Watch;

                return (
                  <View
                    key={device.id}
                    style={[
                      styles.deviceCard,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    <View style={styles.deviceHeader}>
                      <View style={styles.deviceInfo}>
                        <View
                          style={[
                            styles.deviceIcon,
                            { backgroundColor: deviceInfo?.color + "20" },
                          ]}
                        >
                          <DeviceIcon
                            size={24}
                            color={deviceInfo?.color || "#666"}
                          />
                        </View>
                        <View style={styles.deviceDetails}>
                          <Text
                            style={[styles.deviceName, { color: colors.text }]}
                          >
                            {device.name}
                          </Text>
                          <View style={styles.deviceStatus}>
                            <View
                              style={[
                                styles.statusDot,
                                {
                                  backgroundColor:
                                    device.status === "CONNECTED"
                                      ? "#10b981"
                                      : "#ef4444",
                                },
                              ]}
                            />
                            <Text
                              style={[
                                styles.statusText,
                                { color: colors.subtext },
                              ]}
                            >
                              {device.status === "CONNECTED"
                                ? t("devices.connected")
                                : t("devices.disconnected")}
                              {device.isPrimary && ` • ${t("devices.primary")}`}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.deviceActions}>
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            { backgroundColor: colors.primary + "20" },
                          ]}
                          onPress={() => handleSyncDevice(device.id)}
                          disabled={isSyncing}
                        >
                          {isSyncing ? (
                            <ActivityIndicator
                              size="small"
                              color={colors.primary}
                            />
                          ) : (
                            <RefreshCw
                              size={16}
                              color={colors.primary}
                            />
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            { backgroundColor: "#ef444420" },
                          ]}
                          onPress={() => handleDisconnectDevice(device.id)}
                        >
                          <X size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {device.lastSync && (
                      <Text style={[styles.lastSync, { color: colors.muted }]}>
                        {t("devices.last_sync")}:{" "}
                        {new Date(device.lastSync).toLocaleString()}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Available Devices */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {connectedDevices.length === 0
                ? t("devices.connect_first_device")
                : t("devices.available_devices")}
            </Text>
            {connectedDevices.length === 0 && (
              <Text style={[styles.sectionSubtitle, { color: colors.subtext }]}>
                {t("devices.connect_first_device_desc")}
              </Text>
            )}

            {SUPPORTED_DEVICES.filter(
              (device) =>
                !connectedDevices.some(
                  (connected) => connected.type === device.type
                )
            ).map((device) => {
              const isConnecting = connectingDevices.has(device.type);
              const DeviceIcon = device.Icon;

              return (
                <TouchableOpacity
                  key={device.type}
                  style={[
                    styles.availableDeviceCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    !device.available && styles.unavailableDevice,
                  ]}
                  onPress={() => handleConnectDevice(device.type)}
                  disabled={!device.available || isConnecting}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.deviceIcon,
                      { backgroundColor: device.color + "20" },
                    ]}
                  >
                    <DeviceIcon
                      size={24}
                      color={device.available ? device.color : "#ccc"}
                    />
                  </View>

                  <View style={styles.availableDeviceInfo}>
                    <Text
                      style={[
                        styles.availableDeviceName,
                        { color: colors.text },
                      ]}
                    >
                      {device.name}
                    </Text>
                    <Text
                      style={[
                        styles.availableDeviceDescription,
                        { color: colors.subtext },
                      ]}
                    >
                      {device.description}
                    </Text>
                    {!device.available && (
                      <Text style={styles.unavailableText}>
                        {t("devices.not_available_on_platform")}
                      </Text>
                    )}
                  </View>

                  {device.available && (
                    <View style={styles.connectButton}>
                      {isConnecting ? (
                        <ActivityIndicator size="small" color={device.color} />
                      ) : (
                        <PlusCircle
                          size={24}
                          color={device.color}
                        />
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Empty State */}
          {connectedDevices.length === 0 && (
            <View style={styles.emptyState}>
              <Activity size={80} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {t("devices.empty_state_title")}
              </Text>
              <Text style={[styles.emptyText, { color: colors.subtext }]}>
                {t("devices.empty_state_desc")}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#ffffff",
    opacity: 0.9,
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  section: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  syncAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  syncAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  balanceContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  },
  balanceItem: {
    alignItems: "center",
    gap: 8,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  activityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },
  activityCard: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    gap: 8,
  },
  activityValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  activityLabel: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  deviceCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  deviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  deviceDetails: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  deviceStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
  },
  deviceActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  lastSync: {
    fontSize: 12,
    marginTop: 12,
    fontStyle: "italic",
  },
  availableDeviceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    gap: 12,
  },
  unavailableDevice: {
    opacity: 0.5,
  },
  availableDeviceInfo: {
    flex: 1,
  },
  availableDeviceName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  availableDeviceDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  unavailableText: {
    fontSize: 12,
    color: "#f59e0b",
    fontWeight: "500",
    marginTop: 4,
  },
  connectButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  rtlText: {
    textAlign: "right",
  },
});
