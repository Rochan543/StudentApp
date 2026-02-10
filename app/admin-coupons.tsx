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
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

export default function AdminCouponsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [code, setCode] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedCourseTitle, setSelectedCourseTitle] = useState("");
  const [maxUses, setMaxUses] = useState("10");

  const { data: coupons, isLoading, refetch } = useQuery({
    queryKey: ["coupons"],
    queryFn: () => apiGet("/api/coupons"),
  });

  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: () => apiGet("/api/courses"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/coupons", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      resetForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiPut(`/api/coupons/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/coupons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  function resetForm() {
    setShowCreateModal(false);
    setCode("");
    setSelectedCourseId(null);
    setSelectedCourseTitle("");
    setMaxUses("10");
  }

  function handleDelete(id: number) {
    Alert.alert("Delete Coupon", "This will deactivate the coupon. Continue?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(id) },
    ]);
  }

  function renderCoupon({ item }: { item: any }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.codeContainer}>
            <Ionicons name="ticket" size={16} color={Colors.primary} />
            <Text style={styles.codeText}>{item.coupon.code}</Text>
          </View>
          <Pressable
            onPress={() => toggleMutation.mutate({ id: item.coupon.id, isActive: !item.coupon.isActive })}
            style={[styles.statusBadge, item.coupon.isActive ? styles.activeBadge : styles.inactiveBadge]}
          >
            <Text style={[styles.statusText, item.coupon.isActive ? styles.activeText : styles.inactiveText]}>
              {item.coupon.isActive ? "Active" : "Inactive"}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.courseLabel}>{item.course?.title || "Unknown Course"}</Text>
        <View style={styles.cardFooter}>
          <View style={styles.usageContainer}>
            <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.usageText}>
              {item.coupon.usedCount}/{item.coupon.maxUses} used
            </Text>
          </View>
          <Pressable onPress={() => handleDelete(item.coupon.id)}>
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </Pressable>
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
        <Text style={styles.title}>Coupon Management</Text>
        <Pressable testID="add-button" onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add-circle" size={26} color={Colors.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={coupons || []}
          keyExtractor={(item) => item.coupon.id.toString()}
          renderItem={renderCoupon}
          contentContainerStyle={[styles.list, { paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="ticket-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No coupons created</Text>
              <Text style={styles.emptySubtext}>Tap + to create a new coupon code</Text>
            </View>
          }
        />
      )}

      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Coupon</Text>
              <Pressable onPress={resetForm}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Coupon Code</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="e.g. WELCOME50"
              autoCapitalize="characters"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.inputLabel}>Course</Text>
            <Pressable style={styles.pickerBtn} onPress={() => setShowCoursePicker(!showCoursePicker)}>
              <Text style={[styles.pickerText, !selectedCourseTitle && { color: Colors.textTertiary }]}>
                {selectedCourseTitle || "Select a course"}
              </Text>
              <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
            </Pressable>
            {showCoursePicker && (
              <ScrollView style={styles.pickerList} nestedScrollEnabled>
                {(courses || []).map((c: any) => (
                  <Pressable
                    key={c.id}
                    style={[styles.pickerItem, selectedCourseId === c.id && styles.pickerItemActive]}
                    onPress={() => {
                      setSelectedCourseId(c.id);
                      setSelectedCourseTitle(c.title);
                      setShowCoursePicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, selectedCourseId === c.id && styles.pickerItemTextActive]}>
                      {c.title}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <Text style={styles.inputLabel}>Max Uses</Text>
            <TextInput
              style={styles.input}
              value={maxUses}
              onChangeText={setMaxUses}
              keyboardType="numeric"
              placeholderTextColor={Colors.textTertiary}
            />

            <Pressable
              style={[styles.saveBtn, (!code || !selectedCourseId) && styles.saveBtnDisabled]}
              onPress={() =>
                createMutation.mutate({
                  code,
                  courseId: selectedCourseId,
                  maxUses: parseInt(maxUses) || 10,
                })
              }
              disabled={!code || !selectedCourseId || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Create Coupon</Text>
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
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  list: { paddingHorizontal: 20, paddingTop: 16 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  codeContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  codeText: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  activeBadge: { backgroundColor: "#ECFDF5" },
  inactiveBadge: { backgroundColor: Colors.errorLight },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  activeText: { color: Colors.success },
  inactiveText: { color: Colors.error },
  courseLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 8 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  usageContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
  usageText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
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
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
  pickerList: { maxHeight: 150, backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginTop: 4 },
  pickerItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  pickerItemActive: { backgroundColor: Colors.primary + "10" },
  pickerItemText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text },
  pickerItemTextActive: { color: Colors.primary, fontFamily: "Inter_600SemiBold" },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
