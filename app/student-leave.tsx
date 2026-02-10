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

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: "Pending", color: Colors.warning, bg: Colors.warningLight, icon: "time-outline" },
  approved: { label: "Approved", color: Colors.success, bg: Colors.successLight, icon: "checkmark-circle-outline" },
  rejected: { label: "Rejected", color: Colors.error, bg: Colors.errorLight, icon: "close-circle-outline" },
};

export default function StudentLeaveScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ["my-leave-requests"],
    queryFn: () => apiGet("/api/leave-requests"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/leave-requests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] });
      resetForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  function resetForm() {
    setShowCreateModal(false);
    setDate("");
    setReason("");
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function renderRequest({ item }: { item: any }) {
    const config = statusConfig[item.status] || statusConfig.pending;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: config.bg }]}>
            <Ionicons name={config.icon} size={20} color={config.color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
              <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
              </View>
            </View>
            {item.reason ? (
              <Text style={styles.reasonText} numberOfLines={2}>{item.reason}</Text>
            ) : null}
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
        <Text style={styles.headerTitle}>Leave Requests</Text>
        <Pressable testID="add-button" onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add-circle" size={26} color={Colors.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={requests || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRequest}
          contentContainerStyle={[styles.list, { paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No leave requests</Text>
              <Text style={styles.emptySubtext}>Tap + to submit a leave request</Text>
            </View>
          }
        />
      )}

      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Leave Request</Text>
              <Pressable onPress={resetForm}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="2025-03-15"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.inputLabel}>Reason</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={reason}
              onChangeText={setReason}
              placeholder="Why do you need leave?"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor={Colors.textTertiary}
            />

            <Pressable
              style={[styles.saveBtn, (!date || !reason) && styles.saveBtnDisabled]}
              onPress={() => createMutation.mutate({ date, reason })}
              disabled={!date || !reason || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Submit Request</Text>
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
  cardHeader: { flexDirection: "row", gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardDate: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  reasonText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 6, lineHeight: 18 },
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
  textArea: { minHeight: 100, paddingTop: 12 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
