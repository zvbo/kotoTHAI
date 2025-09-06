import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import ConversationBubble from '@/components/ConversationBubble';
// 移除手动录音模式的状态指示器
// import StatusIndicator from '@/components/StatusIndicator';
import TimeExpiredCard from '@/components/TimeExpiredCard';
// import WelcomeCard from '@/components/WelcomeCard';
import { useAppContext } from '@/context/AppContext';
import { colors, spacing, borderRadius, shadows, typography } from '@/styles/designSystem';
import useRealtime from '@/hooks/useRealtime';
import LanguageSelector from '@/components/LanguageSelector';
// import LanguagePickerModal from '@/components/LanguagePickerModal';
import ToastBanner from '../../components/ToastBanner';
import { saveConversation } from '@/utils/storage';
import type { Language } from '@/types';


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
    // setStatus, // No longer used by handleStatusPress
    // markLowTimePromptShown, // removed
    swapLanguages,
    setSourceLanguage,
    setTargetLanguage,
  } = useAppContext();
  
  // 实时字幕状态
  const [realtimeSrcText, setRealtimeSrcText] = useState('');
  const [realtimeTgtText, setRealtimeTgtText] = useState('');

  // Hooks are now unused since handleStatusPress was removed.
  // const {} = useAudioRecording();
  // const {} = useTranslation();
  
  // 为实时模式传入语言代码，后续在 /api/ephemeral 中作为提示
  const realtime = useRealtime({ sourceLangCode: sourceLanguage.code, targetLangCode: targetLanguage.code });
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  // 引入稳定的连接/断开/重连函数引用，避免 effect 依赖 realtime 对象导致循环
  const connectFnRef = useRef(realtime.connect);
  const disconnectFnRef = useRef(realtime.disconnect);
  const reconnectFnRef = useRef(realtime.reconnect);
  useEffect(() => {
    connectFnRef.current = realtime.connect;
    disconnectFnRef.current = realtime.disconnect;
    reconnectFnRef.current = realtime.reconnect;
  }, [realtime.connect, realtime.disconnect, realtime.reconnect]);

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
  // 新增：仅在检测到用户输入后才允许显示模型输出
  const userInputSeenRef = useRef(false);
  
  // 原文与译文双缓冲，支持“完整对话模式”
  const { conversationMode } = useAppContext();

  // Toast 状态（非模态小条提示）
  const [toast, setToast] = useState<null | { message: string; type: 'info' | 'success' | 'error'; key: number }>(null);
  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => setToast({ message, type, key: Date.now() });
  // Ref for messages list
  const messagesListRef = useRef<FlatList>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 实时模式切换与连接（仅依赖开关本身，避免因 realtime 引用变化造成反复 cleanup/connect）
  useEffect(() => {
    if (!realtimeEnabled) return;
    // 仅当开启时尝试连接（connect 内部自带并发/状态守卫）
    connectFnRef.current?.();
    return () => {
      // 关闭开关时断开（仅网络/音频资源清理，不再在此处更新全局会话状态）
      disconnectFnRef.current?.();
      if (rtTimerRef.current) clearTimeout(rtTimerRef.current);
      // 仅清空 ref，避免触发重渲染
      rtSrcBufferRef.current = '';
      rtTgtBufferRef.current = '';
      userInputSeenRef.current = false; // 重置“已见用户输入”标志
    };
  }, [realtimeEnabled]);

  // 仅显示重要错误信息
  useEffect(() => {
    if (realtime.error && !realtime.error.includes('连接在 SDP 协商期间被中断')) {
      showToast('语音连接失败，请重试', 'error');
    }
  }, [realtime.error]);
  
  const errorMessage = realtime.error;
  useEffect(() => {
    if (errorMessage && !errorMessage.includes('连接在 SDP 协商期间被中断')) {
      console.error('应用错误:', errorMessage);
    }
  }, [errorMessage]);
  const prevRealtimeEnabledRef = useRef(false);
  useEffect(() => {
    const prev = prevRealtimeEnabledRef.current;
    prevRealtimeEnabledRef.current = realtimeEnabled;
  }, [realtimeEnabled]);

  const toggleRealtime = useCallback(() => {
    if (realtimeEnabled) {
      try { disconnectFnRef.current?.(); } catch {}
      setRealtimeEnabled(false);
      // 关闭实时模式时重置标记
      userInputSeenRef.current = false;
      rtSrcBufferRef.current = '';
      rtTgtBufferRef.current = '';
    } else {
      setRealtimeEnabled(true);
      // 开启实时模式时重置标记
      userInputSeenRef.current = false;
      rtSrcBufferRef.current = '';
      rtTgtBufferRef.current = '';
    }
  }, [realtimeEnabled]);

  useEffect(() => {
    if (realtimeEnabled) {
      try { startSessionRef.current?.(); } catch {}
    } else {
      try { stopSessionRef.current?.(); } catch {}
    }
  }, [realtimeEnabled]);

  // 语言切换触发重连：不依赖 realtime 对象，避免循环
  useEffect(() => {
    if (!realtimeEnabled) return;
    reconnectFnRef.current?.();
  }, [sourceLanguage.code, targetLanguage.code, realtimeEnabled]);

  useEffect(() => {
    if (status === 'time_expired' && realtimeEnabled) {
      try { disconnectFnRef.current?.(); } catch {}
      setRealtimeEnabled(false);
    }
  }, [status, realtimeEnabled]);

  const prevIsSessionActiveRef = useRef<boolean>(isSessionActive);
  useEffect(() => {
    const prev = prevIsSessionActiveRef.current;
    prevIsSessionActiveRef.current = isSessionActive;
    if (prev && !isSessionActive && realtimeEnabled) {
      try { disconnectFnRef.current?.(); } catch {}
      setRealtimeEnabled(false);
    }
  }, [isSessionActive, realtimeEnabled]);

  useEffect(() => {
    if (!isSessionActive && realtimeEnabled) {
    }
  }, [isSessionActive, realtimeEnabled]);

  const handlePurchase = useCallback(() => {
    if (realtimeEnabled) {
      try { disconnectFnRef.current?.(); } catch {}
      setRealtimeEnabled(false);
    }
    router.push('/settings');
  }, [realtimeEnabled]);

  const extractRealtimeText = useCallback((ev: unknown): string | null => {
    if (!ev) return null;
    if (typeof ev === 'string') return ev;

    // 尝试从常见的聚合/嵌套结构中提取译文文本
    const tryCollect = (obj: any): string | null => {
      if (!obj || typeof obj !== 'object') return null;

      // 1) 直接的 output_text
      if (typeof obj.output_text === 'string' && obj.output_text.trim()) return obj.output_text;
      if (Array.isArray(obj.output_text)) {
        const joined = obj.output_text.filter((s: any) => typeof s === 'string').join('').trim();
        if (joined) return joined;
      }

      // 2) content 数组，形如 [{ type: 'output_text', text: '...' } | { text: '...' } | '...'] 
      if (Array.isArray(obj.content)) {
        const parts = obj.content
          .map((c: any) => {
            if (typeof c === 'string') return c;
            if (c && typeof c === 'object') {
              if (typeof c.text === 'string') return c.text;
              if (typeof c.delta === 'string') return c.delta;
              if (c.type === 'output_text' && typeof c.output_text === 'string') return c.output_text;
            }
            return '';
          })
          .filter(Boolean);
        const joined = parts.join('').trim();
        if (joined) return joined;
      }

      // 3) 常见的 text/delta/content/value 字段兜底
      if (typeof obj.text === 'string' && obj.text.trim()) return obj.text;
      if (typeof obj.delta === 'string' && obj.delta.trim()) return obj.delta;
      if (typeof obj.content === 'string' && obj.content.trim()) return obj.content;
      if (typeof obj.value === 'string' && obj.value.trim()) return obj.value;
      
      // 4) 特殊格式：message.content
      if (obj.message && typeof obj.message.content === 'string' && obj.message.content.trim()) {
        return obj.message.content;
      }

      // 5) 特殊格式：response.output_text.done 事件
      if (obj.done && obj.output_text && typeof obj.output_text === 'string' && obj.output_text.trim()) {
        return obj.output_text;
      }

      return null;
    };

    if (typeof ev === 'object' && ev !== null) {
      // 1) 增量事件（已支持）
      if ('type' in ev && typeof (ev as any).type === 'string') {
        const t = (ev as any).type as string;
        console.log(`处理译文事件类型: ${t}`);
        
        // 处理 response.output_text.delta 事件
        if (t === 'response.output_text.delta' && 'delta' in ev && typeof (ev as any).delta === 'string') {
          console.log(`提取到增量译文(delta string): ${(ev as any).delta}`);
          return (ev as any).delta as string;
        }
        
        // 处理 response.output_text.done 事件
        if (t === 'response.output_text.done' && 'output_text' in ev && typeof (ev as any).output_text === 'string') {
          console.log(`提取到完整译文(output_text): ${(ev as any).output_text}`);
          return (ev as any).output_text as string;
        }
        
        // 处理 response.delta 事件
        if (t === 'response.delta' && 'delta' in ev) {
          console.log('检测到response.delta事件:', JSON.stringify(ev, null, 2));
          const d: any = (ev as any).delta;
          if (typeof d === 'string') {
            console.log(`提取到增量译文(delta string): ${d}`);
            return d;
          }
          if (typeof d === 'object' && d) {
            if (typeof d.text === 'string') {
              console.log(`提取到增量译文(delta.text): ${d.text}`);
              return d.text as string;
            }
            if (typeof d.delta === 'string') {
              console.log(`提取到增量译文(delta.delta): ${d.delta}`);
              return d.delta as string;
            }
            if (Array.isArray(d.content)) {
              const parts = d.content
                .map((c: any) => (typeof c?.text === 'string' ? c.text : typeof c === 'string' ? c : ''))
                .filter(Boolean);
              if (parts.length) {
                const joined = parts.join('');
                console.log(`提取到增量译文(delta.content数组): ${joined}`);
                return joined;
              }
            }
          }
        }
        
        // 处理完成事件
        if (t.includes('completed') || t.includes('done')) {
          console.log('检测到完成事件:', JSON.stringify(ev, null, 2));
        }
      }

      // 2) 聚合/完成类事件：response.completed / response.done 等，以及顶层或嵌套的 response/output/content/output_text
      const aggregated =
        tryCollect(ev as any) ||
        tryCollect((ev as any).response) ||
        tryCollect((ev as any).output) ||
        tryCollect((ev as any).message) ||
        tryCollect((ev as any).content) ||
        tryCollect((ev as any).item); // 新增：兼容 conversation.item.* 事件
      if (aggregated) {
        console.log(`从聚合路径提取到译文: ${aggregated}`);
        return aggregated;
      }

      // 某些实现会把 response.output 设为数组，每个元素再有 content/output_text
      const resp: any = (ev as any).response;
      if (resp && Array.isArray(resp.output)) {
        const joined = resp.output.map((o: any) => tryCollect(o)).filter(Boolean).join('').trim();
        if (joined) {
          console.log(`从response.output数组提取到译文: ${joined}`);
          return joined;
        }
      }

      // 3) 兜底：顶层存在 text/delta/content/value 字符串
      if ('text' in ev && typeof (ev as any).text === 'string') {
        console.log(`从text字段提取到译文: ${(ev as any).text}`);
        return (ev as any).text as string;
      }
      if ('delta' in ev && typeof (ev as any).delta === 'string') {
        console.log(`从delta字段提取到译文: ${(ev as any).delta}`);
        return (ev as any).delta as string;
      }
      if ('content' in ev && typeof (ev as any).content === 'string') {
        console.log(`从content字段提取到译文: ${(ev as any).content}`);
        return (ev as any).content as string;
      }
      if ('value' in ev && typeof (ev as any).value === 'string') {
        console.log(`从value字段提取到译文: ${(ev as any).value}`);
        return (ev as any).value as string;
      }
    }

    return null;
  }, []);

  const extractOriginalText = useCallback((ev: unknown): string | null => {
    if (!ev || typeof ev !== 'object') return null;
    const obj: any = ev as any;

    const tryCollect = (maybe: any): string | null => {
      if (!maybe || typeof maybe !== 'object') return null;
      if (typeof maybe.text === 'string' && maybe.text.trim()) return maybe.text;
      if (typeof maybe.transcript === 'string' && maybe.transcript.trim()) return maybe.transcript;
      if (typeof maybe.value === 'string' && maybe.value.trim()) return maybe.value;
      return null;
    };

    // 1) 顶层直接字段
    if (typeof obj.input === 'string' && obj.input.trim()) return obj.input as string;

    // 2) 嵌套在 input 或 input_audio 中的文本
    if (obj.input_audio && typeof obj.input_audio.text === 'string') return obj.input_audio.text;

    // 3) 嵌套在 audio_transcription 中的文本
    if (obj.audio_transcription && typeof obj.audio_transcription.text === 'string') {
      return obj.audio_transcription.text;
    }
    if (obj.audio_transcription && typeof obj.audio_transcription.transcript === 'string') {
      return obj.audio_transcription.transcript;
    }
    // 3.1) 兼容 input_audio_transcription
    if (obj.input_audio_transcription && typeof obj.input_audio_transcription.text === 'string') {
      return obj.input_audio_transcription.text;
    }
    if (obj.input_audio_transcription && typeof obj.input_audio_transcription.transcript === 'string') {
      return obj.input_audio_transcription.transcript;
    }

    // 4) 事件类型判断
    const t: string | undefined = (obj as any).type;

    // 处理 conversation.item.audio_transcription.completed / conversation.item.input_audio_transcription.completed
    if (t && (t.includes('audio_transcription') || t.includes('input_audio_transcription'))) {
      const item = (obj as any).item;
      if (item) {
        if (item.audio_transcription) {
          if (typeof item.audio_transcription.text === 'string') {
            console.log(`提取到音频转写文本: ${item.audio_transcription.text}`);
            return item.audio_transcription.text;
          }
          if (typeof item.audio_transcription.transcript === 'string') {
            console.log(`提取到音频转写文本: ${item.audio_transcription.transcript}`);
            return item.audio_transcription.transcript;
          }
        }
        if (item.input_audio_transcription) {
          if (typeof item.input_audio_transcription.text === 'string') {
            console.log(`提取到音频转写文本: ${item.input_audio_transcription.text}`);
            return item.input_audio_transcription.text;
          }
          if (typeof item.input_audio_transcription.transcript === 'string') {
            console.log(`提取到音频转写文本: ${item.input_audio_transcription.transcript}`);
            return item.input_audio_transcription.transcript;
          }
        }
      }
    }

    if ((t && (t.includes('input_audio') || t.includes('transcription') || t.includes('asr')))) {
      // 检查 delta 字段
      if ('delta' in ev) {
        const d: any = (ev as any).delta;
        if (typeof d === 'string' && d.trim()) {
          console.log(`提取到增量转写文本(delta string): ${d}`);
          return d;
        }
        if (d && typeof d === 'object') {
          if (typeof d.text === 'string' && d.text.trim()) {
            console.log(`提取到增量转写文本(delta.text): ${d.text}`);
            return d.text;
          }
          if (typeof d.transcript === 'string' && d.transcript.trim()) {
            console.log(`提取到增量转写文本(delta.transcript): ${d.transcript}`);
            return d.transcript;
          }
        }
      }
    }

    // 5) 其他常见嵌套结构
    return (
      tryCollect((ev as any).input) ||
      tryCollect((ev as any).input_audio) ||
      tryCollect((ev as any).transcription) ||
      tryCollect((ev as any).audio_transcription) ||
      tryCollect((ev as any).input_audio_transcription) ||
      tryCollect((ev as any).item) ||
      null
    );
  }, []);

  useEffect(() => {
    if (!realtimeEnabled || !realtime.lastEvent) return;

    console.log('--- [Realtime Event Received] ---', JSON.stringify(realtime.lastEvent, null, 2));

    const tgtChunkRaw = extractRealtimeText(realtime.lastEvent);
    const srcChunk = extractOriginalText(realtime.lastEvent);

    console.log(`--- [Chunks Extracted] --- Src: "${srcChunk}", Tgt: "${tgtChunkRaw}"`);
    console.log(`--- [User Input Seen] --- ${userInputSeenRef.current ? 'YES' : 'NO'}`);

    // 一旦检测到原文（来自用户的音频/文本）则放行后续译文
    if (srcChunk) {
      userInputSeenRef.current = true;
      rtSrcBufferRef.current += srcChunk;
      // 更新实时原文字幕
      setRealtimeSrcText(rtSrcBufferRef.current);
      console.log(`--- [Source Buffer Updated] --- "${rtSrcBufferRef.current}"`);
      // 如译文缓冲已有内容，源文本出现后立即显示，减少时序错觉
      if (rtTgtBufferRef.current.length > 0) {
        setRealtimeTgtText(rtTgtBufferRef.current);
        console.log('源文本已出现：同步已缓冲的译文到UI');
      }
    }

    // 仅在检测到源文本后才展示译文，避免“AI说”先出现造成混乱
    if (tgtChunkRaw) {
      if (userInputSeenRef.current && rtSrcBufferRef.current.length > 0) {
        rtTgtBufferRef.current += tgtChunkRaw;
        // 更新实时译文字幕
        setRealtimeTgtText(rtTgtBufferRef.current);
        console.log(`--- [Target Buffer Updated] --- "${rtTgtBufferRef.current}"`);
      } else {
        // 积累译文缓冲但暂不展示，待源文本出现后统一显示
        rtTgtBufferRef.current += tgtChunkRaw;
        console.log('译文到达但尚未检测到源文本，暂缓显示');
      }
    }

    // 事件类型判定（用于分阶段冲刷）
    const ev: any = realtime.lastEvent as any;
    const evType: string | undefined = typeof ev === 'object' ? (ev?.type as string) : undefined;

    // 当仅译文/原文都没有增量时，进一步判断是否属于“阶段完成/轮次结束”事件
    if (!tgtChunkRaw && !srcChunk) {
      // 1) 原文完成：优先在“完整对话模式”下先落原文气泡
      const isSrcFinalEvent = Boolean(
        evType && (
          evType.includes('audio_transcription.completed') ||
          evType.includes('input_audio_transcription.completed') ||
          evType.includes('transcription.completed')
        )
      );
      if (isSrcFinalEvent) {
        const toSendSrc = rtSrcBufferRef.current.trim();
        if (conversationMode === 'full' && toSendSrc.length > 0) {
          addMessage({
            text: toSendSrc,
            translatedText: '',
            sourceLanguage: sourceLanguage.code,
            targetLanguage: targetLanguage.code,
            isUser: true,
          });
          console.log(`--- [Flush Source Only] --- Src: "${toSendSrc}"`);
        }
        // 清空原文缓冲与实时字幕，但保留 userInputSeenRef 供后续译文落地
        rtSrcBufferRef.current = '';
        setRealtimeSrcText('');
        return; // 本次事件已处理
      }

      // 2) 译文完成：在检测到本轮确有原文后，再落译文气泡并复位轮次
      const isTgtFinalEvent = Boolean(
        evType && (
          evType.includes('response.completed') ||
          evType.includes('response.output_text.done') ||
          evType.includes('output_text.done')
        )
      );
      if (isTgtFinalEvent) {
        const toSendTgt = rtTgtBufferRef.current.trim();
        const hadSourceThisTurn = userInputSeenRef.current;
        if (toSendTgt.length > 0 && hadSourceThisTurn) {
          addMessage({
            text: '',
            translatedText: toSendTgt,
            sourceLanguage: sourceLanguage.code,
            targetLanguage: targetLanguage.code,
            isUser: false,
          });
          console.log(`--- [Flush Target Only] --- Tgt: "${toSendTgt}"`);
        }
        // 清空译文缓冲与实时字幕，并复位轮次标记；顺带清理可能残留的原文缓冲
        rtTgtBufferRef.current = '';
        setRealtimeTgtText('');
        rtSrcBufferRef.current = '';
        setRealtimeSrcText('');
        userInputSeenRef.current = false;
        return; // 本次事件已处理
      }

      // 3) 兜底：轮次结束（非特定 completed 类型），统一冲刷剩余缓冲
      if (userInputSeenRef.current && evType && (evType.includes('turn.end') || evType.includes('stop') || evType.includes('stopped'))) {
        console.log('检测到会话结束事件，立即冲刷缓冲区:', evType);
        if (rtTimerRef.current) clearTimeout(rtTimerRef.current);
        const toSendSrc = rtSrcBufferRef.current.trim();
        const toSendTgt = rtTgtBufferRef.current.trim();
        const hadSourceThisTurn = userInputSeenRef.current;
        rtSrcBufferRef.current = '';
        rtTgtBufferRef.current = '';
        setRealtimeSrcText('');
        setRealtimeTgtText('');
        if (toSendSrc.length > 0 && conversationMode === 'full') {
          addMessage({ text: toSendSrc, translatedText: '', sourceLanguage: sourceLanguage.code, targetLanguage: targetLanguage.code, isUser: true });
        }
        if (toSendTgt.length > 0 && hadSourceThisTurn) {
          addMessage({ text: '', translatedText: toSendTgt, sourceLanguage: sourceLanguage.code, targetLanguage: targetLanguage.code, isUser: false });
        }
        userInputSeenRef.current = false;
        return;
      }
      return;
    }

    if (rtTimerRef.current) clearTimeout(rtTimerRef.current);

    // 仅在“轮次结束”事件时才异步冲刷，避免与上面的分阶段冲刷重复
    let isCompletion = false;
    try {
      const ev: any = realtime.lastEvent;
      const evType: string | undefined = typeof ev === 'object' ? (ev?.type as string) : undefined;
      if (evType && (evType.includes('turn.end') || evType.includes('stop') || evType.includes('stopped'))) {
        isCompletion = true;
      }
    } catch {}

    if (isCompletion) {
      rtTimerRef.current = setTimeout(() => {
        const toSendSrc = rtSrcBufferRef.current.trim();
        const toSendTgt = rtTgtBufferRef.current.trim();
        const hadSourceThisTurn = userInputSeenRef.current;

        console.log(`--- [Message to Add] --- Src: "${toSendSrc}", Tgt: "${toSendTgt}"`);

        rtSrcBufferRef.current = '';
        rtTgtBufferRef.current = '';
        setRealtimeSrcText('');
        setRealtimeTgtText('');

        if (conversationMode === 'full') {
          if (toSendSrc.length > 0) {
            addMessage({
              text: toSendSrc,
              translatedText: '',
              sourceLanguage: sourceLanguage.code,
              targetLanguage: targetLanguage.code,
              isUser: true,
            });
          }
          if (toSendTgt.length > 0 && hadSourceThisTurn) {
            addMessage({
              text: '',
              translatedText: toSendTgt,
              sourceLanguage: sourceLanguage.code,
              targetLanguage: targetLanguage.code,
              isUser: false,
            });
          }
        } else if (conversationMode === 'translation_only') {
          if (toSendTgt.length > 0 && hadSourceThisTurn) {
            addMessage({
              text: '',
              translatedText: toSendTgt,
              sourceLanguage: sourceLanguage.code,
              targetLanguage: targetLanguage.code,
              isUser: false,
            });
          }
        }
        userInputSeenRef.current = false;
      }, 0);
    }

  }, [realtime.lastEvent, realtimeEnabled, addMessage, sourceLanguage.code, targetLanguage.code, extractRealtimeText, extractOriginalText, conversationMode]);
  
  useEffect(() => {
    return () => {
      if (rtTimerRef.current) clearTimeout(rtTimerRef.current);
      rtSrcBufferRef.current = '';
      rtTgtBufferRef.current = '';
      userInputSeenRef.current = false;
      // 清空实时字幕
      setRealtimeSrcText('');
      setRealtimeTgtText('');
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
      {userState.firstLaunch && (
        // WelcomeCard 已移除：使用下方的简洁欢迎提示（位于消息区上方，非气泡样式）
        null
      )}
      
      <LanguageSelector
        sourceLanguage={sourceLanguage}
        targetLanguage={targetLanguage}
        onSourcePress={() => {
          setShowSourcePicker((v) => {
            const next = !v;
            if (next) setShowTargetPicker(false);
            return next;
          });
        }}
        onTargetPress={() => {
          setShowTargetPicker((v) => {
            const next = !v;
            if (next) setShowSourcePicker(false);
            return next;
          });
        }}
        onSwapPress={() => {
          swapLanguages();
          setShowSourcePicker(false);
          setShowTargetPicker(false);
          if (realtime.isConnecting) {
            try { realtime.disconnect(); } catch {}
            // 重置用户输入标记
            userInputSeenRef.current = false;
            rtSrcBufferRef.current = '';
            rtTgtBufferRef.current = '';
            // 清空实时字幕
            setRealtimeSrcText('');
            setRealtimeTgtText('');
            setTimeout(() => { try { realtime.connect(); } catch {} }, 300);
          } else if (realtime.isConnected) {
            // 重置用户输入标记
            userInputSeenRef.current = false;
            rtSrcBufferRef.current = '';
            rtTgtBufferRef.current = '';
            // 清空实时字幕
            setRealtimeSrcText('');
            setRealtimeTgtText('');
            realtime.reconnect();
          }
        }}
        disabled={false}
        showSourcePicker={showSourcePicker}
        showTargetPicker={showTargetPicker}
        onSelectSource={(lang: Language) => { 
          if (lang.code === targetLanguage.code) {
            setShowSourcePicker(false);
            return;
          }
          setSourceLanguage(lang); 
          setShowSourcePicker(false); 
          setShowTargetPicker(false); 
          if (realtime.isConnecting) {
            try { realtime.disconnect(); } catch {}
            setTimeout(() => { try { realtime.connect(); } catch {} }, 300);
          } else if (realtime.isConnected) {
            realtime.reconnect();
          }
        }}
        onSelectTarget={(lang: Language) => { 
          if (lang.code === sourceLanguage.code) {
            setShowTargetPicker(false);
            return;
          }
          setTargetLanguage(lang); 
          setShowTargetPicker(false); 
          setShowSourcePicker(false); 
          if (realtime.isConnecting) {
            try { realtime.disconnect(); } catch {}
            setTimeout(() => { try { realtime.connect(); } catch {} }, 300);
          } else if (realtime.isConnected) {
            realtime.reconnect();
          }
        }}
        showLanguageBubbles={false}
        sourceBubbleText={undefined}
        targetBubbleText={undefined}
      />

      {/* 简洁欢迎提示：位于消息区上方，非气泡样式，仅首次显示 */}
      {userState.firstLaunch && messages.length === 0 && (
        <View style={styles.welcomeTipContainer}>
          <Text style={styles.welcomeTipText}>开始说话即可双向翻译（应用不会主动发话）</Text>
          <TouchableOpacity onPress={() => acknowledgeFirstLaunch()}>
            <Text style={styles.welcomeTipAction}>知道了</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 实时双路字幕区域 - 仅在有内容时显示 */}
      {realtimeEnabled &&
        realtime.isConnected &&
        Boolean(realtimeSrcText?.trim() || realtimeTgtText?.trim()) && (
          <View style={styles.subtitleCenterContainer}>
            {Boolean(realtimeSrcText?.trim()) && (
              <View style={styles.subtitleCenterBox}>
                <Text style={styles.subtitleCenterLabel}>{sourceLanguage.name}</Text>
                <Text style={styles.subtitleCenterText}>{realtimeSrcText}</Text>
              </View>
            )}
            {Boolean(realtimeTgtText?.trim()) && (
              <View style={[styles.subtitleCenterBox, { marginTop: spacing.xs }]}> 
                <Text style={styles.subtitleCenterLabel}>{targetLanguage.name}</Text>
                <Text style={styles.subtitleCenterText}>{realtimeTgtText}</Text>
              </View>
            )}
          </View>
        )}

      <View style={styles.conversationContainer}>
        {status === 'time_expired' ? (
          <TimeExpiredCard onPurchase={handlePurchase} />
        ) : (
          conversationMode !== 'voice_only' && messages.length > 0 ? (
            <FlatList
              ref={messagesListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ConversationBubble message={item} />}
              contentContainerStyle={styles.messagesList}
            />
          ) : null
        )}
      </View>
      
      <View style={styles.statusContainer}>
        <View className="w-full items-center" style={{ marginTop: spacing.lg }}>
          {/* 简单连接状态指示 */}
          <View style={{ marginBottom: spacing.sm }}>
            <Text style={{
              color: realtime.isConnected
                ? colors.accent.green
                : realtime.isConnecting
                ? colors.text.secondary
                : colors.text.secondary,
              fontSize: typography.fontSize.small,
            }}>
              {realtime.isConnecting ? '连接中…' : realtime.isConnected ? '已连接' : '未连接'}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: realtimeEnabled ? colors.accent.rust : colors.accent.green }]}
            onPress={toggleRealtime}
          >
            <Text style={styles.testButtonText}>{realtimeEnabled ? '停止语音翻译' : '开始语音翻译'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="保存当前对话"
            className={isSaving ? 'opacity-60' : ''}
            style={[styles.testButton, { marginTop: spacing.md, backgroundColor: colors.accent.green }]}
            onPress={async () => {
              try {
                if (isSaving) return;
                if (!messages || messages.length === 0) {
                  showToast('暂无可保存的对话', 'info');
                  return;
                }
                setIsSaving(true);
                await saveConversation(messages);
                showToast('已保存当前对话', 'success');
              } catch (e) {
                console.error('[index] saveConversation error', e);
                showToast('保存失败，请稍后重试', 'error');
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={isSaving}
          >
            <Text style={styles.testButtonText}>{isSaving ? '保存中…' : '保存对话'}</Text>
          </TouchableOpacity>
        </View>
      </View>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  // 实时字幕区域样式
  subtitlesContainer: {
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subtitleBox: {
    flex: 1,
    padding: spacing.sm,
    backgroundColor: colors.surface.paper,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xs,
    maxHeight: 120,
    ...shadows.sm,
  },
  subtitleContent: {
    flexGrow: 1,
  },
  subtitleLabel: {
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  subtitleText: {
    fontSize: typography.fontSize.body,
    color: colors.text.primary,
  },
  subtitleCenterContainer: {
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  subtitleCenterBox: {
    width: '100%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface.paper,
    borderRadius: borderRadius.lg,
    maxHeight: 120,
    ...shadows.sm,
  },
  subtitleCenterLabel: {
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitleCenterText: {
    fontSize: typography.fontSize.body,
    color: colors.text.primary,
    textAlign: 'center',
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
  // 新增：欢迎提示样式（非气泡）
  welcomeTipContainer: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface.paper,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.sm,
  },
  welcomeTipText: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.fontSize.body,
  },
  welcomeTipAction: {
    marginLeft: spacing.md,
    color: colors.accent.green,
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.medium,
  },
});