import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: quiz, isLoading } = useQuery({
    queryKey: ["quiz", id],
    queryFn: () => apiGet(`/api/quiz/${id}`),
  });

  useEffect(() => {
    if (quiz?.attempt?.finishedAt) {
      setSubmitted(true);
      setResult(quiz.attempt);
    }
  }, [quiz]);

  useEffect(() => {
    if (started && quiz?.duration && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started]);

  const startMutation = useMutation({
    mutationFn: () => apiPost("/api/quiz-attempt", { quizId: parseInt(id!) }),
    onSuccess: () => {
      setStarted(true);
      setTimeLeft((quiz?.duration || 30) * 60);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const submitMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/quiz-submit", data),
    onSuccess: (data) => {
      setSubmitted(true);
      setResult(data);
      if (timerRef.current) clearInterval(timerRef.current);
      queryClient.invalidateQueries({ queryKey: ["quiz", id] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  function handleSubmit() {
    Alert.alert("Submit Quiz", "Are you sure you want to submit?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Submit",
        onPress: () => submitMutation.mutate({ quizId: parseInt(id!), answers }),
      },
    ]);
  }

  function selectAnswer(questionId: number, option: string) {
    setAnswers((prev) => ({ ...prev, [questionId.toString()]: option }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!quiz) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text>Quiz not found</Text>
      </View>
    );
  }

  const questions = quiz.questions || [];
  const currentQuestion = questions[currentQ];

  if (submitted && result) {
    const percentage = result.totalMarks > 0 ? Math.round((result.score / result.totalMarks) * 100) : 0;
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + webTopInset + 16, paddingBottom: 40, alignItems: "center" }]}
      >
        <View style={styles.resultCard}>
          <View style={[styles.resultIcon, percentage >= 50 ? { backgroundColor: "#ECFDF5" } : { backgroundColor: Colors.errorLight }]}>
            <Ionicons
              name={percentage >= 50 ? "trophy" : "sad"}
              size={48}
              color={percentage >= 50 ? Colors.success : Colors.error}
            />
          </View>
          <Text style={styles.resultTitle}>
            {percentage >= 50 ? "Well Done!" : "Keep Trying!"}
          </Text>
          <Text style={styles.resultScore}>
            {result.score} / {result.totalMarks}
          </Text>
          <Text style={styles.resultPercentage}>{percentage}%</Text>
          <View style={styles.resultBar}>
            <View style={[styles.resultBarFill, { width: `${percentage}%`, backgroundColor: percentage >= 50 ? Colors.success : Colors.error }]} />
          </View>
        </View>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back to Course</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (!started) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + webTopInset + 16, paddingBottom: 40 }]}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>

        <View style={styles.quizIntro}>
          <View style={styles.quizIntroIcon}>
            <Ionicons name="help-circle" size={40} color="#6366F1" />
          </View>
          <Text style={styles.quizIntroTitle}>{quiz.title}</Text>
          {quiz.description && <Text style={styles.quizIntroDesc}>{quiz.description}</Text>}

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="time" size={20} color={Colors.primary} />
              <Text style={styles.infoLabel}>{quiz.duration} min</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="list" size={20} color={Colors.accent} />
              <Text style={styles.infoLabel}>{questions.length} questions</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name={quiz.negativeMarking ? "warning" : "shield-checkmark"} size={20} color={quiz.negativeMarking ? Colors.warning : Colors.success} />
              <Text style={styles.infoLabel}>{quiz.negativeMarking ? "Penalty" : "No penalty"}</Text>
            </View>
          </View>

          <Pressable
            style={[styles.startBtn, startMutation.isPending && { opacity: 0.6 }]}
            onPress={() => startMutation.mutate()}
            disabled={startMutation.isPending}
          >
            {startMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={styles.startBtnText}>Start Quiz</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.quizHeader}>
        <View style={styles.timerBadge}>
          <Ionicons name="time" size={16} color={timeLeft < 60 ? Colors.error : Colors.primary} />
          <Text style={[styles.timerText, timeLeft < 60 && { color: Colors.error }]}>
            {formatTime(timeLeft)}
          </Text>
        </View>
        <Text style={styles.progressText}>
          {currentQ + 1} / {questions.length}
        </Text>
        <Pressable onPress={handleSubmit}>
          <Text style={styles.submitText}>Submit</Text>
        </Pressable>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentQ + 1) / questions.length) * 100}%` }]} />
      </View>

      {currentQuestion && (
        <ScrollView
          style={styles.questionContainer}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.questionText}>{currentQuestion.questionText}</Text>

          {["A", "B", "C", "D"].map((opt) => {
            const optionKey = `option${opt}` as string;
            const optionText = currentQuestion[optionKey];
            if (!optionText) return null;
            const isSelected = answers[currentQuestion.id.toString()] === opt;
            return (
              <Pressable
                key={opt}
                style={[styles.optionCard, isSelected && styles.optionSelected]}
                onPress={() => selectAnswer(currentQuestion.id, opt)}
              >
                <View style={[styles.optionLetter, isSelected && styles.optionLetterSelected]}>
                  <Text style={[styles.optionLetterText, isSelected && styles.optionLetterTextSelected]}>{opt}</Text>
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{optionText}</Text>
              </Pressable>
            );
          })}

          <View style={styles.navRow}>
            <Pressable
              style={[styles.navBtn, currentQ === 0 && styles.navBtnDisabled]}
              onPress={() => setCurrentQ((prev) => Math.max(0, prev - 1))}
              disabled={currentQ === 0}
            >
              <Ionicons name="arrow-back" size={20} color={currentQ === 0 ? Colors.textTertiary : Colors.primary} />
            </Pressable>

            <View style={styles.qDots}>
              {questions.map((_: any, idx: number) => (
                <Pressable key={idx} onPress={() => setCurrentQ(idx)}>
                  <View style={[
                    styles.qDot,
                    idx === currentQ && styles.qDotActive,
                    answers[questions[idx]?.id?.toString()] && styles.qDotAnswered,
                  ]} />
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[styles.navBtn, currentQ === questions.length - 1 && styles.navBtnDisabled]}
              onPress={() => setCurrentQ((prev) => Math.min(questions.length - 1, prev + 1))}
              disabled={currentQ === questions.length - 1}
            >
              <Ionicons name="arrow-forward" size={20} color={currentQ === questions.length - 1 ? Colors.textTertiary : Colors.primary} />
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  quizIntro: { alignItems: "center", paddingTop: 20 },
  quizIntroIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  quizIntroTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "center" },
  quizIntroDesc: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center", marginTop: 8, lineHeight: 22 },
  infoGrid: { flexDirection: "row", gap: 20, marginTop: 28, marginBottom: 32 },
  infoItem: { alignItems: "center", gap: 6, backgroundColor: Colors.surface, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14 },
  infoLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  startBtn: { flexDirection: "row", backgroundColor: "#6366F1", borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40, alignItems: "center", gap: 8 },
  startBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_600SemiBold" },
  quizHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  timerBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  timerText: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.primary },
  progressText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  submitText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  progressBar: { height: 4, backgroundColor: Colors.borderLight, marginHorizontal: 20, borderRadius: 2, marginBottom: 16 },
  progressFill: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  questionContainer: { flex: 1, paddingHorizontal: 20 },
  questionText: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.text, lineHeight: 28, marginBottom: 24 },
  optionCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 2, borderColor: Colors.borderLight },
  optionSelected: { borderColor: Colors.primary, backgroundColor: "#EEF2FF" },
  optionLetter: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.borderLight, justifyContent: "center", alignItems: "center", marginRight: 14 },
  optionLetterSelected: { backgroundColor: Colors.primary },
  optionLetterText: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.textSecondary },
  optionLetterTextSelected: { color: "#fff" },
  optionText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.text },
  optionTextSelected: { color: Colors.primaryDark },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24 },
  navBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, justifyContent: "center", alignItems: "center" },
  navBtnDisabled: { opacity: 0.5 },
  qDots: { flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "center", flex: 1, paddingHorizontal: 10 },
  qDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.borderLight },
  qDotActive: { backgroundColor: Colors.primary, transform: [{ scale: 1.3 }] },
  qDotAnswered: { backgroundColor: Colors.accent },
  resultCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 32, alignItems: "center", width: "100%", marginTop: 40, borderWidth: 1, borderColor: Colors.borderLight },
  resultIcon: { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center", marginBottom: 20 },
  resultTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 8 },
  resultScore: { fontSize: 32, fontFamily: "Inter_700Bold", color: Colors.primary },
  resultPercentage: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginTop: 4, marginBottom: 20 },
  resultBar: { width: "100%", height: 8, backgroundColor: Colors.borderLight, borderRadius: 4, overflow: "hidden" },
  resultBarFill: { height: 8, borderRadius: 4 },
  backButton: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, marginTop: 20 },
  backButtonText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
