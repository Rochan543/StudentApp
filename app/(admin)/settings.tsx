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
  Modal,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

export default function AdminSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponCourseId, setCouponCourseId] = useState("");
  const [couponMaxUses, setCouponMaxUses] = useState("10");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [meetingType, setMeetingType] = useState("class");

  const { data: coupons } = useQuery({ queryKey: ["coupons"], queryFn: () => apiGet("/api/coupons") });
  const { data: courses } = useQuery({ queryKey: ["admin-courses"], queryFn: () => apiGet("/api/courses") });
  const { data: meetings } = useQuery({ queryKey: ["meetings"], queryFn: () => apiGet("/api/meetings") });
  const { data: leaderboard } = useQuery({ queryKey: ["leaderboard"], queryFn: () => apiGet("/api/leaderboard") });

  const couponMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/coupons", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      setShowCouponModal(false);
      setCouponCode("");
      setCouponCourseId("");
      setCouponMaxUses("10");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const meetingMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/meetings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setShowMeetingModal(false);
      setMeetingTitle("");
      setMeetingLink("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  async function handleLogout() {
    await logout();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace("/(auth)/login");
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + webTopInset + 16, paddingBottom: 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Administration</Text>

      <Text style={styles.sectionLabel}>MANAGEMENT</Text>

      <Pressable style={styles.menuItem} onPress={() => setShowCouponModal(true)}>
        <View style={[styles.menuIcon, { backgroundColor: "#FEF3C7" }]}>
          <Ionicons name="ticket" size={20} color={Colors.warning} />
        </View>
        <View style={styles.menuInfo}>
          <Text style={styles.menuTitle}>Coupon Codes</Text>
          <Text style={styles.menuSubtitle}>{coupons?.length || 0} coupons created</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
      </Pressable>

      <Pressable style={styles.menuItem} onPress={() => setShowMeetingModal(true)}>
        <View style={[styles.menuIcon, { backgroundColor: "#DBEAFE" }]}>
          <Ionicons name="videocam" size={20} color={Colors.primary} />
        </View>
        <View style={styles.menuInfo}>
          <Text style={styles.menuTitle}>Schedule Meeting</Text>
          <Text style={styles.menuSubtitle}>{meetings?.length || 0} meetings total</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
      </Pressable>

      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>LEADERBOARD</Text>
      {(leaderboard || []).slice(0, 5).map((item: any, idx: number) => (
        <View key={item.entry.id} style={styles.rankItem}>
          <Text style={styles.rankNum}>#{idx + 1}</Text>
          <Text style={styles.rankName}>{item.user.name}</Text>
          <Text style={styles.rankPoints}>{Math.round(item.entry.totalPoints)} pts</Text>
        </View>
      ))}

      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>COUPONS</Text>
      {(coupons || []).slice(0, 5).map((item: any) => (
        <View key={item.coupon.id} style={styles.couponItem}>
          <View>
            <Text style={styles.couponCode}>{item.coupon.code}</Text>
            <Text style={styles.couponMeta}>{item.course.title} | Used: {item.coupon.usedCount}/{item.coupon.maxUses}</Text>
          </View>
          <View style={[styles.couponStatus, item.coupon.isActive ? styles.active : styles.inactive]}>
            <Text style={[styles.couponStatusText, item.coupon.isActive ? styles.activeText : styles.inactiveText]}>
              {item.coupon.isActive ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>
      ))}

      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>ACCOUNT</Text>
      <Pressable style={styles.logoutItem} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </Pressable>

      <Modal visible={showCouponModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Coupon</Text>
              <Pressable onPress={() => setShowCouponModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <Text style={styles.inputLabel}>Coupon Code</Text>
            <TextInput style={styles.modalInput} value={couponCode} onChangeText={setCouponCode} placeholder="e.g. FREE2024" autoCapitalize="characters" placeholderTextColor={Colors.textTertiary} />
            <Text style={styles.inputLabel}>Course ID</Text>
            <TextInput style={styles.modalInput} value={couponCourseId} onChangeText={setCouponCourseId} placeholder="Enter course ID" keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
            {courses && (
              <Text style={styles.hint}>
                Available: {courses.map((c: any) => `${c.id}: ${c.title}`).join(", ")}
              </Text>
            )}
            <Text style={styles.inputLabel}>Max Uses</Text>
            <TextInput style={styles.modalInput} value={couponMaxUses} onChangeText={setCouponMaxUses} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
            <Pressable
              style={[styles.saveBtn, (!couponCode || !couponCourseId) && styles.saveBtnDisabled]}
              onPress={() => couponMutation.mutate({ code: couponCode, courseId: parseInt(couponCourseId), maxUses: parseInt(couponMaxUses) || 10 })}
              disabled={!couponCode || !couponCourseId || couponMutation.isPending}
            >
              {couponMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Create Coupon</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showMeetingModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Meeting</Text>
              <Pressable onPress={() => setShowMeetingModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput style={styles.modalInput} value={meetingTitle} onChangeText={setMeetingTitle} placeholder="Meeting title" placeholderTextColor={Colors.textTertiary} />
            <Text style={styles.inputLabel}>Meeting Link</Text>
            <TextInput style={styles.modalInput} value={meetingLink} onChangeText={setMeetingLink} placeholder="Zoom/Meet URL" placeholderTextColor={Colors.textTertiary} autoCapitalize="none" />
            <Text style={styles.inputLabel}>Type</Text>
            <View style={styles.typeRow}>
              {["class", "mock_interview", "live_coding"].map((t) => (
                <Pressable key={t} style={[styles.typeBtn, meetingType === t && styles.typeBtnActive]} onPress={() => setMeetingType(t)}>
                  <Text style={[styles.typeBtnText, meetingType === t && styles.typeBtnTextActive]}>{t.replace("_", " ")}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[styles.saveBtn, (!meetingTitle || !meetingLink) && styles.saveBtnDisabled]}
              onPress={() => meetingMutation.mutate({ title: meetingTitle, link: meetingLink, meetingType, scheduledAt: new Date(Date.now() + 86400000).toISOString() })}
              disabled={!meetingTitle || !meetingLink || meetingMutation.isPending}
            >
              {meetingMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Schedule Meeting</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 24 },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textTertiary, marginBottom: 12, letterSpacing: 0.5 },
  menuItem: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight },
  menuIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 12 },
  menuInfo: { flex: 1 },
  menuTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  menuSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  rankItem: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: Colors.borderLight },
  rankNum: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.primary, width: 36 },
  rankName: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text },
  rankPoints: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  couponItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.surface, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: Colors.borderLight },
  couponCode: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text },
  couponMeta: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  couponStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  active: { backgroundColor: "#ECFDF5" },
  inactive: { backgroundColor: Colors.errorLight },
  couponStatusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  activeText: { color: Colors.success },
  inactiveText: { color: Colors.error },
  logoutItem: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: Colors.errorLight },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.error },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  inputLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 6, marginTop: 12 },
  modalInput: { backgroundColor: Colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textTertiary, marginTop: 4 },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.background, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  typeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeBtnText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textTransform: "capitalize" as const },
  typeBtnTextActive: { color: "#fff" },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
