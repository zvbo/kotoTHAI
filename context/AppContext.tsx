import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback } from 'react';

import { DEFAULT_SOURCE_LANGUAGE, DEFAULT_TARGET_LANGUAGE, WELCOME_MESSAGES, ALL_LANGUAGES } from '@/constants/languages';
import { ConversationMessage, ConversationStatus, Language, UserState } from '@/types';
import { getDeviceId } from '@/utils/device';

// Initial free time in seconds (10 minutes)
const INITIAL_FREE_TIME = 10 * 60;
// Review reward time in seconds (5 minutes)
const REVIEW_REWARD_TIME = 5 * 60;
// Low time threshold to prompt for review (3 minutes)
const LOW_TIME_THRESHOLD = 3 * 60;

export const [AppProvider, useAppContext] = createContextHook(() => {
  // User state
  const [userState, setUserState] = useState<UserState>({
    deviceId: '',
    remainingTime: INITIAL_FREE_TIME,
    hasRated: false,
    firstLaunch: true,
    lowTimePromptShown: false,
  });

  // Language selection
  const [sourceLanguage, setSourceLanguage] = useState<Language>(DEFAULT_SOURCE_LANGUAGE);
  const [targetLanguage, setTargetLanguage] = useState<Language>(DEFAULT_TARGET_LANGUAGE);

  // Conversation state
  const [status, setStatus] = useState<ConversationStatus>('idle');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);

  // Initialize user state
  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Get device ID
        const deviceId = await getDeviceId();
        
        // Try to load existing user data
        const storedUserData = await AsyncStorage.getItem('kotoba_user_state');
        
        if (storedUserData) {
          // User exists, load their data
          const parsedData = JSON.parse(storedUserData) as UserState;
          setUserState({
            ...parsedData,
            deviceId, // Always use the current device ID
            firstLaunch: false,
            // 兼容旧数据：若不存在 lowTimePromptShown，默认 false
            lowTimePromptShown: (parsedData as any).lowTimePromptShown ?? false,
          });
          console.log('Loaded existing user data:', parsedData);
        } else {
          // New user, set up with initial free time
          const newUserState: UserState = {
            deviceId,
            remainingTime: INITIAL_FREE_TIME,
            hasRated: false,
            firstLaunch: true,
            lowTimePromptShown: false,
          };
          setUserState(newUserState);
          await AsyncStorage.setItem('kotoba_user_state', JSON.stringify(newUserState));
          console.log('Created new user with ID:', deviceId);
        }
        
        // Load saved language preferences
        const savedSourceLang = await AsyncStorage.getItem('kotoba_source_language');
        const savedTargetLang = await AsyncStorage.getItem('kotoba_target_language');
        
        if (savedSourceLang) setSourceLanguage(JSON.parse(savedSourceLang));
        if (savedTargetLang) setTargetLanguage(JSON.parse(savedTargetLang));
        
      } catch (error) {
        console.error('Error initializing user:', error);
        // Fallback to default state if there's an error
      }
    };
    
    initializeUser();
  }, []);

  // Save user state when it changes
  useEffect(() => {
    if (userState.deviceId) {
      AsyncStorage.setItem('kotoba_user_state', JSON.stringify(userState))
        .catch(err => console.error('Error saving user state:', err));
    }
  }, [userState]);

  // Save language preferences when they change
  useEffect(() => {
    AsyncStorage.setItem('kotoba_source_language', JSON.stringify(sourceLanguage))
      .catch(err => console.error('Error saving source language:', err));
  }, [sourceLanguage]);
  
  useEffect(() => {
    AsyncStorage.setItem('kotoba_target_language', JSON.stringify(targetLanguage))
      .catch(err => console.error('Error saving target language:', err));
  }, [targetLanguage]);

  // Time tracking logic
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    
    if (isSessionActive && userState.remainingTime > 0) {
      timer = setInterval(() => {
        setUserState(prev => ({
          ...prev,
          remainingTime: Math.max(0, prev.remainingTime - 1)
        }));
      }, 1000);
    }
    
    // If time runs out, stop the session
    if (userState.remainingTime <= 0 && isSessionActive) {
      setIsSessionActive(false);
      setStatus('time_expired');
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSessionActive, userState.remainingTime]);

  // Methods for managing user state
  const addTime = useCallback((seconds: number) => {
    setUserState(prev => ({
      ...prev,
      remainingTime: prev.remainingTime + seconds
    }));
  }, []);

  const markAsRated = useCallback(() => {
    setUserState(prev => {
      if (prev.hasRated) return prev;
      return {
        ...prev,
        hasRated: true,
        remainingTime: prev.remainingTime + REVIEW_REWARD_TIME,
      };
    });
  }, []);

  const acknowledgeFirstLaunch = useCallback(() => {
    setUserState(prev => ({
      ...prev,
      firstLaunch: false
    }));
  }, []);

  // 新增：在显示低时长提示时打标，确保仅弹一次
  const markLowTimePromptShown = useCallback(() => {
    setUserState(prev => ({
      ...prev,
      lowTimePromptShown: true,
    }));
  }, []);

  // 新增：对话显示模式（仅译文/完整对话）
  const [conversationMode, setConversationMode] = useState<'translation_only' | 'full'>('translation_only');

  const addMessage = useCallback((message: Omit<ConversationMessage, 'id' | 'timestamp'>) => {
    const newMessage: ConversationMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // 新增：测试用重置时长方法（不会清空设备ID等信息）
  const resetUserTime = useCallback((seconds: number = INITIAL_FREE_TIME) => {
    setUserState(prev => ({
      ...prev,
      remainingTime: seconds,
      hasRated: false,
      lowTimePromptShown: false,
    }));
  }, []);

  // Methods for conversation management（稳定引用并避免重复设置导致的循环）
  const startSession = useCallback(() => {
    // 若已是激活状态，避免重复 setState
    if (isSessionActive) return;

    if (userState.remainingTime <= 0) {
      setStatus('time_expired');
      return;
    }
    
    setIsSessionActive(true);
    setStatus('listening');
  }, [isSessionActive, userState.remainingTime]);

  const stopSession = useCallback(() => {
    // 若已是非激活状态，避免重复 setState
    if (!isSessionActive) return;

    setIsSessionActive(false);
    setStatus('idle');
    // 停止会话时清空当前对话内容
    clearMessages();
  }, [isSessionActive, clearMessages]);

  const swapLanguages = useCallback(() => {
    const temp = sourceLanguage;
    setSourceLanguage(targetLanguage);
    setTargetLanguage(temp);
  }, [sourceLanguage, targetLanguage]);

  // Check if user should be prompted for a review
  const shouldPromptForReview = useCallback((): boolean => {
    // 只要未评分，并且未显示过低时长提醒，且时间低于阈值，则允许弹出一次
    return !userState.hasRated && !userState.lowTimePromptShown && userState.remainingTime <= LOW_TIME_THRESHOLD;
  }, [userState.hasRated, userState.lowTimePromptShown, userState.remainingTime]);

  return {
    // State
    userState,
    sourceLanguage,
    targetLanguage,
    status,
    messages,
    isSessionActive,
    
    // 新增：对话显示模式
    conversationMode,
    setConversationMode,
    
    // User management
    addTime,
    markAsRated,
    acknowledgeFirstLaunch,
    shouldPromptForReview,
    markLowTimePromptShown,
    
    // Language management
    setSourceLanguage,
    setTargetLanguage,
    swapLanguages,
    
    // Conversation management
    startSession,
    stopSession,
    setStatus,
    addMessage,
    clearMessages,

    // 新增：开发测试 - 重置时长
    resetUserTime,
  };
});