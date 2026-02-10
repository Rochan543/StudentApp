import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiUpload } from "@/lib/api";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";

export default function AssignmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const [content, setContent] = useState("");
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: assignment, isLoading: assgnLoading } = useQuery({
    queryKey: ["assignment", id],
    queryFn: () => apiGet(`/api/assignment/${id}`),
  });

  const { data: submission, isLoading: subLoading } = useQuery({
    queryKey: ["submission", id],
    queryFn: () => apiGet(`/api/submissions/${id}`),
  });

  const submitMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/submissions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submission", id] });
      setContent("");
      setUploadedFileUrl(null);
      setUploadedFileName(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Submitted", "Your assignment has been submitted successfully");
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  async function handleFilePick() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "image/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setIsUploading(true);
      const uploadResult = await apiUpload<{ url: string; publicId: string }>(
        "/api/upload/submission",
        file.uri,
        file.name,
        file.mimeType || "application/octet-stream"
      );
      setUploadedFileUrl(uploadResult.url);
      setUploadedFileName(file.name);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Upload Failed", e.message || "Could not upload file");
    } finally {
      setIsUploading(false);
    }
  }

  function handleSubmit() {
    if (!content.trim() && !uploadedFileUrl) {
      Alert.alert("Error", "Please provide an answer or upload a file");
      return;
    }
    submitMutation.mutate({
      assignmentId: parseInt(id!),
      content: content.trim(),
      fileUrl: uploadedFileUrl,
    });
  }

  if (assgnLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!assignment) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text>Assignment not found</Text>
      </View>
    );
  }

  const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();
  const hasSubmission = submission && submission.id;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + webTopInset + 12, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color={Colors.text} />
      </Pressable>

      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="create" size={28} color={Colors.warning} />
        </View>
        <Text style={styles.title}>{assignment.title}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="star" size={16} color={Colors.primary} />
            <Text style={styles.metaText}>Max: {assignment.maxMarks} marks</Text>
          </View>
          {assignment.dueDate && (
            <View style={styles.metaItem}>
              <Ionicons name="calendar" size={16} color={isOverdue ? Colors.error : Colors.accent} />
              <Text style={[styles.metaText, isOverdue && { color: Colors.error }]}>
                {isOverdue ? "Overdue" : "Due"}: {new Date(assignment.dueDate).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        <Text style={styles.instructions}>{assignment.description}</Text>
        {assignment.fileUrl && (
          <Pressable
            style={styles.attachmentBtn}
            onPress={() => Linking.openURL(assignment.fileUrl)}
          >
            <Ionicons name="document-attach" size={18} color={Colors.primary} />
            <Text style={styles.attachmentText}>View Assignment File</Text>
            <Ionicons name="open-outline" size={16} color={Colors.primary} />
          </Pressable>
        )}
      </View>

      {hasSubmission ? (
        <View style={styles.submissionSection}>
          <View style={styles.submissionHeader}>
            <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
            <Text style={styles.submissionTitle}>Your Submission</Text>
          </View>
          <View style={styles.submissionCard}>
            {submission.content && (
              <Text style={styles.submissionContent}>{submission.content}</Text>
            )}
            {submission.fileUrl && (
              <Pressable
                style={styles.attachmentBtn}
                onPress={() => Linking.openURL(submission.fileUrl)}
              >
                <Ionicons name="document-attach" size={18} color={Colors.primary} />
                <Text style={styles.attachmentText}>View Uploaded File</Text>
                <Ionicons name="open-outline" size={16} color={Colors.primary} />
              </Pressable>
            )}
            <View style={styles.submissionMeta}>
              <Text style={styles.submissionDate}>
                Submitted: {new Date(submission.submittedAt || submission.createdAt).toLocaleString()}
              </Text>
              <View style={[styles.statusBadge, submission.status === "reviewed" ? styles.reviewedBadge : styles.pendingBadge]}>
                <Text style={[styles.statusText, submission.status === "reviewed" ? styles.reviewedText : styles.pendingText]}>
                  {submission.status}
                </Text>
              </View>
            </View>
            {submission.status === "reviewed" && (
              <View style={styles.feedbackSection}>
                <View style={styles.marksBadge}>
                  <Text style={styles.marksText}>{submission.marks} / {assignment.maxMarks}</Text>
                </View>
                {submission.feedback && (
                  <View style={styles.feedbackCard}>
                    <Text style={styles.feedbackLabel}>Feedback</Text>
                    <Text style={styles.feedbackText}>{submission.feedback}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.submitSection}>
          <Text style={styles.sectionTitle}>Your Answer</Text>
          <TextInput
            style={styles.answerInput}
            value={content}
            onChangeText={setContent}
            placeholder="Type your answer here..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            textAlignVertical="top"
          />

          <Pressable style={styles.uploadBtn} onPress={handleFilePick} disabled={isUploading}>
            {isUploading ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={22} color={Colors.primary} />
                <Text style={styles.uploadBtnText}>
                  {uploadedFileName || "Attach a file (PDF, DOC, Image)"}
                </Text>
              </>
            )}
          </Pressable>

          {uploadedFileName && (
            <View style={styles.fileIndicator}>
              <Ionicons name="document" size={18} color={Colors.success} />
              <Text style={styles.fileNameText} numberOfLines={1}>{uploadedFileName}</Text>
              <Pressable onPress={() => { setUploadedFileUrl(null); setUploadedFileName(null); }}>
                <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
              </Pressable>
            </View>
          )}

          <Pressable
            style={[styles.submitBtn, ((!content.trim() && !uploadedFileUrl) || submitMutation.isPending) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={(!content.trim() && !uploadedFileUrl) || submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Submit Assignment</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  header: { alignItems: "center", marginBottom: 28 },
  headerIcon: { width: 64, height: 64, borderRadius: 18, backgroundColor: "#FEF3C7", justifyContent: "center", alignItems: "center", marginBottom: 14 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "center" },
  metaRow: { flexDirection: "row", gap: 16, marginTop: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 10 },
  instructions: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 24 },
  attachmentBtn: {
    flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#EEF2FF",
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginTop: 12, alignSelf: "flex-start",
  },
  attachmentText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.primary },
  submitSection: { marginBottom: 20 },
  answerInput: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text, height: 140, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  uploadBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.surface, borderRadius: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: Colors.primary, borderStyle: "dashed" as const, marginBottom: 8,
  },
  uploadBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.primary },
  fileIndicator: {
    flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#ECFDF5",
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 12,
  },
  fileNameText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text, flex: 1 },
  submitBtn: { flexDirection: "row", backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, justifyContent: "center", alignItems: "center", gap: 8 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  submissionSection: { marginBottom: 20 },
  submissionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  submissionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text },
  submissionCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.borderLight },
  submissionContent: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, lineHeight: 22, marginBottom: 12 },
  submissionMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  submissionDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  reviewedBadge: { backgroundColor: "#ECFDF5" },
  pendingBadge: { backgroundColor: "#FEF3C7" },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" as const },
  reviewedText: { color: Colors.success },
  pendingText: { color: Colors.warning },
  feedbackSection: { marginTop: 16, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 16 },
  marksBadge: { backgroundColor: "#EEF2FF", alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginBottom: 12 },
  marksText: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.primary },
  feedbackCard: { backgroundColor: Colors.background, borderRadius: 10, padding: 12 },
  feedbackLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textTertiary, marginBottom: 4 },
  feedbackText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, lineHeight: 22 },
});
