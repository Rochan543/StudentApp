import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Colors from "@/constants/colors";

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: entries, isLoading, refetch } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => apiGet("/api/leaderboard"),
  });

  const rankColors = ["#FFD700", "#C0C0C0", "#CD7F32"];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>Top performers ranked by total points</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={entries || []}
          keyExtractor={(item) => item.entry.id.toString()}
          contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No rankings yet</Text>
              <Text style={styles.emptySubtext}>Complete activities to earn points</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const isMe = item.user.id === user?.id;
            return (
              <View style={[styles.rankCard, isMe && styles.rankCardHighlight]}>
                <View style={[styles.rankBadge, index < 3 && { backgroundColor: rankColors[index] }]}>
                  {index < 3 ? (
                    <Ionicons name="trophy" size={16} color="#fff" />
                  ) : (
                    <Text style={styles.rankNumber}>{index + 1}</Text>
                  )}
                </View>
                <View style={styles.userInfo}>
                  <Text style={[styles.rankName, isMe && styles.rankNameHighlight]}>
                    {item.user.name} {isMe ? "(You)" : ""}
                  </Text>
                  <View style={styles.pointsBreakdown}>
                    <Text style={styles.breakdownText}>
                      Quiz: {item.entry.quizPoints} | Assignments: {item.entry.assignmentPoints} | Attendance: {item.entry.attendancePoints}
                    </Text>
                  </View>
                </View>
                <View style={styles.totalPoints}>
                  <Text style={styles.totalPointsNumber}>{Math.round(item.entry.totalPoints)}</Text>
                  <Text style={styles.totalPointsLabel}>pts</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 4 },
  list: { paddingHorizontal: 20, paddingTop: 16 },
  rankCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight },
  rankCardHighlight: { borderColor: Colors.primary, backgroundColor: "#EEF2FF" },
  rankBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.textTertiary, justifyContent: "center", alignItems: "center", marginRight: 12 },
  rankNumber: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  userInfo: { flex: 1 },
  rankName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  rankNameHighlight: { color: Colors.primary },
  pointsBreakdown: { marginTop: 2 },
  breakdownText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  totalPoints: { alignItems: "center" },
  totalPointsNumber: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.primary },
  totalPointsLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
});
