import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function CallScreen() {
  return (
    <View style={styles.container}>

      <Ionicons name="videocam" size={80} color="#4f46e5" />

      <Text style={styles.title}>Incoming Call</Text>

      <Text style={styles.sub}>Waiting to connect...</Text>

      <View style={styles.row}>

        <Pressable style={styles.rejectBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>

        <Pressable style={styles.acceptBtn}>
          <Ionicons name="call" size={26} color="#fff" />
        </Pressable>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container:{
    flex:1,
    justifyContent:"center",
    alignItems:"center",
    backgroundColor:"#fff"
  },
  title:{
    fontSize:22,
    fontWeight:"bold",
    marginTop:20
  },
  sub:{
    color:"#666",
    marginTop:6
  },
  row:{
    flexDirection:"row",
    marginTop:40,
    gap:40
  },
  acceptBtn:{
    width:70,
    height:70,
    borderRadius:35,
    backgroundColor:"green",
    justifyContent:"center",
    alignItems:"center"
  },
  rejectBtn:{
    width:70,
    height:70,
    borderRadius:35,
    backgroundColor:"red",
    justifyContent:"center",
    alignItems:"center"
  }
});
