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

interface QuizItem {
  quiz: {
    id: number;
    courseId: number;
    title: string;
    description: string;
    timeLimit: number;
    negativeMarking: boolean;
    isPublished: boolean;
    createdAt: string;
  };
  course: {
    id: number;
    title: string;
  };
}

export default function QuizzesListScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: quizzes, isLoading, refetch } = useQuery({
    queryKey: ["all-quizzes"],
    queryFn: () => apiGet<QuizItem[]>("/api/all-quizzes"),
  });

  const renderItem = ({ item }: { item: QuizItem }) => {
    const isActive = item.quiz.isPublished;

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed, !isActive && styles.cardInactive]}
        onPress={() =>
          router.push({ pathname: "/quiz/[id]", params: { id: item.quiz.id.toString() } })
        }
      >
        <View style={styles.cardTop}>
          <View style={styles.courseBadge}>
            <Text style={styles.courseBadgeText} numberOfLines={1}>{item.course.title}</Text>
          </View>
          <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? Colors.success : Colors.textTertiary }]} />
            <Text style={[styles.statusText, { color: isActive ? Colors.success : Colors.textTertiary }]}>
              {isActive ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>
        <View style={styles.cardRow}>
          <View style={[styles.iconWrap, { backgroundColor: isActive ? "#EEF2FF" : Colors.borderLight }]}>
            <Ionicons name="help-circle" size={20} color={isActive ? Colors.primary : Colors.textTertiary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, !isActive && { color: Colors.textSecondary }]} numberOfLines={2}>
              {item.quiz.title}
            </Text>
            <View style={styles.metaRow}>
              {item.quiz.timeLimit > 0 && (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
                  <Text style={styles.metaText}>{item.quiz.timeLimit} min</Text>
                </View>
              )}
              {item.quiz.negativeMarking && (
                <View style={styles.metaItem}>
                  <Ionicons name="remove-circle-outline" size={13} color={Colors.textSecondary} />
                  <Text style={styles.metaText}>Neg. marking</Text>
                </View>
              )}
            </View>
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
        <Text style={styles.headerTitle}>Quizzes</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={quizzes || []}
          keyExtractor={(item) => item.quiz.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="help-circle-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No quizzes available</Text>
              <Text style={styles.emptySubtext}>Quizzes from your courses will appear here</Text>
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
  cardInactive: { opacity: 0.7 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  courseBadge: { backgroundColor: "#EEF2FF", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, maxWidth: "55%" as any },
  courseBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusActive: { backgroundColor: Colors.successLight },
  statusInactive: { backgroundColor: Colors.borderLight },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
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
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
});
