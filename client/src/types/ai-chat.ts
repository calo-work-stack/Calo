export interface AIChatScreenProps {
  onClose?: () => void;
  onMinimize?: () => void;
}

export interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
  hasWarning?: boolean;
  allergenWarning?: string[];
  suggestions?: string[];
  isError?: boolean;
}

export interface UserProfile {
  allergies: string[];
  medicalConditions: string[];
  dietaryPreferences: string[];
  goals: string[];
}