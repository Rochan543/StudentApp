import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut } from "@/lib/api";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

export default function AdminUsersScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const [search, setSearch] = useState("");

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiGet("/api/admin/users"),
  });

  const filtered = (users || []).filter((u: any) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  async function toggleActive(user: any) {
    const action = user.isActive ? "Disable" : "Enable";
    Alert.alert(`${action} User`, `${action} ${user.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: action,
        style: user.isActive ? "destructive" : "default",
        onPress: async () => {
          await apiPut(`/api/admin/users/${user.id}`, { isActive: !user.isActive });
          queryClient.invalidateQueries({ queryKey: ["admin-users"] });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Text style={styles.title}>User Management</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.userCard, !item.isActive && styles.userCardInactive]}>
              <View style={styles.userAvatar}>
                <Ionicons name="person" size={20} color={item.role === "admin" ? Colors.primary : Colors.accent} />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                <View style={styles.userTags}>
                  <View style={[styles.roleBadge, item.role === "admin" && styles.adminBadge]}>
                    <Text style={[styles.roleText, item.role === "admin" && styles.adminText]}>{item.role}</Text>
                  </View>
                  {!item.isActive && (
                    <View style={styles.inactiveBadge}>
                      <Text style={styles.inactiveText}>Disabled</Text>
                    </View>
                  )}
                </View>
              </View>
              <Pressable onPress={() => toggleActive(item)} hitSlop={8}>
                <Ionicons
                  name={item.isActive ? "ban-outline" : "checkmark-circle-outline"}
                  size={22}
                  color={item.isActive ? Colors.error : Colors.success}
                />
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 16 },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.background, borderRadius: 12, paddingHorizontal: 14, height: 44, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
  list: { paddingHorizontal: 20, paddingTop: 16 },
  userCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight },
  userCardInactive: { opacity: 0.6 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center", marginRight: 12 },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  userEmail: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 1 },
  userTags: { flexDirection: "row", gap: 6, marginTop: 4 },
  roleBadge: { backgroundColor: "#ECFDF5", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  adminBadge: { backgroundColor: "#EEF2FF" },
  roleText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.success, textTransform: "capitalize" as const },
  adminText: { color: Colors.primary },
  inactiveBadge: { backgroundColor: Colors.errorLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  inactiveText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.error },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
});
