import { EventEmitter } from 'events';
import { Transform, TransformCallback } from 'stream';

/**
 * 音频格式配置
 */
export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
  format: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
}

/**
 * 默认音频配置
 */
export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 24000, // OpenAI Realtime API推荐的采样率
  channels: 1,       // 单声道
  bitDepth: 16,      // 16位深度
  format: 'pcm16'    // PCM 16位格式
};

/**
 * 音频处理器
 * 负责音频流的编码、解码和格式转换
 */
export class AudioProcessor extends EventEmitter {
  private config: AudioConfig;
  private inputBuffer: Buffer = Buffer.alloc(0);
  private outputBuffer: Buffer = Buffer.alloc(0);

  constructor(config: AudioConfig = DEFAULT_AUDIO_CONFIG) {
    super();
    this.config = config;
  }

  /**
   * 处理来自WebRTC的音频数据
   */
  processWebRTCAudio(audioData: Buffer): Buffer {
    try {
      // 将WebRTC音频数据转换为OpenAI Realtime API格式
      const processedAudio = this.convertToRealtimeFormat(audioData);
      
      console.log(`🎵 处理WebRTC音频: ${audioData.length} bytes -> ${processedAudio.length} bytes`);
      
      return processedAudio;
    } catch (error) {
      console.error('❌ 处理WebRTC音频失败:', error);
      return Buffer.alloc(0);
    }
  }

  /**
   * 处理来自OpenAI的音频数据
   */
  processOpenAIAudio(audioData: Buffer): Buffer {
    try {
      // 将OpenAI音频数据转换为WebRTC格式
      const processedAudio = this.convertToWebRTCFormat(audioData);
      
      console.log(`🤖 处理OpenAI音频: ${audioData.length} bytes -> ${processedAudio.length} bytes`);
      
      return processedAudio;
    } catch (error) {
      console.error('❌ 处理OpenAI音频失败:', error);
      return Buffer.alloc(0);
    }
  }

  /**
   * 转换为OpenAI Realtime API格式
   */
  private convertToRealtimeFormat(audioData: Buffer): Buffer {
    // 确保音频数据符合OpenAI Realtime API的要求
    // - 采样率: 24kHz
    // - 格式: PCM16
    // - 声道: 单声道
    
    if (this.config.format === 'pcm16') {
      // 如果已经是PCM16格式，直接返回
      return audioData;
    }
    
    // 其他格式转换逻辑
    return this.convertToPCM16(audioData);
  }

  /**
   * 转换为WebRTC格式
   */
  private convertToWebRTCFormat(audioData: Buffer): Buffer {
    // 将OpenAI的音频数据转换为WebRTC可以处理的格式
    // 通常WebRTC支持多种格式，这里保持PCM16
    
    return audioData;
  }

  /**
   * 转换为PCM16格式
   */
  private convertToPCM16(audioData: Buffer): Buffer {
    // 简化实现，实际应该根据源格式进行转换
    switch (this.config.format) {
      case 'g711_ulaw':
        return this.ulawToPCM16(audioData);
      case 'g711_alaw':
        return this.alawToPCM16(audioData);
      default:
        return audioData;
    }
  }

  /**
   * μ-law转PCM16
   */
  private ulawToPCM16(ulawData: Buffer): Buffer {
    const pcmData = Buffer.alloc(ulawData.length * 2);
    
    for (let i = 0; i < ulawData.length; i++) {
      const ulaw = ulawData[i];
      const pcm = this.ulawToPCM(ulaw);
      pcmData.writeInt16LE(pcm, i * 2);
    }
    
    return pcmData;
  }

  /**
   * A-law转PCM16
   */
  private alawToPCM16(alawData: Buffer): Buffer {
    const pcmData = Buffer.alloc(alawData.length * 2);
    
    for (let i = 0; i < alawData.length; i++) {
      const alaw = alawData[i];
      const pcm = this.alawToPCM(alaw);
      pcmData.writeInt16LE(pcm, i * 2);
    }
    
    return pcmData;
  }

  /**
   * μ-law解码
   */
  private ulawToPCM(ulaw: number): number {
    const BIAS = 0x84;
    const CLIP = 32635;
    
    ulaw = ~ulaw;
    const sign = (ulaw & 0x80);
    const exponent = (ulaw >> 4) & 0x07;
    const mantissa = ulaw & 0x0F;
    
    let sample = mantissa << (exponent + 3);
    sample += BIAS;
    if (exponent !== 0) sample += (1 << (exponent + 2));
    
    return sign ? -sample : sample;
  }

  /**
   * A-law解码
   */
  private alawToPCM(alaw: number): number {
    const sign = (alaw & 0x80);
    let exponent = (alaw >> 4) & 0x07;
    let mantissa = alaw & 0x0F;
    
    if (exponent === 0) {
      mantissa = mantissa << 4;
    } else {
      mantissa = (mantissa << 4) | 0x08;
      mantissa = mantissa << (exponent - 1);
    }
    
    return sign ? -mantissa : mantissa;
  }

  /**
   * 创建音频流转换器
   */
  createAudioTransform(): Transform {
    const self = this;
    return new Transform({
      transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback) {
        try {
          const processedChunk = self.processWebRTCAudio(chunk);
          callback(null, processedChunk);
        } catch (error) {
          const err: Error = error instanceof Error ? error : new Error(String(error));
          callback(err);
         }
      }
    });
  }

  /**
   * 获取音频配置
   */
  getConfig(): AudioConfig {
    return { ...this.config };
  }

  /**
   * 更新音频配置
   */
  updateConfig(newConfig: Partial<AudioConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 音频配置已更新:', this.config);
  }

  /**
   * 计算音频时长（毫秒）
   */
  calculateDuration(audioData: Buffer): number {
    const bytesPerSample = this.config.bitDepth / 8;
    const totalSamples = audioData.length / (bytesPerSample * this.config.channels);
    return (totalSamples / this.config.sampleRate) * 1000;
  }

  /**
   * 验证音频数据格式
   */
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