import { LucideIcon, Shield } from "lucide-react-native";
import {
  Home,
  Utensils,
  UtensilsCrossed,
  Camera,
  BarChart3,
  Calendar,
  Watch,
  Clock,
  User,
  ChefHat,
  MessageCircle,
  MessageSquare,
  Scan,
  FileText,
  TrophyIcon,
  Settings,
  Bell,
  LogOut,
  Edit,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Plus,
  Minus,
  Search,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  Globe,
  Heart,
  Star,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  HelpCircle,
  Flame,
  Droplets,
  Apple,
  Beef,
  Fish,
  Egg,
  Milk,
  Wheat,
  Leaf,
  Sparkles,
  Zap,
  Target,
  Award,
  Crown,
  Gem,
  Medal,
} from "lucide-react-native";
import React from "react";
import { StyleProp, ViewStyle } from "react-native";

// Comprehensive symbol name mapping for icon consistency
type SupportedSymbolName =
  | "house.fill"
  | "fork.knife"
  | "restaurant"
  | "camera.fill"
  | "chart.bar.fill"
  | "calendar"
  | "watch.digital"
  | "clock.fill"
  | "person.fill"
  | "dining"
  | "message.fill"
  | "message.square"
  | "barcode.viewfinder"
  | "trophy.fill"
  | "shield.fill"
  | "doc.text.fill"
  | "settings"
  | "bell"
  | "logout"
  | "edit"
  | "chevron.right"
  | "chevron.left"
  | "chevron.down"
  | "chevron.up"
  | "xmark"
  | "checkmark"
  | "plus"
  | "minus"
  | "search"
  | "mail"
  | "lock"
  | "eye"
  | "eye.off"
  | "arrow.left"
  | "arrow.right"
  | "globe"
  | "heart"
  | "star"
  | "trash"
  | "refresh"
  | "alert.circle"
  | "check.circle"
  | "info"
  | "help.circle"
  | "flame"
  | "droplets"
  | "apple"
  | "beef"
  | "fish"
  | "egg"
  | "milk"
  | "wheat"
  | "leaf"
  | "sparkles"
  | "zap"
  | "target"
  | "award"
  | "crown"
  | "gem"
  | "medal";

type IconMapping = Record<SupportedSymbolName, LucideIcon>;

const MAPPING: IconMapping = {
  "house.fill": Home,
  "fork.knife": Utensils,
  "restaurant": UtensilsCrossed,
  "camera.fill": Camera,
  "chart.bar.fill": BarChart3,
  calendar: Calendar,
  "watch.digital": Watch,
  "clock.fill": Clock,
  "person.fill": User,
  dining: ChefHat,
  "message.fill": MessageCircle,
  "message.square": MessageSquare,
  "barcode.viewfinder": Scan,
  "doc.text.fill": FileText,
  "trophy.fill": TrophyIcon,
  "shield.fill": Shield,
  "settings": Settings,
  "bell": Bell,
  "logout": LogOut,
  "edit": Edit,
  "chevron.right": ChevronRight,
  "chevron.left": ChevronLeft,
  "chevron.down": ChevronDown,
  "chevron.up": ChevronUp,
  "xmark": X,
  "checkmark": Check,
  "plus": Plus,
  "minus": Minus,
  "search": Search,
  "mail": Mail,
  "lock": Lock,
  "eye": Eye,
  "eye.off": EyeOff,
  "arrow.left": ArrowLeft,
  "arrow.right": ArrowRight,
  "globe": Globe,
  "heart": Heart,
  "star": Star,
  "trash": Trash2,
  "refresh": RefreshCw,
  "alert.circle": AlertCircle,
  "check.circle": CheckCircle,
  "info": Info,
  "help.circle": HelpCircle,
  "flame": Flame,
  "droplets": Droplets,
  "apple": Apple,
  "beef": Beef,
  "fish": Fish,
  "egg": Egg,
  "milk": Milk,
  "wheat": Wheat,
  "leaf": Leaf,
  "sparkles": Sparkles,
  "zap": Zap,
  "target": Target,
  "award": Award,
  "crown": Crown,
  "gem": Gem,
  "medal": Medal,
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: SupportedSymbolName;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  const IconComponent = MAPPING[name];

  if (!IconComponent) {
    console.warn(`Icon "${name}" is not mapped to any Lucide icon.`);
    // Return a fallback icon
    return <FileText size={size} color={color} style={style} />;
  }

  return <IconComponent size={size} color={color} style={style} />;
}
