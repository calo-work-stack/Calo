import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";

interface InstructionStepsProps {
  instructions: string;
}

export const InstructionSteps = React.memo(
  ({ instructions }: InstructionStepsProps) => {
    const { colors } = useTheme();
    const { t } = useTranslation();

    const steps = useMemo(() => {
      if (!instructions) return [];
      // Split on numbered patterns like "1. ", "2. " etc.
      const parts = instructions
        .split(/\n?\d+\.\s*/)
        .filter((s) => s.trim().length > 0);
      return parts;
    }, [instructions]);

    // Fallback to plain text if no numbered steps detected
    if (steps.length <= 1 && !instructions.match(/\d+\.\s/)) {
      return (
        <View style={styles.plainContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("active_menu.instructions", "Instructions")}
          </Text>
          <View style={[styles.plainBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.plainText, { color: colors.textSecondary }]}>
              {instructions}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("instructions.cooking_steps", "Cooking Steps")}
        </Text>
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              {/* Connector line */}
              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    { backgroundColor: colors.warmOrange + "30" },
                  ]}
                />
              )}
              {/* Numbered circle */}
              <View
                style={[
                  styles.stepCircle,
                  { backgroundColor: colors.warmOrange },
                ]}
              >
                <Text style={styles.stepNumber}>{index + 1}</Text>
              </View>
              {/* Step text */}
              <View style={styles.stepTextContainer}>
                <Text style={[styles.stepText, { color: colors.text }]}>
                  {step.trim()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  stepsContainer: {
    gap: 0,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingBottom: 12,
    position: "relative",
  },
  connector: {
    position: "absolute",
    left: 13,
    top: 28,
    width: 2,
    bottom: 0,
    borderRadius: 1,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 1,
  },
  stepNumber: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  stepTextContainer: {
    flex: 1,
    paddingTop: 4,
  },
  stepText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500",
  },
  plainContainer: {
    gap: 8,
  },
  plainBox: {
    padding: 14,
    borderRadius: 14,
  },
  plainText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
