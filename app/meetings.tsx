import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import Colors from "@/constants/colors";

interface Meeting {
  id: number;
  title: string;
  link: string;
  meetingType: string;
  scheduledAt: string;
  isActive: boolean;
}

const meetingTypeConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  class: { label: "Class", color: Colors.primary, bg: "#EEF2FF", icon: "videocam" },
  mock_interview: { label: "Mock Interview", color: "#7C3AED", bg: "#F3E8FF", icon: "person" },
  live_coding: { label: "Live Coding", color: Colors.success, bg: Colors.successLight, icon: "code-slash" },
};

export default function MeetingsScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: meetings, isLoading, refetch } = useQuery({
    queryKey: ["all-meetings"],
    queryFn: () => apiGet<Meeting[]>("/api/meetings"),
  });

  const now = new Date();
  const sorted = [...(meetings || [])].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );
  const upcoming = sorted.filter((m) => new Date(m.scheduledAt) >= now);
  const past = sorted.filter((m) => new Date(m.scheduledAt) < now).reverse();

  const sections = [
    ...(upcoming.length > 0 ? [{ type: "header" as const, title: "Upcoming" }] : []),
    ...upcoming.map((m) => ({ type: "meeting" as const, meeting: m })),
    ...(past.length > 0 ? [{ type: "header" as const, title: "Past" }] : []),
    ...past.map((m) => ({ type: "meeting" as const, meeting: m })),
  ];

  const handleMeetingPress = (meeting: Meeting) => {
    if (meeting.link) {
      Linking.openURL(meeting.link);
    }
  };

  const getTypeConfig = (type: string) =>
    meetingTypeConfig[type] || { label: type, color: Colors.textSecondary, bg: Colors.borderLight, icon: "ellipse" };

  const renderItem = ({ item }: { item: (typeof sections)[number] }) => {
    if (item.type === "header") {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{item.title}</Text>
        </View>
      );
    }

    const meeting = item.meeting!;
    const config = getTypeConfig(meeting.meetingType);
    const isPast = new Date(meeting.scheduledAt) < now;

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed, isPast && styles.cardPast]}
        onPress={() => handleMeetingPress(meeting)}
      >
        <View style={styles.cardRow}>
          <View style={[styles.iconWrap, { backgroundColor: config.bg }]}>
            <Ionicons name={config.icon as any} size={20} color={config.color} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, isPast && styles.cardTitlePast]} numberOfLines={1}>
              {meeting.title}
            </Text>
            <View style={styles.cardMeta}>
              <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
              <Text style={styles.cardDate}>
                {new Date(meeting.scheduledAt).toLocaleDateString()} at{" "}
                {new Date(meeting.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.typeBadgeText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>
        {meeting.link && (
          <View style={styles.linkRow}>
            <Ionicons name="link-outline" size={14} color={Colors.primary} />
            <Text style={styles.linkText} numberOfLines={1}>Join Meeting</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Pressable testID="back-button" onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Meetings</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item, index) => (item.type === "header" ? `header-${item.title}` : `meeting-${item.meeting!.id}`)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No meetings scheduled</Text>
              <Text style={styles.emptySubtext}>Meetings will appear here when scheduled</Text>
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
  sectionHeader: { paddingTop: 20, paddingBottom: 8 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text },
  list: { paddingHorizontal: 20, paddingTop: 4 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardPast: { opacity: 0.65 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  cardRow: { flexDirection: "row", alignItems: "center" },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  cardTitlePast: { color: Colors.textSecondary },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  cardDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
  typeBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  linkText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.primary },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
});
