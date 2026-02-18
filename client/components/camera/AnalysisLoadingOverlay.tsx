import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  Sparkles,
  Scan,
  Utensils,
  Calculator,
  Lightbulb,
  CheckCircle,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/context/ThemeContext";
import { AnalysisPhase } from "@/hooks/camera/useMealAnalysis";

const { width, height } = Dimensions.get("window");

interface AnalysisLoadingOverlayProps {
  visible: boolean;
  currentPhase?: AnalysisPhase;
  progress?: number;
  statusMessage?: string;
}

const STEPS = [
  { key: "step1", icon: Scan, color: "#3B82F6", phase: "uploading" as AnalysisPhase },
  { key: "step2", icon: Utensils, color: "#10B981", phase: "processing" as AnalysisPhase },
  { key: "step3", icon: Calculator, color: "#8B5CF6", phase: "analyzing" as AnalysisPhase },
  { key: "step4", icon: Lightbulb, color: "#F59E0B", phase: "generating" as AnalysisPhase },
];

const PHASE_TO_STEP: Record<string, number> = {
  idle: -1,
  uploading: 0,
  processing: 1,
  analyzing: 2,
  generating: 3,
  complete: 4,
};

export const AnalysisLoadingOverlay: React.FC<AnalysisLoadingOverlayProps> = ({
  visible,
  currentPhase = 'idle',
  progress = 0,
  statusMessage,
}) => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  // Step animations
  const stepAnimations = STEPS.map(() => useRef(new Animated.Value(0)).current);

  // Determine current step from phase
  const currentStep = PHASE_TO_STEP[currentPhase] ?? -1;

  // Elapsed time counter
  useEffect(() => {
    if (visible) {
      setElapsedSeconds(0);
      const interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedSeconds(0);
    }
  }, [visible]);

  // Animate progress bar based on prop
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  useEffect(() => {
    if (visible) {
      // Fade in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous rotation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 6000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();

      // Glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.5,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Animate steps based on currentPhase prop
  useEffect(() => {
    stepAnimations.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: index === currentStep ? 1 : 0,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
  }, [currentStep]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <BlurView intensity={isDark ? 80 : 60} tint="dark" style={styles.blur}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Animated background rings */}
          <View style={styles.ringsContainer}>
            <Animated.View
              style={[
                styles.middleRing,
                {
                  opacity: glowAnim,
                  transform: [
                    { rotate: rotation },
                    { scale: pulseAnim },
                  ],
                  borderColor: colors.primary + "60",
                },
              ]}
            />
            <Animated.View
              style={[
                styles.innerRing,
                {
                  transform: [{ scale: pulseAnim }],
                  backgroundColor: colors.primary + "20",
                },
              ]}
            />
          </View>

          {/* Center icon */}
          <Animated.View
            style={[
              styles.iconContainer,
            ]}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryContainer || colors.primary]}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Sparkles size={48} color="#FFF" strokeWidth={2} />
            </LinearGradient>
          </Animated.View>

          {/* Title */}
          <Text style={styles.title}>{t("camera.analysisLoader.title")}</Text>
          <Text style={styles.subtitle}>
            {statusMessage || t("camera.analysisLoader.subtitle")}
          </Text>

          {/* Elapsed time */}
          <Text style={styles.elapsedTime}>{formatElapsed(elapsedSeconds)}</Text>

          {/* Step indicators */}
          <View style={styles.stepsContainer}>
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <Animated.View
                  key={step.key}
                  style={[
                    styles.stepItem,
                    {
                      opacity: stepAnimations[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 1],
                      }),
                      transform: [
                        {
                          scale: stepAnimations[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.9, 1.1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.stepIconContainer,
                      {
                        backgroundColor: isActive
                          ? step.color + "20"
                          : isCompleted
                          ? "#10B981" + "20"
                          : colors.border + "40",
                        borderColor: isActive
                          ? step.color
                          : isCompleted
                          ? "#10B981"
                          : "transparent",
                      },
                    ]}
                  >
                    {isCompleted ? (
                      <CheckCircle size={20} color="#10B981" strokeWidth={2.5} />
                    ) : (
                      <StepIcon
                        size={20}
                        color={isActive ? step.color : colors.textSecondary}
                        strokeWidth={2}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepText,
                      {
                        color: isActive
                          ? "#FFF"
                          : isCompleted
                          ? "#10B981"
                          : "rgba(255,255,255,0.5)",
                        fontWeight: isActive ? "700" : "500",
                      },
                    ]}
                  >
                    {t(`camera.analysisLoader.${step.key}`)}
                  </Text>
                </Animated.View>
              );
            })}
          </View>

          {/* Progress bar - prop driven */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ["0%", "100%"],
                    }),
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
          </View>

          {/* Tip */}
          <View style={styles.tipContainer}>
            <Lightbulb size={14} color="rgba(255,255,255,0.6)" strokeWidth={2} />
            <Text style={styles.tipText}>{t("camera.analysisLoader.tip")}</Text>
          </View>
        </Animated.View>
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  blur: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  container: {
    width: width * 0.88,
    maxWidth: 400,
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  ringsContainer: {
    position: "absolute",
    top: 20,
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  middleRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
  },
  innerRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  iconContainer: {
    marginBottom: 32,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 15,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.2)",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFF",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  elapsedTime: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255,255,255,0.5)",
    marginBottom: 28,
    letterSpacing: 0.5,
  },
  stepsContainer: {
    width: "100%",
    gap: 12,
    marginBottom: 32,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  stepText: {
    fontSize: 15,
    flex: 1,
  },
  progressContainer: {
    width: "100%",
    marginBottom: 24,
  },
  progressTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
  },
  tipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
  },
});

export default AnalysisLoadingOverlay;
