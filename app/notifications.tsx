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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut } from "@/lib/api";
import Colors from "@/constants/colors";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiGet("/api/notifications"),
  });

  async function markRead(id: number) {

    // ✅ FIX: send empty object
    await apiPut(`/api/notifications/${id}/read`, {});

    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["unread-count"] });
  }

  async function markAllRead() {

    // ✅ FIX: send empty object
    await apiPut("/api/notifications/read-all", {});

    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["unread-count"] });
  }

  function getIcon(type: string) {
    switch (type) {
      case "success": return { name: "checkmark-circle" as const, color: Colors.success };
      case "warning": return { name: "warning" as const, color: Colors.warning };
      case "error": return { name: "alert-circle" as const, color: Colors.error };
      default: return { name: "information-circle" as const, color: Colors.info };
    }
  }

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>

        <Text style={styles.title}>Notifications</Text>

        <Pressable onPress={markAllRead}>
          <Ionicons name="checkmark-done" size={24} color={Colors.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={notifications || []}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.list, { paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={() => refetch()} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          }
          renderItem={({ item }) => {
            const icon = getIcon(item.type);

            return (
              <Pressable
                style={[styles.notifCard, !item.isRead && styles.notifCardUnread]}
                onPress={() => !item.isRead && markRead(item.id)}
              >
                <View style={[styles.notifIcon, { backgroundColor: `${icon.color}15` }]}>
                  <Ionicons name={icon.name} size={22} color={icon.color} />
                </View>

                <View style={styles.notifContent}>
                  <Text style={[styles.notifTitle, !item.isRead && styles.notifTitleUnread]}>
                    {item.title}
                  </Text>

                  <Text style={styles.notifMessage} numberOfLines={2}>
                    {item.message}
                  </Text>

                  <Text style={styles.notifTime}>
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>

                {!item.isRead && <View style={styles.unreadDot} />}
              </Pressable>
            );
          }}
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 12,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    flex: 1,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },

  list: { paddingHorizontal: 20, paddingTop: 12 },

  notifCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  notifCardUnread: {
    backgroundColor: "#EEF2FF",
    borderColor: Colors.primary + "30",
  },

  notifIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  notifContent: { flex: 1 },

  notifTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },

  notifTitleUnread: { color: Colors.primaryDark },

  notifMessage: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },

  notifTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 4,
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },

  emptyState: { alignItems: "center", paddingTop: 80, gap: 12 },

  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
});
