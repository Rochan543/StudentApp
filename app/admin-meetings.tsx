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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

const MEETING_TYPES = [
  { value: "class", label: "Class", icon: "school" as const, color: Colors.primary },
  { value: "mock_interview", label: "Mock Interview", icon: "people" as const, color: Colors.warning },
  { value: "live_coding", label: "Live Coding", icon: "code-slash" as const, color: Colors.success },
];

export default function AdminMeetingsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [meetingType, setMeetingType] = useState("class");
  const [scheduledDate, setScheduledDate] = useState("");

  const { data: meetings, isLoading, refetch } = useQuery({
    queryKey: ["meetings"],
    queryFn: () => apiGet("/api/meetings"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/meetings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      resetForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  function resetForm() {
    setShowCreateModal(false);
    setTitle("");
    setLink("");
    setMeetingType("class");
    setScheduledDate("");
  }

  function getTypeInfo(type: string) {
    return MEETING_TYPES.find((t) => t.value === type) || MEETING_TYPES[0];
  }

  function formatDateTime(date: string) {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function isPast(date: string) {
    return new Date(date) < new Date();
  }

  function renderMeeting({ item }: { item: any }) {
    const typeInfo = getTypeInfo(item.meetingType);
    const past = item.scheduledAt ? isPast(item.scheduledAt) : false;

    return (
      <View style={[styles.card, past && styles.cardPast]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: typeInfo.color + "20" }]}>
            <Ionicons name={typeInfo.icon} size={18} color={typeInfo.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.meetingTitle}>{item.title}</Text>
            <View style={styles.typeBadge}>
              <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>
                {typeInfo.label}
              </Text>
            </View>
          </View>
          {!item.isActive && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveText}>Inactive</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          {item.scheduledAt ? (
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={14} color={past ? Colors.textTertiary : Colors.textSecondary} />
              <Text style={[styles.dateText, past && { color: Colors.textTertiary }]}>
                {formatDateTime(item.scheduledAt)}
              </Text>
            </View>
          ) : (
            <Text style={styles.dateText}>No date set</Text>
          )}
          <View style={styles.linkRow}>
            <Ionicons name="link-outline" size={14} color={Colors.primary} />
            <Text style={styles.linkText} numberOfLines={1}>{item.link}</Text>
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
        <Text style={styles.headerTitle}>Meetings</Text>
        <Pressable testID="add-button" onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add-circle" size={26} color={Colors.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={meetings || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMeeting}
          contentContainerStyle={[styles.list, { paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="videocam-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No meetings scheduled</Text>
              <Text style={styles.emptySubtext}>Tap + to schedule a new meeting</Text>
            </View>
          }
        />
      )}

      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Meeting</Text>
              <Pressable onPress={resetForm}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Meeting title"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.inputLabel}>Meeting Link</Text>
            <TextInput
              style={styles.input}
              value={link}
              onChangeText={setLink}
              placeholder="Zoom/Meet URL"
              autoCapitalize="none"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.inputLabel}>Type</Text>
            <View style={styles.typeSelector}>
              {MEETING_TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  style={[styles.typeOption, meetingType === t.value && styles.typeOptionActive]}
                  onPress={() => setMeetingType(t.value)}
                >
                  <Ionicons name={t.icon} size={16} color={meetingType === t.value ? "#fff" : Colors.textSecondary} />
                  <Text style={[styles.typeOptionText, meetingType === t.value && styles.typeOptionTextActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.inputLabel}>Scheduled Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={scheduledDate}
              onChangeText={setScheduledDate}
              placeholder="2025-03-15"
              placeholderTextColor={Colors.textTertiary}
            />

            <Pressable
              style={[styles.saveBtn, (!title || !link) && styles.saveBtnDisabled]}
              onPress={() =>
                createMutation.mutate({
                  title,
                  link,
                  meetingType,
                  scheduledAt: scheduledDate
                    ? new Date(scheduledDate).toISOString()
                    : new Date(Date.now() + 86400000).toISOString(),
                })
              }
              disabled={!title || !link || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Schedule Meeting</Text>
              )}
            </Pressable>
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
  cardPast: { opacity: 0.6 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconContainer: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  meetingTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  typeBadge: { marginTop: 2 },
  typeBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  inactiveBadge: { backgroundColor: Colors.errorLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  inactiveText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.error },
  cardFooter: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight, gap: 6 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  linkText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.primary, flex: 1 },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  inputLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeSelector: { flexDirection: "row", gap: 8 },
  typeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeOptionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeOptionText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  typeOptionTextActive: { color: "#fff" },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
