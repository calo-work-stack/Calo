import { useRef, useEffect } from "react";
import { Animated } from "react-native";

interface AnimationRefs {
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  nutritionCardAnim: Animated.Value;
  scanLineAnim: Animated.Value;
  pulseAnim: Animated.Value;
}

export function useCameraAnimations(
  selectedImage: string | null,
  hasBeenAnalyzed: boolean
) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const nutritionCardAnim = useRef(new Animated.Value(0)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (selectedImage && !hasBeenAnalyzed) {
      const scanAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ])
      );

      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      scanAnimation.start();
      pulseAnimation.start();

      return () => {
        scanAnimation.stop();
        pulseAnimation.stop();
      };
    }
  }, [selectedImage, hasBeenAnalyzed]);

  const playResultsAnimation = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(nutritionCardAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();
  };

  const reset = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    nutritionCardAnim.setValue(0);
    scanLineAnim.setValue(0);
    pulseAnim.setValue(1);
  };

  return {
    animations: {
      fadeAnim,
      slideAnim,
      nutritionCardAnim,
      scanLineAnim,
      pulseAnim,
    },
    playResultsAnimation,
    reset,
  };
}
