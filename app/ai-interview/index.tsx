import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from "react-native";
import { GiftedChat } from "react-native-gifted-chat";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";

const API_URL = "https://studentapp-dwvm.onrender.com";

export default function AIInterviewScreen() {

  const [messages, setMessages] = useState<any[]>([]);
  const [interviewId, setInterviewId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [aiThinking, setAiThinking] = useState(false);

  useEffect(() => {
    startInterview();
  }, []);

  // ================= START =================
  async function startInterview() {
    const token = await AsyncStorage.getItem("auth_token");


    const res = await axios.post(
      `${API_URL}/api/ai/interview/start`,
      {
        role: "Frontend Developer",
        resumeSkills: ["React", "JavaScript", "HTML", "CSS"]
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setInterviewId(res.data.interviewId);

    setMessages([
      {
        _id: 1,
        text: res.data.question,
        createdAt: new Date(),
        user: { _id: 2, name: "AI" }
      }
    ]);

    setLoading(false);
  }

  // ================= SEND TEXT =================
const onSend = useCallback(async (msgs: any[] = []) => {
  if (!msgs.length) return;

  const userMessage = msgs[0];

  setMessages(prev => GiftedChat.append(prev, msgs));

  if (userMessage?.text) {
    await sendAnswer(userMessage.text);
  }
}, [interviewId]);


  // ================= SEND ANSWER =================
  async function sendAnswer(answer: string) {
    const token = await AsyncStorage.getItem("token");
    setAiThinking(true);

    const res = await axios.post(
      `${API_URL}/api/ai/interview/message`,
      { interviewId, answer },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setMessages(prev =>
      GiftedChat.append(prev, [{
        _id: Math.random(),
        text: res.data.question,
        createdAt: new Date(),
        user: { _id: 2, name: "AI" }
      }])
    );

    setAiThinking(false);
  }

  // ================= VOICE RECORD =================
  async function startRecording() {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true });

    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await rec.startAsync();
    setRecording(rec);
  }

  async function stopRecording() {
    if (!recording) return;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);

    // Fake speech-to-text (for now)
    await sendAnswer("Voice answer recorded");
  }

  // ================= FINISH =================
  async function finishInterview() {
    const token = await AsyncStorage.getItem("token");

    const res = await axios.post(
      `${API_URL}/api/ai/interview/finish`,
      {
        interviewId,
        totalScore: messages.length * 10
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setScore(res.data.totalScore);
    setFinished(true);
  }

  // ================= LOADING =================
  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  // ================= RESULT =================
  if (finished) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Interview Completed 🎉</Text>
        <Text style={styles.score}>Score: {score}</Text>

        <TouchableOpacity style={styles.btn} onPress={startInterview}>
          <Text style={styles.btnText}>Restart</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ================= UI =================
  return (
    <View style={{ flex: 1 }}>
      {aiThinking && (
        <View style={styles.avatarBox}>
          <Image source={{ uri: "https://i.imgur.com/7k12EPD.gif" }} style={styles.avatar} />
          <Text>AI is thinking...</Text>
        </View>
      )}

      <GiftedChat
        messages={messages}
        onSend={msgs => onSend(msgs)}
        user={{ _id: 1 }}
      />

      <View style={styles.controls}>
        <TouchableOpacity onPress={startRecording} style={styles.micBtn}>
          <Text>🎤</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={stopRecording} style={styles.micBtn}>
          <Text>⏹</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={finishInterview} style={styles.finishBtn}>
          <Text style={{ color: "#fff" }}>Finish</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10
  },
  micBtn: {
    backgroundColor: "#ddd",
    padding: 12,
    borderRadius: 50
  },
  finishBtn: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 8
  },
  avatarBox: {
    alignItems: "center",
    padding: 5
  },
  avatar: {
    width: 60,
    height: 60
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  title: {
    fontSize: 22,
    fontWeight: "bold"
  },
  score: {
    fontSize: 28,
    color: "green",
    marginVertical: 20
  },
  btn: {
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 8
  },
  btnText: {
    color: "#fff"
  }
});
