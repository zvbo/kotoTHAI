import { EventEmitter } from 'events';
import { Transform, TransformCallback } from 'stream';

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
  format: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 24000,
  channels: 1,
  bitDepth: 16,
  format: 'pcm16',
};

export class AudioProcessor extends EventEmitter {
  private config: AudioConfig;
  private inputBuffer: Buffer = Buffer.alloc(0);
  private outputBuffer: Buffer = Buffer.alloc(0);

  constructor(config: AudioConfig = DEFAULT_AUDIO_CONFIG) {
    super();
    this.config = config;
  }

  processWebRTCAudio(audioData: Buffer): Buffer {
    try {
      const processedAudio = this.convertToRealtimeFormat(audioData);
      console.log(`🎵 处理WebRTC音频: ${audioData.length} bytes -> ${processedAudio.length} bytes`);
      return processedAudio;
    } catch (error) {
      console.error('❌ 处理WebRTC音频失败:', error);
      return Buffer.alloc(0);
    }
  }

  processOpenAIAudio(audioData: Buffer): Buffer {
    try {
      const processedAudio = this.convertToWebRTCFormat(audioData);
      console.log(`🤖 处理OpenAI音频: ${audioData.length} bytes -> ${processedAudio.length} bytes`);
      return processedAudio;
    } catch (error) {
      console.error('❌ 处理OpenAI音频失败:', error);
      return Buffer.alloc(0);
    }
  }

  private convertToRealtimeFormat(audioData: Buffer): Buffer {
    if (this.config.format === 'pcm16') {
      return audioData;
    }
    return this.convertToPCM16(audioData);
  }

  private convertToWebRTCFormat(audioData: Buffer): Buffer {
    return audioData;
  }

  private convertToPCM16(audioData: Buffer): Buffer {
    switch (this.config.format) {
      case 'g711_ulaw':
        return this.ulawToPCM16(audioData);
      case 'g711_alaw':
        return this.alawToPCM16(audioData);
      default:
        return audioData;
    }
  }

  private ulawToPCM16(ulawData: Buffer): Buffer {
    const pcmData = Buffer.alloc(ulawData.length * 2);
    for (let i = 0; i < ulawData.length; i++) {
      const ulaw = ulawData[i];
      const pcm = this.ulawToPCM(ulaw);
      pcmData.writeInt16LE(pcm, i * 2);
    }
    return pcmData;
  }

  private alawToPCM16(alawData: Buffer): Buffer {
    const pcmData = Buffer.alloc(alawData.length * 2);
    for (let i = 0; i < alawData.length; i++) {
      const alaw = alawData[i];
      const pcm = this.alawToPCM(alaw);
      pcmData.writeInt16LE(pcm, i * 2);
    }
    return pcmData;
  }

  private ulawToPCM(ulaw: number): number {
    const BIAS = 0x84;
    // eslint-disable-next-line no-bitwise
    ulaw = ~ulaw;
    // eslint-disable-next-line no-bitwise
    const sign = (ulaw & 0x80);
    // eslint-disable-next-line no-bitwise
    const exponent = (ulaw >> 4) & 0x07;
    // eslint-disable-next-line no-bitwise
    const mantissa = ulaw & 0x0F;
    // eslint-disable-next-line no-bitwise
    let sample = mantissa << (exponent + 3);
    sample += BIAS;
    // eslint-disable-next-line no-bitwise
    if (exponent !== 0) sample += (1 << (exponent + 2));
    return sign ? -sample : sample;
  }

  private alawToPCM(alaw: number): number {
    // eslint-disable-next-line no-bitwise
    const sign = (alaw & 0x80);
    // eslint-disable-next-line no-bitwise
    const exponent = (alaw >> 4) & 0x07;
    // eslint-disable-next-line no-bitwise
    let mantissa = alaw & 0x0F;
    if (exponent === 0) {
      // eslint-disable-next-line no-bitwise
      mantissa = mantissa << 4;
    } else {
      // eslint-disable-next-line no-bitwise
      mantissa = (mantissa << 4) | 0x08;
      // eslint-disable-next-line no-bitwise
      mantissa = mantissa << (exponent - 1);
    }
    return sign ? -mantissa : mantissa;
  }

  createAudioTransform(): Transform {
    return new Transform({
      transform: (chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback) => {
        try {
          const processedChunk = this.processWebRTCAudio(chunk);
          callback(null, processedChunk);
        } catch (error) {
          const err: Error = error instanceof Error ? error : new Error(String(error));
          callback(err);
        }
      }
    });
  }

  getConfig(): AudioConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<AudioConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 音频配置已更新:', this.config);
  }

  calculateDuration(audioData: Buffer): number {
    const bytesPerSample = this.config.bitDepth / 8;
    const totalSamples = audioData.length / (bytesPerSample * this.config.channels);
    return (totalSamples / this.config.sampleRate) * 1000;
  }

  validateAudioData(audioData: Buffer): boolean {
    if (!audioData || audioData.length === 0) {
      return false;
    }
    const bytesPerSample = this.config.bitDepth / 8;
    const expectedAlignment = bytesPerSample * this.config.channels;
    return audioData.length % expectedAlignment === 0;
  }
}

export default AudioProcessor;