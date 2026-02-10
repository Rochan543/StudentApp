import React from "react";
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
import { apiGet } from "@/lib/api";
import Colors from "@/constants/colors";

export default function StudentRoadmapScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: roadmap, isLoading, refetch } = useQuery({
    queryKey: ["my-roadmap"],
    queryFn: () => apiGet("/api/my-roadmap"),
  });

  const items = (roadmap?.items || []).sort(
    (a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0)
  );

  function handleItemPress(item: any) {
    if (!item.isUnlocked || item.isCompleted) return;
    router.push({ pathname: "/course/[id]", params: { id: item.courseId?.toString() || item.course?.id?.toString() } });
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Pressable testID="back-button" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>My Roadmap</Text>
        <View style={{ width: 22 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : !roadmap || items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="map-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>No roadmap assigned</Text>
          <Text style={styles.emptySubtext}>Your instructor will assign a learning path for you</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} />}
        >
          <View style={styles.progressSummary}>
            <Text style={styles.progressTitle}>Your Progress</Text>
            <Text style={styles.progressCount}>
              {items.filter((i: any) => i.isCompleted).length} / {items.length} completed
            </Text>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: items.length > 0
                      ? `${(items.filter((i: any) => i.isCompleted).length / items.length) * 100}%`
                      : "0%",
                  },
                ]}
              />
            </View>
          </View>

          {items.map((item: any, index: number) => {
            const isLocked = !item.isUnlocked;
            const isCompleted = item.isCompleted;
            const isActive = item.isUnlocked && !item.isCompleted;
            const courseTitle = item.course?.title || `Course ${item.courseId}`;

            return (
              <View key={item.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineDot,
                      isCompleted
                        ? styles.dotCompleted
                        : isActive
                        ? styles.dotActive
                        : styles.dotLocked,
                    ]}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : isLocked ? (
                      <Ionicons name="lock-closed" size={12} color="#fff" />
                    ) : (
                      <Ionicons name="play" size={12} color="#fff" />
                    )}
                  </View>
                  {index < items.length - 1 && (
                    <View
                      style={[
                        styles.timelineLine,
                        isCompleted ? styles.lineCompleted : styles.lineDefault,
                      ]}
                    />
                  )}
                </View>

                <Pressable
                  style={[
                    styles.timelineCard,
                    isLocked && styles.timelineCardLocked,
                    isActive && styles.timelineCardActive,
                    isCompleted && styles.timelineCardCompleted,
                  ]}
                  onPress={() => handleItemPress(item)}
                  disabled={isLocked || isCompleted}
                >
                  <View style={styles.timelineCardHeader}>
                    <View
                      style={[
                        styles.courseIconWrap,
                        {
                          backgroundColor: isCompleted
                            ? Colors.successLight
                            : isActive
                            ? "#EEF2FF"
                            : Colors.borderLight,
                        },
                      ]}
                    >
                      <Ionicons
                        name={isCompleted ? "checkmark-circle" : isLocked ? "lock-closed" : "book"}
                        size={18}
                        color={isCompleted ? Colors.success : isActive ? Colors.primary : Colors.textTertiary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.courseTitle,
                          isLocked && styles.courseTitleLocked,
                        ]}
                        numberOfLines={2}
                      >
                        {courseTitle}
                      </Text>
                      <Text style={styles.stepLabel}>Step {index + 1}</Text>
                    </View>
                    {isActive && (
                      <Ionicons name="arrow-forward-circle" size={22} color={Colors.primary} />
                    )}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  progressSummary: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  progressTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text },
  progressCount: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 4, marginBottom: 12 },
  progressBarBg: { height: 8, backgroundColor: Colors.borderLight, borderRadius: 4, overflow: "hidden" },
  progressBarFill: { height: 8, backgroundColor: Colors.primary, borderRadius: 4 },
  timelineItem: { flexDirection: "row", minHeight: 80 },
  timelineLeft: { alignItems: "center", width: 36, marginRight: 12 },
  timelineDot: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", zIndex: 1 },
  dotCompleted: { backgroundColor: Colors.success },
  dotActive: { backgroundColor: Colors.primary },
  dotLocked: { backgroundColor: Colors.textTertiary },
  timelineLine: { width: 2, flex: 1, marginVertical: 2 },
  lineCompleted: { backgroundColor: Colors.success },
  lineDefault: { backgroundColor: Colors.borderLight },
  timelineCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  timelineCardLocked: { opacity: 0.5 },
  timelineCardActive: { borderColor: Colors.primary + "40", backgroundColor: Colors.primary + "05" },
  timelineCardCompleted: { borderColor: Colors.success + "30" },
  timelineCardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  courseIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  courseTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  courseTitleLocked: { color: Colors.textTertiary },
  stepLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textTertiary, marginTop: 2 },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary, textAlign: "center", paddingHorizontal: 40 },
});
