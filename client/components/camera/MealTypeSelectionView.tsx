import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MealTypeSelector, MealType } from './MealTypeSelector';

interface MealsRemainingInfo {
  remaining: number;
  limit: number;
  used: number;
  canLogMandatory: boolean;
}

interface MealTypeSelectionViewProps {
  onSelect: (mealType: MealType) => void;
  mealsRemaining?: MealsRemainingInfo;
}

export function MealTypeSelectionView({ onSelect, mealsRemaining }: MealTypeSelectionViewProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <MealTypeSelector onSelect={onSelect} mealsRemaining={mealsRemaining} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
});
