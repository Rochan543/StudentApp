import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiGet } from "@/lib/api";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

interface MenuItem {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  route: string;
  count?: number;
}

export default function AdminSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: coupons } = useQuery({ queryKey: ["coupons"], queryFn: () => apiGet("/api/coupons") });
  const { data: meetings } = useQuery({ queryKey: ["meetings"], queryFn: () => apiGet("/api/meetings") });
  const { data: banners } = useQuery({ queryKey: ["banners"], queryFn: () => apiGet("/api/banners") });
  const { data: groups } = useQuery({ queryKey: ["groups"], queryFn: () => apiGet("/api/groups") });

  const managementItems: MenuItem[] = [
    { title: "Coupons", subtitle: `${coupons?.length || 0} codes`, icon: "ticket", color: Colors.warning, bg: "#FEF3C7", route: "/admin-coupons" },
    { title: "Banners", subtitle: `${banners?.length || 0} banners`, icon: "megaphone", color: "#8B5CF6", bg: "#EDE9FE", route: "/admin-banners" },
    { title: "Meetings", subtitle: `${meetings?.length || 0} scheduled`, icon: "videocam", color: Colors.primary, bg: "#DBEAFE", route: "/admin-meetings" },
    { title: "Groups", subtitle: `${groups?.length || 0} groups`, icon: "people", color: Colors.accent, bg: "#D1FAE5", route: "/admin-groups" },
  ];

  const contentItems: MenuItem[] = [
    { title: "Assignments", subtitle: "View all assignments", icon: "document-text", color: "#EC4899", bg: "#FCE7F3", route: "/admin-assignments" },
    { title: "Submissions", subtitle: "Review student work", icon: "documents", color: "#0EA5E9", bg: "#E0F2FE", route: "/admin-submissions" },
    { title: "Quizzes", subtitle: "View all quizzes", icon: "help-circle", color: "#F97316", bg: "#FFF7ED", route: "/admin-quizzes" },
    { title: "Leave Requests", subtitle: "Manage student leaves", icon: "calendar-outline", color: "#EF4444", bg: "#FEE2E2", route: "/admin-leave-requests" },
    { title: "Roadmaps", subtitle: "Student learning paths", icon: "map", color: "#14B8A6", bg: "#CCFBF1", route: "/admin-roadmaps" },
    { title: "Reports", subtitle: "Analytics & stats", icon: "bar-chart", color: "#06B6D4", bg: "#CFFAFE", route: "/admin-reports" },
  ];

  async function handleLogout() {
    await logout();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace("/(auth)/login");
  }

  function navigateTo(route: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + webTopInset + 16, paddingBottom: 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Administration</Text>
          <Text style={styles.subtitle}>Manage your learning platform</Text>
        </View>
        <Pressable onPress={() => router.push("/notifications" as any)} style={styles.notifBtn}>
          <Ionicons name="notifications-outline" size={22} color={Colors.text} />
        </Pressable>
      </View>

      <View style={styles.adminCard}>
        <View style={styles.adminAvatar}>
          <Ionicons name="shield-checkmark" size={28} color="#fff" />
        </View>
        <View style={styles.adminInfo}>
          <Text style={styles.adminName}>{user?.name || "Admin"}</Text>
          <Text style={styles.adminEmail}>{user?.email}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>MANAGEMENT</Text>
      <View style={styles.menuGrid}>
        {managementItems.map((item) => (
          <Pressable
            key={item.route}
            style={({ pressed }) => [styles.menuCard, pressed && styles.pressed]}
            onPress={() => navigateTo(item.route)}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <Text style={styles.menuCardTitle}>{item.title}</Text>
            <Text style={styles.menuCardSub}>{item.subtitle}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>CONTENT & ANALYTICS</Text>
      {contentItems.map((item) => (
        <Pressable
          key={item.route}
          style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
          onPress={() => navigateTo(item.route)}
        >
          <View style={[styles.menuRowIcon, { backgroundColor: item.bg }]}>
            <Ionicons name={item.icon} size={20} color={item.color} />
          </View>
          <View style={styles.menuRowInfo}>
            <Text style={styles.menuRowTitle}>{item.title}</Text>
            <Text style={styles.menuRowSub}>{item.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
        </Pressable>
      ))}

      <Text style={[styles.sectionLabel, { marginTop: 28 }]}>ACCOUNT</Text>
      <Pressable style={styles.logoutItem} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  notifBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.surface, justifyContent: "center", alignItems: "center" },
  adminCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.primary, borderRadius: 16, padding: 18, marginBottom: 28 },
  adminAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginRight: 14 },
  adminInfo: { flex: 1 },
  adminName: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  adminEmail: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 2 },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textTertiary, marginBottom: 12, letterSpacing: 0.5 },
  menuGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 28 },
  menuCard: { width: "47%" as any, backgroundColor: Colors.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.borderLight },
  menuIconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  menuCardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  menuCardSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  menuRow: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight },
  menuRowIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 12 },
  menuRowInfo: { flex: 1 },
  menuRowTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  menuRowSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  logoutItem: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: Colors.errorLight },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.error },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
