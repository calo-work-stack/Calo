import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { Play, Square, Pencil, Trash2 } from "lucide-react-native";

interface MenuActionBarProps {
  isActive: boolean;
  isStarting?: boolean;
  isStopping?: boolean;
  onStart: () => void;
  onStop: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const MenuActionBar = React.memo(
  ({
    isActive,
    isStarting = false,
    isStopping = false,
    onStart,
    onStop,
    onEdit,
    onDelete,
  }: MenuActionBarProps) => {
    const { colors } = useTheme();
    const { t } = useTranslation();

    const handleStop = () => {
      Alert.alert(
        t("menu_crud.stop_menu"),
        t("menu_crud.stop_confirm"),
        [
          { text: t("menu_crud.cancel"), style: "cancel" },
          {
            text: t("menu_crud.stop_menu"),
            style: "destructive",
            onPress: onStop,
          },
        ]
      );
    };

    const handleDelete = () => {
      Alert.alert(
        t("menu_crud.delete_menu"),
        t("menu_crud.delete_confirm"),
        [
          { text: t("menu_crud.cancel"), style: "cancel" },
          {
            text: t("menu_crud.delete_menu"),
            style: "destructive",
            onPress: onDelete,
          },
        ]
      );
    };

    if (isActive) {
      return (
        <View style={[styles.container, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Pressable
            onPress={handleStop}
            disabled={isStopping}
            style={[styles.stopButton, { backgroundColor: colors.error + "15" }]}
          >
            {isStopping ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <>
                <Square size={18} color={colors.error} />
                <Text style={[styles.stopButtonText, { color: colors.error }]}>
                  {t("menu_crud.stop_menu")}
                </Text>
              </>
            )}
          </Pressable>

          <Pressable onPress={onEdit} style={[styles.iconButton, { backgroundColor: colors.surface }]}>
            <Pencil size={20} color={colors.text} />
          </Pressable>
        </View>
      );
    }

    return (
      <View style={[styles.container, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Pressable onPress={onStart} disabled={isStarting} style={styles.startButtonWrapper}>
          <LinearGradient
            colors={[colors.warmOrange, "#D97706"]}
            style={styles.startButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isStarting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
                <Text style={styles.startButtonText}>
                  {t("menu_crud.start_menu")}
                </Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        <Pressable onPress={onEdit} style={[styles.iconButton, { backgroundColor: colors.surface }]}>
          <Pencil size={20} color={colors.text} />
        </Pressable>

        <Pressable onPress={handleDelete} style={[styles.iconButton, { backgroundColor: colors.error + "15" }]}>
          <Trash2 size={20} color={colors.error} />
        </Pressable>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 28,
    gap: 10,
    borderTopWidth: 1,
  },
  startButtonWrapper: {
    flex: 1,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    gap: 10,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  stopButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  stopButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});
