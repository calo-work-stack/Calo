// src/Features/design/authDesign.tsx - GLASSMORPHIC DARK STYLE
import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/src/context/ThemeContext";
import { createAuthStyles } from "@/src/Features/theme/authTheme";

// ============= GRADIENT BACKGROUND =============
export const AuthBackground: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { colors } = useTheme();
  const styles = createAuthStyles(colors.primary);

  return (
    <>
      <LinearGradient
        colors={[
          "#0a0a0a",
          colors.primary + "40",
          colors.primary + "50",
          colors.primary + "60",
        ]}
        locations={[0, 0.3, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      />

      <View style={styles.meshGradient1} />
      <View style={styles.meshGradient2} />
      <View style={styles.meshGradient3} />

      <LinearGradient
        colors={[
          "rgba(0, 0, 0, 0.2)",
          "rgba(0, 0, 0, 0.3)",
          "rgba(0, 0, 0, 0.5)",
        ]}
        style={styles.overlayGradient}
      />

      {children}
    </>
  );
};

// ============= AUTH HEADER =============
interface AuthHeaderProps {
  title: string;
  onBackPress: () => void;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({
  title,
  onBackPress,
}) => {
  const { colors } = useTheme();
  const styles = createAuthStyles(colors.primary);

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBackPress}
        activeOpacity={0.8}
      >
        <Ionicons name="chevron-back" size={22} color="white" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
};

// ============= AUTH LOGO SECTION =============
interface AuthLogoSectionProps {
  icon: string;
  title: string;
  subtitle: string;
  emailHighlight?: string;
}

export const AuthLogoSection: React.FC<AuthLogoSectionProps> = ({
  icon,
  title,
  subtitle,
  emailHighlight,
}) => {
  const { colors } = useTheme();
  const styles = createAuthStyles(colors.primary);

  const renderSubtitle = () => {
    if (!emailHighlight) {
      return <Text style={styles.subtitle}>{subtitle}</Text>;
    }

    const parts = subtitle.split(emailHighlight);
    return (
      <Text style={styles.subtitle}>
        {parts[0]}
        <Text style={styles.emailText}>{emailHighlight}</Text>
        {parts[1]}
      </Text>
    );
  };

  return (
    <View style={styles.logoSection}>
      <View style={styles.logoContainer}>
        <Ionicons name={icon as any} size={48} color="white" />
      </View>
      <Text style={styles.title}>{title}</Text>
      {renderSubtitle()}
    </View>
  );
};

// ============= AUTH BUTTON (With gradient like Welcome) =============
interface AuthButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  loadingText?: string;
  style?: any;
  variant?: "primary" | "secondary";
}

