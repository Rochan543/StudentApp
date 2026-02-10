import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut } from "@/lib/api";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: Colors.warning, bg: Colors.warningLight },
  approved: { label: "Approved", color: Colors.success, bg: Colors.successLight },
  rejected: { label: "Rejected", color: Colors.error, bg: Colors.errorLight },
};

export default function AdminLeaveRequestsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ["leave-requests"],
    queryFn: () => apiGet("/api/leave-requests"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiPut(`/api/leave-requests/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to update leave request");
    },
  });

  function handleAction(id: number, action: string) {
    const label = action === "approved" ? "Approve" : "Reject";
    if (Platform.OS === "web") {
      const confirmed = window.confirm(`Are you sure you want to ${label.toLowerCase()} this leave request?`);
      if (confirmed) {
        updateMutation.mutate({ id, status: action });
      }
    } else {
      Alert.alert(`${label} Request`, `Are you sure you want to ${label.toLowerCase()} this leave request?`, [
        { text: "Cancel", style: "cancel" },
        { text: label, onPress: () => updateMutation.mutate({ id, status: action }) },
      ]);
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function renderRequest({ item }: { item: any }) {
    const config = statusConfig[item.status] || statusConfig.pending;
    const studentName = item.user?.name || item.userName || "Student";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatarWrap}>
              <Ionicons name="person" size={16} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.studentName}>{studentName}</Text>
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={13} color={Colors.textTertiary} />
                <Text style={styles.dateText}>{formatDate(item.date)}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>

        {item.reason ? (
          <View style={styles.reasonWrap}>
            <Text style={styles.reasonLabel}>Reason</Text>
            <Text style={styles.reasonText}>{item.reason}</Text>
          </View>
        ) : null}

        {item.status === "pending" && (
          <View style={styles.actionRow}>
            <Pressable
              testID="approve-button"
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => handleAction(item.id, "approved")}
              disabled={updateMutation.isPending}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Approve</Text>
            </Pressable>
            <Pressable
              testID="reject-button"
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleAction(item.id, "rejected")}
              disabled={updateMutation.isPending}
            >
              <Ionicons name="close" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Reject</Text>
            </Pressable>
          </View>
        )}
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
        <View style={{ width: 22 }} />
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
              <Text style={styles.emptySubtext}>Requests will appear here when students submit them</Text>
            </View>
          }
        />
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
  list: { paddingHorizontal: 20, paddingTop: 16 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  userInfo: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10 },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  studentName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  dateText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  reasonWrap: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  reasonLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textTertiary, marginBottom: 4 },
  reasonText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, lineHeight: 20 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  approveBtn: { backgroundColor: Colors.success },
  rejectBtn: { backgroundColor: Colors.error },
  actionBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
});
