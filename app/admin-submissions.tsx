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
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut } from "@/lib/api";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

interface SubmissionData {
  submission: {
    id: number;
    assignmentId: number;
    userId: number;
    content: string | null;
    fileUrl: string | null;
    status: string;
    marks: number | null;
    feedback: string | null;
    submittedAt: string;
  };
  user: {
    id: number;
    name: string;
    email: string;
  };
  assignment: {
    id: number;
    title: string;
    maxMarks: number;
    courseId: number;
  };
}

export default function AdminSubmissionsScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const queryClient = useQueryClient();

  const [reviewModal, setReviewModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionData | null>(null);
  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const [filter, setFilter] = useState<"all" | "submitted" | "reviewed">("all");

  const { data: submissions, isLoading, refetch } = useQuery({
    queryKey: ["all-submissions"],
    queryFn: () => apiGet<SubmissionData[]>("/api/all-submissions"),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) =>
      apiPut(`/api/submissions/${id}/review`, body),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["all-submissions"] });
      setReviewModal(false);
      setSelectedSubmission(null);
      setMarks("");
      setFeedback("");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to review submission");
    },
  });

  function openReview(item: SubmissionData) {
    setSelectedSubmission(item);
    setMarks(item.submission.marks?.toString() || "");
    setFeedback(item.submission.feedback || "");
    setReviewModal(true);
  }

  function handleReview() {
    if (!selectedSubmission) return;
    if (!marks.trim()) {
      Alert.alert("Error", "Please enter marks");
      return;
    }
    const marksNum = parseInt(marks);
    if (isNaN(marksNum) || marksNum < 0) {
      Alert.alert("Error", "Please enter valid marks");
      return;
    }
    if (marksNum > selectedSubmission.assignment.maxMarks) {
      Alert.alert("Error", `Marks cannot exceed ${selectedSubmission.assignment.maxMarks}`);
      return;
    }
    reviewMutation.mutate({
      id: selectedSubmission.submission.id,
      body: { marks: marksNum, feedback: feedback.trim() },
    });
  }

  function openFile(url: string) {
    Linking.openURL(url).catch(() => Alert.alert("Error", "Cannot open file"));
  }

  const filtered = (submissions || []).filter((s) => {
    if (filter === "all") return true;
    return s.submission.status === filter;
  });

  const pendingCount = (submissions || []).filter(s => s.submission.status === "submitted").length;
  const reviewedCount = (submissions || []).filter(s => s.submission.status === "reviewed").length;

  function getStatusColor(status: string) {
    switch (status) {
      case "submitted": return Colors.warning;
      case "reviewed": return Colors.success;
      default: return Colors.textTertiary;
    }
  }

  function getStatusBg(status: string) {
    switch (status) {
      case "submitted": return Colors.warningLight;
      case "reviewed": return Colors.successLight;
      default: return Colors.borderLight;
    }
  }

  function renderSubmission({ item }: { item: SubmissionData }) {
    const isReviewed = item.submission.status === "reviewed";
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={() => openReview(item)}
      >
        <View style={styles.cardTop}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusBg(item.submission.status) }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.submission.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(item.submission.status) }]}>
              {item.submission.status === "submitted" ? "Pending Review" : "Reviewed"}
            </Text>
          </View>
          {isReviewed && item.submission.marks !== null && (
            <View style={styles.marksBadge}>
              <Text style={styles.marksText}>{item.submission.marks}/{item.assignment.maxMarks}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <View style={[styles.avatarWrap, { backgroundColor: isReviewed ? Colors.successLight : Colors.warningLight }]}>
            <Ionicons name="person" size={18} color={isReviewed ? Colors.success : Colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.studentName}>{item.user.name}</Text>
            <Text style={styles.studentEmail}>{item.user.email}</Text>
          </View>
        </View>

        <View style={styles.assignmentRow}>
          <Ionicons name="document-text-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.assignmentTitle} numberOfLines={1}>{item.assignment.title}</Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={Colors.textTertiary} />
            <Text style={styles.metaText}>
              {new Date(item.submission.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
          <View style={styles.actionsRow}>
            {item.submission.fileUrl && (
              <Pressable
                style={styles.fileIconBtn}
                onPress={(e) => { e.stopPropagation(); openFile(item.submission.fileUrl!); }}
              >
                <Ionicons name="attach" size={16} color={Colors.info} />
              </Pressable>
            )}
            {item.submission.content && (
              <Ionicons name="chatbubble-outline" size={14} color={Colors.textTertiary} />
            )}
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Submissions</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: Colors.warning }]}>
          <Text style={styles.statNumber}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: Colors.success }]}>
          <Text style={styles.statNumber}>{reviewedCount}</Text>
          <Text style={styles.statLabel}>Reviewed</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: Colors.primary }]}>
          <Text style={styles.statNumber}>{(submissions || []).length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {(["all", "submitted", "reviewed"] as const).map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f === "all" ? "All" : f === "submitted" ? "Pending" : "Reviewed"}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.submission.id.toString()}
          renderItem={renderSubmission}
          contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="documents-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No submissions found</Text>
              <Text style={styles.emptySubtext}>Student submissions will appear here</Text>
            </View>
          }
        />
      )}

      <Modal
        visible={reviewModal}
        animationType="slide"
        transparent
        onRequestClose={() => setReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Submission</Text>
              <Pressable onPress={() => { setReviewModal(false); setSelectedSubmission(null); }}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {selectedSubmission && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.reviewInfoCard}>
                  <View style={styles.reviewInfoRow}>
                    <Ionicons name="person-outline" size={16} color={Colors.primary} />
                    <Text style={styles.reviewInfoLabel}>Student</Text>
                    <Text style={styles.reviewInfoValue}>{selectedSubmission.user.name}</Text>
                  </View>
                  <View style={styles.reviewInfoRow}>
                    <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
                    <Text style={styles.reviewInfoLabel}>Assignment</Text>
                    <Text style={styles.reviewInfoValue} numberOfLines={1}>{selectedSubmission.assignment.title}</Text>
                  </View>
                  <View style={styles.reviewInfoRow}>
                    <Ionicons name="star-outline" size={16} color={Colors.primary} />
                    <Text style={styles.reviewInfoLabel}>Max Marks</Text>
                    <Text style={styles.reviewInfoValue}>{selectedSubmission.assignment.maxMarks}</Text>
                  </View>
                  <View style={styles.reviewInfoRow}>
                    <Ionicons name="time-outline" size={16} color={Colors.primary} />
                    <Text style={styles.reviewInfoLabel}>Submitted</Text>
                    <Text style={styles.reviewInfoValue}>
                      {new Date(selectedSubmission.submission.submittedAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {selectedSubmission.submission.content && (
                  <View style={styles.contentSection}>
                    <Text style={styles.sectionLabel}>Student's Answer</Text>
                    <View style={styles.contentBox}>
                      <Text style={styles.contentText}>{selectedSubmission.submission.content}</Text>
                    </View>
                  </View>
                )}

                {selectedSubmission.submission.fileUrl && (
                  <Pressable
                    style={styles.fileButton}
                    onPress={() => openFile(selectedSubmission.submission.fileUrl!)}
                  >
                    <Ionicons name="document-attach" size={18} color={Colors.primary} />
                    <Text style={styles.fileButtonText}>View Submitted File</Text>
                    <Ionicons name="open-outline" size={16} color={Colors.primary} />
                  </Pressable>
                )}

                <Text style={[styles.inputLabel, { marginTop: 20 }]}>Marks (out of {selectedSubmission.assignment.maxMarks})</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`Enter marks (0-${selectedSubmission.assignment.maxMarks})`}
                  placeholderTextColor={Colors.textTertiary}
                  value={marks}
                  onChangeText={setMarks}
                  keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>Feedback</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Write feedback for the student..."
                  placeholderTextColor={Colors.textTertiary}
                  value={feedback}
                  onChangeText={setFeedback}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <Pressable
                  style={[styles.submitButton, reviewMutation.isPending && styles.submitButtonDisabled]}
                  onPress={handleReview}
                  disabled={reviewMutation.isPending}
                >
                  {reviewMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                      <Text style={styles.submitButtonText}>
                        {selectedSubmission.submission.status === "reviewed" ? "Update Review" : "Submit Review"}
                      </Text>
                    </>
                  )}
                </Pressable>
              </ScrollView>
            )}
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
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statNumber: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textSecondary, marginTop: 2 },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  filterChipTextActive: { color: "#FFFFFF" },
  list: { paddingHorizontal: 20, paddingTop: 10 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  marksBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  marksText: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.success },
  cardBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  studentName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  studentEmail: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary, marginTop: 1 },
  assignmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  assignmentTitle: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary, flex: 1 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  fileIconBtn: {
    padding: 4,
  },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "90%",
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
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  modalBody: { flexGrow: 0 },
  reviewInfoCard: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  reviewInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reviewInfoLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary, width: 80 },
  reviewInfoValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text, flex: 1 },
  contentSection: { marginTop: 16 },
  sectionLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 8 },
  contentBox: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  contentText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, lineHeight: 20 },
  fileButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.infoLight,
    marginTop: 16,
  },
  fileButtonText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.primary, flex: 1 },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 16,
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
  multilineInput: { minHeight: 100, paddingTop: 12 },
  submitButton: {
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
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
});
