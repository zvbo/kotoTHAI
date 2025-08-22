import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

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

  const isWeb = Platform.OS === 'web';

  // 服务器地址（默认本机 8787，可用 EXPO_PUBLIC_AGENT_SERVER_URL 覆盖）
  const AGENT_SERVER_URL = (process.env.EXPO_PUBLIC_AGENT_SERVER_URL as string) || 'http://localhost:8787';

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
        remoteAudioRef.current.srcObject = null;
        remoteAudioRef.current.pause();
      }
    } catch {}

    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const connectWeb = useCallback(async () => {
    setError(null);
    if (!isSupported) {
      setError('当前平台暂不支持 WebRTC（请在浏览器中使用，或稍后在原生端接入 react-native-webrtc）');
      return;
    }
    setIsConnecting(true);

    try {
      // 1) 获取本地麦克风
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
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
          localChannel.send(
            JSON.stringify({
              type: 'session.update',
              session: {
                input_audio_transcription: { model: 'gpt-4o-transcribe' },
              },
            })
          );
          localChannel.send(
            JSON.stringify({
              type: 'response.create',
              response: {
                modalities: ['text', 'audio'],
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

      // 6) 添加本地音频
      mic.getTracks().forEach((t) => pc.addTrack(t, mic));
      pc.addTransceiver('audio', { direction: 'sendrecv' });

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
      const model: string = (ephData.session && ephData.session.model) || 'gpt-4o-realtime-preview';

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
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      setIsConnected(true);
    } catch (err: any) {
      console.error('Realtime 连接失败', err);
      setError(err?.message || 'Realtime 连接失败');
      cleanup();
    } finally {
      setIsConnecting(false);
    }
  }, [AGENT_SERVER_URL, cleanup, isSupported, params?.sourceLangCode, params?.targetLangCode]);

  const connectNative = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    try {
      // 动态引入以避免 Web 侧打包报错
      const webrtc = await import('react-native-webrtc');
      // @ts-ignore - 运行时存在
      const RNRTCPeerConnection = webrtc.RTCPeerConnection as any;
      // @ts-ignore - 运行时存在
      const mediaDevices = webrtc.mediaDevices as any;

      // 1) 获取本地麦克风
      const mic = await mediaDevices.getUserMedia({ audio: true });
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
          localChannel.send(
            JSON.stringify({
              type: 'session.update',
              session: {
                input_audio_transcription: { model: 'gpt-4o-transcribe' },
              },
            })
          );
          localChannel.send(
            JSON.stringify({
              type: 'response.create',
              response: {
                modalities: ['text', 'audio'],
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

      // 5) 附加本地音频
      mic.getTracks().forEach((t: any) => pc.addTrack(t, mic));
      try {
        // 某些平台支持 addTransceiver
        pc.addTransceiver && pc.addTransceiver('audio', { direction: 'sendrecv' });
      } catch {}

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
      const model: string = (ephData.session && ephData.session.model) || 'gpt-4o-realtime-preview';

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
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      setIsConnected(true);
    } catch (err: any) {
      console.error('Realtime 连接失败（Native）', err);
      setError(err?.message || 'Realtime 连接失败（Native）');
      cleanup();
    } finally {
      setIsConnecting(false);
    }
  }, [AGENT_SERVER_URL, cleanup, params?.sourceLangCode, params?.targetLangCode]);

  const connect = useCallback(async () => {
    if (isWeb) {
      return connectWeb();
    }
    return connectNative();
  }, [isWeb, connectWeb, connectNative]);

  const disconnect = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return {
    isSupported,
    isConnecting,
    isConnected,
    error,
    lastEvent,
    connect,
    disconnect,
  } as const;
}