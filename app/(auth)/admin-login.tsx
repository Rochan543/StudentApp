import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

export default function AdminLoginScreen() {
  const insets = useSafeAreaInsets();
  const { adminLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  async function handleAdminLogin() {
    if (!email.trim() || !password.trim() || !adminKey.trim()) {
      setError("All fields are required");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await adminLogin(email.trim(), password, adminKey.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e.message || "Authentication failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + webTopInset + 20,
            paddingBottom: insets.bottom + webBottomInset + 20,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>

        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>Admin Access</Text>
          <Text style={styles.subtitle}>Secure authentication required</Text>
        </View>

        {!!error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={18} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="key-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Admin secret key"
              placeholderTextColor={Colors.textTertiary}
              value={adminKey}
              onChangeText={setAdminKey}
              secureTextEntry={!showKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable onPress={() => setShowKey(!showKey)} style={styles.eyeButton}>
              <Ionicons name={showKey ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Admin email"
              placeholderTextColor={Colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [styles.loginButton, pressed && styles.pressed]}
            onPress={handleAdminLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Authenticate</Text>
            )}
          </Pressable>

          <View style={styles.securityNote}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.textTertiary} />
            <Text style={styles.securityNoteText}>
              This portal is for authorized administrators only. All access attempts are logged.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D1117" },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  backButton: { width: 44, height: 44, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 36 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: "#E74C3C",
    justifyContent: "center", alignItems: "center", marginBottom: 16,
    shadowColor: "#E74C3C", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#F0F6FC", marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#8B949E" },
  errorContainer: {
    flexDirection: "row", alignItems: "center", backgroundColor: "rgba(231,76,60,0.15)",
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 16, gap: 8,
  },
  errorText: { fontFamily: "Inter_500Medium", fontSize: 14, color: "#E74C3C", flex: 1 },
  form: { gap: 16 },
  inputContainer: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#161B22",
    borderRadius: 14, borderWidth: 1, borderColor: "#30363D", paddingHorizontal: 16, height: 54,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: "#F0F6FC" },
  eyeButton: { padding: 4 },
  loginButton: {
    backgroundColor: "#E74C3C", borderRadius: 14, height: 54,
    justifyContent: "center", alignItems: "center", marginTop: 8,
    shadowColor: "#E74C3C", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  loginButtonText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  securityNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 12,
    paddingHorizontal: 4,
  },
  securityNoteText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8B949E", flex: 1, lineHeight: 18 },
});
