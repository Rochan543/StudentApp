import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

function getTodayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function formatDateStr(year: number, month: number, day: number) {
  return year + "-" + String(month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
}

function getMonthDays(year: number, month: number) {
  const days: string[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(formatDateStr(year, month, d));
  }
  return days;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function StudentAttendanceScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const todayStr = getTodayStr();

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["attendance-stats"],
    queryFn: () => apiGet("/api/attendance-streak/stats"),
  });

  const { data: streakData, isLoading: streakLoading, refetch: refetchStreak } = useQuery({
    queryKey: ["attendance-streak"],
    queryFn: () => apiGet("/api/attendance-streak"),
  });

  const markMutation = useMutation({
    mutationFn: () => apiPost("/api/attendance-streak", { date: todayStr }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-stats"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-streak"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const isLoading = statsLoading || streakLoading;

  const attendanceDates = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(streakData)) {
      streakData.forEach((entry: any) => {
        const d = entry.date || entry;
        if (typeof d === "string") set.add(d.slice(0, 10));
      });
    }
    return set;
  }, [streakData]);

  const markedToday = attendanceDates.has(todayStr);
  const monthDays = getMonthDays(viewYear, viewMonth);

  const currentStreak = stats?.currentStreak || 0;
  const totalPresent = stats?.totalPresent || 0;
  const totalDays = stats?.totalDays || 0;
  const percentage = totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 0;

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  function onRefresh() {
    refetchStats();
    refetchStreak();
  }

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function goToNextMonth() {
    const currentNow = new Date();
    const maxYear = currentNow.getFullYear();
    const maxMonth = currentNow.getMonth();
    if (viewYear > maxYear || (viewYear === maxYear && viewMonth >= maxMonth)) {
      return;
    }
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const canGoNext = !(viewYear >= now.getFullYear() && viewMonth >= now.getMonth());

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Pressable testID="back-button" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Attendance</Text>
        <View style={{ width: 22 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
        >
          <View style={styles.streakCard}>
            <View style={styles.flameWrap}>
              <Ionicons name="flame" size={40} color="#FF6B35" />
            </View>
            <Text style={styles.streakNumber}>{currentStreak}</Text>
            <Text style={styles.streakLabel}>Day Streak</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{totalPresent}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{totalDays}</Text>
              <Text style={styles.statLabel}>Total Days</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{percentage}%</Text>
              <Text style={styles.statLabel}>Rate</Text>
            </View>
          </View>

          <Pressable
            testID="mark-attendance-button"
            style={[styles.markBtn, markedToday && styles.markBtnDisabled]}
            onPress={() => markMutation.mutate()}
            disabled={markedToday || markMutation.isPending}
          >
            {markMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={markedToday ? "checkmark-circle" : "hand-right"}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.markBtnText}>
                  {markedToday ? "Marked for Today" : "Mark Today's Attendance"}
                </Text>
              </>
            )}
          </Pressable>

          <View style={styles.calendarSection}>
            <View style={styles.calendarNav}>
              <Pressable onPress={goToPrevMonth} hitSlop={8}>
                <Ionicons name="chevron-back" size={22} color={Colors.text} />
              </Pressable>
              <Text style={styles.calendarTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
              <Pressable onPress={goToNextMonth} hitSlop={8} style={{ opacity: canGoNext ? 1 : 0.3 }}>
                <Ionicons name="chevron-forward" size={22} color={canGoNext ? Colors.text : Colors.textTertiary} />
              </Pressable>
            </View>
            <View style={styles.dayLabelsRow}>
              {dayLabels.map((label, i) => (
                <View key={i} style={styles.dayLabelWrap}>
                  <Text style={styles.dayLabelText}>{label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {(() => {
                const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
                const cells: React.ReactNode[] = [];
                for (let i = 0; i < firstDayOfMonth; i++) {
                  cells.push(<View key={`empty-${i}`} style={styles.calendarCell} />);
                }
                monthDays.forEach((dateStr) => {
                  const isPresent = attendanceDates.has(dateStr);
                  const isToday = dateStr === todayStr;
                  const isFuture = dateStr > todayStr;
                  const dayNum = new Date(dateStr).getDate();
                  const dayOfWeek = new Date(dateStr).getDay();
                  const isSunday = dayOfWeek === 0;

                  cells.push(
                    <View
                      key={dateStr}
                      style={[
                        styles.calendarCell,
                        isPresent
                          ? styles.cellPresent
                          : isSunday
                          ? styles.cellHoliday
                          : isFuture
                          ? styles.cellFuture
                          : styles.cellDefault,
                        isToday && styles.cellToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          isPresent && styles.cellTextPresent,
                          isSunday && !isPresent && styles.cellTextHoliday,
                          isFuture && !isSunday && styles.cellTextFuture,
                        ]}
                      >
                        {dayNum}
                      </Text>
                    </View>
                  );
                });
                return cells;
              })()}
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
                <Text style={styles.legendText}>Present</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border }]} />
                <Text style={styles.legendText}>Not Marked</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.borderLight }]} />
                <Text style={styles.legendText}>Holiday</Text>
              </View>
            </View>
          </View>
        </ScrollView>
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  streakCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  flameWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  streakNumber: { fontSize: 48, fontFamily: "Inter_700Bold", color: Colors.text },
  streakLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statNumber: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 4 },
  markBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  markBtnDisabled: { backgroundColor: Colors.success },
  markBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  calendarSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  calendarNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calendarTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text },
  dayLabelsRow: { flexDirection: "row", marginBottom: 6 },
  dayLabelWrap: { flex: 1, alignItems: "center" },
  dayLabelText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textTertiary },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarCell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 2,
  },
  cellPresent: { backgroundColor: Colors.success + "20", borderRadius: 8, margin: 1 },
  cellAbsent: { backgroundColor: Colors.error + "08", borderRadius: 8, margin: 1 },
  cellDefault: { backgroundColor: Colors.background, borderRadius: 8, margin: 1 },
  cellFuture: { backgroundColor: Colors.background, borderRadius: 8, margin: 1, opacity: 0.5 },
  cellHoliday: { backgroundColor: Colors.borderLight, borderRadius: 8, margin: 1 },
  cellToday: { borderWidth: 2, borderColor: Colors.primary },
  cellText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.text },
  cellTextPresent: { color: Colors.success, fontFamily: "Inter_700Bold" },
  cellTextHoliday: { color: Colors.textTertiary },
  cellTextFuture: { color: Colors.textTertiary },
  legendRow: { flexDirection: "row", justifyContent: "center", gap: 20, marginTop: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
});
