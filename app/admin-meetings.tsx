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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

const MEETING_TYPES = [
  { value: "class", label: "Class", icon: "school" as const, color: Colors.primary },
  { value: "mock_interview", label: "Mock Interview", icon: "people" as const, color: Colors.warning },
  { value: "live_coding", label: "Live Coding", icon: "code-slash" as const, color: Colors.success },
];

const ASSIGN_MODES = [
  { value: "course", label: "Course", icon: "book" as const },
  { value: "group", label: "Group", icon: "people" as const },
  { value: "user", label: "User", icon: "person" as const },
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
  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedHour, setSelectedHour] = useState<number>(9);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [assignTo, setAssignTo] = useState("course");
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const { data: meetings, isLoading, refetch } = useQuery({
    queryKey: ["meetings"],
    queryFn: () => apiGet("/api/meetings"),
  });

  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: () => apiGet("/api/courses"),
    enabled: showCreateModal,
  });

  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: () => apiGet("/api/groups"),
    enabled: showCreateModal,
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiGet("/api/users"),
    enabled: showCreateModal,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/meetings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      resetForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/meetings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  function resetForm() {
    setShowCreateModal(false);
    setTitle("");
    setLink("");
    setMeetingType("class");
    setScheduledDate("");
    setAssignTo("course");
    setSelectedCourseId(null);
    setSelectedGroupId(null);
    setSelectedUserId(null);
    const now = new Date();
    setCalendarMonth(now.getMonth());
    setCalendarYear(now.getFullYear());
    setSelectedDay(null);
    setSelectedHour(9);
    setSelectedMinute(0);
  }

  function updateScheduledDate(day: number, hour: number, minute: number) {
    const m = String(calendarMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    const h = String(hour).padStart(2, "0");
    const min = String(minute).padStart(2, "0");
    setScheduledDate(`${calendarYear}-${m}-${d}T${h}:${min}:00`);
  }

  function handleDayPress(day: number) {
    setSelectedDay(day);
    updateScheduledDate(day, selectedHour, selectedMinute);
  }

  function handleHourPress(hour: number) {
    setSelectedHour(hour);
    if (selectedDay) updateScheduledDate(selectedDay, hour, selectedMinute);
  }

  function handleMinutePress(minute: number) {
    setSelectedMinute(minute);
    if (selectedDay) updateScheduledDate(selectedDay, selectedHour, minute);
  }

  function goToPrevMonth() {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  }

  function goToNextMonth() {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  }

  function isDayPast(day: number) {
    const d = new Date(calendarYear, calendarMonth, day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return d < todayStart;
  }

  function getCalendarDays() {
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const blanks: (number | null)[] = Array(firstDay).fill(null);
    const days: (number | null)[] = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return [...blanks, ...days];
  }

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const MINUTES = [0, 15, 30, 45];

  const isPrevMonthDisabled = calendarYear === today.getFullYear() && calendarMonth <= today.getMonth();

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

  function handleDelete(id: number) {
    Alert.alert("Delete Meeting", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(id) },
    ]);
  }

  function handleCreate() {
    const body: any = {
      title,
      link,
      meetingType,
      assignTo,
      scheduledAt: scheduledDate
        ? new Date(scheduledDate).toISOString()
        : new Date(Date.now() + 86400000).toISOString(),
    };
    if (assignTo === "course" && selectedCourseId) body.courseId = selectedCourseId;
    if (assignTo === "group" && selectedGroupId) body.groupId = selectedGroupId;
    if (assignTo === "user" && selectedUserId) body.assignedUserId = selectedUserId;
    createMutation.mutate(body);
  }

  function getAssignLabel(item: any) {
    if (item.assignTo === "user") return "Individual";
    if (item.assignTo === "group") return "Group";
    return "Course";
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
            <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
              <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
              <View style={styles.assignBadge}>
                <Text style={styles.assignBadgeText}>{getAssignLabel(item)}</Text>
              </View>
            </View>
          </View>
          <Pressable onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </Pressable>
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
        <Pressable testID="back-button" onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Meetings</Text>
        <Pressable testID="add-meeting-button" onPress={() => setShowCreateModal(true)} style={{ padding: 8 }}>
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
          <ScrollView style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
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

            <Text style={styles.inputLabel}>Assign To</Text>
            <View style={styles.typeSelector}>
              {ASSIGN_MODES.map((m) => (
                <Pressable
                  key={m.value}
                  style={[styles.typeOption, assignTo === m.value && styles.typeOptionActive]}
                  onPress={() => setAssignTo(m.value)}
                >
                  <Ionicons name={m.icon} size={16} color={assignTo === m.value ? "#fff" : Colors.textSecondary} />
                  <Text style={[styles.typeOptionText, assignTo === m.value && styles.typeOptionTextActive]}>
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {assignTo === "course" && courses && (
              <>
                <Text style={styles.inputLabel}>Select Course</Text>
                {courses.map((c: any) => (
                  <Pressable
                    key={c.id}
                    style={[styles.selectItem, selectedCourseId === c.id && styles.selectItemActive]}
                    onPress={() => setSelectedCourseId(c.id)}
                  >
                    <Ionicons name={selectedCourseId === c.id ? "radio-button-on" : "radio-button-off"} size={18} color={selectedCourseId === c.id ? Colors.primary : Colors.textTertiary} />
                    <Text style={[styles.selectItemText, selectedCourseId === c.id && { color: Colors.primary }]}>{c.title}</Text>
                  </Pressable>
                ))}
              </>
            )}

            {assignTo === "group" && groups && (
              <>
                <Text style={styles.inputLabel}>Select Group</Text>
                {groups.map((g: any) => (
                  <Pressable
                    key={g.id}
                    style={[styles.selectItem, selectedGroupId === g.id && styles.selectItemActive]}
                    onPress={() => setSelectedGroupId(g.id)}
                  >
                    <Ionicons name={selectedGroupId === g.id ? "radio-button-on" : "radio-button-off"} size={18} color={selectedGroupId === g.id ? Colors.primary : Colors.textTertiary} />
                    <Text style={[styles.selectItemText, selectedGroupId === g.id && { color: Colors.primary }]}>{g.name}</Text>
                  </Pressable>
                ))}
              </>
            )}

            {assignTo === "user" && users && (
              <>
                <Text style={styles.inputLabel}>Select Student</Text>
                {users.filter((u: any) => u.role === "student").map((u: any) => (
                  <Pressable
                    key={u.id}
                    style={[styles.selectItem, selectedUserId === u.id && styles.selectItemActive]}
                    onPress={() => setSelectedUserId(u.id)}
                  >
                    <Ionicons name={selectedUserId === u.id ? "radio-button-on" : "radio-button-off"} size={18} color={selectedUserId === u.id ? Colors.primary : Colors.textTertiary} />
                    <Text style={[styles.selectItemText, selectedUserId === u.id && { color: Colors.primary }]}>{u.name} ({u.email})</Text>
                  </Pressable>
                ))}
              </>
            )}

            <Text style={styles.inputLabel}>Scheduled Date & Time</Text>
            <View style={styles.calendarContainer}>
              <View style={styles.calendarNav}>
                <Pressable onPress={goToPrevMonth} disabled={isPrevMonthDisabled} style={styles.calendarNavBtn}>
                  <Ionicons name="chevron-back" size={20} color={isPrevMonthDisabled ? Colors.textTertiary : Colors.text} />
                </Pressable>
                <Text style={styles.calendarMonthLabel}>{MONTH_NAMES[calendarMonth]} {calendarYear}</Text>
                <Pressable onPress={goToNextMonth} style={styles.calendarNavBtn}>
                  <Ionicons name="chevron-forward" size={20} color={Colors.text} />
                </Pressable>
              </View>
              <View style={styles.calendarWeekRow}>
                {WEEKDAYS.map((wd) => (
                  <View key={wd} style={styles.calendarWeekCell}>
                    <Text style={styles.calendarWeekText}>{wd}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.calendarGrid}>
                {getCalendarDays().map((day, idx) => {
                  if (day === null) {
                    return <View key={`blank-${idx}`} style={styles.calendarDayCell} />;
                  }
                  const past = isDayPast(day);
                  const isSelected = selectedDay === day && calendarMonth === new Date(scheduledDate || "").getMonth() && calendarYear === new Date(scheduledDate || "").getFullYear();
                  const isToday = day === today.getDate() && calendarMonth === today.getMonth() && calendarYear === today.getFullYear();
                  return (
                    <Pressable
                      key={`day-${day}`}
                      style={[styles.calendarDayCell, isSelected && styles.calendarDayCellSelected, isToday && !isSelected && styles.calendarDayCellToday]}
                      onPress={() => !past && handleDayPress(day)}
                      disabled={past}
                    >
                      <Text style={[styles.calendarDayText, past && styles.calendarDayTextPast, isSelected && styles.calendarDayTextSelected]}>
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Text style={styles.inputLabel}>Hour</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScrollRow} contentContainerStyle={styles.timeScrollContent}>
              {HOURS.map((h) => (
                <Pressable key={`h-${h}`} style={[styles.timeChip, selectedHour === h && styles.timeChipSelected]} onPress={() => handleHourPress(h)}>
                  <Text style={[styles.timeChipText, selectedHour === h && styles.timeChipTextSelected]}>
                    {String(h).padStart(2, "0")}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Minute</Text>
            <View style={styles.minuteRow}>
              {MINUTES.map((m) => (
                <Pressable key={`m-${m}`} style={[styles.timeChip, styles.minuteChip, selectedMinute === m && styles.timeChipSelected]} onPress={() => handleMinutePress(m)}>
                  <Text style={[styles.timeChipText, selectedMinute === m && styles.timeChipTextSelected]}>
                    :{String(m).padStart(2, "0")}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[styles.saveBtn, (!title || !link) && styles.saveBtnDisabled]}
              onPress={handleCreate}
              disabled={!title || !link || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Schedule Meeting</Text>
              )}
            </Pressable>
            <View style={{ height: 40 }} />
          </ScrollView>
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
  typeBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  assignBadge: { backgroundColor: Colors.borderLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  assignBadgeText: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  cardFooter: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight, gap: 6 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  linkText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.primary, flex: 1 },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "85%" },
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
  selectItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: Colors.background,
  },
  selectItemActive: { backgroundColor: "#EEF2FF" },
  selectItemText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, flex: 1 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  calendarContainer: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  calendarNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calendarNavBtn: {
    padding: 4,
  },
  calendarMonthLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  calendarWeekRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  calendarWeekCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  calendarWeekText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDayCellSelected: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
  },
  calendarDayCellToday: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  calendarDayTextPast: {
    color: Colors.textTertiary,
  },
  calendarDayTextSelected: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  timeScrollRow: {
    maxHeight: 40,
  },
  timeScrollContent: {
    gap: 6,
    paddingVertical: 2,
  },
  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  timeChipTextSelected: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  minuteRow: {
    flexDirection: "row",
    gap: 8,
  },
  minuteChip: {
    flex: 1,
    alignItems: "center",
  },
});
