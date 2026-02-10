import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiGet } from "@/lib/api";
import Colors from "@/constants/colors";

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiGet("/api/admin/stats"),
  });

  const { data: unreadCount, refetch: refetchNotifs } = useQuery({
    queryKey: ["unread-count"],
    queryFn: () => apiGet("/api/notifications/unread-count"),
  });

  const onRefresh = useCallback(() => {
    refetch();
    refetchNotifs();
  }, []);

  const statItems = [
    { icon: "people" as const, label: "Total Users", value: stats?.totalUsers || 0, color: "#6366F1", bg: "#EEF2FF" },
    { icon: "school" as const, label: "Active Students", value: stats?.activeStudents || 0, color: Colors.success, bg: "#ECFDF5" },
    { icon: "book" as const, label: "Courses", value: stats?.totalCourses || 0, color: Colors.primary, bg: "#DBEAFE" },
    { icon: "card" as const, label: "Enrollments", value: stats?.totalEnrollments || 0, color: Colors.warning, bg: "#FEF3C7" },
  ];

  const quickActions = [
    { icon: "add-circle" as const, label: "New Course", action: () => router.push("/(admin)/courses") },
    { icon: "people" as const, label: "Users", action: () => router.push("/(admin)/users") },
    { icon: "ticket" as const, label: "Coupons", action: () => router.push("/(admin)/settings") },
    { icon: "trophy" as const, label: "Leaderboard", action: () => router.push("/(admin)/settings") },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + webTopInset + 16, paddingBottom: 100 }]}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Admin Panel</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>
        <Pressable
          onPress={() => router.push("/notifications")}
          style={styles.notifButton}
        >
          <Ionicons name="notifications-outline" size={24} color={Colors.text} />
          {(unreadCount?.count || 0) > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount.count}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.statsGrid}>
            {statItems.map((item) => (
              <View key={item.label} style={[styles.statCard, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
                <Text style={styles.statValue}>{item.value}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <Pressable
                key={action.label}
                style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
                onPress={action.action}
              >
                <View style={styles.actionIcon}>
                  <Ionicons name={action.icon} size={24} color={Colors.primary} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  userName: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  notifButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, justifyContent: "center", alignItems: "center", position: "relative" as const },
  badge: { position: "absolute" as const, top: 6, right: 6, backgroundColor: Colors.error, borderRadius: 10, minWidth: 18, height: 18, justifyContent: "center", alignItems: "center", paddingHorizontal: 4 },
  badgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap" as const, gap: 12, marginBottom: 28 },
  statCard: { width: "48%" as any, borderRadius: 16, padding: 16, alignItems: "center" as const, gap: 6, flexGrow: 1, flexBasis: "45%" as any },
  statValue: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.text },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 12 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap" as const, gap: 12 },
  actionCard: { width: "48%" as any, backgroundColor: Colors.surface, borderRadius: 16, padding: 20, alignItems: "center" as const, gap: 10, borderWidth: 1, borderColor: Colors.borderLight, flexGrow: 1, flexBasis: "45%" as any },
  actionIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center" },
  actionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
});
