export type Language = {
  code: string;
  name: string;
  flag: string;
  nativeName?: string;
};

export type ConversationStatus = 
  | "idle" 
  | "listening" 
  | "translating" 
  | "speaking" 
  | "error" 
  | "weak_signal" 
  | "time_expired";

export type ConversationMessage = {
  id: string;
  text: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
  isUser: boolean;
};

export type UserState = {
  deviceId: string;
  remainingTime: number; // in seconds
  hasRated: boolean;
  firstLaunch: boolean;
  // 新增：是否已经显示过“低时长提醒”的评价弹窗
  lowTimePromptShown: boolean;
};