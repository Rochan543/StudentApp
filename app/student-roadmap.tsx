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
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

export default function StudentRoadmapScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const queryClient = useQueryClient();

  const { data: roadmap, isLoading, refetch } = useQuery({
    queryKey: ["my-roadmap"],
    queryFn: () => apiGet("/api/my-roadmap"),
  });

  const requestUnlockMutation = useMutation({
    mutationFn: (itemId: number) => apiPost(`/api/roadmap-items/${itemId}/request-unlock`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-roadmap"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      if (Platform.OS === "web") {
        window.alert(error.message || "Failed to send request");
      } else {
        Alert.alert("Error", error.message || "Failed to send request");
      }
    },
  });

  const items = (roadmap?.items || []).sort(
    (a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0)
  );

  function handleItemPress(item: any) {
    if (!item.isUnlocked || item.isCompleted) return;
    router.push({ pathname: "/course/[id]", params: { id: item.courseId?.toString() || item.course?.id?.toString() } });
  }

  function handleRequestUnlock(item: any) {
    if (item.unlockRequested) return;
    requestUnlockMutation.mutate(item.id);
  }

  function openLink(url: string) {
    if (!url) return;
    Linking.openURL(url).catch(() => {});
  }

  function hasResources(item: any) {
    return item.brochureUrl || item.videoUrl || item.cheatSheetUrl || item.tipsUrl || item.telegramLink || item.whatsappLink;
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
            const showResources = item.isUnlocked && hasResources(item);

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

                <View style={{ flex: 1, marginBottom: 12 }}>
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

                  {isLocked && !item.unlockRequested && (
                    <Pressable
                      style={styles.requestUnlockBtn}
                      onPress={() => handleRequestUnlock(item)}
                      disabled={requestUnlockMutation.isPending}
                    >
                      <Ionicons name="key-outline" size={14} color={Colors.primary} />
                      <Text style={styles.requestUnlockText}>Request Unlock</Text>
                    </Pressable>
                  )}

                  {isLocked && item.unlockRequested && (
                    <View style={styles.requestedBadge}>
                      <Ionicons name="time-outline" size={14} color="#E65100" />
                      <Text style={styles.requestedText}>Unlock Requested - Pending Approval</Text>
                    </View>
                  )}

                  {showResources && (
                    <View style={styles.resourcesContainer}>
                      <Text style={styles.resourcesTitle}>Resources</Text>
                      {item.brochureUrl && (
                        <Pressable style={styles.resourceLink} onPress={() => openLink(item.brochureUrl)}>
                          <Ionicons name="document-text" size={16} color={Colors.primary} />
                          <Text style={styles.resourceLinkText}>Course Brochure</Text>
                          <Ionicons name="open-outline" size={14} color={Colors.textTertiary} />
                        </Pressable>
                      )}
                      {item.videoUrl && (
                        <Pressable style={styles.resourceLink} onPress={() => openLink(item.videoUrl)}>
                          <Ionicons name="videocam" size={16} color="#E53935" />
                          <Text style={styles.resourceLinkText}>Video</Text>
                          <Ionicons name="open-outline" size={14} color={Colors.textTertiary} />
                        </Pressable>
                      )}
                      {item.cheatSheetUrl && (
                        <Pressable style={styles.resourceLink} onPress={() => openLink(item.cheatSheetUrl)}>
                          <Ionicons name="newspaper" size={16} color="#FF9800" />
                          <Text style={styles.resourceLinkText}>Cheat Sheet</Text>
                          <Ionicons name="open-outline" size={14} color={Colors.textTertiary} />
                        </Pressable>
                      )}
                      {item.tipsUrl && (
                        <Pressable style={styles.resourceLink} onPress={() => openLink(item.tipsUrl)}>
                          <Ionicons name="bulb" size={16} color="#7C4DFF" />
                          <Text style={styles.resourceLinkText}>Tips & Tricks</Text>
                          <Ionicons name="open-outline" size={14} color={Colors.textTertiary} />
                        </Pressable>
                      )}
                      {item.telegramLink && (
                        <Pressable style={styles.resourceLink} onPress={() => openLink(item.telegramLink)}>
                          <Ionicons name="paper-plane" size={16} color="#0088cc" />
                          <Text style={styles.resourceLinkText}>Telegram Channel</Text>
                          <Ionicons name="open-outline" size={14} color={Colors.textTertiary} />
                        </Pressable>
                      )}
                      {item.whatsappLink && (
                        <Pressable style={styles.resourceLink} onPress={() => openLink(item.whatsappLink)}>
                          <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                          <Text style={styles.resourceLinkText}>WhatsApp Group</Text>
                          <Ionicons name="open-outline" size={14} color={Colors.textTertiary} />
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
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
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
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
  requestUnlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary + "40",
    backgroundColor: Colors.primary + "08",
  },
  requestUnlockText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  requestedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: "#FFF3E0",
  },
  requestedText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#E65100" },
  resourcesContainer: {
    marginTop: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  resourcesTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 8 },
  resourceLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  resourceLinkText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text, flex: 1 },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary, textAlign: "center", paddingHorizontal: 40 },
});
