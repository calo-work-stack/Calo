import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MealTypeSelector, MealType } from './MealTypeSelector';

interface MealTypeSelectionViewProps {
  onSelect: (mealType: MealType) => void;
}

export function MealTypeSelectionView({ onSelect }: MealTypeSelectionViewProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <MealTypeSelector onSelect={onSelect} />
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
