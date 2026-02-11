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

export default function ChatScreen() {

  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [message, setMessage] = useState("");

  const listRef = useRef<FlatList>(null);

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
      if (!groupId) {
        queryClient.setQueryData(["messages", id], (old: any[] = []) => {
          const updated = [...old, msg];
          setTimeout(() => {
            listRef.current?.scrollToEnd({ animated: true });
          }, 50);
          return updated;
        });
      }
    };

    const handleGroupMessage = (msg: any) => {
      if (groupId) {
        queryClient.setQueryData(["messages", id], (old: any[] = []) => {
          const updated = [...old, msg];
          setTimeout(() => {
            listRef.current?.scrollToEnd({ animated: true });
          }, 50);
          return updated;
        });
      }
    };

    socket.on("new-message", handlePrivateMessage);
    socket.on("new-group-message", handleGroupMessage);

    return () => {
      socket.off("new-message", handlePrivateMessage);
      socket.off("new-group-message", handleGroupMessage);
    };
  }, [id, groupId]);

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

        <Text style={styles.title}>
          {groupId ? "Study Group" : partner?.name || `User ${partnerId}`}
        </Text>
      </View>

      {msgsLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages || []}
          keyExtractor={(item: any) => item.id.toString()}
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
                <Text style={{ color: isMe ? "#fff" : "#000" }}>
                  {item.content}
                </Text>
              </View>
            );
          }}
        />
      )}

      {/* INPUT */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
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
