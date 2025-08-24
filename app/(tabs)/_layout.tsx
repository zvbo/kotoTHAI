import { Tabs } from "expo-router";
import { Home, Settings } from "lucide-react-native";
import React from "react";

import Colors from "@/constants/colors";
import { AppProvider } from "@/context/AppContext";
import { Link } from "expo-router";
import { Pressable } from "react-native";

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
            title: "KotoBa",
            tabBarLabel: "首页",
            tabBarIcon: ({ color }) => <Home size={22} color={color} />,
            // 顶部仅显示标题与一个进入设置的图标按钮
            headerRight: () => (
              <Link href="/(tabs)/settings" asChild>
                <Pressable accessibilityLabel="前往设置" hitSlop={8} style={{ paddingHorizontal: 8 }}>
                  <Settings size={20} color={Colors.textPrimary} />
                </Pressable>
              </Link>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "设置",
            tabBarIcon: ({ color }) => <Settings size={22} color={color} />,
          }}
        />
      </Tabs>
    </AppProvider>
  );
}