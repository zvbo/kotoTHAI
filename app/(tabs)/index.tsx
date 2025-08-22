import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import ConversationBubble from '@/components/ConversationBubble';
import LanguagePickerModal from '@/components/LanguagePickerModal';
import LanguageSelector from '@/components/LanguageSelector';
import ReviewPrompt from '@/components/ReviewPrompt';
// 移除手动录音模式的状态指示器
// import StatusIndicator from '@/components/StatusIndicator';
import TimeExpiredCard from '@/components/TimeExpiredCard';
import WelcomeCard from '@/components/WelcomeCard';
import { useAppContext } from '@/context/AppContext';
import { translateText } from '@/utils/api';
import useAudioRecording from '@/hooks/useAudioRecording';
import useTranslation from '@/hooks/useTranslation';
import { colors, spacing, borderRadius, shadows, typography } from '@/styles/designSystem';
import useRealtime from '@/hooks/useRealtime';


// Constants for review reward time
const REVIEW_REWARD_TIME = 20 * 60; // 20 minutes in seconds

export default function TranslateScreen() {
  const {
    userState,
    sourceLanguage,
    targetLanguage,
    status,
    messages,
    isSessionActive,
    setTargetLanguage,
    startSession,
    stopSession,
    markAsRated,
    acknowledgeFirstLaunch,
    shouldPromptForReview,
    addMessage,
    setStatus,
  } = useAppContext();

  // Audio recording hook
  const { isRecording, audioUri, error: recordingError, startRecording, stopRecording, getAudioFile } = useAudioRecording();

  // Translation/Transcription hook
  const { transcribeAudio, createMessage, isTranslating, error: translationError } = useTranslation();
  // 为实时模式传入语言代码，后续在 /api/ephemeral 中作为提示
  const realtime = useRealtime({ sourceLangCode: sourceLanguage.code, targetLangCode: targetLanguage.code });
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

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
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  
  // Ref for messages list
  const messagesListRef = useRef<FlatList>(null);

  // Check if we should show the review prompt
  useEffect(() => {
    if (shouldPromptForReview()) {
      setShowReviewPrompt(true);
    }
  }, [shouldPromptForReview]);

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
  const handleTargetLanguagePress = useCallback(() => {
    if (!isSessionActive) {
      setShowTargetPicker(true);
    }
  }, [isSessionActive]);

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

  // Test API function
  const handleTestAPI = useCallback(async () => {
    try {
      Alert.alert('测试中...', '正在测试API连接');
      
      // Test translation API
      const translation = await translateText('你好，世界！', 'Chinese', 'English');
      console.log('Translation result:', translation);
      
      Alert.alert('API测试成功', `翻译结果: ${translation}`);
    } catch (error) {
      console.error('API test failed:', error);
      Alert.alert('API测试失败', '请检查网络连接');
    }
  }, []);

  // 实时模式切换与连接
  useEffect(() => {
    if (!realtimeEnabled) return;
    // 仅当开启时尝试连接
    if (!realtime.isConnected && !realtime.isConnecting) {
      realtime.connect();
    }
    return () => {
      // 关闭开关时断开
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

  // 当语言变化时（且实时开启），自动重连让新的指令生效
  useEffect(() => {
    if (!realtimeEnabled) return;
    // 简单策略：先断开后重连
    realtime.disconnect();
    realtime.connect();
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
    }, 600);
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
      
      {/* Language selector */}
      <LanguageSelector 
        sourceLanguage={sourceLanguage}
        targetLanguage={targetLanguage}
        onSourcePress={() => {}} // Source is fixed
        onTargetPress={handleTargetLanguagePress}
        onSwapPress={handleTargetLanguagePress} // Swap button opens target picker
        disabled={isSessionActive}
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
          <TouchableOpacity 
            style={[styles.testButton, { marginTop: spacing.md }]}
            onPress={handleTestAPI}
          >
            <Text style={styles.testButtonText}>测试API</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Language picker modal */}
      <LanguagePickerModal 
        visible={showTargetPicker}
        selectedLanguage={targetLanguage}
        onSelect={(lang) => {
          setTargetLanguage(lang);
          setShowTargetPicker(false);
        }}
        onClose={() => setShowTargetPicker(false)}
      />
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