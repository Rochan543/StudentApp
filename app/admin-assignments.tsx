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
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

export default function AdminAssignmentsScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [maxMarks, setMaxMarks] = useState("100");
  const [dueDate, setDueDate] = useState("");

  const { data: assignments, isLoading, refetch } = useQuery({
    queryKey: ["all-assignments"],
    queryFn: () => apiGet("/api/all-assignments"),
  });

  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: () => apiGet("/api/courses"),
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => apiPost("/api/assignments", body),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["all-assignments"] });
      resetForm();
      setShowModal(false);
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to create assignment");
    },
  });

  function resetForm() {
    setTitle("");
    setDescription("");
    setSelectedCourseId(null);
    setMaxMarks("100");
    setDueDate("");
  }

  function handleCreate() {
    if (!title.trim()) {
      Alert.alert("Validation", "Title is required");
      return;
    }
    if (!selectedCourseId) {
      Alert.alert("Validation", "Please select a course");
      return;
    }
    createMutation.mutate({
      courseId: selectedCourseId,
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate.trim() || undefined,
      maxMarks: parseInt(maxMarks) || 100,
    });
  }

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

  const courseList = Array.isArray(courses) ? courses : [];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Pressable testID="back-button" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>All Assignments</Text>
        <Pressable testID="add-assignment-button" onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={24} color={Colors.primary} />
        </Pressable>
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

      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Assignment</Text>
              <Pressable onPress={() => { resetForm(); setShowModal(false); }}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Assignment title"
                placeholderTextColor={Colors.textTertiary}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Assignment description"
                placeholderTextColor={Colors.textTertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Text style={styles.inputLabel}>Course</Text>
              <View style={styles.courseList}>
                {courseList.length === 0 ? (
                  <Text style={styles.noCourses}>No courses available</Text>
                ) : (
                  courseList.map((course: any) => (
                    <Pressable
                      key={course.id}
                      style={[
                        styles.courseOption,
                        selectedCourseId === course.id && styles.courseOptionSelected,
                      ]}
                      onPress={() => setSelectedCourseId(course.id)}
                    >
                      <Ionicons
                        name={selectedCourseId === course.id ? "radio-button-on" : "radio-button-off"}
                        size={20}
                        color={selectedCourseId === course.id ? Colors.primary : Colors.textTertiary}
                      />
                      <Text
                        style={[
                          styles.courseOptionText,
                          selectedCourseId === course.id && styles.courseOptionTextSelected,
                        ]}
                      >
                        {course.title}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>

              <Text style={styles.inputLabel}>Max Marks</Text>
              <TextInput
                style={styles.input}
                placeholder="100"
                placeholderTextColor={Colors.textTertiary}
                value={maxMarks}
                onChangeText={setMaxMarks}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Due Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textTertiary}
                value={dueDate}
                onChangeText={setDueDate}
              />

              <Pressable
                style={[styles.createButton, createMutation.isPending && styles.createButtonDisabled]}
                onPress={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.createButtonText}>Create Assignment</Text>
                  </>
                )}
              </Pressable>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "85%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  modalBody: {
    flexGrow: 0,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  multilineInput: {
    minHeight: 80,
    paddingTop: 12,
  },
  courseList: {
    gap: 6,
  },
  courseOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  courseOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight + "10",
  },
  courseOptionText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  courseOptionTextSelected: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  noCourses: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
    paddingVertical: 12,
  },
  createButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
    marginBottom: 12,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
