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
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import Colors from "@/constants/colors";

interface Group {
  id: number;
  name: string;
  description: string;
  createdBy: number;
  createdAt: string;
}

export default function GroupsScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: groups, isLoading, refetch } = useQuery({
    queryKey: ["groups"],
    queryFn: () => apiGet<Group[]>("/api/groups"),
  });

  function handleCall(groupName: string) {
    Alert.alert("Start Call", `Start a voice call with ${groupName}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Call", onPress: () => Linking.openURL(`tel:`) },
    ]);
  }

  function handleVideoCall(groupName: string) {
  Alert.alert("Video Call", `Start a video call with ${groupName}?`, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Start",
      onPress: async () => {
        const url = "https://meet.google.com";

        const supported = await Linking.canOpenURL(url);

        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert("Error", "No browser available to open meeting link");
        }
      },
    },
  ]);
}


  const renderItem = ({ item }: { item: Group }) => {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={() =>
          router.push({ pathname: "/chat/[id]", params: { id: item.id.toString() } })
        }
      >
        <View style={styles.cardRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="people" size={22} color={Colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
            {item.description ? (
              <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>
            ) : null}
            <View style={styles.dateMeta}>
              <Ionicons name="calendar-outline" size={12} color={Colors.textTertiary} />
              <Text style={styles.dateText}>
                Created {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <View style={styles.actionButtons}>
            <Pressable
              style={styles.callBtn}
              onPress={(e) => { e.stopPropagation(); handleCall(item.name); }}
              hitSlop={4}
            >
              <Ionicons name="call-outline" size={18} color={Colors.success} />
            </Pressable>
            <Pressable
              style={styles.callBtn}
              onPress={(e) => { e.stopPropagation(); handleVideoCall(item.name); }}
              hitSlop={4}
            >
              <Ionicons name="videocam-outline" size={18} color={Colors.primary} />
            </Pressable>
            <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} />
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Pressable testID="back-button" onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Study Groups</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={groups || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No groups available</Text>
              <Text style={styles.emptySubtext}>Study groups will appear here when created</Text>
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
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  cardRow: { flexDirection: "row", alignItems: "center" },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  cardDescription: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  dateMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  dateText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  actionButtons: { flexDirection: "row", alignItems: "center", gap: 10 },
  callBtn: { padding: 4 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
});
