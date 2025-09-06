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
  // 新增：是否为流式占位/未完成气泡
  partial?: boolean;
  // 新增：流式种类（后续可用于区分原文/译文占位）
  streamingKind?: 'source' | 'target';
};

export type UserState = {
  deviceId: string;
  remainingTime: number; // in seconds
  firstLaunch: boolean;
};