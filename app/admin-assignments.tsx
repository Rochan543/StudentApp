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

export default function AdminAssignmentsScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: assignments, isLoading, refetch } = useQuery({
    queryKey: ["all-assignments"],
    queryFn: () => apiGet("/api/all-assignments"),
  });

  function formatDate(date: string | null) {
    if (!date) return "No due date";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function isOverdue(date: string | null) {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  function renderAssignment({ item }: { item: any }) {
    const overdue = isOverdue(item.assignment.dueDate);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: Colors.infoLight }]}>
            <Ionicons name="document-text" size={18} color={Colors.info} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.assignmentTitle}>{item.assignment.title}</Text>
            <Text style={styles.courseName}>{item.course?.title || "Unknown Course"}</Text>
          </View>
        </View>
        {item.assignment.description ? (
          <Text style={styles.description} numberOfLines={2}>{item.assignment.description}</Text>
        ) : null}
        <View style={styles.cardFooter}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={overdue ? Colors.error : Colors.textSecondary} />
            <Text style={[styles.metaText, overdue && { color: Colors.error }]}>
              {formatDate(item.assignment.dueDate)}
            </Text>
          </View>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{item.assignment.maxScore} pts</Text>
          </View>
        </View>
        {item.assignment.fileUrl ? (
          <View style={styles.attachmentRow}>
            <Ionicons name="attach" size={14} color={Colors.textTertiary} />
            <Text style={styles.attachmentText}>File attached</Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>All Assignments</Text>
        <View style={{ width: 22 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={assignments || []}
          keyExtractor={(item) => item.assignment.id.toString()}
          renderItem={renderAssignment}
          contentContainerStyle={[styles.list, { paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No assignments found</Text>
              <Text style={styles.emptySubtext}>Assignments will appear here once created in courses</Text>
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
  assignmentTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  courseName: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  description: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 10, lineHeight: 18 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  scoreBadge: { backgroundColor: Colors.primaryLight + "20", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  scoreText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  attachmentRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  attachmentText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
});
