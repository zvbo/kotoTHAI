// 语言常量定义
export const ALL_LANGUAGES = [
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', nativeName: '中文' },
  { code: 'th', name: 'Thai', flag: '🇹🇭', nativeName: 'ไทย' },
  { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English' },
];

// 对外可选的目标语言（开放中/英/泰三种）
export const LANGUAGES = [
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', nativeName: '中文' },
  { code: 'th', name: 'Thai', flag: '🇹🇭', nativeName: 'ไทย' },
  { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English' },
];

export const DEFAULT_SOURCE_LANGUAGE = { code: 'zh', name: 'Chinese', flag: '🇨🇳', nativeName: '中文' };
// 默认目标语言改为泰语
export const DEFAULT_TARGET_LANGUAGE = { code: 'th', name: 'Thai', flag: '🇹🇭', nativeName: 'ไทย' };

export const WELCOME_MESSAGES: Record<string, string> = {
  zh: '你好！这是一个实时翻译演示。请慢慢说话。',
  th: 'สวัสดี! นี่คือการแปลแบบเรียลไทม์ โปรดพูดช้าๆ',
  en: 'Hello! This is a real-time translation demo. Please speak slowly.',
};
