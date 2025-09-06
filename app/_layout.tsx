import 'react-native-reanimated';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { LogBox, Platform, View, StyleProp, ViewStyle } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="about/privacy" options={{ title: '隐私政策' }} />
      <Stack.Screen name="about/terms" options={{ title: '服务条款' }} />
      <Stack.Screen name="about/support" options={{ title: '帮助与支持' }} />
      <Stack.Screen name="conversation/[id]" options={{ title: '对话详情' }} />
    </Stack>
  );
}

// Define a more specific type for the wrapper component's props.
interface RootWrapperProps {
  style?: StyleProp<ViewStyle>;
  className?: string;
  children?: React.ReactNode;
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (__DEV__ && Platform.OS === 'web') {
      try {
        LogBox.ignoreAllLogs(true);
      } catch {}
    }
  }, []);

  const RootWrapper: React.ComponentType<RootWrapperProps> = Platform.OS === 'web' ? View : GestureHandlerRootView;

  return (
    <QueryClientProvider client={queryClient}>
      {/* 关键修复：确保根容器在 Web 端也占满高度，否则子页面 flex:1 将没有可用空间 */}
      <RootWrapper style={{ flex: 1 }} className="flex-1">
        <RootLayoutNav />
      </RootWrapper>
    </QueryClientProvider>
  );
}