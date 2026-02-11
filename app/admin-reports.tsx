import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import Colors from "@/constants/colors";

interface StatCard {
  id: string;
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

export default function AdminReportsScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiGet("/api/admin/stats"),
  });

  const { data: leaderboard, isLoading: leaderLoading, refetch: refetchLeader } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => apiGet("/api/leaderboard"),
  });

  const { data: enrollments, refetch: refetchEnrollments } = useQuery({
    queryKey: ["enrollments"],
    queryFn: () => apiGet("/api/enrollments"),
  });

  const isLoading = statsLoading || leaderLoading;

  function handleRefresh() {
    refetchStats();
    refetchLeader();
    refetchEnrollments();
  }

  const statCards: StatCard[] = [
    {
      id: "students",
      title: "Total Students",
      value: stats?.totalStudents ?? 0,
      icon: "people",
      color: Colors.primary,
      bgColor: Colors.infoLight,
    },
    {
      id: "courses",
      title: "Total Courses",
      value: stats?.totalCourses ?? 0,
      icon: "book",
      color: Colors.success,
      bgColor: Colors.successLight,
    },
    {
      id: "enrollments",
      title: "Total Enrollments",
      value: stats?.totalEnrollments ?? 0,
      icon: "school",
      color: Colors.warning,
      bgColor: Colors.warningLight,
    },
    {
      id: "attendance",
      title: "Total Attendance",
      value: stats?.totalAttendance ?? 0,
      icon: "calendar",
      color: "#0097A7",
      bgColor: "#E0F7FA",
    },
    {
      id: "submissions",
      title: "Assignment Submissions",
      value: stats?.totalSubmissions ?? 0,
      icon: "document-text",
      color: "#7B1FA2",
      bgColor: "#F3E5F5",
    },
    {
      id: "assignment-score",
      title: "Avg Assignment Score",
      value: stats?.reviewedSubmissions
        ? Math.round(stats.totalAssignmentMarks / stats.reviewedSubmissions)
        : 0,
      icon: "ribbon",
      color: "#E65100",
      bgColor: "#FFF3E0",
    },
    {
      id: "revenue",
      title: "Total Revenue",
      value: stats?.totalRevenue ? `$${Number(stats.totalRevenue).toLocaleString()}` : "$0",
      icon: "cash",
      color: Colors.accent,
      bgColor: Colors.accentLight + "40",
    },
  ];

  const topPerformers = (leaderboard || []).slice(0, 10);
  const rankColors = ["#FFD700", "#C0C0C0", "#CD7F32"];

  const sections = [
    { type: "stats" as const, data: statCards },
    { type: "leaderboard-header" as const },
    ...(topPerformers.length > 0
      ? topPerformers.map((item: any, index: number) => ({
          type: "leaderboard-item" as const,
          item,
          index,
        }))
      : [{ type: "leaderboard-empty" as const }]),
    { type: "enrollment-header" as const },
    { type: "enrollment-summary" as const },
  ];

  function renderSection({ item }: { item: any }) {
    switch (item.type) {
      case "stats":
        return (
          <View style={styles.statsGrid}>
            {item.data.map((stat: StatCard) => (
              <View key={stat.id} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: stat.bgColor }]}>
                  <Ionicons name={stat.icon} size={20} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statTitle}>{stat.title}</Text>
              </View>
            ))}
          </View>
        );

      case "leaderboard-header":
        return (
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={18} color={Colors.warning} />
            <Text style={styles.sectionTitle}>Top 10 Performers</Text>
          </View>
        );

      case "leaderboard-item":
        return (
          <View style={styles.rankCard}>
            <View style={[styles.rankBadge, item.index < 3 && { backgroundColor: rankColors[item.index] }]}>
              {item.index < 3 ? (
                <Ionicons name="trophy" size={14} color="#fff" />
              ) : (
                <Text style={styles.rankNum}>{item.index + 1}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rankName}>{item.item.user.name}</Text>
              <Text style={styles.rankBreakdown}>
                Quiz: {item.item.entry.quizPoints} | Assign: {item.item.entry.assignmentPoints} | Attend: {item.item.entry.attendancePoints}
              </Text>
            </View>
            <View style={styles.pointsContainer}>
              <Text style={styles.pointsValue}>{Math.round(item.item.entry.totalPoints)}</Text>
              <Text style={styles.pointsLabel}>pts</Text>
            </View>
          </View>
        );

      case "leaderboard-empty":
        return (
          <View style={styles.emptySection}>
            <Ionicons name="trophy-outline" size={32} color={Colors.textTertiary} />
            <Text style={styles.emptySectionText}>No leaderboard data yet</Text>
          </View>
        );

      case "enrollment-header":
        return (
          <View style={styles.sectionHeader}>
            <Ionicons name="bar-chart" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Enrollment Overview</Text>
          </View>
        );

      case "enrollment-summary":
        const totalEnrolled = Array.isArray(enrollments) ? enrollments.length : 0;
        return (
          <View style={styles.enrollmentCard}>
            <View style={styles.enrollmentRow}>
              <View style={styles.enrollmentStat}>
                <Text style={styles.enrollmentValue}>{totalEnrolled}</Text>
                <Text style={styles.enrollmentLabel}>Total Enrollments</Text>
              </View>
              <View style={styles.enrollmentDivider} />
              <View style={styles.enrollmentStat}>
                <Text style={styles.enrollmentValue}>{stats?.totalCourses ?? 0}</Text>
                <Text style={styles.enrollmentLabel}>Active Courses</Text>
              </View>
              <View style={styles.enrollmentDivider} />
              <View style={styles.enrollmentStat}>
                <Text style={styles.enrollmentValue}>
                  {stats?.totalCourses ? Math.round(totalEnrolled / (stats.totalCourses || 1)) : 0}
                </Text>
                <Text style={styles.enrollmentLabel}>Avg per Course</Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Pressable testID="back-button" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Reports</Text>
        <View style={{ width: 22 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(_, index) => index.toString()}
          renderItem={renderSection}
          contentContainerStyle={[styles.list, { paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  list: { paddingHorizontal: 20, paddingTop: 16 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 8 },
  statCard: {
    width: "47%" as any,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  statValue: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  statTitle: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary, marginTop: 4 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text },
  rankCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.textTertiary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankNum: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },
  rankName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  rankBreakdown: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  pointsContainer: { alignItems: "center" },
  pointsValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.primary },
  pointsLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  emptySection: { alignItems: "center", paddingVertical: 30, gap: 8 },
  emptySectionText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  enrollmentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  enrollmentRow: { flexDirection: "row", alignItems: "center" },
  enrollmentStat: { flex: 1, alignItems: "center" },
  enrollmentValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text },
  enrollmentLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 4, textAlign: "center" },
  enrollmentDivider: { width: 1, height: 40, backgroundColor: Colors.borderLight },
});
