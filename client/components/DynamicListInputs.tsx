import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { XCircle, PlusCircle } from "lucide-react-native";

interface DynamicListInputsProps {
  placeholder: string;
  label: string;
  onItemsChange: (items: string[]) => void;
  initialItems?: string[];
  maxItems?: number;
}

export default function DynamicListInputs({
  label,
  placeholder,
  onItemsChange,
  initialItems = [],
  maxItems = 10,
}: DynamicListInputsProps) {
  const [items, setItems] = useState<string[]>(initialItems);
  const [inputValue, setInputValue] = useState("");

  const addItem = () => {
    if (inputValue.trim() && items.length < maxItems) {
      const newItems = [...items, inputValue.trim()];
      setItems(newItems);
      setInputValue("");
      onItemsChange(newItems);
    }
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    onItemsChange(newItems);
  };

  const updateItem = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
    onItemsChange(newItems);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{label}</Text>

      <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
        {items.map((item, index) => (
          <View key={index} style={styles.itemContainer}>
            <TextInput
              style={styles.itemInput}
              value={item}
              onChangeText={(value) => updateItem(index, value)}
              placeholder={placeholder}
            />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeItem(index)}
            >
              <XCircle size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {items.length < maxItems && (
        <View style={styles.addContainer}>
          <TextInput
            style={styles.addInput}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder={placeholder}
            onSubmitEditing={addItem}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={addItem}
            disabled={!inputValue.trim()}
          >
            <PlusCircle size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  itemsList: {
    maxHeight: 200,
    marginBottom: 12,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  itemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#F9F9F9",
    marginRight: 8,
  },
  removeButton: {
    padding: 4,
  },
  addContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#F9F9F9",
    marginRight: 8,
  },
  addButton: {
    padding: 4,
  },
});
