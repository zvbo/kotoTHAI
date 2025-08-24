import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import ConversationBubble from '@/components/ConversationBubble';
import ReviewPrompt from '@/components/ReviewPrompt';
// 移除手动录音模式的状态指示器
// import StatusIndicator from '@/components/StatusIndicator';
import TimeExpiredCard from '@/components/TimeExpiredCard';
import WelcomeCard from '@/components/WelcomeCard';
import { useAppContext } from '@/context/AppContext';
import useAudioRecording from '@/hooks/useAudioRecording';
import useTranslation from '@/hooks/useTranslation';
import { colors, spacing, borderRadius, shadows, typography } from '@/styles/designSystem';
import useRealtime from '@/hooks/useRealtime';
import LanguageSelector from '@/components/LanguageSelector';


// Constants for review reward time
const REVIEW_REWARD_TIME = 5 * 60; // 5 minutes in seconds

export default function TranslateScreen() {
  const {
    userState,
    sourceLanguage,
    targetLanguage,
    status,
    messages,
    isSessionActive,
    // setTargetLanguage, // 已移除语言选择功能，不再需要变更目标语言
    startSession,
    stopSession,
    markAsRated,
    acknowledgeFirstLaunch,
    shouldPromptForReview,
    addMessage,
    setStatus,
    markLowTimePromptShown,
  } = useAppContext();

  // Audio recording hook
  const { isRecording, audioUri, error: recordingError, startRecording, stopRecording, getAudioFile } = useAudioRecording();

  // Translation/Transcription hook
  const { transcribeAudio, createMessage, isTranslating, error: translationError } = useTranslation();
  // 为实时模式传入语言代码，后续在 /api/ephemeral 中作为提示
  const realtime = useRealtime({ sourceLangCode: sourceLanguage.code, targetLangCode: targetLanguage.code });
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  // 稳定引用 start/stop，避免依赖变化导致的循环调用
  const startSessionRef = useRef(startSession);
  const stopSessionRef = useRef(stopSession);
  useEffect(() => {
    startSessionRef.current = startSession;
    stopSessionRef.current = stopSession;
  }, [startSession, stopSession]);

  // 本地缓冲区：将 Realtime 的增量文本缓冲，空闲一段时间后落为一条消息
  const [rtBuffer, setRtBuffer] = useState('');
  const rtTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 使用 refs 镜像缓冲，避免将缓冲状态加入依赖导致循环
  const rtBufferRef = useRef('');
  const rtSrcBufferRef = useRef('');
  const rtTgtBufferRef = useRef('');
  
  // 新增：原文与译文双缓冲，支持“完整对话模式”
  const { conversationMode } = useAppContext();
  const [rtSrcBuffer, setRtSrcBuffer] = useState('');
  const [rtTgtBuffer, setRtTgtBuffer] = useState('');

  // Local state for modals
  // const [showTargetPicker, setShowTargetPicker] = useState(false); // 移除：不再展示目标语言选择弹窗
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  
  // Ref for messages list
  const messagesListRef = useRef<FlatList>(null);

  // Check if we should show the review prompt
  useEffect(() => {
    if (shouldPromptForReview()) {
      setShowReviewPrompt(true);
      // 在弹出的同时，立即标记已显示，确保仅弹一次
      markLowTimePromptShown();
    }
  }, [shouldPromptForReview, markLowTimePromptShown]);

  // 录音/转写流程：根据当前状态进行切换
  const handleStatusPress = useCallback(async () => {
    try {
      // 实时模式开启时，禁用原有“按下录音/松开转写”流程，避免混淆
      if (realtimeEnabled) {
        Alert.alert('实时模式已开启', '实时模式下将自动采集麦克风进行流式传输');
        return;
      }
      // 若会话未激活：开启会话并开始录音
      if (!isSessionActive) {
        startSession();
        await startRecording();
        return;
      }

      // 会话已激活：
      if (isRecording) {
        // 1) 停止录音
        const uri = await stopRecording();
        const file = getAudioFile();
        if (!file || !uri) {
          Alert.alert('录音无效', '没有可用于转写的音频');
          return;
        }

        // 2) 转写 + 翻译
        setStatus('translating');
        const text = await transcribeAudio(file, sourceLanguage);
        if (!text) {
          Alert.alert('转写失败', translationError || '请重试');
          setStatus('listening');
          return;
        }

        const message = await createMessage(text, sourceLanguage, targetLanguage, true);
        if (message) {
          addMessage(message);
        }
        // 3) 转写完成，回到聆听状态（可再次点击开始录音）
        setStatus('listening');
      } else {
        // 当前未在录音，则开始录音
        await startRecording();
      }
    } catch (err) {
      console.error('录音/转写流程出错:', err);
      Alert.alert('出错了', '请稍后重试');
      setStatus('error');
    }
  }, [isSessionActive, isRecording, startSession, startRecording, stopRecording, getAudioFile, transcribeAudio, createMessage, addMessage, sourceLanguage, targetLanguage, setStatus, translationError, realtimeEnabled]);

  // Handle language selection
  // const handleTargetLanguagePress = useCallback(() => {
  //   if (!isSessionActive) {
  //     setShowTargetPicker(true);
  //   }
  // }, [isSessionActive]);

  // Handle review prompt
  const handleRequestReview = useCallback(async () => {
    setShowReviewPrompt(false);
    
    // Mark as rated first to ensure the user gets the reward
    markAsRated();
    
    // Request review if available on this platform
    if (Platform.OS !== 'web') {
      // Store review functionality would be implemented here
      console.log('Would request store review');
    }
  }, [markAsRated]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && messagesListRef.current) {
      messagesListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Navigate to settings/purchase screen
  const handlePurchase = useCallback(() => {
    // This would navigate to the purchase screen in the settings tab
    // For now, we'll just log it
    console.log('Navigate to purchase screen');
  }, []);

  // 已移除：测试API按钮与相关函数

  // 实时模式切换与连接
  useEffect(() => {
    if (!realtimeEnabled) return;
    // 仅当开启时尝试连接
    if (!realtime.isConnected && !realtime.isConnecting) {
      realtime.connect();
    }
    return () => {
      // 关闭开关时断开（仅网络/音频资源清理，不再在此处更新全局会话状态）
      realtime.disconnect();
      if (rtTimerRef.current) clearTimeout(rtTimerRef.current);
      setRtBuffer('');
      setRtSrcBuffer('');
      setRtTgtBuffer('');
      rtBufferRef.current = '';
      rtSrcBufferRef.current = '';
      rtTgtBufferRef.current = '';
    };
  }, [realtimeEnabled]);

  const toggleRealtime = useCallback(() => {
    setRealtimeEnabled((prev) => {
      const next = !prev;
      if (!next) {
        // 关闭实时：断开并清理缓冲（会话计时在下方 useEffect 中停止）
        realtime.disconnect();
        if (rtTimerRef.current) clearTimeout(rtTimerRef.current);
        setRtBuffer('');
        setRtSrcBuffer('');
        setRtTgtBuffer('');
        rtBufferRef.current = '';
        rtSrcBufferRef.current = '';
        rtTgtBufferRef.current = '';
      }
      return next;
    });
  }, [realtime]);

  // 根据实时模式开关安全地启动/停止会话（在 effect 中执行，避免渲染期间 setState）
  useEffect(() => {
    if (realtimeEnabled) {
      try { startSessionRef.current?.(); } catch {}
    } else {
      try { stopSessionRef.current?.(); } catch {}
    }
  }, [realtimeEnabled]);

  // 当语言变化时（且实时开启），自动重连让新的指令生效
  useEffect(() => {
    if (!realtimeEnabled) return;
    // 改为串行重连，避免旧连接未完全关闭导致的“双声同播”
    realtime.reconnect?.();
  }, [sourceLanguage.code, targetLanguage.code, realtimeEnabled]);

  // 提取 Realtime 事件中的文本增量
  const extractRealtimeText = useCallback((ev: any): string | null => {
    if (!ev) return null;
    if (typeof ev === 'string') return ev;
    // 常见增量事件：response.output_text.delta
    if (ev?.type === 'response.output_text.delta' && typeof ev.delta === 'string') return ev.delta;
    // 兼容其他可能字段
    if (typeof ev.text === 'string') return ev.text;
    if (typeof ev.delta === 'string') return ev.delta;
    return null;
  }, []);

  // 新增：提取“原文（ASR）”增量
  const extractOriginalText = useCallback((ev: any): string | null => {
    if (!ev || typeof ev !== 'object') return null;
    // 常见类型猜测：input_audio.transcription.delta / asr.partial
    if (typeof ev.type === 'string') {
      const t = ev.type;
      if ((t.includes('input_audio') || t.includes('transcription') || t.includes('asr')) && typeof ev.delta === 'string') {
        return ev.delta as string;
      }
      if ((t.includes('transcript') || t.includes('transcription')) && typeof ev.text === 'string') {
        return ev.text as string;
      }
    }
    // 宽松兜底：如果包含 transcript 字段
    if (typeof (ev as any).transcript === 'string') return (ev as any).transcript as string;
    return null;
  }, []);

  // 将 Realtime 文本增量缓冲，并在短暂空闲后落入全局消息
  useEffect(() => {
    if (!realtimeEnabled) return;
    // 调试：打印事件类型与关键字段，便于识别“原文/译文”事件
    try {
      if (realtime.lastEvent) {
        const ev: any = realtime.lastEvent;
        const t = typeof ev === 'object' ? ev.type : typeof ev;
        console.debug('[Realtime] event:', t, '\nkeys=', typeof ev === 'object' ? Object.keys(ev) : 'primitive');
      }
    } catch {}

    const tgtChunk = extractRealtimeText(realtime.lastEvent);
    const srcChunk = extractOriginalText(realtime.lastEvent);
    if (!tgtChunk && !srcChunk) return;

    if (tgtChunk) {
      setRtTgtBuffer((prev) => {
        const next = prev + tgtChunk;
        rtTgtBufferRef.current = next;
        return next;
      });
    }
    if (srcChunk) {
      setRtSrcBuffer((prev) => {
        const next = prev + srcChunk;
        rtSrcBufferRef.current = next;
        return next;
      });
    }

    // 兼容旧逻辑：维护单缓冲以不破坏 UI（用于仅译文模式实时显示）
    if (tgtChunk) {
      setRtBuffer((prev) => {
        const next = prev + tgtChunk;
        rtBufferRef.current = next;
        return next;
      });
    }

    if (rtTimerRef.current) clearTimeout(rtTimerRef.current);
    rtTimerRef.current = setTimeout(() => {
      // 读取当前缓冲并落库
      const toSendSrc = rtSrcBufferRef.current.trim();
      const toSendTgt = rtTgtBufferRef.current.trim();
      const toSendSingle = rtBufferRef.current.trim();
      
      if (conversationMode === 'full') {
        if (toSendSrc.length > 0 || toSendTgt.length > 0) {
          addMessage({
            text: toSendSrc,
            translatedText: toSendTgt,
            sourceLanguage: sourceLanguage.code,
            targetLanguage: targetLanguage.code,
            isUser: false,
          });
        }
      } else {
        // 仅译文模式
        if (toSendSingle.length > 0) {
          addMessage({
            text: '',
            translatedText: toSendSingle,
            sourceLanguage: sourceLanguage.code,
            targetLanguage: targetLanguage.code,
            isUser: false,
          });
        }
      }

      // 清空缓冲
      setRtSrcBuffer('');
      setRtTgtBuffer('');
      setRtBuffer('');
      rtSrcBufferRef.current = '';
      rtTgtBufferRef.current = '';
      rtBufferRef.current = '';
    }, 1000);
  }, [realtime.lastEvent, realtimeEnabled, addMessage, sourceLanguage.code, targetLanguage.code, extractRealtimeText, extractOriginalText, conversationMode]);

  // 当关闭实时或卸载时清理缓冲
  useEffect(() => {
    return () => {
      if (rtTimerRef.current) clearTimeout(rtTimerRef.current);
      setRtSrcBuffer('');
      setRtTgtBuffer('');
      setRtBuffer('');
      rtSrcBufferRef.current = '';
      rtTgtBufferRef.current = '';
      rtBufferRef.current = '';
    };
  }, []);

  return (
    <LinearGradient
      colors={[colors.primary.beige, colors.primary.sand]}
      style={styles.container}
    >
      {/* Welcome card for first launch */}
      {userState.firstLaunch && (
        <WelcomeCard 
          remainingTime={userState.remainingTime}
          onDismiss={() => { acknowledgeFirstLaunch(); setRealtimeEnabled(true); }}
        />
      )}
      
      {/* Review prompt */}
      {showReviewPrompt && (
        <ReviewPrompt 
          rewardTime={REVIEW_REWARD_TIME}
          onRequestReview={handleRequestReview}
          onDismiss={() => setShowReviewPrompt(false)}
        />
      )}
      
      {/* 语言固定为 中文 -> 日语，已移除语言选择 UI */}
      {/* 恢复语言选择 UI（仅UI展示，不改变功能，不允许交互） */}
      <LanguageSelector
      sourceLanguage={sourceLanguage}
      targetLanguage={targetLanguage}
      onSourcePress={() => {}}
      onTargetPress={() => {}}
      onSwapPress={() => {}}
      disabled={true}
      />
      {/* Conversation area */}
      <View style={styles.conversationContainer}>
        {messages.length > 0 ? (
          <FlatList
            ref={messagesListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ConversationBubble message={item} />}
            contentContainerStyle={styles.messagesList}
          />
        ) : status === 'time_expired' ? (
          <TimeExpiredCard onPurchase={handlePurchase} />
        ) : null}
      </View>
      
      {/* Status & realtime container */}
      <View style={styles.statusContainer}>
        {/* 已移除手动录音按钮与交互，仅保留实时模式区域 */}
        {/* 实时模式（Beta） */}
        <View style={{ width: '100%', marginTop: spacing.lg, alignItems: 'center' }}>
          <Text style={{ marginBottom: spacing.sm, fontSize: typography.fontSize.body, color: colors.text.secondary }}>
            实时模式（Beta）：{realtime.isConnected ? '已连接' : (realtime.isConnecting ? '连接中...' : '未连接')}
          </Text>
          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: realtimeEnabled ? colors.accent.rust : colors.accent.green }]}
            onPress={toggleRealtime}
          >
            <Text style={styles.testButtonText}>{realtimeEnabled ? '关闭实时模式' : '开启实时模式'}</Text>
          </TouchableOpacity>
          {/* 测试API按钮已移除 */}
        </View>
      </View>

      {/* 目标语言选择弹窗已移除 */}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  conversationContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  messagesList: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  statusContainer: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.overlay,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    ...shadows.lg,
  },
  testButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent.green,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  testButtonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },
});