import { EventEmitter } from 'events';
import OpenAI from 'openai';
import WebSocket from 'ws';
import { WebRTCManager } from './webrtc';

// --- Type Definitions ---

interface WebRTCOfferPayload {
  socketId: string;
  offer: RTCSessionDescriptionInit;
  language?: 'ja' | 'en' | 'th';
}

interface WebRTCAnswerPayload {
  socketId: string;
  answer: RTCSessionDescriptionInit;
}

interface WebRTCIceCandidatePayload {
  socketId: string;
  candidate: RTCIceCandidateInit;
}

interface OpenAIMessage {
  type: string;
  [key: string]: unknown;
}

// Based on user language selection, injects a system prompt for real-time interpretation.
const REALTIME_PROMPTS: Record<string, string> = {
  ja: `You are a professional real-time simultaneous interpreter between Chinese and Japanese...`,
  en: `You are a professional real-time simultaneous interpreter between Chinese and English...`,
  th: `You are a professional real-time simultaneous interpreter between Chinese and Thai...`,
};

/**
 * Agent Bridge - Bridges WebRTC connections with the OpenAI Realtime API.
 */
export class AgentBridge extends EventEmitter {
  private openai: OpenAI;
  private webrtcManager: WebRTCManager;
  private realtimeConnections: Map<string, WebSocket> = new Map();
  private sessionTokens: Map<string, string> = new Map();

  constructor(webrtcManager: WebRTCManager) {
    super();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.webrtcManager = webrtcManager;
    
    this.setupWebRTCListeners();
  }

  private setupWebRTCListeners() {
    this.webrtcManager.on('webrtc-offer', (data: WebRTCOfferPayload) => {
      this.handleWebRTCOffer(data);
    });
    
    this.webrtcManager.on('webrtc-answer', (data: WebRTCAnswerPayload) => {
      this.handleWebRTCAnswer(data);
    });
    
    this.webrtcManager.on('webrtc-ice-candidate', (data: WebRTCIceCandidatePayload) => {
      this.handleWebRTCIceCandidate(data);
    });
  }

  async createRealtimeSession(socketId: string, language: 'ja' | 'en' | 'th' = 'th'): Promise<string> {
    try {
      console.log(`🤖 Creating OpenAI Realtime session for client ${socketId} (lang=${language})`);
      const instructions = REALTIME_PROMPTS[language] ?? REALTIME_PROMPTS.th;
      
      const response = await this.openai.beta.realtime.sessions.create({
          model: 'gpt-realtime-2025-08-28' as any,
         voice: 'alloy',
         instructions,
         tools: [
          {
            type: 'function',
            function: {
              name: 'translate_text',
              description: 'Translate text between Chinese, Thai and English',
              parameters: {
                type: 'object',
                properties: {
                  text: { type: 'string', description: 'Text to translate' },
                  from: { type: 'string', enum: ['zh', 'th', 'en'], description: 'Source language' },
                  to: { type: 'string', enum: ['zh', 'th', 'en'], description: 'Target language' }
                },
                required: ['text', 'from', 'to']
              }
            }
          }
        ] as any,
      });

      this.sessionTokens.set(socketId, response.client_secret.value);
      console.log(`✅ OpenAI Realtime session created successfully`);
      return response.client_secret.value;
      
    } catch (error) {
      console.error('❌ Failed to create OpenAI Realtime session:', error);
      throw error;
    }
  }

  async connectToOpenAI(socketId: string, sessionToken: string): Promise<void> {
    try {
      const ws = new WebSocket('wss://api.openai.com/v1/realtime', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      ws.on('open', () => {
        console.log(`🔗 OpenAI Realtime WebSocket connection established: ${socketId}`);
        this.realtimeConnections.set(socketId, ws);
        this.webrtcManager.sendToClient(socketId, 'realtime-ready', {
          ok: true
        });
      });

      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          this.emit('openai-message', { socketId, message: parsed });
        } catch {
          this.emit('openai-message', { socketId, message: data.toString() });
        }
      });

      ws.on('close', () => {
        console.log(`❌ OpenAI Realtime WebSocket closed: ${socketId}`);
        this.realtimeConnections.delete(socketId);
      });

      ws.on('error', (err) => {
        console.error('OpenAI Realtime WebSocket error:', err);
      });

    } catch (error) {
      console.error('Failed to connect to OpenAI Realtime WS:', error);
    }
  }

  private async handleWebRTCOffer(data: WebRTCOfferPayload) {
    try {
      const token = await this.createRealtimeSession(data.socketId, data.language);
      await this.connectToOpenAI(data.socketId, token);
      this.webrtcManager.sendToClient(data.socketId, 'realtime-token', { token });
    } catch (error) {
      console.error('Error handling WebRTC offer:', error);
      this.webrtcManager.sendToClient(data.socketId, 'realtime-error', {
        message: 'Failed to establish realtime session'
      });
    }
  }

  private handleWebRTCAnswer(data: WebRTCAnswerPayload) {
    // No-op for now; could be used to finalize handshake with client
    console.log('Received WebRTC answer from client', data.socketId);
  }

  private handleWebRTCIceCandidate(data: WebRTCIceCandidatePayload) {
    // No-op: ICE is exchanged between peers; server may relay if needed in future
    console.log('Received ICE candidate from client', data.socketId);
  }

  sendToOpenAI(socketId: string, message: OpenAIMessage): void {
    const ws = this.realtimeConnections.get(socketId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  disconnect(socketId: string): void {
    const ws = this.realtimeConnections.get(socketId);
    if (ws) {
      try { ws.close(); } catch {}
      this.realtimeConnections.delete(socketId);
    }
  }

  getActiveRealtimeConnections(): number {
    return this.realtimeConnections.size;
  }
}

export default AgentBridge;
