import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useAudioRecorder, useAudioRecorderState, setAudioModeAsync, RecordingPresets } from 'expo-audio';

export default function useAudioRecording() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [error, setError] = useState<string | null>(null);

  // 组件卸载时，确保停止录音
  useEffect(() => {
    return () => {
      try {
        recorder.stop();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 开始录音
  const startRecording = async () => {
    try {
      setError(null);
      // 在原生平台开启录音模式
      if (Platform.OS !== 'web') {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
      return true;
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to start recording');
      return false;
    }
  };

  // 停止录音并返回文件 URI
  const stopRecording = async () => {
    try {
      recorder.stop();
      if (Platform.OS !== 'web') {
        await setAudioModeAsync({ allowsRecording: false });
      }
      return recorder.uri ?? null;
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setError('Failed to stop recording');
      return recorder.uri ?? null;
    }
  };

  // 供上传的文件描述
  const getAudioFile = () => {
    const uri = recorder.uri ?? null;
    if (!uri) return null;
    const ext = uri.split('.').pop() || 'm4a';
    return {
      uri,
      name: `recording.${ext}`,
      type: `audio/${ext}`,
    };
  };

  return {
    isRecording: recorderState.isRecording,
    audioUri: recorder.uri ?? null,
    error,
    startRecording,
    stopRecording,
    getAudioFile,
  };
}

// 在 Web 平台，跳过不必要的原生音频设置；在 iOS/Android 设置录音模式
export async function prepareRecording() {
  if (Platform.OS !== 'web') {
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });
  }
}