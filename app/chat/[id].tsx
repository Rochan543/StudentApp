import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";
import { getSocket, connectSocket } from "@/lib/socket";
import * as ImagePicker from "expo-image-picker";
import { apiUpload } from "@/lib/api";
import { Image } from "react-native";
import { Modal, Dimensions } from "react-native";
import { Audio } from "expo-av";



const VoicePlayer = ({ url }: { url: string }) => {
  const soundRef = useRef<Audio.Sound | null>(null);

  // ✅ ADD THIS HERE
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const playSound = async () => {
  try {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    const { sound } = await Audio.Sound.createAsync({ uri: url });
    soundRef.current = sound;
    await sound.playAsync();
  } catch (e) {
    console.log("play error", e);
  }
};


  return (
    <Pressable onPress={playSound}>
      <Ionicons name="play-circle" size={30} color="#fff" />
    </Pressable>
  );
};




export default function ChatScreen() {

  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [message, setMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);




  const listRef = useRef<FlatList>(null);
  useEffect(() => {
    ImagePicker.requestMediaLibraryPermissionsAsync();
    Audio.requestPermissionsAsync();
  }, []);



  const sendImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
  });

  if (result.canceled) return;

  const img = result.assets[0];

  const upload = await apiUpload(
    "/api/upload/chat-image",
    img.uri,
    "chat.jpg",
    "image/jpeg"
  );

  const socket = getSocket();

  socket?.emit("send-message", {
    senderId: user?.id,
    receiverId: groupId ? null : partnerId,
    groupId,
    mediaUrl: upload.url,
    messageType: "image",
  });
};

const startRecording = async () => {
  try {
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) return;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );

    setRecording(recording);
    setIsRecording(true);
  } catch (err) {
    console.log("record start error", err);
  }
};



const stopRecording = async () => {
  try {
    if (!recording) return;

    setIsRecording(false);

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);

    if (!uri) return;

    const upload = await apiUpload(
      "/api/upload/chat-voice",
      uri,
      "voice.m4a",
      "audio/m4a"
    );

    const socket = getSocket();

    socket?.emit("send-message", {
      senderId: user?.id,
      receiverId: groupId ? null : partnerId,
      groupId,
      mediaUrl: upload.url,
      messageType: "voice",
    });
  } catch (err) {
    console.log("record stop error", err);
  }
};



  // ✅ GROUP CHAT DETECTION
  const isGroupChat = id?.startsWith("group-");
  const groupId = isGroupChat ? Number(id?.replace("group-", "")) : null;

  // ✅ FIXED PARTNER ID
  const partnerId = !isGroupChat ? parseInt(id || "0") : 0;
  const isChatList = partnerId === 0 && !groupId;

  // ================= CHAT LIST =================
  const { data: chatList, isLoading: listLoading, refetch: refetchList } =
    useQuery({
      queryKey: ["chat-list"],
      queryFn: () => apiGet("/api/chat-list"),
      enabled: isChatList,
    });

  // ================= MESSAGES =================
  const { data: messages, isLoading: msgsLoading } =
    useQuery({
      queryKey: ["messages", id],
      queryFn: () =>
      groupId
    ? apiGet(`/api/messages/group/${groupId}`)
    : apiGet(`/api/messages/${id}`),
      enabled: !isChatList && !!id,
      // placeholderData: (previousData) => previousData,
    });

  const partner = chatList?.find((p: any) => p.id === partnerId);

  // ================= CONNECT SOCKET =================
  useEffect(() => {
    if (!user?.id) return;
    connectSocket(user.id);
  }, [user?.id]);

  // ✅ JOIN GROUP ROOM
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    if (groupId && user?.id) {
      socket.emit("join-group", groupId);
    }
  }, [groupId, user?.id]);

  // ================= LISTEN SOCKET =================
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

const handlePrivateMessage = (msg: any) => {

  // mark delivered ONLY if I am receiver
  if (msg.senderId !== user?.id) {
    const socket = getSocket();
    socket?.emit("message-delivered", msg.id);
  }

  queryClient.setQueryData(["messages", id], (old: any[] = []) => {
    const exists = old.find((m) => m.id === msg.id);
    if (exists) return old;
    return [...old, msg];
  });
};





