import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Alert, AppState, Linking, AlertButton } from 'react-native';
import type { RTCPeerConnection as RNRTCPeerConnection, RTCDataChannel as RNRTCDataChannel, MediaStream as RNMediaStream } from 'react-native-webrtc';

// --- Type Definitions ---

interface UseRealtimeParams {
  sourceLangCode?: string;
  targetLangCode?: string;
}

interface InCallManager {
  start(options?: { media: 'audio' | 'video' }): void;
  stop(): void;
  setForceSpeakerphoneOn(enabled: boolean): void;
}

interface SessionConfig {
  input_audio_transcription?: { model: string };
  instructions?: string;
  // 删除不被支持的 audio 字段，避免在 session.update 中发送 session.audio
  // audio?: { output?: { voice?: string } };
  turn_detection?: { type: string; threshold: number; prefix_padding_ms: number; silence_duration_ms: number };
  model?: string;
}

// --- Hook Implementation ---

export default function useRealtime(params?: UseRealtimeParams) {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<unknown | null>(null);

  // 使用 any 以兼容 Web 与 React Native 的不同实现，同时避免 import type 名称作为值的冲突
  const pcRef = useRef<any>(null);
  const micStreamRef = useRef<any>(null);
  const remoteAudioRef = useRef<any>(null);
  const dataChannelRef = useRef<any>(null);
  const incallRef = useRef<InCallManager | null>(null);
  const connectingRef = useRef(false);
  const isWeb = Platform.OS === 'web';
  // 连接序列令牌：每次开始/清理连接时递增，用于中止并发/过期的连接流程
  const connectSeqRef = useRef(0);

  const AGENT_SERVER_URL =
    (process.env.EXPO_PUBLIC_AGENT_SERVER_URL as string) ||
    (typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:8788`
      : 'http://localhost:8788');

  useEffect(() => {
    if (isWeb) {
      setIsSupported(typeof window !== 'undefined' && !!(navigator.mediaDevices && (window as any).RTCPeerConnection));
    } else {
      setIsSupported(true);
    }
  }, [isWeb]);

  const cleanup = useCallback(() => {
    // 使任何进行中的连接流程失效
    connectSeqRef.current += 1;
    try {
      if (dataChannelRef.current?.readyState === 'open') {
        dataChannelRef.current.send(JSON.stringify({ type: 'response.cancel' }));
        dataChannelRef.current.send(JSON.stringify({ type: 'session.close' }));
        dataChannelRef.current.onmessage = null;
      }
      dataChannelRef.current?.close();
    } catch {}
    dataChannelRef.current = null;

    try {
      pcRef.current?.getSenders().forEach((s: any) => s.track?.stop());
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;

    micStreamRef.current?.getTracks().forEach((t: any) => t.stop());
    micStreamRef.current = null;

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.pause?.();
    }

    incallRef.current?.setForceSpeakerphoneOn(false);
    incallRef.current?.stop();
    incallRef.current = null;

    setIsConnected(false);
    setIsConnecting(false);
    connectingRef.current = false;
    setLastEvent(null);
  }, []);

  const buildFallbackInstructions = useCallback((src?: string, tgt?: string) => {
    const source = src || 'zh';
    const target = tgt || 'th';
    return (
      `You are a professional simultaneous interpreter between ${source} and ${target}. ` +
      `Start silent: produce NO output on session start. ` +
      `Only produce output AFTER you receive user speech or text input. ` +
      `Detect the language of each utterance. If the user speaks ${source}, immediately interpret into ${target}. ` +
      `If the user speaks ${target}, immediately interpret into ${source}. ` +
      `Do not greet, do not chat, do not add explanations, do not ask questions. ` +
      `Keep sentences natural, concise, and conversational. ` +
      `If the input is already clear in the target language, repeat briefly for clarity in that language.`
    );
  }, []);

  const sendSessionUpdate = useCallback((sessionFromServer?: Partial<SessionConfig>) => {
    // Sanitize incoming session payload: drop unsupported fields (e.g., language) and keep only allowed keys
    const raw: any = { ...(sessionFromServer || {}) };
    if ('language' in raw) delete raw.language;

    const session: SessionConfig = {} as SessionConfig;

    if (typeof raw.model === 'string') {
      session.model = raw.model;
    }

    // 确保使用 whisper-1 模型进行音频转写，提高准确性
    session.input_audio_transcription = { model: 'whisper-1' };

    session.instructions =
      typeof raw?.instructions === 'string'
        ? raw.instructions
        : buildFallbackInstructions(params?.sourceLangCode, params?.targetLangCode);

    // 移除对 voice 的前端设置，voice 应由后端在会话创建时设定；避免发送 session.audio 触发 unknown_parameter 错误
    // const voice = raw?.audio?.output?.voice || 'marin';
    // session.audio = { output: { voice } };

    session.turn_detection =
      raw?.turn_detection && typeof raw.turn_detection === 'object'
        ? raw.turn_detection
        : { type: 'server_vad', threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 2200 };

    let attempts = 0;
    const trySend = () => {
      attempts += 1;
      if (dataChannelRef.current?.readyState === 'open') {
        try {
          dataChannelRef.current.send(JSON.stringify({ type: 'session.update', session }));
        } catch (e) {
          console.warn('Failed to send session.update', e);
        }
        return;
      }
      if (attempts < 20) {
        setTimeout(trySend, 100);
      }
    };
    trySend();
  }, [buildFallbackInstructions, params?.sourceLangCode, params?.targetLangCode]);

  const connect = useCallback(async () => {
    if (isConnecting || connectingRef.current) return;
    connectingRef.current = true;
    setIsConnecting(true);
    setError(null);

    // 为本次连接生成本地序列号，用于取消检查
    const mySeq = ++connectSeqRef.current;

    try {
      // Allow TURN credentials optionally
      const turnUrl = process.env.EXPO_PUBLIC_TURN_URL;
      const turnUsername = process.env.EXPO_PUBLIC_TURN_USERNAME;
      const turnPassword = process.env.EXPO_PUBLIC_TURN_PASSWORD;
      const iceServers: Array<{ urls: string; username?: string; credential?: string }> = [
        { urls: 'stun:stun.l.google.com:19302' },
      ];
      if (turnUrl && /^turns?:/i.test(turnUrl)) {
        iceServers.push({ urls: turnUrl, username: turnUsername, credential: turnPassword });
      }

      let pc: any;
      if (isWeb) {
        pc = new (window as any).RTCPeerConnection({ iceServers });
      } else {
        const webrtc = await import('react-native-webrtc');
        pc = new (webrtc as any).RTCPeerConnection({ iceServers } as any);
      }
      pcRef.current = pc as any;

      if (mySeq !== connectSeqRef.current) {
        // 已被新的连接/清理操作中止
        try { pc.close(); } catch {}
        connectingRef.current = false;
        setIsConnecting(false);
        return;
      }

      if (isWeb) {
        if (typeof Audio !== 'undefined') {
          const audioEl: any = new Audio();
          audioEl.autoplay = true;
          remoteAudioRef.current = audioEl;
        }
        pc.ontrack = (ev: any) => {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = ev.streams[0];
            remoteAudioRef.current.play?.();
          }
        };
      } else {
        try {
          const { default: InCallManager } = await import('react-native-incall-manager');
          if (mySeq !== connectSeqRef.current) { try { pc.close(); } catch {}; connectingRef.current = false; setIsConnecting(false); return; }
          incallRef.current = InCallManager as any;
          InCallManager.start({ media: 'audio' });
          InCallManager.setForceSpeakerphoneOn(true);
        } catch (e) {
          console.warn('InCallManager failed to initialize', e);
        }
      }

      const localChannel = pc.createDataChannel('oai-events');
      dataChannelRef.current = localChannel as any;
      
      localChannel.onopen = () => {
        console.log('--- [Data Channel] --- State: open');
        // 连接打开后立即发送会话更新
        const session: SessionConfig = {} as any; // 确保存在 session 引用
        sendSessionUpdate(session);
      };
      localChannel.onclose = () => console.log('--- [Data Channel] --- State: close');
      localChannel.onerror = (ev: any) => console.error('--- [Data Channel] --- Error:', ev);
      localChannel.onmessage = (event: any) => {
        console.log('--- [Data Channel] --- Message received:', event.data);
        try {
          setLastEvent(JSON.parse(event.data));
        } catch {
          setLastEvent(event.data);
        }
      };
      
      let mic: any;
      try {
        if (isWeb) {
          mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          const webrtc = await import('react-native-webrtc');
          mic = await (webrtc as any).mediaDevices.getUserMedia({ audio: true });
        }
        if (mySeq !== connectSeqRef.current) {
          // 在获取麦克风期间被取消
          try { mic?.getTracks?.().forEach((t: any) => t.stop()); } catch {}
          try { pc.close(); } catch {}
          connectingRef.current = false;
          setIsConnecting(false);
          return;
        }
        micStreamRef.current = mic;
      } catch (e: unknown) {
        const err = e as Error & { code?: string };
        let msg = '无法访问麦克风，请检查权限设置或设备是否可用';
        if ((err as any).name === 'NotAllowedError' || (err as any).name === 'PermissionDeniedError') {
          msg = isWeb ? '麦克风权限被拒绝，请在浏览器地址栏右侧开启麦克风权限后重试' : '麦克风权限被拒绝，请在系统设置中为 kotoTHAI 开启麦克风权限后重试';
        } else if ((err as any).name === 'NotFoundError' || (err as any).name === 'DevicesNotFoundError') {
          msg = '未检测到可用的音频输入设备，请连接麦克风后重试';
        }
        setError(msg);
        const alertButtons: AlertButton[] = [{ text: '稍后' }];
        if (Linking.openSettings) {
          alertButtons.push({ text: '前往设置', onPress: () => Linking.openSettings?.() });
        }
        Alert.alert('麦克风不可用', msg, alertButtons);
        return;
      }

      // 守卫：仅当连接仍有效且 PC 未关闭时才添加音轨
      if (mySeq === connectSeqRef.current && pcRef.current === pc && pc.signalingState !== 'closed') {
        try {
          mic.getTracks().forEach((track: any) => pc.addTrack(track, mic));
        } catch (err) {
          console.warn('Skip addTrack: peer connection not ready or already closed', err);
        }
      } else {
        console.warn('Skip addTrack due to cancelled/closed connection');
      }

      const offer = await pc.createOffer();
      if (mySeq !== connectSeqRef.current || pc.signalingState === 'closed') { try { pc.close(); } catch {}; connectingRef.current = false; setIsConnecting(false); return; }
      await pc.setLocalDescription(offer);

      const ephResp = await fetch(`${AGENT_SERVER_URL}/api/ephemeral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceLanguage: params?.sourceLangCode,
          targetLanguage: params?.targetLangCode,
        }),
      });
      if (!ephResp.ok) throw new Error('获取临时密钥失败');
      const ephData = await ephResp.json();
      const { apiKey, session } = ephData as { apiKey: string; session: Partial<SessionConfig> };

      if (mySeq !== connectSeqRef.current || pc.signalingState === 'closed') { try { pc.close(); } catch {}; connectingRef.current = false; setIsConnecting(false); return; }
      const sdpResp = await fetch(`${AGENT_SERVER_URL}/api/realtime/sdp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer: offer.sdp,
          token: apiKey,
          model: session?.model || 'gpt-realtime-2025-08-28',
        }),
      });
      if (!sdpResp.ok) throw new Error('SDP 交换失败');
      const answerSdp = await sdpResp.text();

      if (!pcRef.current || pcRef.current !== pc || pc.signalingState === 'closed' || mySeq !== connectSeqRef.current) return;
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      sendSessionUpdate(session);
      setIsConnected(true);

    } catch (e: unknown) {
      const caughtError = e as Error;
      console.error('Realtime connection failed', caughtError);
      let msg = (caughtError as any)?.message || 'Realtime 连接失败';
      if (/临时密钥|ephemeral/i.test(msg)) {
        msg = '服务暂时不可用或密钥颁发失败，请稍后重试';
      } else if (/SDP|realtime|fetch|network/i.test(msg)) {
        msg = '网络异常或服务不可用，请检查网络后重试';
      } else if (/getUserMedia|麦克风|microphone|permission/i.test(msg)) {
        msg = '麦克风访问失败，请检查权限设置';
      } else if (/datachannel|peerconnection|webrtc/i.test(msg)) {
        msg = 'WebRTC连接失败，请检查网络或浏览器设置';
      }
      setError(msg);
      console.warn('连接失败详情:', msg, caughtError);
      Alert.alert('连接失败', msg);
      cleanup();
    } finally {
      setIsConnecting(false);
      connectingRef.current = false;
    }
  }, [isConnecting, isWeb, AGENT_SERVER_URL, cleanup, sendSessionUpdate, params?.sourceLangCode, params?.targetLangCode, setError]);

  const disconnect = useCallback(() => {
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && (isConnected || isConnecting)) {
        Alert.alert('已暂停实时连接', '由于来电或应用切换，实时会话已暂停');
        setError('由于来电/切换应用/系统打断，实时连接已暂停');
        disconnect();
      }
    });
    return () => sub.remove();
  }, [isConnected, isConnecting, disconnect]);

  const reconnect = useCallback(async () => {
    if (isConnecting || connectingRef.current) return;
    cleanup();
    await new Promise((r) => setTimeout(r, 500));
    return connect();
  }, [cleanup, connect, isConnecting]);

  return {
    isSupported,
    isConnecting,
    isConnected,
    error,
    lastEvent,
    connect,
    disconnect,
    reconnect,
  } as const;
}