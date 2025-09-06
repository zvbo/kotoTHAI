import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 获取一个在本机持久化的设备唯一标识
 * - 跨平台统一使用 AsyncStorage 存取
 * - 若不存在则生成并保存
 */
export async function getDeviceId(): Promise<string> {
  const STORAGE_KEY = 'kotoba_device_id';
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (existing) return existing;

    const newId = generateFallbackId();
    await AsyncStorage.setItem(STORAGE_KEY, newId);
    return newId;
  } catch {
    // 兜底：即使存取失败也返回一个可用的随机ID，保证流程可继续
    return generateFallbackId();
  }
}

/**
 * 生成一个足够随机的ID，用于缺省/兜底场景
 */
function generateFallbackId(): string {
  const randomPart = () => Math.random().toString(36).slice(2, 10);
  return `${randomPart()}-${randomPart()}-${Date.now().toString(36)}`;
}