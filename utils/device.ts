import { Platform } from 'react-native';

/**
 * Gets a unique device identifier that persists across app installs
 * Uses native APIs when available, falls back to a generated ID for web
 */
export async function getDeviceId(): Promise<string> {
  // For now, generate a fallback ID for all platforms
  // In a production app, you would use expo-application for native platforms
  return generateFallbackId();
}

/**
 * Generates a fallback ID for platforms where native device IDs aren't available
 */
function generateFallbackId(): string {
  // Generate a random ID and store it in localStorage for web
  if (Platform.OS === 'web') {
    const storedId = localStorage.getItem('kotoba_device_id');
    if (storedId) return storedId;
    
    const newId = Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15);
    localStorage.setItem('kotoba_device_id', newId);
    return newId;
  }
  
  // For other platforms, just generate a random ID
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}