import React from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";

export default function GroupInfo() {

  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  // 🔹 Fetch group
  const { data: group } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => apiGet(`/api/groups/${groupId}`),
  });

  // 🔹 Fetch members
  const { data: members } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: () => apiGet(`/api/groups/${groupId}/members`),
  });

  // 🔹 Leave group
  const leaveGroup = () => {
    Alert.alert("Leave Group", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          await apiPost(`/api/groups/${groupId}/leave`);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>{group?.name}</Text>

      <Text style={styles.subtitle}>Members</Text>

      <FlatList
        data={members || []}
        keyExtractor={(item:any) => item.id.toString()}
        renderItem={({ item }:any) => (
          <View style={styles.memberRow}>
            <Ionicons name="person" size={18} />
            <Text style={styles.memberName}>{item.name}</Text>
          </View>
        )}
      />

      <Pressable style={styles.leaveBtn} onPress={leaveGroup}>
        <Text style={{ color: "#fff" }}>Leave Group</Text>
      </Pressable>

    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, padding:20 },
  title:{ fontSize:22, fontWeight:"bold", marginBottom:10 },
  subtitle:{ fontSize:16, marginVertical:10 },
  memberRow:{ flexDirection:"row", gap:10, paddingVertical:8 },
  memberName:{ fontSize:15 },
  leaveBtn:{
    backgroundColor:"red",
    padding:14,
    borderRadius:10,
    alignItems:"center",
    marginTop:20
  }
});
