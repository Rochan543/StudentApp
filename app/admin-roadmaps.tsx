import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

export default function AdminRoadmapsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRoadmap, setSelectedRoadmap] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<number[]>([]);

  const { data: roadmaps, isLoading, refetch } = useQuery({
    queryKey: ["roadmaps"],
    queryFn: () => apiGet("/api/roadmaps"),
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiGet("/api/users"),
    enabled: showCreateModal,
  });

  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: () => apiGet("/api/courses"),
    enabled: showCreateModal,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/roadmaps", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      resetCreateForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiPut(`/api/roadmap-items/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      if (selectedRoadmap) {
        const updated = (roadmaps || []).find((r: any) => r.id === selectedRoadmap.id);
        if (updated) setSelectedRoadmap(updated);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  function resetCreateForm() {
    setShowCreateModal(false);
    setSelectedUserId(null);
    setSelectedCourses([]);
  }

  function toggleCourse(courseId: number) {
    setSelectedCourses((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  }

  function handleCreate() {
    if (!selectedUserId || selectedCourses.length === 0) return;
    const items = selectedCourses.map((courseId, index) => ({
      courseId,
      orderIndex: index + 1,
    }));
    createMutation.mutate({ userId: selectedUserId, items });
  }

  function openDetail(roadmap: any) {
    setSelectedRoadmap(roadmap);
    setShowDetailModal(true);
  }

  function handleUnlock(itemId: number) {
    updateItemMutation.mutate({ id: itemId, data: { isUnlocked: true } });
  }

  function handleComplete(itemId: number) {
    updateItemMutation.mutate({ id: itemId, data: { isCompleted: true } });
  }

  function renderRoadmap({ item }: { item: any }) {
    const items = item.items || [];
    const completed = items.filter((i: any) => i.isCompleted).length;
    const total = items.length;
    const studentName = item.user?.name || "Student";

    return (
      <Pressable style={styles.card} onPress={() => openDetail(item)}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: "#EEF2FF" }]}>
            <Ionicons name="map" size={18} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.studentName}>{studentName}</Text>
            <Text style={styles.progressText}>
              {completed}/{total} items completed
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: total > 0 ? `${(completed / total) * 100}%` : "0%" },
            ]}
          />
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Pressable testID="back-button" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Roadmaps</Text>
        <Pressable testID="add-button" onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add-circle" size={26} color={Colors.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={roadmaps || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRoadmap}
          contentContainerStyle={[styles.list, { paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="map-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No roadmaps created</Text>
              <Text style={styles.emptySubtext}>Tap + to create a student roadmap</Text>
            </View>
          }
        />
      )}

      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentLarge, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Roadmap</Text>
              <Pressable onPress={resetCreateForm}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Select Student</Text>
              {(users || []).map((user: any) => (
                <Pressable
                  key={user.id}
                  style={[styles.selectRow, selectedUserId === user.id && styles.selectRowActive]}
                  onPress={() => setSelectedUserId(user.id)}
                >
                  <View style={[styles.radioOuter, selectedUserId === user.id && styles.radioOuterActive]}>
                    {selectedUserId === user.id && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.selectRowText}>{user.name || user.email}</Text>
                </Pressable>
              ))}

              <Text style={[styles.inputLabel, { marginTop: 20 }]}>Select Courses</Text>
              {(courses || []).map((course: any) => (
                <Pressable
                  key={course.id}
                  style={[styles.selectRow, selectedCourses.includes(course.id) && styles.selectRowActive]}
                  onPress={() => toggleCourse(course.id)}
                >
                  <View style={[styles.checkbox, selectedCourses.includes(course.id) && styles.checkboxActive]}>
                    {selectedCourses.includes(course.id) && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={styles.selectRowText}>{course.title}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              style={[styles.saveBtn, (!selectedUserId || selectedCourses.length === 0) && styles.saveBtnDisabled]}
              onPress={handleCreate}
              disabled={!selectedUserId || selectedCourses.length === 0 || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Create Roadmap</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentLarge, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedRoadmap?.user?.name || "Student"}'s Roadmap
              </Text>
              <Pressable testID="close-detail-modal" onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {(selectedRoadmap?.items || [])
                .sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0))
                .map((item: any, index: number) => (
                  <View key={item.id} style={styles.roadmapItem}>
                    <View style={styles.roadmapItemLeft}>
                      <View
                        style={[
                          styles.roadmapDot,
                          item.isCompleted
                            ? styles.dotCompleted
                            : item.isUnlocked
                            ? styles.dotUnlocked
                            : styles.dotLocked,
                        ]}
                      >
                        {item.isCompleted ? (
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        ) : item.isUnlocked ? (
                          <Ionicons name="lock-open" size={10} color="#fff" />
                        ) : (
                          <Ionicons name="lock-closed" size={10} color="#fff" />
                        )}
                      </View>
                      {index < (selectedRoadmap?.items || []).length - 1 && (
                        <View style={styles.roadmapLine} />
                      )}
                    </View>
                    <View style={styles.roadmapItemContent}>
                      <Text style={styles.roadmapItemTitle}>
                        {item.course?.title || `Course ${item.courseId}`}
                      </Text>
                      <View style={styles.roadmapItemMeta}>
                        {item.isCompleted ? (
                          <View style={[styles.itemBadge, { backgroundColor: Colors.successLight }]}>
                            <Text style={[styles.itemBadgeText, { color: Colors.success }]}>Completed</Text>
                          </View>
                        ) : item.isUnlocked ? (
                          <View style={[styles.itemBadge, { backgroundColor: Colors.warningLight }]}>
                            <Text style={[styles.itemBadgeText, { color: Colors.warning }]}>Unlocked</Text>
                          </View>
                        ) : (
                          <View style={[styles.itemBadge, { backgroundColor: Colors.borderLight }]}>
                            <Text style={[styles.itemBadgeText, { color: Colors.textTertiary }]}>Locked</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.itemActions}>
                        {!item.isUnlocked && (
                          <Pressable
                            testID="unlock-item-button"
                            style={[styles.itemActionBtn, { backgroundColor: Colors.warning + "15" }]}
                            onPress={() => handleUnlock(item.id)}
                          >
                            <Ionicons name="lock-open-outline" size={14} color={Colors.warning} />
                            <Text style={[styles.itemActionText, { color: Colors.warning }]}>Unlock</Text>
                          </Pressable>
                        )}
                        {item.isUnlocked && !item.isCompleted && (
                          <Pressable
                            testID="complete-item-button"
                            style={[styles.itemActionBtn, { backgroundColor: Colors.success + "15" }]}
                            onPress={() => handleComplete(item.id)}
                          >
                            <Ionicons name="checkmark-circle-outline" size={14} color={Colors.success} />
                            <Text style={[styles.itemActionText, { color: Colors.success }]}>Complete</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              {(!selectedRoadmap?.items || selectedRoadmap.items.length === 0) && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No items in this roadmap</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  iconContainer: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  studentName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  progressText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  progressBarBg: { height: 6, backgroundColor: Colors.borderLight, borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContentLarge: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text, flex: 1 },
  inputLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 8, marginTop: 4 },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: Colors.background,
    gap: 10,
  },
  selectRowActive: { backgroundColor: Colors.primary + "08", borderWidth: 1, borderColor: Colors.primary + "30" },
  selectRowText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, justifyContent: "center", alignItems: "center" },
  radioOuterActive: { borderColor: Colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, justifyContent: "center", alignItems: "center" },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 16 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  roadmapItem: { flexDirection: "row", marginBottom: 4 },
  roadmapItemLeft: { alignItems: "center", width: 30 },
  roadmapDot: { width: 24, height: 24, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  dotCompleted: { backgroundColor: Colors.success },
  dotUnlocked: { backgroundColor: Colors.warning },
  dotLocked: { backgroundColor: Colors.textTertiary },
  roadmapLine: { width: 2, flex: 1, backgroundColor: Colors.borderLight, marginVertical: 2 },
  roadmapItemContent: { flex: 1, marginLeft: 10, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, marginBottom: 4 },
  roadmapItemTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  roadmapItemMeta: { flexDirection: "row", marginTop: 6 },
  itemBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  itemBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  itemActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  itemActionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  itemActionText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
