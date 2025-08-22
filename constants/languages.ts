// 语言常量定义
export const ALL_LANGUAGES = [
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', nativeName: '日本語' },
  // 其他语言保留但暂不暴露为可选
  { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷', nativeName: '한국어' },
  { code: 'th', name: 'Thai', flag: '🇹🇭', nativeName: 'ไทย' },
];

// 对外可选的目标语言（暂时仅开放日语）
export const LANGUAGES = [
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', nativeName: '日本語' },
];

export const DEFAULT_SOURCE_LANGUAGE = { code: 'zh', name: 'Chinese', flag: '🇨🇳', nativeName: '中文' };
// 默认目标语言改为日语
export const DEFAULT_TARGET_LANGUAGE = { code: 'ja', name: 'Japanese', flag: '🇯🇵', nativeName: '日本語' };

export const WELCOME_MESSAGES: Record<string, string> = {
  zh: '你好！这是一个实时翻译演示。请慢慢说话。',
  ja: 'こんにちは！こちらはリアルタイム翻訳のデモです。ゆっくり話してみてください。',
};
