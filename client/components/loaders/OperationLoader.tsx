import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import {
  Trash2,
  Plus,
  Save,
  RefreshCw,
  Upload,
  Download,
  Copy,
  Heart,
  Star,
  Check,
  X,
  Loader2,
  LucideIcon,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

// Operation types with their icons and default messages
export type OperationType =
  | "delete"
  | "add"
  | "save"
  | "update"
  | "upload"
  | "download"
  | "duplicate"
  | "favorite"
  | "rate"
  | "sync"
  | "loading";

interface OperationConfig {
  icon: LucideIcon;
  defaultMessage: string;
  color: string;
}

const operationConfigs: Record<OperationType, OperationConfig> = {
  delete: { icon: Trash2, defaultMessage: "operations.deleting", color: "#EF4444" },
  add: { icon: Plus, defaultMessage: "operations.adding", color: "#10B981" },
  save: { icon: Save, defaultMessage: "operations.saving", color: "#3B82F6" },
  update: { icon: RefreshCw, defaultMessage: "operations.updating", color: "#8B5CF6" },
  upload: { icon: Upload, defaultMessage: "operations.uploading", color: "#F59E0B" },
  download: { icon: Download, defaultMessage: "operations.downloading", color: "#06B6D4" },
  duplicate: { icon: Copy, defaultMessage: "operations.duplicating", color: "#6366F1" },
  favorite: { icon: Heart, defaultMessage: "operations.saving", color: "#EC4899" },
  rate: { icon: Star, defaultMessage: "operations.rating", color: "#FBBF24" },
  sync: { icon: RefreshCw, defaultMessage: "operations.syncing", color: "#10B981" },
  loading: { icon: Loader2, defaultMessage: "operations.loading", color: "#10B981" },
};

interface OperationLoaderProps {
  visible: boolean;
  type?: OperationType;
  message?: string;
  progress?: number; // 0-100 for progress bar
  showProgress?: boolean;
  onComplete?: () => void;
}

export const OperationLoader: React.FC<OperationLoaderProps> = ({
  visible,
  type = "loading",
  message,
  progress,
  showProgress = false,
  onComplete,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const config = operationConfigs[type];
  const IconComponent = config.icon;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Rotation animation for icon
      const rotation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      rotation.start();

      return () => rotation.stop();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    if (progress !== undefined) {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [progress]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View
        style={[
          styles.overlay,
          {
            backgroundColor: isDark
              ? "rgba(0, 0, 0, 0.7)"
              : "rgba(0, 0, 0, 0.5)",
            opacity: fadeAnim,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: colors.card,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.iconContainer,
              { backgroundColor: config.color + "15" },
              type !== "loading" &&
                type !== "sync" &&
                type !== "update" && { transform: [] },
              (type === "loading" || type === "sync" || type === "update") && {
                transform: [{ rotate: rotation }],
              },
            ]}
          >
            <IconComponent size={28} color={config.color} />
          </Animated.View>

          <Text style={[styles.message, { color: colors.text }]}>
            {message || t(config.defaultMessage)}
          </Text>

          {showProgress && (
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <Animated.View
                style={[
                  styles.progressBar,
                  { backgroundColor: config.color, width: progressWidth },
                ]}
              />
            </View>
          )}

          <View style={styles.dotsContainer}>
            <ActivityIndicator size="small" color={config.color} />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// Inline operation indicator for buttons/items
interface InlineLoaderProps {
  loading: boolean;
  type?: OperationType;
  size?: "small" | "medium" | "large";
}

export const InlineLoader: React.FC<InlineLoaderProps> = ({
  loading,
  type = "loading",
  size = "small",
}) => {
  const config = operationConfigs[type];
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const iconSize = size === "small" ? 16 : size === "medium" ? 20 : 24;

  useEffect(() => {
    if (loading) {
      const rotation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      rotation.start();
      return () => rotation.stop();
    }
  }, [loading]);

  if (!loading) return null;

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: rotation }] }}>
      <Loader2 size={iconSize} color={config.color} />
    </Animated.View>
  );
};

// Toast-style operation notification
interface OperationToastProps {
  visible: boolean;
  type: OperationType;
  message?: string;
  status?: "loading" | "success" | "error";
}

export const OperationToast: React.FC<OperationToastProps> = ({
  visible,
  type,
  message,
  status = "loading",
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const config = operationConfigs[type];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const statusColor =
    status === "success"
      ? "#10B981"
      : status === "error"
      ? "#EF4444"
      : config.color;

  const StatusIcon =
    status === "success"
      ? Check
      : status === "error"
      ? X
      : config.icon;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: colors.card,
          transform: [{ translateY }],
          opacity,
          borderLeftColor: statusColor,
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.toastIcon, { backgroundColor: statusColor + "15" }]}>
        {status === "loading" ? (
          <InlineLoader loading type={type} size="small" />
        ) : (
          <StatusIcon size={18} color={statusColor} />
        )}
      </View>
      <Text style={[styles.toastMessage, { color: colors.text }]}>
        {message || t(config.defaultMessage)}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: width * 0.7,
    maxWidth: 280,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  progressTrack: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBar: {
    height: "100%",
    borderRadius: 2,
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  // Toast styles
  toast: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    gap: 12,
  },
  toastIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  toastMessage: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
});

export default OperationLoader;
