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
  Modal,
  ScrollView,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

export default function AdminCoursesScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [isPublished, setIsPublished] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [brochureUrl, setBrochureUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [instructorName, setInstructorName] = useState("");

  const { data: courses, isLoading, refetch } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: () => apiGet("/api/courses"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/courses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      setShowModal(false);
      resetForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  function resetForm() {
    setTitle("");
    setDescription("");
    setPrice("0");
    setIsPublished(false);
    setImageUrl("");
    setBrochureUrl("");
    setDuration("");
    setInstructorName("");
  }

  async function handleDelete(id: number) {
    Alert.alert("Delete Course", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await apiDelete(`/api/courses/${id}`);
          queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Text style={styles.title}>Course Management</Text>
        <Pressable style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={courses || []}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No courses yet</Text>
              <Pressable style={styles.createBtn} onPress={() => setShowModal(true)}>
                <Text style={styles.createBtnText}>Create First Course</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.courseCard, pressed && styles.pressed]}
              onPress={() => router.push({ pathname: "/course/[id]", params: { id: item.id.toString() } })}
            >
              <View style={styles.courseHeader}>
                <View style={[styles.statusDot, item.isPublished ? styles.published : styles.draft]} />
                <View style={styles.courseInfo}>
                  <Text style={styles.courseName} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.courseMeta}>
                    {item.isPublished ? "Published" : "Draft"} | {"\u20B9"}{item.price}
                  </Text>
                </View>
                <Pressable onPress={() => handleDelete(item.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={20} color={Colors.error} />
                </Pressable>
              </View>
              <Text style={styles.courseDesc} numberOfLines={2}>{item.description}</Text>
            </Pressable>
          )}
        />
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Course</Text>
              <Pressable onPress={() => { setShowModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput style={styles.modalInput} value={title} onChangeText={setTitle} placeholder="Course title" placeholderTextColor={Colors.textTertiary} />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput style={[styles.modalInput, { height: 100 }]} value={description} onChangeText={setDescription} placeholder="Course description" placeholderTextColor={Colors.textTertiary} multiline />

              <Text style={styles.inputLabel}>Price ({"\u20B9"})</Text>
              <TextInput style={styles.modalInput} value={price} onChangeText={setPrice} placeholder="0" keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />

              <Text style={styles.inputLabel}>Duration (hours)</Text>
              <TextInput style={styles.modalInput} value={duration} onChangeText={setDuration} placeholder="e.g. 40" keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />

              <Text style={styles.inputLabel}>Instructor Name</Text>
              <TextInput style={styles.modalInput} value={instructorName} onChangeText={setInstructorName} placeholder="Instructor name" placeholderTextColor={Colors.textTertiary} />

              <Text style={styles.inputLabel}>Image URL</Text>
              <TextInput style={styles.modalInput} value={imageUrl} onChangeText={setImageUrl} placeholder="https://..." autoCapitalize="none" placeholderTextColor={Colors.textTertiary} />

              <Text style={styles.inputLabel}>Brochure PDF URL</Text>
              <TextInput style={styles.modalInput} value={brochureUrl} onChangeText={setBrochureUrl} placeholder="https://...pdf" autoCapitalize="none" placeholderTextColor={Colors.textTertiary} />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Published</Text>
                <Switch value={isPublished} onValueChange={setIsPublished} trackColor={{ true: Colors.primary }} />
              </View>

              <Pressable
                style={[styles.saveBtn, (!title || !description) && styles.saveBtnDisabled]}
                onPress={() => createMutation.mutate({
                  title,
                  description,
                  price: parseFloat(price) || 0,
                  isPublished,
                  duration: duration ? parseInt(duration) : undefined,
                  imageUrl: imageUrl || undefined,
                  brochureUrl: brochureUrl || undefined,
                })}
                disabled={!title || !description || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Create Course</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" },
  list: { paddingHorizontal: 20, paddingTop: 16 },
  courseCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  courseHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  published: { backgroundColor: Colors.success },
  draft: { backgroundColor: Colors.warning },
  courseInfo: { flex: 1 },
  courseName: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text },
  courseMeta: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  courseDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 20 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  createBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  createBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  modalScroll: { flexGrow: 1 },
  inputLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 6, marginTop: 12 },
  modalInput: { backgroundColor: Colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16 },
  switchLabel: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.text },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
