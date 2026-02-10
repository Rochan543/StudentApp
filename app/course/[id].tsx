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
  Image,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const [couponCode, setCouponCode] = useState("");
  const [showCoupon, setShowCoupon] = useState(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: () => apiGet(`/api/courses/${id}`),
  });

  const { data: enrollCheck } = useQuery({
    queryKey: ["enrollment-check", id],
    queryFn: () => apiGet(`/api/enrollments/check/${id}`),
  });

  const { data: assignments } = useQuery({
    queryKey: ["assignments", id],
    queryFn: () => apiGet(`/api/assignments/${id}`),
    enabled: !!enrollCheck?.enrolled,
  });

  const { data: quizzes } = useQuery({
    queryKey: ["quizzes", id],
    queryFn: () => apiGet(`/api/quizzes/${id}`),
    enabled: !!enrollCheck?.enrolled,
  });

  const enrollMutation = useMutation({
    mutationFn: (data: { courseId: number; couponCode?: string }) => apiPost("/api/enroll", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollment-check", id] });
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message);
    },
  });

  function handleEnroll() {
    if (course.price > 0 && !couponCode) {
      setShowCoupon(true);
      return;
    }
    enrollMutation.mutate({ courseId: parseInt(id!), couponCode: couponCode || undefined });
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!course) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={styles.errorText}>Course not found</Text>
      </View>
    );
  }

  const isEnrolled = enrollCheck?.enrolled;
  const isAdmin = user?.role === "admin";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + webTopInset + 12, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color={Colors.text} />
      </Pressable>

      <View style={styles.heroSection}>
        {course.imageUrl ? (
          <Image source={{ uri: course.imageUrl }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={styles.heroIcon}>
            <Ionicons name="book" size={32} color={Colors.primary} />
          </View>
        )}
        <Text style={styles.courseTitle}>{course.title}</Text>
        <View style={styles.metaRow}>
          {course.price > 0 ? (
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>{"\u20B9"}{course.price}</Text>
            </View>
          ) : (
            <View style={[styles.priceBadge, { backgroundColor: "#ECFDF5" }]}>
              <Text style={[styles.priceText, { color: Colors.success }]}>FREE</Text>
            </View>
          )}
          {course.duration && (
            <View style={[styles.priceBadge, { backgroundColor: "#EEF2FF" }]}>
              <Text style={[styles.priceText, { color: Colors.primary }]}>{course.duration}h</Text>
            </View>
          )}
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{course.isPublished ? "Published" : "Draft"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.descText}>{course.description}</Text>
      </View>

      {course.brochureUrl && (
        <Pressable
          style={styles.brochureBtn}
          onPress={() => Linking.openURL(course.brochureUrl)}
        >
          <View style={styles.brochureIcon}>
            <Ionicons name="document-attach" size={20} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brochureTitle}>Course Brochure</Text>
            <Text style={styles.brochureSub}>Download PDF</Text>
          </View>
          <Ionicons name="download-outline" size={20} color={Colors.primary} />
        </Pressable>
      )}

      {!isEnrolled && !isAdmin && (
        <View style={styles.enrollSection}>
          {showCoupon && (
            <View style={styles.couponInput}>
              <TextInput
                style={styles.couponTextInput}
                value={couponCode}
                onChangeText={setCouponCode}
                placeholder="Enter coupon code"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="characters"
              />
            </View>
          )}
          <Pressable
            style={[styles.enrollBtn, enrollMutation.isPending && styles.enrollBtnDisabled]}
            onPress={handleEnroll}
            disabled={enrollMutation.isPending}
          >
            {enrollMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="school" size={20} color="#fff" />
                <Text style={styles.enrollBtnText}>
                  {course.price > 0 && !showCoupon ? "Enter Coupon to Enroll" : "Enroll Now"}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {isEnrolled && (
        <View style={styles.enrolledBadge}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          <Text style={styles.enrolledText}>You are enrolled in this course</Text>
        </View>
      )}

      {course.modules && course.modules.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modules & Lessons</Text>
          {course.modules.map((mod: any, modIdx: number) => (
            <View key={mod.id} style={styles.moduleCard}>
              <View style={styles.moduleHeader}>
                <View style={styles.moduleNum}>
                  <Text style={styles.moduleNumText}>{modIdx + 1}</Text>
                </View>
                <Text style={styles.moduleTitle}>{mod.title}</Text>
              </View>
              {mod.lessons && mod.lessons.map((lesson: any) => (
                <View key={lesson.id} style={styles.lessonItem}>
                  <Ionicons
                    name={
                      lesson.contentType === "video" ? "play-circle" :
                      lesson.contentType === "pdf" ? "document" : "reader"
                    }
                    size={18}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.lessonTitle} numberOfLines={1}>{lesson.title}</Text>
                  {lesson.duration && (
                    <Text style={styles.lessonDuration}>{lesson.duration}min</Text>
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {isEnrolled && quizzes && quizzes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quizzes</Text>
          {quizzes.map((quiz: any) => (
            <Pressable
              key={quiz.id}
              style={({ pressed }) => [styles.quizCard, pressed && styles.pressed]}
              onPress={() => router.push({ pathname: "/quiz/[id]", params: { id: quiz.id.toString() } })}
            >
              <View style={styles.quizIconWrap}>
                <Ionicons name="help-circle" size={22} color="#6366F1" />
              </View>
              <View style={styles.quizInfo}>
                <Text style={styles.quizTitle}>{quiz.title}</Text>
                <Text style={styles.quizMeta}>
                  {quiz.duration} min | {quiz.negativeMarking ? "Negative marking" : "No penalty"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
            </Pressable>
          ))}
        </View>
      )}

      {isEnrolled && assignments && assignments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assignments</Text>
          {assignments.map((assgn: any) => (
            <Pressable
              key={assgn.id}
              style={({ pressed }) => [styles.assignmentCard, pressed && styles.pressed]}
              onPress={() => router.push({ pathname: "/assignment/[id]", params: { id: assgn.id.toString() } })}
            >
              <View style={styles.assignIconWrap}>
                <Ionicons name="create" size={20} color={Colors.warning} />
              </View>
              <View style={styles.assignInfo}>
                <Text style={styles.assignTitle}>{assgn.title}</Text>
                <Text style={styles.assignMeta}>
                  Due: {assgn.dueDate ? new Date(assgn.dueDate).toLocaleDateString() : "No deadline"} | Max: {assgn.maxMarks} marks
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
            </Pressable>
          ))}
        </View>
      )}

      {isAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Admin Actions</Text>
          <View style={styles.adminActions}>
            <Pressable
              style={({ pressed }) => [styles.adminBtn, pressed && styles.pressed]}
              onPress={() => Alert.alert("Info", "Module & content management coming soon")}
            >
              <Ionicons name="add-circle" size={20} color={Colors.primary} />
              <Text style={styles.adminBtnText}>Add Content</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.adminBtn, pressed && styles.pressed]}
              onPress={() => router.push("/chat/0")}
            >
              <Ionicons name="chatbubbles" size={20} color={Colors.accent} />
              <Text style={styles.adminBtnText}>Messages</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  heroSection: { alignItems: "center", marginBottom: 28 },
  heroImage: { width: "100%", height: 180, borderRadius: 16, marginBottom: 16 },
  heroIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  courseTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "center" },
  metaRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  priceBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  priceText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.warning },
  statusBadge: { backgroundColor: Colors.infoLight, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.info },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 12 },
  descText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 24 },
  enrollSection: { marginBottom: 24 },
  couponInput: { marginBottom: 12 },
  couponTextInput: { backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  enrollBtn: { flexDirection: "row", backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, justifyContent: "center", alignItems: "center", gap: 8 },
  enrollBtnDisabled: { opacity: 0.6 },
  enrollBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  enrolledBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#ECFDF5", borderRadius: 12, padding: 14, gap: 8, marginBottom: 24 },
  enrolledText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.success },
  moduleCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight },
  moduleHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  moduleNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center", marginRight: 10 },
  moduleNumText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  moduleTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text, flex: 1 },
  lessonItem: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingLeft: 38, gap: 10 },
  lessonTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text },
  lessonDuration: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textTertiary },
  quizCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  quizIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center", marginRight: 12 },
  quizInfo: { flex: 1 },
  quizTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  quizMeta: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  assignmentCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight },
  assignIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#FEF3C7", justifyContent: "center", alignItems: "center", marginRight: 12 },
  assignInfo: { flex: 1 },
  assignTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  assignMeta: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  adminActions: { flexDirection: "row", gap: 12 },
  adminBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: Colors.surface, borderRadius: 14, paddingVertical: 14, gap: 8, borderWidth: 1, borderColor: Colors.borderLight },
  adminBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  brochureBtn: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: Colors.borderLight },
  brochureIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center", marginRight: 12 },
  brochureTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  brochureSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
});
