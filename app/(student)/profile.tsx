import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { apiPut } from "@/lib/api";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, refreshUser } = useAuth();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [college, setCollege] = useState(user?.college || "");
  const [skills, setSkills] = useState(user?.skills || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await apiPut("/api/auth/profile", { name, phone, college, skills });
      await refreshUser();
      setEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace("/(auth)/login");
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + webTopInset + 16, paddingBottom: 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Pressable onPress={() => editing ? handleSave() : setEditing(true)}>
          {saving ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons name={editing ? "checkmark" : "create-outline"} size={24} color={Colors.primary} />
          )}
        </Pressable>
      </View>

      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={Colors.primary} />
        </View>
        <Text style={styles.avatarName}>{user?.name}</Text>
        <Text style={styles.avatarEmail}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Personal Information</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Full Name</Text>
          {editing ? (
            <TextInput style={styles.fieldInput} value={name} onChangeText={setName} />
          ) : (
            <Text style={styles.fieldValue}>{user?.name || "Not set"}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Phone</Text>
          {editing ? (
            <TextInput style={styles.fieldInput} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Enter phone" placeholderTextColor={Colors.textTertiary} />
          ) : (
            <Text style={styles.fieldValue}>{user?.phone || "Not set"}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>College / University</Text>
          {editing ? (
            <TextInput style={styles.fieldInput} value={college} onChangeText={setCollege} placeholder="Enter college" placeholderTextColor={Colors.textTertiary} />
          ) : (
            <Text style={styles.fieldValue}>{user?.college || "Not set"}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Skills</Text>
          {editing ? (
            <TextInput style={[styles.fieldInput, { height: 80 }]} value={skills} onChangeText={setSkills} multiline placeholder="e.g. JavaScript, React, Python" placeholderTextColor={Colors.textTertiary} />
          ) : (
            <Text style={styles.fieldValue}>{user?.skills || "Not set"}</Text>
          )}
        </View>
      </View>

      {editing && (
        <Pressable style={styles.cancelButton} onPress={() => setEditing(false)}>
          <Text style={styles.cancelText}>Cancel Editing</Text>
        </Pressable>
      )}

      <Pressable
        style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  avatarSection: { alignItems: "center", marginBottom: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  avatarName: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  avatarEmail: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  roleBadge: { backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  roleText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" as const },
  section: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.borderLight },
  sectionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 16, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textTertiary, marginBottom: 4 },
  fieldValue: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.text },
  fieldInput: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text, backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  cancelButton: { alignItems: "center", paddingVertical: 12, marginBottom: 12 },
  cancelText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  logoutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: Colors.surface, borderRadius: 14, paddingVertical: 16, gap: 8, borderWidth: 1, borderColor: Colors.errorLight },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.error },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
