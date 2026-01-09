import React from "react";
import { View, StyleSheet } from "react-native";
import { Leaf, Beef, Wheat, Fish, Milk, Egg } from "lucide-react-native";

interface DietaryIconsProps {
  tags: string[];
  size?: number;
  style?: any;
}

const ICON_COLORS = {
  vegan: "#10B981",      // Green
  vegetarian: "#34D399", // Light green
  "gluten-free": "#F59E0B", // Amber
  "dairy-free": "#3B82F6",  // Blue
  meat: "#EF4444",       // Red
  fish: "#06B6D4",       // Cyan
  egg: "#FBBF24",        // Yellow
  "nut-free": "#8B5CF6", // Purple
};

export function DietaryIcons({ tags, size = 16, style }: DietaryIconsProps) {
  if (!tags || tags.length === 0) return null;

  const renderIcon = (tag: string) => {
    const color = ICON_COLORS[tag.toLowerCase() as keyof typeof ICON_COLORS] || "#6B7280";

    switch (tag.toLowerCase()) {
      case "vegan":
        return <Leaf key={tag} size={size} color={color} fill={color} />;
      case "vegetarian":
        return <Leaf key={tag} size={size} color={color} />;
      case "meat":
      case "beef":
      case "chicken":
      case "pork":
        return <Beef key={tag} size={size} color={color} />;
      case "fish":
      case "seafood":
        return <Fish key={tag} size={size} color={color} />;
      case "gluten-free":
      case "gluten":
        return <Wheat key={tag} size={size} color={color} strokeWidth={2.5} />;
      case "dairy-free":
      case "lactose-free":
        return <Milk key={tag} size={size} color={color} />;
      case "egg":
      case "eggs":
        return <Egg key={tag} size={size} color={color} />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, style]}>
      {tags.map((tag) => renderIcon(tag))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
