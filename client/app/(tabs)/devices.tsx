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
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
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
import LoadingScreen from "@/components/LoadingScreen";
import ErrorBoundary from "@/components/ErrorBoundary";
import axios from "axios";
import { SupportedDevice } from "@/src/types/devices";

const getApiBaseUrl = () => {
  if (__DEV__) {
    return "http://127.0.0.1:3000/api";
  }
  return "https://your-production-api.com/api";
};

const SUPPORTED_DEVICES: SupportedDevice[] = [
  {
    type: "APPLE_HEALTH",
    name: "Apple Health",
    icon: "logo-apple",
    color: "#000000",
    available: Platform.OS === "ios",
    description: "Sync steps, calories, heart rate, and more from Apple Health",
  },
  {
    type: "GOOGLE_FIT",
    name: "Google Fit",
    icon: "fitness",
    color: "#4285F4",
    available: true,
    description:
      "Connect your Google Fit data for comprehensive activity tracking",
  },
  {
    type: "FITBIT",
    name: "Fitbit",
    icon: "watch" as const,
    color: "#00B0B9",
    available: true,
    description: "Sync your Fitbit device data including sleep and activity",
  },
  {
    type: "GARMIN",
    name: "Garmin",
    icon: "watch" as const,
    color: "#007CC3",
    available: true,
    description: "Connect Garmin devices for detailed fitness metrics",
  },
  {
    type: "WHOOP",
    name: "Whoop",
    icon: "fitness" as const,
    color: "#FF6B35",
    available: true,
    description: "Track recovery, strain, and sleep with Whoop integration",
  },
  {
    type: "POLAR",
    name: "Polar",
    icon: "heart" as const,
    color: "#0066CC",
    available: true,
    description: "Sync Polar heart rate and training data",
  },
  {
    type: "SAMSUNG_HEALTH",
    name: "Samsung Health",
    icon: "heart" as const,
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
        language === "he" ? "שדרוג נדרש" : "Upgrade Required",
        language === "he"
          ? "חיבור מכשירים זמין רק במנויי Gold ו-Platinum"
          : "Device integration is only available on Gold and Platinum plans.",
        [
          {
            text: language === "he" ? "ביטול" : "Cancel",
            onPress: () => router.replace("/(tabs)"),
            style: "cancel",
          },
          {
            text: language === "he" ? "שדרג" : "Upgrade",
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
      setError("Failed to load device data. Please try again.");
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
      Alert.alert("Error", "Device type not found");
      return;
    }

    if (!deviceInfo.available) {
      console.log("❌ Device not available:", deviceInfo.name);
      Alert.alert(
        "Not Available",
        `${deviceInfo.name} integration is not available on this platform.`
      );
      return;
    }

    if (deviceType === "GOOGLE_FIT") {
      const clientSecret = process.env.EXPO_PUBLIC_GOOGLE_FIT_CLIENT_SECRET;
      if (!clientSecret) {
        Alert.alert(
          "Configuration Required",
          "Google Fit client secret is not configured. Please add EXPO_PUBLIC_GOOGLE_FIT_CLIENT_SECRET to your environment variables and restart the app.",
          [{ text: "OK" }]
        );
        return;
      }

      Alert.alert(
        "Connect Device",
        `Connect to ${deviceInfo.name}?\n\n${deviceInfo.description}\n\nThis will request permission to access your health data.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Connect",
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
                    "Success",
                    `${deviceInfo.name} connected successfully! You can now sync your health data.`
                  );
                  await loadDeviceData();
                } else {
                  Alert.alert(
                    "Connection Failed",
                    `Failed to connect to ${deviceInfo.name}. ${result.error}`
                  );
                }
              } catch (error) {
                console.error("💥 Connection error:", error);
                setError(
                  `Failed to connect to ${deviceInfo.name}. Please try again.`
                );
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
      "Connect Device",
      `Connect to ${deviceInfo.name}?\n\n${deviceInfo.description}\n\nThis will request permission to access your health data.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Connect",
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
                  "Success",
                  `${deviceInfo.name} connected successfully! You can now sync your health data.`
                );
                await loadDeviceData();
              } else {
                Alert.alert(
                  "Connection Failed",
                  `Failed to connect to ${deviceInfo.name}. This could be due to:\n\n• Cancelled authorization\n• Network issues\n• Configuration problems\n\nPlease try again or check your settings.`
                );
              }
            } catch (error) {
              console.error("💥 Connection error:", error);
              setError(
                `Failed to connect to ${deviceInfo.name}. Please try again.`
              );
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
      "Disconnect Device",
      `Are you sure you want to disconnect ${device.name}? This will stop syncing data from this device.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            try {
              const success = await deviceAPI.disconnectDevice(deviceId);
              if (success) {
                Alert.alert("Success", "Device disconnected successfully");
                await loadDeviceData();
              } else {
                Alert.alert("Error", "Failed to disconnect device");
              }
            } catch (error) {
              console.error("💥 Disconnect error:", error);
              Alert.alert("Error", "Failed to disconnect device");
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
        Alert.alert("Success", "Device synced successfully!");
        await loadDeviceData();
      } else {
        Alert.alert(
          "Error",
          "Failed to sync device. Please check your connection and try again."
        );
      }
    } catch (error) {
      console.error("💥 Sync error:", error);
      Alert.alert("Error", "Failed to sync device");
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
      Alert.alert("No Devices", "No connected devices to sync");
      return;
    }

    try {
      const result = await deviceAPI.syncAllDevices();
      if (result.success > 0) {
        Alert.alert(
          "Sync Complete",
          `Successfully synced ${result.success} device(s)${
            result.failed > 0 ? `, ${result.failed} failed` : ""
          }`
        );
        await loadDeviceData();
      } else {
        Alert.alert(
          "Sync Failed",
          "Failed to sync any devices. Please check your connections."
        );
      }
    } catch (error) {
      console.error("💥 Sync all error:", error);
      Alert.alert("Error", "Failed to sync devices");
    }
  };

  if (isLoading) {
    return <LoadingScreen text={t("loading_smart_devices")} />;
  }

  if (error) {
    return (
      <View
        style={[styles.errorContainer, { backgroundColor: colors.background }]}
      >
        <Ionicons
          name="warning-outline"
          size={64}
          color={colors.error || "#ef4444"}
        />
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          Oops! Something went wrong
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
          <Ionicons name="refresh" size={20} color="#ffffff" />
          <Text style={styles.retryButtonText}>Try Again</Text>
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
                  <Ionicons name="arrow-down" size={24} color="#10b981" />
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
                  <Ionicons name="arrow-up" size={24} color="#ef4444" />
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
                  <Ionicons name="analytics" size={24} color="#6366f1" />
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
                  <Ionicons name="walk" size={28} color="#10b981" />
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
                  <Ionicons name="flame" size={28} color="#ef4444" />
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
                  <Ionicons name="time" size={28} color="#3b82f6" />
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
                    <Ionicons name="heart" size={28} color="#e91e63" />
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
                  <Ionicons name="refresh" size={16} color="#ffffff" />
                  <Text style={styles.syncAllText}>Sync All</Text>
                </TouchableOpacity>
              </View>

              {connectedDevices.map((device) => {
                const deviceInfo = SUPPORTED_DEVICES.find(
                  (d) => d.type === device.type
                );
                const isSyncing = syncingDevices.has(device.id);

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
                          <Ionicons
                            name={deviceInfo?.icon || "watch"}
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
                                ? "Connected"
                                : "Disconnected"}
                              {device.isPrimary && " • Primary"}
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
                            <Ionicons
                              name="refresh"
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
                          <Ionicons name="close" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {device.lastSync && (
                      <Text style={[styles.lastSync, { color: colors.muted }]}>
                        Last synced:{" "}
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
                ? "Connect Your First Device"
                : "Available Devices"}
            </Text>
            {connectedDevices.length === 0 && (
              <Text style={[styles.sectionSubtitle, { color: colors.subtext }]}>
                Connect fitness trackers and health apps to automatically sync
                your activity data
              </Text>
            )}

            {SUPPORTED_DEVICES.filter(
              (device) =>
                !connectedDevices.some(
                  (connected) => connected.type === device.type
                )
            ).map((device) => {
              const isConnecting = connectingDevices.has(device.type);

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
                    <Ionicons
                      name={device.icon}
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
                        Not available on this platform
                      </Text>
                    )}
                  </View>

                  {device.available && (
                    <View style={styles.connectButton}>
                      {isConnecting ? (
                        <ActivityIndicator size="small" color={device.color} />
                      ) : (
                        <Ionicons
                          name="add-circle"
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
              <Ionicons name="fitness-outline" size={80} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No Connected Devices
              </Text>
              <Text style={[styles.emptyText, { color: colors.subtext }]}>
                Connect your fitness trackers and health apps to get
                comprehensive insights into your wellness journey
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
