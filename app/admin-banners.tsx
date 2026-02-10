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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

export default function AdminBannersScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [link, setLink] = useState("");

  const { data: banners, isLoading, refetch } = useQuery({
    queryKey: ["banners"],
    queryFn: () => apiGet("/api/banners"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/banners", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      resetForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiPut(`/api/banners/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/banners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  function resetForm() {
    setShowCreateModal(false);
    setTitle("");
    setSubtitle("");
    setImageUrl("");
    setLink("");
  }

  function handleDelete(id: number) {
    Alert.alert("Delete Banner", "Are you sure you want to delete this banner?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(id) },
    ]);
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function renderBanner({ item }: { item: any }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{item.title}</Text>
            {item.subtitle ? <Text style={styles.bannerSubtitle}>{item.subtitle}</Text> : null}
          </View>
          <Pressable
            onPress={() => toggleMutation.mutate({ id: item.id, isActive: !item.isActive })}
            style={[styles.statusBadge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}
          >
            <Text style={[styles.statusText, item.isActive ? styles.activeText : styles.inactiveText]}>
              {item.isActive ? "Active" : "Inactive"}
            </Text>
          </Pressable>
        </View>
        {item.link ? (
          <View style={styles.linkRow}>
            <Ionicons name="link-outline" size={14} color={Colors.primary} />
            <Text style={styles.linkText} numberOfLines={1}>{item.link}</Text>
          </View>
        ) : null}
        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          <Pressable onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Banner Management</Text>
        <Pressable onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add-circle" size={26} color={Colors.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={banners || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderBanner}
          contentContainerStyle={[styles.list, { paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="image-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No banners yet</Text>
              <Text style={styles.emptySubtext}>Tap + to create a new banner</Text>
            </View>
          }
        />
      )}

      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Banner</Text>
              <Pressable onPress={resetForm}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Banner title"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.inputLabel}>Subtitle</Text>
            <TextInput
              style={styles.input}
              value={subtitle}
              onChangeText={setSubtitle}
              placeholder="Optional subtitle"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.inputLabel}>Image URL</Text>
            <TextInput
              style={styles.input}
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://example.com/image.jpg"
              autoCapitalize="none"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.inputLabel}>Link URL</Text>
            <TextInput
              style={styles.input}
              value={link}
              onChangeText={setLink}
              placeholder="https://example.com"
              autoCapitalize="none"
              placeholderTextColor={Colors.textTertiary}
            />

            <Pressable
              style={[styles.saveBtn, !title && styles.saveBtnDisabled]}
              onPress={() => createMutation.mutate({ title, subtitle, imageUrl, link })}
              disabled={!title || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Create Banner</Text>
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
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  bannerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text },
  bannerSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  activeBadge: { backgroundColor: "#ECFDF5" },
  inactiveBadge: { backgroundColor: Colors.errorLight },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  activeText: { color: Colors.success },
  inactiveText: { color: Colors.error },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  linkText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.primary, flex: 1 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  dateText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
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
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
