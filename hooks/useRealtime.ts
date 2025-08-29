import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Alert, AppState, Linking } from 'react-native';

/**
 * useRealtime
 * 最小可用版本（Web 优先）：
 * - 通过后端 /api/ephemeral 获取临时会话密钥
 * - 使用浏览器 WebRTC 将本地麦克风音频发送至 OpenAI Realtime，获取远端音频与事件
 * - 仅在 Web 环境生效；原生端（iOS/Android）后续接入 react-native-webrtc
 */
export default function useRealtime(params?: { sourceLangCode?: string; targetLangCode?: string }) {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<any>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  // 原生端：InCallManager 实例（动态引入）
  const incallRef = useRef<any>(null);
  // 新增：连接互斥，避免同一时刻多次 connect/reconnect 并发触发
  const connectingRef = useRef(false);

  const isWeb = Platform.OS === 'web';

  // 服务器地址（默认本机 8788，可用 EXPO_PUBLIC_AGENT_SERVER_URL 覆盖）
  const AGENT_SERVER_URL =
  (process.env.EXPO_PUBLIC_AGENT_SERVER_URL as string) ||
  (typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:8788`
  : 'http://localhost:8788');

  useEffect(() => {
    if (Platform.OS === 'web') {
      // 仅 Web 环境内置 WebRTC 标准 API
      const supported = typeof window !== 'undefined' && !!(navigator.mediaDevices && (window as any).RTCPeerConnection);
      setIsSupported(supported);
    } else {
      // 原生端由 react-native-webrtc 提供能力
      setIsSupported(true);
    }
  }, []);

  const cleanup = useCallback(() => {
    // 在关闭前，尽量通知服务端结束当前 response / session，避免继续计费
    try {
      if (dataChannelRef.current && (dataChannelRef.current as any).readyState === 'open') {
        dataChannelRef.current.send(JSON.stringify({ type: 'response.cancel' }));
        dataChannelRef.current.send(JSON.stringify({ type: 'session.close' }));
        // 移除消息监听，避免关闭过程中的残余回调
        try { (dataChannelRef.current as any).onmessage = null; } catch {}
      }
    } catch {}
    try {
      dataChannelRef.current?.close?.();
    } catch {}
    dataChannelRef.current = null;

    try {
      pcRef.current?.getSenders?.().forEach((s) => s.track && s.track.stop());
      pcRef.current?.close?.();
    } catch {}
    pcRef.current = null;

    try {
      micStreamRef.current?.getTracks?.().forEach((t) => t.stop());
    } catch {}
    micStreamRef.current = null;

    try {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null as any;
        remoteAudioRef.current.pause();
      }
    } catch {}

    // 关闭原生通话音频路由（若已启动）
    try {
      incallRef.current?.setForceSpeakerphoneOn?.(false);
      incallRef.current?.stop?.();
    } catch {}
    incallRef.current = null;

    setIsConnected(false);
    setIsConnecting(false);
    connectingRef.current = false; // 防止异常中断时互斥锁未释放
    setLastEvent(null);
  }, []);

  // 构建兜底的实时口译指令（仅在后端未提供 instructions 时使用）
  const buildFallbackInstructions = useCallback((src?: string, tgt?: string) => {
    const source = src || 'auto';
    const target = tgt || 'th';
    return (
      `You are a simultaneous interpreter. Your ONLY job is to translate the speaker's speech from ${source} to ${target} in real time. ` +
      `Do not chat, do not add explanations, do not ask questions. Keep sentences natural, concise, and conversational. ` +
      `If input is already in ${target}, repeat it briefly with improved clarity in ${target}.`
    );
  }, []);

  // 在数据通道上发送包含 instructions/voice/turn_detection 的 session.update（等待通道就绪，最多重试）
  const sendSessionUpdate = useCallback((sessionFromServer?: any) => {
    const session: any = {
      input_audio_transcription: { model: 'gpt-4o-transcribe' },
      temperature: 0.2,
      top_p: 0.3,
      presence_penalty: 0,
      frequency_penalty: 0,
    };
    if (sessionFromServer && typeof sessionFromServer === 'object') {
      Object.assign(session, sessionFromServer);
    }
    if (!session.instructions) {
      session.instructions = buildFallbackInstructions(params?.sourceLangCode, params?.targetLangCode);
    }
    if (!session.voice) session.voice = 'alloy';
    if (!session.turn_detection) {
      session.turn_detection = { type: 'server_vad', threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 1700 };
    }

    let attempts = 0;
    const trySend = () => {
      attempts += 1;
      const ch = dataChannelRef.current as any;
      if (ch && ch.readyState === 'open') {
        try {
          ch.send(JSON.stringify({ type: 'session.update', session }));
        } catch (e) {
          console.warn('发送 session.update 失败', e);
        }
        return;
      }
      if (attempts < 20) {
        setTimeout(trySend, 100);
      }
    };
    trySend();
  }, [buildFallbackInstructions, params?.sourceLangCode, params?.targetLangCode]);

  const connectWeb = useCallback(async () => {
    setError(null);
    if (!isSupported) {
      setError('当前平台暂不支持 WebRTC（请在浏览器中使用，或稍后在原生端接入 react-native-webrtc）');
      return;
    }
    // 互斥保护
    if (connectingRef.current) return;
    connectingRef.current = true;
    setIsConnecting(true);

    try {
      // 1) 获取本地麦克风
      let mic: MediaStream;
      try {
        mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e: any) {
        const name = e?.name || e?.code || '';
        let msg = '无法访问麦克风，请检查权限设置或设备是否可用';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          msg = '麦克风权限被拒绝，请在系统设置中为 kotoTHAI 开启麦克风权限后重试';
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          msg = '未检测到可用的音频输入设备，请连接麦克风后重试';
        }
        setError(msg);
        try {
          Alert.alert('麦克风不可用', msg, [
            { text: '稍后' },
            Linking.openSettings ? { text: '前往设置', onPress: () => Linking.openSettings?.() } as any : undefined,
          ].filter(Boolean) as any);
        } catch {}
        setIsConnecting(false);
        connectingRef.current = false;
        return;
      }
      micStreamRef.current = mic;

      // 2) 创建 RTCPeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      // 3) 远端音频播放（仅 Web）
      if (typeof Audio !== 'undefined') {
        const audioEl = new Audio();
        audioEl.autoplay = true;
        remoteAudioRef.current = audioEl as HTMLAudioElement;
      }

      pc.ontrack = (ev) => {
        if (remoteAudioRef.current) {
          try {
            (remoteAudioRef.current as any).srcObject = ev.streams[0];
            remoteAudioRef.current.play().catch(() => {});
          } catch {}
        }
      };

      // 4) 创建本地数据通道
      const localChannel = pc.createDataChannel('oai-events');
      dataChannelRef.current = localChannel;
      localChannel.onopen = () => {
        try {
          // 连接建立时先下发基础配置；详细 instructions 稍后以服务器返回为准再覆盖
          localChannel.send(
            JSON.stringify({
              type: 'session.update',
              session: {
                input_audio_transcription: { model: 'gpt-4o-transcribe' },
                temperature: 0.2,
                presence_penalty: 0,
                frequency_penalty: 0,
              },
            })
          );
        } catch (e) {
          console.warn('发送初始化事件失败', e);
        }
      };
      localChannel.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          setLastEvent(data);
        } catch {
          setLastEvent(msg.data);
        }
      };

      // 5) 接收来自 OpenAI 的远端数据通道
      pc.ondatachannel = (ev) => {
        const channel = ev.channel;
        if (!dataChannelRef.current) dataChannelRef.current = channel;
        channel.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data);
            setLastEvent(data);
          } catch {
            setLastEvent(msg.data);
          }
        };
      };

      // 6) 添加本地音频（仅使用 addTrack，避免与 addTransceiver 重复导致双路音频）
      mic.getTracks().forEach((t) => pc.addTrack(t, mic));
      // 移除：pc.addTransceiver('audio', { direction: 'sendrecv' });

      // 7) 创建本地 SDP
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 8) 获取临时密钥
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
      const apiKey: string = ephData.apiKey;
      const model: string = (ephData.session && ephData.session.model) || 'gpt-4o-mini-realtime-preview-2024-12-17';

      // 9) SDP 交换
      const sdpResp = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/sdp',
          'OpenAI-Beta': 'realtime=v1',
        },
        body: offer.sdp || '',
      });
      if (!sdpResp.ok) throw new Error('建立实时连接失败（SDP 交换失败）');
      const answerSdp = await sdpResp.text();
      // 防御：如果在等待服务端应答期间被外部 cleanup() 关闭，则不再调用 setRemoteDescription
      if (!pcRef.current || (pcRef.current as any).signalingState === 'closed') {
        console.warn('连接在 SDP 协商期间被中断，跳过 setRemoteDescription');
        return; // 静默返回，不抛出错误
      }
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      // 10) 会话建立后，基于后端返回或本地兜底下发语言指令
      sendSessionUpdate(ephData.session);

      setIsConnected(true);
    } catch (err: any) {
      console.error('Realtime 连接失败', err);
      let msg = err?.message || 'Realtime 连接失败';
      if (/临时密钥|ephemeral/i.test(msg)) {
        msg = '服务暂时不可用或密钥颁发失败，请稍后重试';
      } else if (/SDP|realtime|fetch|network/i.test(msg)) {
        msg = '网络异常或服务不可用，请检查网络后重试';
      }
      setError(msg);
      try { Alert.alert('连接失败', msg); } catch {}
      cleanup();
    } finally {
      setIsConnecting(false);
      connectingRef.current = false;
    }
  }, [AGENT_SERVER_URL, cleanup, isSupported, params?.sourceLangCode, params?.targetLangCode, sendSessionUpdate]);

  const connectNative = useCallback(async () => {
    setError(null);
    // 互斥保护
    if (connectingRef.current) return;
    connectingRef.current = true;
    setIsConnecting(true);
    try {
      // 动态引入以避免 Web 侧打包报错
      const webrtc = await import('react-native-webrtc');
      // @ts-ignore - 运行时存在
      const RNRTCPeerConnection = (webrtc as any).RTCPeerConnection as any;
      // @ts-ignore - 运行时存在
      const mediaDevices = (webrtc as any).mediaDevices as any;

      // 关键校验：如果原生模块未正确安装/未包含在 Dev Client，将无法创建 PeerConnection
      if (!RNRTCPeerConnection || !mediaDevices || typeof mediaDevices.getUserMedia !== 'function') {
        throw new Error('未找到原生 WebRTC 能力：请使用自定义 Dev Client 运行，或重新构建包含 react-native-webrtc 的客户端');
      }

      console.log('✅ WebRTC 原生模块检测成功');

      // 启用外放：使用 InCallManager 强制扬声器输出，让系统音量可控
      try {
        const { default: InCallManager } = await import('react-native-incall-manager');
        incallRef.current = InCallManager;
        InCallManager.start({ media: 'audio' });
        InCallManager.setForceSpeakerphoneOn(true);
      } catch (e) {
        console.warn('InCallManager 初始化失败（可忽略，仅影响外放）', e);
      }

      // 1) 获取本地麦克风
      let mic: any;
      try {
        mic = await mediaDevices.getUserMedia({ audio: true });
      } catch (e: any) {
        const name = e?.name || e?.code || '';
        let msg = '无法访问麦克风，请检查权限设置或设备是否可用';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          msg = '麦克风权限被拒绝，请在系统设置中为 kotoTHAI 开启麦克风权限后重试';
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          msg = '未检测到可用的音频输入设备，请连接麦克风后重试';
        }
        setError(msg);
        try {
          Alert.alert('麦克风不可用', msg, [
            { text: '稍后' },
            Linking.openSettings ? { text: '前往设置', onPress: () => Linking.openSettings?.() } as any : undefined,
          ].filter(Boolean) as any);
        } catch {}
        setIsConnecting(false);
        connectingRef.current = false;
        return;
      }
      micStreamRef.current = mic;

      // 2) 创建 RTCPeerConnection（原生）
      const pc = new RNRTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc as unknown as RTCPeerConnection;

      // 3) 数据通道
      const localChannel = pc.createDataChannel('oai-events');
      dataChannelRef.current = localChannel;
      localChannel.onopen = () => {
        try {
          // 仅更新会话配置；不主动触发 response.create
          localChannel.send(
            JSON.stringify({
              type: 'session.update',
              session: {
                input_audio_transcription: { model: 'gpt-4o-transcribe' },
                temperature: 0.2,
                presence_penalty: 0,
                frequency_penalty: 0,
              },
            })
          );
        } catch (e) {
          console.warn('发送初始化事件失败', e);
        }
      };
      localChannel.onmessage = (msg: any) => {
        try {
          const data = JSON.parse(msg.data);
          setLastEvent(data);
        } catch {
          setLastEvent(msg.data);
        }
      };

      // 4) 远端数据通道（回退）
      pc.ondatachannel = (ev: any) => {
        const channel = ev.channel;
        if (!dataChannelRef.current) dataChannelRef.current = channel;
        channel.onmessage = (msg: any) => {
          try {
            const data = JSON.parse(msg.data);
            setLastEvent(data);
          } catch {
            setLastEvent(msg.data);
          }
        };
      };

      // 5) 附加本地音频（仅使用 addTrack，避免与 addTransceiver 重复）
      mic.getTracks().forEach((t: any) => pc.addTrack(t, mic));
      // 移除：pc.addTransceiver && pc.addTransceiver('audio', { direction: 'sendrecv' });

      // 6) 创建本地 SDP
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 7) 获取临时密钥（与 Web 相同）
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
      const apiKey: string = ephData.apiKey;
      const model: string = (ephData.session && ephData.session.model) || 'gpt-4o-mini-realtime-preview-2024-12-17';

      // 8) SDP 交换（与 Web 相同）
      const sdpResp = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/sdp',
          'OpenAI-Beta': 'realtime=v1',
        },
        body: offer.sdp || '',
      });
      if (!sdpResp.ok) throw new Error('建立实时连接失败（SDP 交换失败）');
      const answerSdp = await sdpResp.text();
      
      // 防御：如果在等待服务端应答期间被外部 cleanup() 关闭，则不再调用 setRemoteDescription
      if (!pcRef.current || (pcRef.current as any).signalingState === 'closed') {
        console.warn('连接在 SDP 协商期间被中断（Native），跳过 setRemoteDescription');
        return; // 静默返回，不抛出错误
      }
      await (pc as any).setRemoteDescription({ type: 'answer', sdp: answerSdp });

      // 9) 下发语言与语音配置（优先后端 session，兜底本地构建）
      sendSessionUpdate(ephData.session);

      setIsConnected(true);
    } catch (err: any) {
      console.error('Realtime 连接失败（Native）', err);
      let msg = err?.message || 'Realtime 连接失败（Native）';
      if (/临时密钥|ephemeral/i.test(msg)) {
        msg = '服务暂时不可用或密钥颁发失败，请稍后重试';
      } else if (/SDP|realtime|fetch|network/i.test(msg)) {
        msg = '网络异常或服务不可用，请检查网络后重试';
      }
      setError(msg);
      try { Alert.alert('连接失败', msg); } catch {}
      cleanup();
    } finally {
      setIsConnecting(false);
      connectingRef.current = false;
    }
  }, [AGENT_SERVER_URL, cleanup, params?.sourceLangCode, params?.targetLangCode, sendSessionUpdate]);

  const connect = useCallback(async () => {
    // 并发保护：若正在连接中，直接忽略新的连接请求
    if (isConnecting || connectingRef.current) return;
    // 若存在残余连接/通道，先做一次安全清理，避免并发导致的“双声”
    if (pcRef.current || dataChannelRef.current) {
      cleanup();
      await new Promise((r) => setTimeout(r, 200));
    }
    if (isWeb) {
      return connectWeb();
    }
    return connectNative();
  }, [isWeb, connectWeb, connectNative, cleanup, isConnecting]);

  const disconnect = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // 在 iOS/Android 上，应用进入后台、被来电或系统打断时，主动暂停实时连接
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && (isConnected || isConnecting)) {
        try { Alert.alert('已暂停实时连接', '由于来电或应用切换，实时会话已暂停'); } catch {}
        setError('由于来电/切换应用/系统打断，实时连接已暂停');
        disconnect();
      }
    });
    return () => sub.remove();
  }, [isConnected, isConnecting, disconnect]);

  // 新增：先断开、等待、再重连，用于语言切换等需要“重协商”的场景
  const reconnect = useCallback(async () => {
    // 并发保护：连接过程中不再触发二次重连
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