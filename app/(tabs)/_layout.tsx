import { Tabs, Link } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable } from "react-native";

import Colors from "@/constants/colors";
import { AppProvider } from "@/context/AppContext";

// To fix "react/no-unstable-nested-components", we define stable components outside the render path.

// Stable component for the Home tab icon
const HomeIcon = ({ color }: { color: string }) => (
  <MaterialCommunityIcons name="home-outline" size={22} color={color} />
);

// Stable component for the Settings tab icon
const SettingsIcon = ({ color }: { color: string }) => (
  <MaterialCommunityIcons name="cog-outline" size={22} color={color} />
);

// Stable component for the History tab icon
const HistoryIcon = ({ color }: { color: string }) => (
  <MaterialCommunityIcons name="history" size={22} color={color} />
);

// Stable component for the header right button
const SettingsHeaderButton = () => (
  <Link href="/(tabs)/settings" asChild>
    <Pressable accessibilityLabel="前往设置" hitSlop={8} className="px-2">
      <MaterialCommunityIcons name="cog-outline" size={20} color={Colors.textPrimary} />
    </Pressable>
  </Link>
);

export default function TabLayout() {
  return (
    <AppProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarStyle: {
            backgroundColor: Colors.background,
            borderTopColor: Colors.border,
          },
          headerStyle: {
            backgroundColor: Colors.background,
          },
          headerTintColor: Colors.textPrimary,
          tabBarLabelStyle: {
            fontWeight: "500",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "KotoTHAI",
            tabBarLabel: "首页",
            tabBarIcon: HomeIcon,
            headerRight: SettingsHeaderButton,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "设置",
            tabBarIcon: SettingsIcon,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "历史记录",
            tabBarLabel: "历史",
            tabBarIcon: HistoryIcon,
          }}
        />
      </Tabs>
    </AppProvider>
  );
}
