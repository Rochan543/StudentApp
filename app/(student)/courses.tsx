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
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import Colors from "@/constants/colors";

export default function CoursesScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const [search, setSearch] = useState("");

  const { data: courses, isLoading, refetch } = useQuery({
    queryKey: ["courses-published"],
    queryFn: () => apiGet("/api/courses?published=true"),
  });

  const filtered = (courses || []).filter((c: any) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Text style={styles.title}>Explore Courses</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search courses..."
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
            </Pressable>
          )}
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
              <Ionicons name="search-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No courses found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.courseCard, pressed && styles.pressed]}
              onPress={() => router.push({ pathname: "/course/[id]", params: { id: item.id.toString() } })}
            >
              <View style={styles.courseHeader}>
                <View style={styles.courseIconWrap}>
                  <Ionicons name="book" size={22} color={Colors.primary} />
                </View>
                <View style={styles.courseMeta}>
                  <Text style={styles.courseTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.priceRow}>
                    {item.price > 0 ? (
                      <Text style={styles.price}>
                        {"\u20B9"}{item.price}
                      </Text>
                    ) : (
                      <View style={styles.freeBadge}>
                        <Text style={styles.freeText}>FREE</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
              </View>
              <Text style={styles.courseDesc} numberOfLines={2}>{item.description}</Text>
            </Pressable>
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
  courseCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.borderLight },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  courseHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  courseIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center", marginRight: 12 },
  courseMeta: { flex: 1 },
  courseTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text },
  priceRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  price: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.accent },
  freeBadge: { backgroundColor: "#ECFDF5", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  freeText: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.success },
  courseDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 20 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
});
