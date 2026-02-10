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

export default function AdminQuizzesScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: quizzes, isLoading, refetch } = useQuery({
    queryKey: ["all-quizzes"],
    queryFn: () => apiGet("/api/all-quizzes"),
  });

  function formatTime(minutes: number | null) {
    if (!minutes) return "No limit";
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  function renderQuiz({ item }: { item: any }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: Colors.warningLight }]}>
            <Ionicons name="help-circle" size={18} color={Colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.quizTitle}>{item.quiz.title}</Text>
            <Text style={styles.courseName}>{item.course?.title || "Unknown Course"}</Text>
          </View>
          <View style={[styles.statusBadge, item.quiz.isActive ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={[styles.statusText, item.quiz.isActive ? styles.activeText : styles.inactiveText]}>
              {item.quiz.isActive ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>

        {item.quiz.description ? (
          <Text style={styles.description} numberOfLines={2}>{item.quiz.description}</Text>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.statText}>{formatTime(item.quiz.timeLimit)}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="repeat-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.statText}>{item.quiz.maxAttempts || "Unlimited"} attempts</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.statText}>{item.quiz.passingScore}% to pass</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Pressable testID="back-button" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>All Quizzes</Text>
        <View style={{ width: 22 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={quizzes || []}
          keyExtractor={(item) => item.quiz.id.toString()}
          renderItem={renderQuiz}
          contentContainerStyle={[styles.list, { paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="help-circle-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No quizzes found</Text>
              <Text style={styles.emptySubtext}>Quizzes will appear here once created in courses</Text>
            </View>
          }
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
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconContainer: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  quizTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  courseName: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  activeBadge: { backgroundColor: "#ECFDF5" },
  inactiveBadge: { backgroundColor: Colors.errorLight },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  activeText: { color: Colors.success },
  inactiveText: { color: Colors.error },
  description: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 10, lineHeight: 18 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
});
