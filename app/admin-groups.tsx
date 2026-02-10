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
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

export default function AdminGroupsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: groups, isLoading, refetch } = useQuery({
    queryKey: ["groups"],
    queryFn: () => apiGet("/api/groups"),
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiGet("/api/users"),
    enabled: showMembersModal,
  });

  const { data: groupMembers, refetch: refetchMembers } = useQuery({
    queryKey: ["group-members", selectedGroup?.id],
    queryFn: () => apiGet(`/api/groups/${selectedGroup.id}/members`),
    enabled: !!selectedGroup,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/groups", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      resetForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: number; userId: number }) =>
      apiPost(`/api/groups/${groupId}/members`, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-members", selectedGroup?.id] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: number; userId: number }) =>
      apiDelete(`/api/groups/${groupId}/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-members", selectedGroup?.id] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const callMutation = useMutation({
    mutationFn: ({ groupId, callType }: { groupId: number; callType: string }) =>
      apiPost(`/api/groups/${groupId}/call`, { callType }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Call Started", "All group members have been notified.");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to start call");
    },
  });

  function startCall(groupId: number, groupName: string, callType: "voice" | "video") {
    const label = callType === "video" ? "Video Call" : "Voice Call";
    Alert.alert(`Start ${label}`, `Notify all members of "${groupName}" about a ${label.toLowerCase()}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Start", onPress: () => callMutation.mutate({ groupId, callType }) },
    ]);
  }

  function resetForm() {
    setShowCreateModal(false);
    setName("");
    setDescription("");
  }

  function handleDelete(id: number, groupName: string) {
    Alert.alert("Delete Group", `Delete "${groupName}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(id) },
    ]);
  }

  function openMembers(group: any) {
    setSelectedGroup(group);
    setShowMembersModal(true);
  }

  function closeMembers() {
    setShowMembersModal(false);
    setSelectedGroup(null);
  }

  function isMember(userId: number): boolean {
    if (!groupMembers) return false;
    return groupMembers.some((m: any) => m.userId === userId || m.user?.id === userId || m.id === userId);
  }

  function toggleMember(userId: number) {
    if (!selectedGroup) return;
    if (isMember(userId)) {
      removeMemberMutation.mutate({ groupId: selectedGroup.id, userId });
    } else {
      addMemberMutation.mutate({ groupId: selectedGroup.id, userId });
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function renderGroup({ item }: { item: any }) {
    const memberCount = item.memberCount || item._count?.members || 0;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: Colors.accentLight + "40" }]}>
            <Ionicons name="chatbubbles" size={18} color={Colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.groupName}>{item.name}</Text>
            {item.description ? (
              <Text style={styles.groupDescription} numberOfLines={2}>{item.description}</Text>
            ) : null}
          </View>
          <Pressable testID="delete-group-button" onPress={() => handleDelete(item.id, item.name)}>
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </Pressable>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <View style={styles.metaRow}>
              <Ionicons name="people-outline" size={14} color={Colors.textTertiary} />
              <Text style={styles.metaText}>{memberCount} members</Text>
            </View>
          </View>
          <View style={styles.footerActions}>
            <Pressable onPress={() => startCall(item.id, item.name, "voice")} style={styles.callBtn}>
              <Ionicons name="call-outline" size={16} color={Colors.success} />
            </Pressable>
            <Pressable onPress={() => startCall(item.id, item.name, "video")} style={styles.callBtn}>
              <Ionicons name="videocam-outline" size={16} color={Colors.info} />
            </Pressable>
            <Pressable
              testID="members-button"
              style={styles.membersBtn}
              onPress={() => openMembers(item)}
            >
              <Ionicons name="person-add-outline" size={14} color={Colors.primary} />
              <Text style={styles.membersBtnText}>Members</Text>
            </Pressable>
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
        <Text style={styles.headerTitle}>Groups</Text>
        <Pressable testID="add-button" onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add-circle" size={26} color={Colors.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={groups || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderGroup}
          contentContainerStyle={[styles.list, { paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No groups created</Text>
              <Text style={styles.emptySubtext}>Tap + to create a new group chat</Text>
            </View>
          }
        />
      )}

      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Group</Text>
              <Pressable onPress={resetForm}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Group Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. React Study Group"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="What is this group about?"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholderTextColor={Colors.textTertiary}
            />

            <Pressable
              style={[styles.saveBtn, !name && styles.saveBtnDisabled]}
              onPress={() => createMutation.mutate({ name, description })}
              disabled={!name || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Create Group</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showMembersModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.membersModalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedGroup?.name} - Members
              </Text>
              <Pressable testID="close-members-modal" onPress={closeMembers}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {(users || []).map((user: any) => {
                const memberStatus = isMember(user.id);
                return (
                  <Pressable
                    key={user.id}
                    style={[styles.userRow, memberStatus && styles.userRowActive]}
                    onPress={() => toggleMember(user.id)}
                  >
                    <View style={[styles.userAvatar, memberStatus && styles.userAvatarActive]}>
                      <Ionicons
                        name="person"
                        size={16}
                        color={memberStatus ? "#fff" : Colors.textTertiary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>{user.name || user.email}</Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                    </View>
                    <View style={[styles.checkbox, memberStatus && styles.checkboxActive]}>
                      {memberStatus && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                  </Pressable>
                );
              })}
              {(!users || users.length === 0) && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No users found</Text>
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
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconContainer: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  groupName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  groupDescription: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  cardFooter: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerLeft: { gap: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  footerActions: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
  callBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.background, justifyContent: "center" as const, alignItems: "center" as const, borderWidth: 1, borderColor: Colors.borderLight },
  membersBtn: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4, backgroundColor: Colors.primary + "10", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  membersBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  membersModalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text, flex: 1 },
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
  textArea: { minHeight: 80, paddingTop: 12 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: Colors.background,
    gap: 12,
  },
  userRowActive: { backgroundColor: Colors.primary + "08", borderWidth: 1, borderColor: Colors.primary + "30" },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },
  userAvatarActive: { backgroundColor: Colors.primary },
  userName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  userEmail: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
});
