import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import Colors from "@/constants/colors";

interface AssignmentItem {
  assignment: {
    id: number;
    courseId: number;
    title: string;
    description: string;
    dueDate: string;
    maxScore: number;
    fileUrl: string | null;
    createdAt: string;
  };
  course: {
    id: number;
    title: string;
  };
}

export default function AssignmentsListScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: assignments, isLoading, refetch } = useQuery({
    queryKey: ["all-assignments"],
    queryFn: () => apiGet<AssignmentItem[]>("/api/all-assignments"),
  });

  const now = new Date();

  const isOverdue = (dueDate: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < now;
  };

  const sorted = [...(assignments || [])].sort((a, b) => {
    const aDate = a.assignment.dueDate ? new Date(a.assignment.dueDate).getTime() : Infinity;
    const bDate = b.assignment.dueDate ? new Date(b.assignment.dueDate).getTime() : Infinity;
    return aDate - bDate;
  });

  const renderItem = ({ item }: { item: AssignmentItem }) => {
    const overdue = isOverdue(item.assignment.dueDate);

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={() =>
          router.push({ pathname: "/assignment/[id]", params: { id: item.assignment.id.toString() } })
        }
      >
        <View style={styles.cardTop}>
          <View style={styles.courseBadge}>
            <Text style={styles.courseBadgeText} numberOfLines={1}>{item.course.title}</Text>
          </View>
          {overdue && (
            <View style={styles.overdueBadge}>
              <Ionicons name="alert-circle" size={12} color={Colors.error} />
              <Text style={styles.overdueText}>Overdue</Text>
            </View>
          )}
        </View>
        <View style={styles.cardRow}>
          <View style={[styles.iconWrap, overdue ? { backgroundColor: Colors.errorLight } : { backgroundColor: "#EEF2FF" }]}>
            <Ionicons name="document-text" size={20} color={overdue ? Colors.error : Colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.assignment.title}</Text>
            {item.assignment.dueDate && (
              <View style={styles.dueDateRow}>
                <Ionicons name="time-outline" size={13} color={overdue ? Colors.error : Colors.textSecondary} />
                <Text style={[styles.dueDate, overdue && { color: Colors.error }]}>
                  Due: {new Date(item.assignment.dueDate).toLocaleDateString()} at{" "}
                  {new Date(item.assignment.dueDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            )}
            {item.assignment.maxScore > 0 && (
              <Text style={styles.maxScore}>Max Score: {item.assignment.maxScore}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Pressable testID="back-button" onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Assignments</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.assignment.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No assignments yet</Text>
              <Text style={styles.emptySubtext}>Assignments from your courses will appear here</Text>
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
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  courseBadge: { backgroundColor: "#EEF2FF", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, maxWidth: "60%" as any },
  courseBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  overdueBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: Colors.errorLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  overdueText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.error },
  cardRow: { flexDirection: "row", alignItems: "center" },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  dueDateRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  dueDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  maxScore: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary, marginTop: 2 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
});