const handleGroupMessage = (msg: any) => {
  if (groupId) {

    // ✅ ignore my own socket echo
    // if (msg.senderId === user?.id) return;

    queryClient.setQueryData(["messages", id], (old: any[] = []) => {
      const exists = old.find((m) => m.id === msg.id);
      if (exists) return old;

      return [...old, msg];
    });
  }
};


    socket.on("new-message", handlePrivateMessage);
    socket.on("new-group-message", handleGroupMessage);

    // ✅ ADDED
    socket.on("user-online", (id: number) => {
      setOnlineUsers((prev) => [...new Set([...prev, id])]);
    });

    socket.on("user-offline", (id: number) => {
      setOnlineUsers((prev) => prev.filter((u) => u !== id));
    });

    socket.on("typing", (name: string) => {
      setTypingUser(name);
    });

    socket.on("stop-typing", () => {
      setTypingUser(null);
    });
    socket.on("message-status-updated", (update) => {
  queryClient.setQueryData(["messages", id], (old: any[] = []) =>
    old.map((m) =>
      m.id === update.id ? { ...m, ...update } : m
    )
  );
});




    return () => {
  socket.off("new-message", handlePrivateMessage);
  socket.off("new-group-message", handleGroupMessage);
  socket.off("user-online");
  socket.off("user-offline");
  socket.off("typing");
  socket.off("stop-typing");
  socket.off("message-status-updated");
};
  }, [id, groupId, user?.id]);

  // ================= EMIT SEEN =================