export const AuthButton: React.FC<AuthButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  loadingText,
  style,
  variant = "primary",
}) => {
  const { colors } = useTheme();
  const styles = createAuthStyles(colors.primary);

  const isDisabled = disabled || loading;

  if (variant === "secondary") {
    return (
      <TouchableOpacity
        style={[
          styles.secondaryButton,
          isDisabled && styles.primaryButtonDisabled,
          style,
        ]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="white" />
            {loadingText && (
              <Text style={[styles.loadingText, { color: "white" }]}>
                {loadingText}
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.secondaryButtonText}>{title}</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.primaryButton,
        isDisabled && styles.primaryButtonDisabled,
        style,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.9}
        style={{ width: "100%" }}
      >
        <LinearGradient
          colors={["#ffffff", "#f5f5f5"]}
          style={styles.primaryButtonGradient}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              {loadingText && (
                <Text style={styles.loadingText}>{loadingText}</Text>
              )}
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>{title}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// ============= AUTH FOOTER LINK =============
interface AuthFooterLinkProps {
  text: string;
  linkText: string;
  onPress: () => void;
  small?: boolean;
}

export const AuthFooterLink: React.FC<AuthFooterLinkProps> = ({
  text,
  linkText,
  onPress,
  small = false,
}) => {
  const { colors } = useTheme();
  const styles = createAuthStyles(colors.primary);

  return (
    <View style={small ? styles.footerSmall : styles.footer}>
      <Text style={styles.footerText}>{text}</Text>
      <TouchableOpacity onPress={onPress}>
        <Text style={styles.linkText}>{linkText}</Text>
      </TouchableOpacity>
    </View>
  );
};

// ============= AUTH LINK =============
interface AuthLinkProps {
  text: string;
  onPress: () => void;
  align?: "left" | "right" | "center";
}

export const AuthLink: React.FC<AuthLinkProps> = ({
  text,
  onPress,
  align = "right",
}) => {
  const { colors } = useTheme();
  const styles = createAuthStyles(colors.primary);

  const containerStyle = {
    alignSelf:
      align === "left"
        ? "flex-start"
        : align === "right"
          ? "flex-end"
          : "center",
    marginTop: 12,
    marginBottom: 8,
  } as const;

  return (
    <TouchableOpacity style={containerStyle} onPress={onPress}>
      <Text style={styles.link}>{text}</Text>
    </TouchableOpacity>
  );
};

// ============= AUTH CHECKBOX =============
interface AuthCheckboxProps {
  checked: boolean;
  onPress: () => void;
  children: React.ReactNode;
}

export const AuthCheckbox: React.FC<AuthCheckboxProps> = ({
  checked,
  onPress,
  children,
}) => {
  const { colors } = useTheme();
  const styles = createAuthStyles(colors.primary);

  return (
    <TouchableOpacity
      style={styles.privacyContainer}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Ionicons name="checkmark" size={14} color="white" />}
      </View>
      {children}
    </TouchableOpacity>
  );
};

// ============= CODE INPUT GROUP =============
interface CodeInputGroupProps {
  code: string[];
  onCodeChange: (code: string[]) => void;
  inputRefs: React.MutableRefObject<any[]>;
  loading?: boolean;
  focusedIndex?: number;
  onFocusChange?: (index: number) => void;
}

export const CodeInputGroup: React.FC<CodeInputGroupProps> = ({
  code,
  onCodeChange,
  inputRefs,
  loading = false,
  focusedIndex = -1,
  onFocusChange,
}) => {
  const { colors } = useTheme();
  const styles = createAuthStyles(colors.primary);

  const handleCodeChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, "");

    if (digit.length <= 1) {
      const newCode = [...code];
      newCode[index] = digit;
      onCodeChange(newCode);

      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = "";
      onCodeChange(newCode);
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.codeContainer}>
      {code.map((digit, index) => (
        <View key={index}>
          <TextInput
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            style={[
              styles.codeInput,
              digit && styles.codeInputFilled,
              focusedIndex === index && styles.codeInputFocused,
            ]}
            value={digit}
            onChangeText={(text) => handleCodeChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            onFocus={() => onFocusChange?.(index)}
            onBlur={() => onFocusChange?.(-1)}
            keyboardType="number-pad"
            maxLength={1}
            textAlign="center"
            editable={!loading}
            selectTextOnFocus
            autoFocus={index === 0}
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
          />
        </View>
      ))}
    </View>
  );
};

// ============= RESEND CODE SECTION =============
interface ResendCodeSectionProps {
  canResend: boolean;
  onResend: () => void;
  loading?: boolean;
  countdown?: number;
  didntReceiveText: string;
  resendText: string;
  resendInText?: string;
  loadingText?: string;
}

export const ResendCodeSection: React.FC<ResendCodeSectionProps> = ({
  canResend,
  onResend,
  loading = false,
  countdown,
  didntReceiveText,
  resendText,
  resendInText = "Resend in",
  loadingText = "Loading...",
}) => {
  const { colors } = useTheme();
  const styles = createAuthStyles(colors.primary);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.resendContainer}>
      <Text style={styles.resendText}>{didntReceiveText}</Text>
      {canResend ? (
        <TouchableOpacity
          style={styles.resendButton}
          onPress={onResend}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.resendButtonText}>
            {loading ? loadingText : resendText}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.resendDisabledText}>
          {resendInText} {countdown !== undefined ? formatTime(countdown) : ""}
        </Text>
      )}
    </View>
  );
};
