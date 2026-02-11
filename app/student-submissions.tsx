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
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import Colors from "@/constants/colors";

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
  assignment: {
    id: number;
    title: string;
    maxMarks: number;
    courseId: number;
  };
}

export default function StudentSubmissionsScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const [detailModal, setDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SubmissionData | null>(null);
  const [filter, setFilter] = useState<"all" | "submitted" | "reviewed">("all");

  const { data: submissions, isLoading, refetch } = useQuery({
    queryKey: ["my-submissions"],
    queryFn: () => apiGet<SubmissionData[]>("/api/my-submissions"),
  });

  function openDetail(item: SubmissionData) {
    setSelectedItem(item);
    setDetailModal(true);
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

  function getPercentage(marks: number | null, maxMarks: number) {
    if (marks === null || maxMarks === 0) return null;
    return Math.round((marks / maxMarks) * 100);
  }

  function getGradeColor(pct: number | null) {
    if (pct === null) return Colors.textTertiary;
    if (pct >= 80) return Colors.success;
    if (pct >= 60) return Colors.primary;
    if (pct >= 40) return Colors.warning;
    return Colors.error;
  }

  function renderSubmission({ item }: { item: SubmissionData }) {
    const isReviewed = item.submission.status === "reviewed";
    const pct = getPercentage(item.submission.marks, item.assignment.maxMarks);

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={() => openDetail(item)}
      >
        <View style={styles.cardTop}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusBg(item.submission.status) }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.submission.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(item.submission.status) }]}>
              {item.submission.status === "submitted" ? "Awaiting Review" : "Reviewed"}
            </Text>
          </View>
          {isReviewed && pct !== null && (
            <View style={[styles.percentBadge, { backgroundColor: getGradeColor(pct) + "18" }]}>
              <Text style={[styles.percentText, { color: getGradeColor(pct) }]}>{pct}%</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <View style={[styles.iconWrap, { backgroundColor: isReviewed ? Colors.successLight : "#EEF2FF" }]}>
            <Ionicons name="document-text" size={18} color={isReviewed ? Colors.success : Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.assignmentName} numberOfLines={2}>{item.assignment.title}</Text>
            <Text style={styles.submittedDate}>
              Submitted {new Date(item.submission.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </Text>
          </View>
        </View>

        {isReviewed && item.submission.marks !== null && (
          <View style={styles.marksRow}>
            <View style={styles.marksBarBg}>
              <View style={[styles.marksBarFill, { width: `${pct}%` as any, backgroundColor: getGradeColor(pct) }]} />
            </View>
            <Text style={[styles.marksLabel, { color: getGradeColor(pct) }]}>
              {item.submission.marks}/{item.assignment.maxMarks}
            </Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.metaRow}>
            {item.submission.fileUrl && (
              <Ionicons name="attach" size={14} color={Colors.textTertiary} />
            )}
            {item.submission.content && (
              <Ionicons name="chatbubble-outline" size={13} color={Colors.textTertiary} />
            )}
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
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
        <Text style={styles.headerTitle}>My Submissions</Text>
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
              <Text style={styles.emptyText}>No submissions yet</Text>
              <Text style={styles.emptySubtext}>Your assignment submissions will appear here</Text>
            </View>
          }
        />
      )}

      <Modal
        visible={detailModal}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submission Details</Text>
              <Pressable onPress={() => { setDetailModal(false); setSelectedItem(null); }}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {selectedItem && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailAssignmentTitle}>{selectedItem.assignment.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBg(selectedItem.submission.status), alignSelf: "flex-start", marginTop: 8 }]}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(selectedItem.submission.status) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(selectedItem.submission.status) }]}>
                      {selectedItem.submission.status === "submitted" ? "Awaiting Review" : "Reviewed"}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoSection}>
                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.infoLabel}>Submitted</Text>
                    <Text style={styles.infoValue}>
                      {new Date(selectedItem.submission.submittedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="star-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.infoLabel}>Max Marks</Text>
                    <Text style={styles.infoValue}>{selectedItem.assignment.maxMarks}</Text>
                  </View>
                </View>

                {selectedItem.submission.content && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Your Answer</Text>
                    <View style={styles.contentBox}>
                      <Text style={styles.contentText}>{selectedItem.submission.content}</Text>
                    </View>
                  </View>
                )}

                {selectedItem.submission.fileUrl && (
                  <Pressable
                    style={styles.fileButton}
                    onPress={() => openFile(selectedItem.submission.fileUrl!)}
                  >
                    <Ionicons name="document-attach" size={18} color={Colors.primary} />
                    <Text style={styles.fileButtonText}>View Submitted File</Text>
                    <Ionicons name="open-outline" size={16} color={Colors.primary} />
                  </Pressable>
                )}

                {selectedItem.submission.status === "reviewed" && (
                  <View style={styles.reviewSection}>
                    <Text style={styles.sectionLabel}>Review Results</Text>
                    {selectedItem.submission.marks !== null && (
                      <View style={styles.gradeCard}>
                        <View style={{ alignItems: "center" }}>
                          <Text style={[styles.gradeNumber, { color: getGradeColor(getPercentage(selectedItem.submission.marks, selectedItem.assignment.maxMarks)) }]}>
                            {selectedItem.submission.marks}
                          </Text>
                          <Text style={styles.gradeMax}>out of {selectedItem.assignment.maxMarks}</Text>
                        </View>
                        <View style={[styles.gradePctCircle, { borderColor: getGradeColor(getPercentage(selectedItem.submission.marks, selectedItem.assignment.maxMarks)) }]}>
                          <Text style={[styles.gradePctText, { color: getGradeColor(getPercentage(selectedItem.submission.marks, selectedItem.assignment.maxMarks)) }]}>
                            {getPercentage(selectedItem.submission.marks, selectedItem.assignment.maxMarks)}%
                          </Text>
                        </View>
                      </View>
                    )}
                    {selectedItem.submission.feedback && (
                      <View style={styles.feedbackBox}>
                        <View style={styles.feedbackHeader}>
                          <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.primary} />
                          <Text style={styles.feedbackLabel}>Instructor Feedback</Text>
                        </View>
                        <Text style={styles.feedbackText}>{selectedItem.submission.feedback}</Text>
                      </View>
                    )}
                  </View>
                )}

                {selectedItem.submission.status === "submitted" && (
                  <View style={styles.pendingNotice}>
                    <Ionicons name="hourglass-outline" size={20} color={Colors.warning} />
                    <Text style={styles.pendingNoticeText}>
                      Your submission is being reviewed. You'll be notified once it's graded.
                    </Text>
                  </View>
                )}
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
  percentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  percentText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  cardBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  assignmentName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  submittedDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary, marginTop: 3 },
  marksRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  marksBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: "hidden",
  },
  marksBarFill: { height: 6, borderRadius: 3 },
  marksLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", minWidth: 50, textAlign: "right" },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
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
  detailCard: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  detailAssignmentTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text },
  infoSection: {
    marginTop: 16,
    gap: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary, width: 80 },
  infoValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text, flex: 1 },
  section: { marginTop: 20 },
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
  reviewSection: { marginTop: 20 },
  gradeCard: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  gradeNumber: { fontSize: 36, fontFamily: "Inter_700Bold" },
  gradeMax: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  gradePctCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  gradePctText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  feedbackBox: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  feedbackHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  feedbackLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  feedbackText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, lineHeight: 22 },
  pendingNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.warningLight,
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  pendingNoticeText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text, flex: 1, lineHeight: 18 },
});
