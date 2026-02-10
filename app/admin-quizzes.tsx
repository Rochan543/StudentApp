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
  Switch,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

export default function AdminQuizzesScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [timeLimit, setTimeLimit] = useState("30");
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [questionsJson, setQuestionsJson] = useState("");

  const { data: quizzes, isLoading, refetch } = useQuery({
    queryKey: ["all-quizzes"],
    queryFn: () => apiGet("/api/all-quizzes"),
  });

  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: () => apiGet("/api/courses"),
    enabled: modalVisible,
  });

  const createQuizMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title is required");
      if (!selectedCourseId) throw new Error("Please select a course");

      let parsedQuestions: any[] = [];
      if (questionsJson.trim()) {
        try {
          parsedQuestions = JSON.parse(questionsJson.trim());
          if (!Array.isArray(parsedQuestions)) throw new Error("Questions must be a JSON array");
          for (let i = 0; i < parsedQuestions.length; i++) {
            const q = parsedQuestions[i];
            if (!q.text || !Array.isArray(q.options) || q.options.length < 2 || typeof q.correctAnswer !== "number") {
              throw new Error(`Question ${i + 1} is invalid. Each question needs text, options (array), and correctAnswer (number).`);
            }
          }
        } catch (e: any) {
          if (e.message.startsWith("Question")) throw e;
          throw new Error("Invalid JSON format: " + e.message);
        }
      }

      const quiz: any = await apiPost("/api/quizzes", {
        courseId: selectedCourseId,
        title: title.trim(),
        description: description.trim() || undefined,
        timeLimit: parseInt(timeLimit) || 30,
        negativeMarking,
        isPublished,
      });

      const quizId = quiz.id;

      for (let i = 0; i < parsedQuestions.length; i++) {
        const q = parsedQuestions[i];
        await apiPost("/api/questions", {
          quizId,
          text: q.text,
          options: q.options,
          correctAnswer: q.correctAnswer,
          marks: q.marks || 1,
          orderIndex: i,
        });
      }

      return quiz;
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["all-quizzes"] });
      resetForm();
      setModalVisible(false);
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
  });

  function resetForm() {
    setTitle("");
    setDescription("");
    setSelectedCourseId(null);
    setTimeLimit("30");
    setNegativeMarking(false);
    setIsPublished(false);
    setQuestionsJson("");
  }

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
        <Pressable testID="add-quiz-button" onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color={Colors.primary} />
        </Pressable>
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

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Quiz</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter quiz title"
                placeholderTextColor={Colors.textTertiary}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional description"
                placeholderTextColor={Colors.textTertiary}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Course *</Text>
              <View style={styles.courseList}>
                {courses?.map((course: any) => (
                  <Pressable
                    key={course.id}
                    style={styles.courseOption}
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
                        selectedCourseId === course.id && { color: Colors.primary },
                      ]}
                    >
                      {course.title}
                    </Text>
                  </Pressable>
                ))}
                {courses?.length === 0 && (
                  <Text style={styles.helperText}>No courses available</Text>
                )}
              </View>

              <Text style={styles.label}>Time Limit (minutes)</Text>
              <TextInput
                style={styles.input}
                value={timeLimit}
                onChangeText={setTimeLimit}
                placeholder="30"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numeric"
              />

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Negative Marking</Text>
                  <Text style={styles.switchSubLabel}>Deduct marks for wrong answers</Text>
                </View>
                <Switch
                  value={negativeMarking}
                  onValueChange={setNegativeMarking}
                  trackColor={{ false: Colors.borderLight, true: Colors.primaryLight }}
                  thumbColor={negativeMarking ? Colors.primary : "#f4f3f4"}
                />
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Published</Text>
                  <Text style={styles.switchSubLabel}>Make quiz visible to students</Text>
                </View>
                <Switch
                  value={isPublished}
                  onValueChange={setIsPublished}
                  trackColor={{ false: Colors.borderLight, true: Colors.primaryLight }}
                  thumbColor={isPublished ? Colors.primary : "#f4f3f4"}
                />
              </View>

              <Text style={styles.label}>Questions (JSON)</Text>
              <Text style={styles.helperText}>
                Paste a JSON array of questions. Format:{"\n"}
                [{"{"}"text": "Q?", "options": ["A","B","C","D"], "correctAnswer": 0, "marks": 1{"}"}]
              </Text>
              <TextInput
                style={[styles.input, styles.jsonInput]}
                value={questionsJson}
                onChangeText={setQuestionsJson}
                placeholder='[{"text": "...", "options": [...], "correctAnswer": 0}]'
                placeholderTextColor={Colors.textTertiary}
                multiline
                numberOfLines={6}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Pressable
                style={[styles.submitButton, createQuizMutation.isPending && styles.submitButtonDisabled]}
                onPress={() => createQuizMutation.mutate()}
                disabled={createQuizMutation.isPending}
              >
                {createQuizMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>Create Quiz</Text>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingHorizontal: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  modalScroll: {
    flexGrow: 0,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  jsonInput: {
    minHeight: 120,
    textAlignVertical: "top",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  courseList: {
    gap: 6,
  },
  courseOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  courseOptionText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  switchLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  switchSubLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  helperText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginBottom: 8,
    lineHeight: 17,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
