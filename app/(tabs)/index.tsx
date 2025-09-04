import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import ConversationBubble from '@/components/ConversationBubble';
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
// import LanguagePickerModal from '@/components/LanguagePickerModal';
import ToastBanner from '../../components/ToastBanner';


// Constants for review reward time
// 移除评分奖励常量
// const REVIEW_REWARD_TIME = 5 * 60; // 5 minutes in seconds

export default function TranslateScreen() {
  const {
    userState,
    sourceLanguage,
    targetLanguage,
    status,
    messages,
    isSessionActive,
    startSession,
    stopSession,
    // markAsRated, // removed
    acknowledgeFirstLaunch,
    // shouldPromptForReview, // removed
    addMessage,
    setStatus,
    // markLowTimePromptShown, // removed
    swapLanguages,
    setSourceLanguage,
    setTargetLanguage,
  } = useAppContext();

  // Audio recording hook
  const { isRecording, audioUri, error: recordingError, startRecording, stopRecording, getAudioFile } = useAudioRecording();

  // Translation/Transcription hook
  const { transcribeAudio, createMessage, isTranslating, error: translationError } = useTranslation();
  // 为实时模式传入语言代码，后续在 /api/ephemeral 中作为提示
  const realtime = useRealtime({ sourceLangCode: sourceLanguage.code, targetLangCode: targetLanguage.code });
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  // 语言下拉显示状态（替换 Modal）
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);

  // 稳定引用 start/stop，避免依赖变化导致的循环调用
  const startSessionRef = useRef(startSession);
  const stopSessionRef = useRef(stopSession);
  useEffect(() => {
    startSessionRef.current = startSession;
    stopSessionRef.current = stopSession;
  }, [startSession, stopSession]);

  // 本地缓冲区：将 Realtime 的增量文本缓冲，空闲一段时间后落为一条消息
  const rtTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 使用 refs 镜像缓冲，避免将缓冲状态加入依赖导致循环
  const rtSrcBufferRef = useRef('');
  const rtTgtBufferRef = useRef('');
  
  // 原文与译文双缓冲，支持“完整对话模式”
  const { conversationMode } = useAppContext();

  // Toast 状态（非模态小条提示）
  const [toast, setToast] = useState<null | { message: string; type: 'info' | 'success' | 'error'; key: number }>(null);
  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => setToast({ message, type, key: Date.now() });
  // Ref for messages list
  const messagesListRef = useRef<FlatList>(null);

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
      // 仅清空 ref，避免触发重渲染
      rtSrcBufferRef.current = '';
      rtTgtBufferRef.current = '';
    };
  }, [realtimeEnabled]);

  // Toast：连接进度/结果/错误
  useEffect(() => {
    if (realtimeEnabled && realtime.isConnecting) {
      showToast('正在连接...', 'info');
    }
  }, [realtimeEnabled, realtime.isConnecting]);
  useEffect(() => {
    if (realtimeEnabled && realtime.isConnected) {
      showToast('已连接', 'success');
    }
  }, [realtimeEnabled, realtime.isConnected]);
  useEffect(() => {
    if (realtime.error && !realtime.error.includes('连接在 SDP 协商期间被中断')) {
      showToast(realtime.error, 'error');
    }
  }, [realtime.error]);
  
  // 错误处理 - 过滤掉正常的清理过程错误
  const errorMessage = recordingError || translationError || realtime.error;
  useEffect(() => {
    if (errorMessage && !errorMessage.includes('连接在 SDP 协商期间被中断')) {
      console.error('应用错误:', errorMessage);
    }
  }, [errorMessage]);
  const prevRealtimeEnabledRef = useRef(false);
  useEffect(() => {
    const prev = prevRealtimeEnabledRef.current;
    prevRealtimeEnabledRef.current = realtimeEnabled;
    if (prev && !realtimeEnabled) {
      showToast('已断开', 'info');
    }
  }, [realtimeEnabled]);

  const toggleRealtime = useCallback(() => {
    setRealtimeEnabled((prev) => {
      const next = !prev;
      if (!next) {
        // 关闭实时：断开并清理缓冲
        realtime.disconnect();
        if (rtTimerRef.current) clearTimeout(rtTimerRef.current);
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

  // 新增：当时间耗尽或会话被动结束时，自动关闭实时模式并断开连接
  useEffect(() => {
    if (status === 'time_expired' && realtimeEnabled) {
      try { realtime.disconnect(); } catch {}
      setRealtimeEnabled(false);
    }
  }, [status, realtimeEnabled, realtime]);

  // 修复：避免在“开启实时”第一时间由于 isSessionActive 尚未置为 true 而被误判为未激活从而立即断开
  // 仅在 isSessionActive 从 true -> false 的过渡时执行断开逻辑
  const prevIsSessionActiveRef = useRef<boolean>(isSessionActive);
  useEffect(() => {
    const prev = prevIsSessionActiveRef.current;
    prevIsSessionActiveRef.current = isSessionActive;
    if (prev && !isSessionActive && realtimeEnabled) {
      try { realtime.disconnect(); } catch {}
      setRealtimeEnabled(false);
    }
  }, [isSessionActive, realtimeEnabled, realtime]);

  useEffect(() => {
    if (!isSessionActive && realtimeEnabled) {
      // 已由上方过渡检测处理，这里不再做任何操作以避免竞态
    }
  }, [isSessionActive, realtimeEnabled]);

  // 购买时间：跳转到设置页面（可在其中处理购买/充值），并在需要时先断开实时模式
  const handlePurchase = useCallback(() => {
    if (realtimeEnabled) {
      try { realtime.disconnect(); } catch {}
      setRealtimeEnabled(false);
    }
    router.push('/settings');
  }, [realtime, realtimeEnabled]);

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

  // 将 Realtime 文本增量缓冲，并在短暂空闲后落入全局消息（仅使用 ref，不触发重渲染）
  useEffect(() => {
    if (!realtimeEnabled || !realtime.lastEvent) return;

    // 1. 打印原始事件
    console.log('--- [Realtime Event Received] ---', JSON.stringify(realtime.lastEvent, null, 2));

    const tgtChunk = extractRealtimeText(realtime.lastEvent);
    const srcChunk = extractOriginalText(realtime.lastEvent);

    // 2. 打印提取的文本块
    console.log(`--- [Chunks Extracted] --- Src: "${srcChunk}", Tgt: "${tgtChunk}"`);

    if (tgtChunk) {
      rtTgtBufferRef.current += tgtChunk;
    }
    if (srcChunk) {
      rtSrcBufferRef.current += srcChunk;
    }

    if (!tgtChunk && !srcChunk) return;

    if (rtTimerRef.current) clearTimeout(rtTimerRef.current);

    rtTimerRef.current = setTimeout(() => {
      const toSendSrc = rtSrcBufferRef.current.trim();
      const toSendTgt = rtTgtBufferRef.current.trim();

      // 3. 打印将要添加的消息
      console.log(`--- [Message to Add] --- Src: "${toSendSrc}", Tgt: "${toSendTgt}"`);

      rtSrcBufferRef.current = '';
      rtTgtBufferRef.current = '';

      if (toSendSrc.length > 0) {
        addMessage({
          text: toSendSrc,
          translatedText: '',
          sourceLanguage: sourceLanguage.code,
          targetLanguage: targetLanguage.code,
          isUser: true,
        });
      }
      if (toSendTgt.length > 0) {
        addMessage({
          text: '',
          translatedText: toSendTgt,
          sourceLanguage: sourceLanguage.code,
          targetLanguage: targetLanguage.code,
          isUser: false,
        });
      }
    }, 1200);

  }, [realtime.lastEvent, realtimeEnabled, addMessage, sourceLanguage.code, targetLanguage.code, extractRealtimeText, extractOriginalText]);
  
  // 当关闭实时或卸载时清理缓冲
  useEffect(() => {
    return () => {
      if (rtTimerRef.current) clearTimeout(rtTimerRef.current);
      rtSrcBufferRef.current = '';
      rtTgtBufferRef.current = '';
    };
  }, []);

  return (
    <LinearGradient
      colors={[colors.primary.beige, colors.primary.sand]}
      style={styles.container}
    >
      {toast && (
        <ToastBanner
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}
      {/* Welcome card for first launch */}
      {userState.firstLaunch && (
        <WelcomeCard 
          remainingTime={userState.remainingTime}
          onDismiss={() => { acknowledgeFirstLaunch(); setRealtimeEnabled(true); }}
        />
      )}
      
      {/* 语言选择：按钮+内联下拉 */}
      <LanguageSelector
        sourceLanguage={sourceLanguage}
        targetLanguage={targetLanguage}
        onSourcePress={() => {
          console.log('[index.tsx] onSourcePress triggered.');
          // 允许在实时模式下展开下拉，无需拦截
          setShowSourcePicker((v) => {
            const next = !v;
            console.log(`[index.tsx] Toggling source picker. Current: ${v}, Next: ${next}`);
            if (next) setShowTargetPicker(false);
            return next;
          });
        }}
        onTargetPress={() => {
          console.log('[index.tsx] onTargetPress triggered.');
          // 允许在实时模式下展开下拉，无需拦截
          setShowTargetPicker((v) => {
            const next = !v;
            console.log(`[index.tsx] Toggling target picker. Current: ${v}, Next: ${next}`);
            if (next) setShowSourcePicker(false);
            return next;
          });
        }}
        onSwapPress={() => {
          console.log('[index.tsx] onSwapPress triggered.');
          // 交换语言并关闭下拉
          swapLanguages();
          setShowSourcePicker(false);
          setShowTargetPicker(false);
          // 若实时模式正在连接或已连接，应用新语言
          if (realtime.isConnecting) {
            // 取消当前连接并重新建立
            try { realtime.disconnect(); } catch {}
            setTimeout(() => { try { realtime.connect(); } catch {} }, 300);
            setToast({ key: Date.now(), message: '正在应用新语言…', type: 'info' });
          } else if (realtime.isConnected) {
            realtime.reconnect();
            setToast({ key: Date.now(), message: '语言已交换，正在应用…', type: 'info' });
          }
        }}
        disabled={false}
        showSourcePicker={showSourcePicker}
        showTargetPicker={showTargetPicker}
        onSelectSource={(lang) => { 
          console.log(`[index.tsx] onSelectSource triggered with language: ${lang.name}`);
          // 如果选择的“听”语言与当前“说”语言相同，阻止并提示
          if (lang.code === targetLanguage.code) {
            setShowSourcePicker(false);
            setToast({ key: Date.now(), message: '现在听说是同一种语言，请切换语言', type: 'error' });
            return;
          }
          setSourceLanguage(lang); 
          setShowSourcePicker(false); 
          setShowTargetPicker(false); 
          // 若实时模式正在连接或已连接，应用新语言
          if (realtime.isConnecting) {
            try { realtime.disconnect(); } catch {}
            setTimeout(() => { try { realtime.connect(); } catch {} }, 300);
            setToast({ key: Date.now(), message: `已切换为「${lang.name}（听）」：正在应用…`, type: 'info' });
          } else if (realtime.isConnected) {
            realtime.reconnect();
            setToast({ key: Date.now(), message: `已切换为「${lang.name}（听）」：正在应用…`, type: 'info' });
          }
        }}
        onSelectTarget={(lang) => { 
          console.log(`[index.tsx] onSelectTarget triggered with language: ${lang.name}`);
          // 如果选择的“说”语言与当前“听”语言相同，阻止并提示
          if (lang.code === sourceLanguage.code) {
            setShowTargetPicker(false);
            setToast({ key: Date.now(), message: '现在听说是同一种语言，请切换语言', type: 'error' });
            return;
          }
          setTargetLanguage(lang); 
          setShowTargetPicker(false); 
          setShowSourcePicker(false); 
          // 若实时模式正在连接或已连接，应用新语言
          if (realtime.isConnecting) {
            try { realtime.disconnect(); } catch {}
            setTimeout(() => { try { realtime.connect(); } catch {} }, 300);
            setToast({ key: Date.now(), message: `将输出语言改为「${lang.name}」：正在应用…`, type: 'info' });
          } else if (realtime.isConnected) {
            realtime.reconnect();
            setToast({ key: Date.now(), message: `将输出语言改为「${lang.name}」：正在应用…`, type: 'info' });
          }
        }}
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
          <Text style={{ marginBottom: spacing.xs, fontSize: typography.fontSize.body, color: colors.text.secondary }}>
            实时模式（Beta）：{realtime.isConnected ? '已连接' : (realtime.isConnecting ? '连接中...' : '未连接')}
          </Text>
          {/* 新增：提醒小字 */}
          <Text style={{ marginBottom: spacing.sm, fontSize: typography.fontSize.small, color: colors.text.secondary }}>
            请关闭实时模式后再切换语言。
          </Text>
          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: realtimeEnabled ? colors.accent.rust : colors.accent.green }]}
            onPress={toggleRealtime}
          >
            <Text style={styles.testButtonText}>{realtimeEnabled ? '关闭实时模式' : '开启实时模式'}</Text>
          </TouchableOpacity>
          {/* 删除“测试API”按钮 */}
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
    // 关键：允许上方 LanguageSelector 的下拉超出容器显示（RN Web 默认会裁切）
    overflow: 'visible',
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