import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { LogBox, Platform, View } from "react-native";
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
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  // 在 Web 开发环境下，暂时隐藏 React Native 的 LogBox 覆盖层，避免挡住 UI 点击
  useEffect(() => {
    if (__DEV__ && Platform.OS === 'web') {
      try {
        LogBox.ignoreAllLogs(true);
      } catch {}
    }
  }, []);

  // 针对 Web 平台，使用 View 包裹，避免 GestureHandlerRootView 在 Web 上为 undefined 导致的渲染错误
  const RootWrapper: React.ComponentType<any> = Platform.OS === 'web' ? View : GestureHandlerRootView;

  return (
    <QueryClientProvider client={queryClient}>
      <RootWrapper style={{ flex: 1 }}>
        <RootLayoutNav />
      </RootWrapper>
    </QueryClientProvider>
  );
}
