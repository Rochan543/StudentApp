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

export default function StudentDashboard() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: enrollments, isLoading: enrollLoading, refetch: refetchEnrollments } = useQuery({
    queryKey: ["enrollments"],
    queryFn: () => apiGet("/api/enrollments"),
  });

  const { data: meetings, refetch: refetchMeetings } = useQuery({
    queryKey: ["meetings"],
    queryFn: () => apiGet("/api/meetings"),
  });

  const { data: unreadCount, refetch: refetchNotifs } = useQuery({
    queryKey: ["unread-count"],
    queryFn: () => apiGet("/api/notifications/unread-count"),
  });

  const onRefresh = useCallback(() => {
    refetchEnrollments();
    refetchMeetings();
    refetchNotifs();
  }, []);

  const upcomingMeetings = (meetings || [])
    .filter((m: any) => new Date(m.scheduledAt) > new Date())
    .slice(0, 3);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + webTopInset + 16, paddingBottom: 100 }]}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.userName}>{user?.name || "Student"}</Text>
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

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: "#EEF2FF" }]}>
          <Ionicons name="book" size={24} color={Colors.primary} />
          <Text style={styles.statNumber}>{enrollments?.length || 0}</Text>
          <Text style={styles.statLabel}>Enrolled</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#ECFDF5" }]}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
          <Text style={styles.statNumber}>
            {enrollments?.filter((e: any) => e.enrollment.progress >= 100).length || 0}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#FEF3C7" }]}>
          <Ionicons name="calendar" size={24} color={Colors.warning} />
          <Text style={styles.statNumber}>{upcomingMeetings.length}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
      </View>

      {enrollLoading ? (
        <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Courses</Text>
            <Pressable onPress={() => router.push("/(student)/courses")}>
              <Text style={styles.seeAll}>See All</Text>
            </Pressable>
          </View>

          {(!enrollments || enrollments.length === 0) ? (
            <View style={styles.emptyCard}>
              <Ionicons name="school-outline" size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No courses enrolled yet</Text>
              <Pressable
                style={styles.browseButton}
                onPress={() => router.push("/(student)/courses")}
              >
                <Text style={styles.browseButtonText}>Browse Courses</Text>
              </Pressable>
            </View>
          ) : (
            enrollments.slice(0, 3).map((item: any) => (
              <Pressable
                key={item.enrollment.id}
                style={({ pressed }) => [styles.courseCard, pressed && styles.pressed]}
                onPress={() => router.push({ pathname: "/course/[id]", params: { id: item.course.id.toString() } })}
              >
                <View style={styles.courseInfo}>
                  <View style={styles.courseIconWrap}>
                    <Ionicons name="book" size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.courseDetails}>
                    <Text style={styles.courseTitle} numberOfLines={1}>{item.course.title}</Text>
                    <Text style={styles.courseProgress}>{Math.round(item.enrollment.progress)}% complete</Text>
                  </View>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(item.enrollment.progress, 100)}%` }]} />
                </View>
              </Pressable>
            ))
          )}

          {upcomingMeetings.length > 0 && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
              </View>
              {upcomingMeetings.map((meeting: any) => (
                <View key={meeting.id} style={styles.meetingCard}>
                  <View style={styles.meetingIconWrap}>
                    <Ionicons
                      name={meeting.meetingType === "class" ? "videocam" : "people"}
                      size={20}
                      color={Colors.accent}
                    />
                  </View>
                  <View style={styles.meetingInfo}>
                    <Text style={styles.meetingTitle} numberOfLines={1}>{meeting.title}</Text>
                    <Text style={styles.meetingTime}>
                      {new Date(meeting.scheduledAt).toLocaleDateString()} at{" "}
                      {new Date(meeting.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                  <View style={styles.meetingTypeBadge}>
                    <Text style={styles.meetingTypeText}>{meeting.meetingType}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  headerLeft: {},
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  userName: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  notifButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, justifyContent: "center", alignItems: "center", position: "relative" as const },
  badge: { position: "absolute" as const, top: 6, right: 6, backgroundColor: Colors.error, borderRadius: 10, minWidth: 18, height: 18, justifyContent: "center", alignItems: "center", paddingHorizontal: 4 },
  badgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
  statCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: "center", gap: 6 },
  statNumber: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  seeAll: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  emptyCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 32, alignItems: "center", gap: 12, borderWidth: 1, borderColor: Colors.borderLight },
  emptyText: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  browseButton: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, marginTop: 4 },
  browseButtonText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  courseCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.borderLight },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  courseInfo: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  courseIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center", marginRight: 12 },
  courseDetails: { flex: 1 },
  courseTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  courseProgress: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  progressBarBg: { height: 6, backgroundColor: Colors.borderLight, borderRadius: 3, overflow: "hidden" as const },
  progressBarFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
  meetingCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight },
  meetingIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#E0F7FA", justifyContent: "center", alignItems: "center", marginRight: 12 },
  meetingInfo: { flex: 1 },
  meetingTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  meetingTime: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  meetingTypeBadge: { backgroundColor: Colors.accentLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  meetingTypeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.primaryDark, textTransform: "capitalize" as const },
});
