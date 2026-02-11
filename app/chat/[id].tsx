import React, { useState, useCallback } from "react";
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
import { apiGet, apiPost } from "@/lib/api";
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
  const [sending, setSending] = useState(false);
  const partnerId = parseInt(id || "0");
  const isChatList = partnerId === 0;

  const { data: chatList, isLoading: listLoading, refetch: refetchList } = useQuery({
    queryKey: ["chat-list"],
    queryFn: () => apiGet("/api/chat-list"),
    enabled: isChatList,
  });

  const { data: allUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiGet("/api/admin/users"),
    enabled: isChatList && user?.role === "admin",
  });

  const { data: messages, isLoading: msgsLoading, refetch: refetchMsgs } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => apiGet(`/api/messages/${id}`),
    enabled: !isChatList && !!partnerId,
  });

  const partner = chatList?.find((p: any) => p.id === partnerId);
  // 🔌 Connect socket when user loads chat
React.useEffect(() => {
  if (!user?.id) return;
  connectSocket(user.id);
}, [user?.id]);

// 📩 Listen for incoming messages
React.useEffect(() => {
  const socket = getSocket();

  socket?.on("new-message", () => {
    queryClient.invalidateQueries({ queryKey: ["messages", id] });
  });

  return () => {
    socket?.off("new-message");
  };
}, [id]);


const sendMessage = useCallback(async () => {
  if (!message.trim() || sending) return;

  setSending(true);

  try {
    const socket = getSocket();

    socket?.emit("send-message", {
      senderId: user?.id,
      receiverId: partnerId,
      content: message.trim(),
    });

    setMessage("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  } catch (e) {
    console.error(e);
  } finally {
    setSending(false);
  }
}, [message, partnerId, user?.id]);

  if (isChatList) {
    const users = user?.role === "admin" ? (allUsers || chatList || []) : (chatList || []);
    const uniqueUsers = Array.from(new Map((users as any[]).map((u: any) => [u.id, u])).values())
      .filter((u: any) => u.id !== user?.id);

    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.title}>Messages</Text>
          <View style={{ width: 40 }} />
        </View>

        {listLoading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={uniqueUsers}
            keyExtractor={(item: any) => item.id.toString()}
            contentContainerStyle={[styles.list, { paddingBottom: 40 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetchList()} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>No conversations yet</Text>
              </View>
            }
            renderItem={({ item }: any) => (
              <Pressable
                style={({ pressed }) => [styles.chatItem, pressed && styles.pressed]}
                onPress={() => router.push({ pathname: "/chat/[id]", params: { id: item.id.toString() } })}
              >
                <View style={styles.chatAvatar}>
                  <Ionicons name="person" size={20} color={Colors.primary} />
                </View>
                <View style={styles.chatInfo}>
                  <Text style={styles.chatName}>{item.name}</Text>
                  <Text style={styles.chatEmail}>{item.email}</Text>
                </View>
                <View style={[styles.chatRoleBadge, item.role === "admin" ? styles.adminBg : styles.studentBg]}>
                  <Text style={[styles.chatRoleText, item.role === "admin" ? styles.adminColor : styles.studentColor]}>
                    {item.role}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {partner?.name || `User ${partnerId}`}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {msgsLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={messages || []}
          keyExtractor={(item) => item.id.toString()}
          inverted
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetchMsgs()} />}
          ListEmptyComponent={
            <View style={[styles.emptyState, { transform: [{ scaleY: -1 }] }]}>
              <Ionicons name="chatbubble-outline" size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>Start a conversation</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.senderId === user?.id;
            return (
              <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}>
                <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                  {item.content}
                </Text>
                <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            );
          }}
        />
      )}

      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 8) }]}>
        <TextInput
          style={styles.messageInput}
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textTertiary}
          multiline
          maxLength={500}
        />
        <Pressable
          style={[styles.sendBtn, (!message.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!message.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  title: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "center" },
  list: { paddingHorizontal: 20, paddingTop: 12 },
  chatItem: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.borderLight },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  chatAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center", marginRight: 12 },
  chatInfo: { flex: 1 },
  chatName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  chatEmail: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  chatRoleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  adminBg: { backgroundColor: "#EEF2FF" },
  studentBg: { backgroundColor: "#ECFDF5" },
  chatRoleText: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" as const },
  adminColor: { color: Colors.primary },
  studentColor: { color: Colors.success },
  messageList: { paddingHorizontal: 20, paddingVertical: 8 },
  messageBubble: { maxWidth: "80%", borderRadius: 18, padding: 12, marginBottom: 6 },
  myMessage: { alignSelf: "flex-end", backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  otherMessage: { alignSelf: "flex-start", backgroundColor: Colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.borderLight },
  messageText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  myMessageText: { color: "#fff" },
  otherMessageText: { color: Colors.text },
  messageTime: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textTertiary, marginTop: 4, alignSelf: "flex-end" },
  myMessageTime: { color: "rgba(255,255,255,0.7)" },
  inputContainer: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 16, paddingTop: 8, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.borderLight, gap: 10 },
  messageInput: { flex: 1, backgroundColor: Colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text, maxHeight: 100, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" },
  sendBtnDisabled: { opacity: 0.5 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
});