useEffect(() => {
  const socket = getSocket();
  if (!socket) return;

  messages?.forEach((m: any) => {
    if (!m.isSeen && m.senderId !== user?.id) {
      socket.emit("message-seen", m.id);
    }
  });
}, [messages]);


  // ================= SEND MESSAGE =================
  const sendMessage = useCallback(() => {
    if (!message.trim()) return;

    const socket = getSocket();

    if (groupId) {
      socket?.emit("send-message", {
        senderId: user?.id,
        groupId: groupId,
        content: message.trim(),
      });
    } else {
      socket?.emit("send-message", {
        senderId: user?.id,
        receiverId: partnerId,
        content: message.trim(),
      });
    }

    setMessage("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  }, [message, partnerId, user?.id, groupId]);

  // ================= CHAT LIST SCREEN =================
  if (isChatList) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + webTopInset }]}>
          <Text style={styles.title}>Messages</Text>
        </View>

        {listLoading ? (
          <ActivityIndicator size="large" color={Colors.primary} />
        ) : (
          <FlatList
            data={chatList || []}
            keyExtractor={(item: any, index: number) =>
            item.id ? item.id.toString() : index.toString()}
            refreshControl={
              <RefreshControl refreshing={false} onRefresh={refetchList} />
            }
            renderItem={({ item }: any) => (
              <Pressable
                style={styles.chatItem}
                onPress={() =>
                  router.push({
                    pathname: "/chat/[id]",
                    params: { id: item.id.toString() },
                  })
                }
              >
                <Ionicons name="person" size={22} />
                <Text style={styles.chatName}>{item.name}</Text>
              </Pressable>
            )}
          />
        )}
      </View>
    );
  }

  // ================= CHAT SCREEN =================
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { paddingTop: insets.top + webTopInset }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} />
        </Pressable>

              <View>
        <Text style={styles.title}>
          {groupId ? "Study Group" : partner?.name || `User ${partnerId}`}
        </Text>

        {!groupId && onlineUsers.includes(partnerId) && (
          <Text style={{ fontSize: 12, color: "green" }}>
            Online
          </Text>
        )}
      </View>

      </View>

      {msgsLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages || []}
          onContentSizeChange={() => {
          if (messages?.length) {
            listRef.current?.scrollToEnd({ animated: true });
          }
        }}
          keyExtractor={(item: any, index: number) =>
            item?.id ? item.id.toString() : index.toString()
          }
          contentContainerStyle={styles.messageList}
          renderItem={({ item }: any) => {
            const isMe = item.senderId === user?.id;

            return (
              <View
                style={[
                  styles.messageBubble,
                  isMe ? styles.myMessage : styles.otherMessage,
                ]}
              >
                {groupId && !isMe && (
                <Text style={{ fontSize: 11, color: "#666" }}>
                  {item.senderName}
                </Text>
              )}

              {/* IMAGE MESSAGE */}
                    {item.messageType === "image" && (
                      <Pressable onPress={() => setPreviewImage(item.mediaUrl)}>
                        <Image
                          source={{ uri: item.mediaUrl }}
                          style={{ width: 180, height: 180, borderRadius: 10 }}
                        />
                      </Pressable>
                    )}

                    {/* VOICE MESSAGE */}
                    {item.messageType === "voice" && (
                      <View style={{ padding: 6 }}>
                        <VoicePlayer url={item.mediaUrl} />
                      </View>
                    )}

                    {/* TEXT MESSAGE */}
                  {item.messageType === "text" && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ color: isMe ? "#fff" : "#000" }}>
                        {item.content}
                      </Text>

                      {isMe && (
                        <Text style={{ fontSize: 10, color: "#ccc" }}>
                          {item.isSeen ? "✓✓" : item.isDelivered ? "✓" : ""}
                        </Text>
                      )}
                    </View>
                  )}



              </View>
            );
          }}
        />
      )}

      {/* INPUT */}
      <View style={styles.inputContainer}>

        <Pressable onPress={isRecording ? stopRecording : startRecording}>
          <Ionicons
            name={isRecording ? "stop-circle" : "mic"}
            size={22}
            color={isRecording ? "red" : "#555"}
          />
        </Pressable>


          {/* IMAGE PICKER */}
          <Pressable onPress={sendImage}>
            <Ionicons name="image" size={22} color="#555" />
          </Pressable>

          <TextInput
            style={styles.input}
            value={message}
            onChangeText={(text) => {
                setMessage(text);

                const socket = getSocket();
                if (text.length === 1) {
                  socket?.emit("typing", {
                    senderName: user?.name,
                    receiverId: partnerId,
                    groupId,
                  });
                }

                if (text.length === 0) {
                  socket?.emit("stop-typing");
                }
              }}

            placeholder="Type message..."
          />

          <Pressable
            style={[styles.sendBtn, !message.trim() && { opacity: 0.5 }]}
            disabled={!message.trim()}
            onPress={sendMessage}
          >
            <Ionicons name="send" color="#fff" size={18} />
          </Pressable>

      </View>

            {/* IMAGE PREVIEW MODAL */}
      <Modal visible={!!previewImage} transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.9)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Pressable
            style={{
              position: "absolute",
              top: 50,
              right: 20,
            }}
            onPress={() => setPreviewImage(null)}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </Pressable>

          <Image
            source={{ uri: previewImage || "" }}
            style={{
              width: Dimensions.get("window").width,
              height: Dimensions.get("window").height * 0.7,
              resizeMode: "contain",
            }}
          />
        </View>
      </Modal>

    </KeyboardAvoidingView>
);
}

// ================= STYLES =================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },

  title: { fontSize: 18, fontWeight: "bold" },

  chatItem: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  chatName: { fontSize: 16 },

  messageList: { padding: 16 },

  messageBubble: {
    maxWidth: "70%",
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },

  myMessage: {
    backgroundColor: "#4f46e5",
    alignSelf: "flex-end",
  },

  otherMessage: {
    backgroundColor: "#eee",
    alignSelf: "flex-start",
  },

  inputContainer: {
  flexDirection: "row",
  padding: 10,
  alignItems: "center",
  gap: 8,
  borderTopWidth: 1,
  borderColor: "#ddd",
},


  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 12,
  },

  sendBtn: {
    backgroundColor: "#4f46e5",
    marginLeft: 8,
    padding: 10,
    borderRadius: 20,
  },
});