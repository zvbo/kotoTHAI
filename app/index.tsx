import { Redirect } from 'expo-router';

// 根路由：将 "/" 重定向到 /(tabs)
export default function Index() {
  return <Redirect href="/(tabs)" />;
}