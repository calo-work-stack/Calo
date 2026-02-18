import React from "react";
import {
  Home,
  UtensilsCrossed,
  Camera,
  BarChart3,
  Calendar,
  Watch,
  Clock,
  User,
  MessageSquare,
  Scan,
  FileText,
  Shield,
  Settings,
  Bell,
  ChevronRight,
  ChevronLeft,
  Search,
  Heart,
  Star,
  Trash2,
  AlertCircle,
  CheckCircle,
  Info,
  HelpCircle,
  Menu,
  X,
  Plus,
  Minus,
  Edit,
  LogOut,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Globe,
  RefreshCw,
  type LucideIcon,
} from "lucide-react-native";
import { StyleProp, ViewStyle } from "react-native";

// Map common icon names to Lucide icons
type IconName =
  | "home"
  | "home-outline"
  | "restaurant"
  | "restaurant-outline"
  | "camera"
  | "camera-outline"
  | "stats-chart"
  | "stats-chart-outline"
  | "calendar"
  | "calendar-outline"
  | "watch"
  | "watch-outline"
  | "time"
  | "time-outline"
  | "person"
  | "person-outline"
  | "chatbubble"
  | "chatbubble-outline"
  | "barcode"
  | "barcode-outline"
  | "document-text"
  | "document-text-outline"
  | "shield"
  | "shield-outline"
  | "settings"
  | "settings-outline"
  | "notifications"
  | "notifications-outline"
  | "chevron-forward"
  | "chevron-back"
  | "search"
  | "search-outline"
  | "heart"
  | "heart-outline"
  | "star"
  | "star-outline"
  | "trash"
  | "trash-outline"
  | "alert-circle"
  | "alert-circle-outline"
  | "checkmark-circle"
  | "checkmark-circle-outline"
  | "information-circle"
  | "information-circle-outline"
  | "help-circle"
  | "help-circle-outline"
  | "menu"
  | "menu-outline"
  | "close"
  | "close-outline"
  | "add"
  | "add-outline"
  | "remove"
  | "remove-outline"
  | "create"
  | "create-outline"
  | "log-out"
  | "log-out-outline"
  | "mail"
  | "mail-outline"
  | "lock-closed"
  | "lock-closed-outline"
  | "eye"
  | "eye-outline"
  | "eye-off"
  | "eye-off-outline"
  | "arrow-back"
  | "arrow-back-outline"
  | "globe"
  | "globe-outline"
  | "refresh"
  | "refresh-outline";

const ICON_MAP: Record<IconName, LucideIcon> = {
  "home": Home,
  "home-outline": Home,
  "restaurant": UtensilsCrossed,
  "restaurant-outline": UtensilsCrossed,
  "camera": Camera,
  "camera-outline": Camera,
  "stats-chart": BarChart3,
  "stats-chart-outline": BarChart3,
  "calendar": Calendar,
  "calendar-outline": Calendar,
  "watch": Watch,
  "watch-outline": Watch,
  "time": Clock,
  "time-outline": Clock,
  "person": User,
  "person-outline": User,
  "chatbubble": MessageSquare,
  "chatbubble-outline": MessageSquare,
  "barcode": Scan,
  "barcode-outline": Scan,
  "document-text": FileText,
  "document-text-outline": FileText,
  "shield": Shield,
  "shield-outline": Shield,
  "settings": Settings,
  "settings-outline": Settings,
  "notifications": Bell,
  "notifications-outline": Bell,
  "chevron-forward": ChevronRight,
  "chevron-back": ChevronLeft,
  "search": Search,
  "search-outline": Search,
  "heart": Heart,
  "heart-outline": Heart,
  "star": Star,
  "star-outline": Star,
  "trash": Trash2,
  "trash-outline": Trash2,
  "alert-circle": AlertCircle,
  "alert-circle-outline": AlertCircle,
  "checkmark-circle": CheckCircle,
  "checkmark-circle-outline": CheckCircle,
  "information-circle": Info,
  "information-circle-outline": Info,
  "help-circle": HelpCircle,
  "help-circle-outline": HelpCircle,
  "menu": Menu,
  "menu-outline": Menu,
  "close": X,
  "close-outline": X,
  "add": Plus,
  "add-outline": Plus,
  "remove": Minus,
  "remove-outline": Minus,
  "create": Edit,
  "create-outline": Edit,
  "log-out": LogOut,
  "log-out-outline": LogOut,
  "mail": Mail,
  "mail-outline": Mail,
  "lock-closed": Lock,
  "lock-closed-outline": Lock,
  "eye": Eye,
  "eye-outline": Eye,
  "eye-off": EyeOff,
  "eye-off-outline": EyeOff,
  "arrow-back": ArrowLeft,
  "arrow-back-outline": ArrowLeft,
  "globe": Globe,
  "globe-outline": Globe,
  "refresh": RefreshCw,
  "refresh-outline": RefreshCw,
};

export function TabBarIcon({
  style,
  name,
  color,
  size = 28,
}: {
  name: IconName;
  color: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const IconComponent = ICON_MAP[name];

  if (!IconComponent) {
    console.warn(`TabBarIcon: Unknown icon name "${name}"`);
    return <Home size={size} color={color} style={style} />;
  }

  return <IconComponent size={size} color={color} style={style} />;
}
