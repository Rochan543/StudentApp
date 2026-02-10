import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider } from "@/lib/auth-context";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { StatusBar } from "expo-status-bar";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(student)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="course/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="quiz/[id]" options={{ animation: "slide_from_right", gestureEnabled: false }} />
      <Stack.Screen name="assignment/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="chat/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="notifications" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="admin-coupons" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="admin-banners" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="admin-assignments" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="admin-quizzes" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="admin-meetings" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="admin-groups" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="admin-reports" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="meetings" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="assignments-list" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="quizzes-list" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="chat-list" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="groups" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <StatusBar style="dark" />
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
