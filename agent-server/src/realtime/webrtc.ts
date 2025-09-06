import { EventEmitter } from 'events';
import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

// --- Type Definitions ---

interface OfferData {
  offer: RTCSessionDescriptionInit;
  language: 'ja' | 'en' | 'th';
}

interface AnswerData {
  answer: RTCSessionDescriptionInit;
}

interface IceCandidateData {
  candidate: RTCIceCandidateInit;
}

interface Connection {
  socket: Socket;
  offer: RTCSessionDescriptionInit;
  language: 'ja' | 'en' | 'th';
  timestamp: number;
  answer?: RTCSessionDescriptionInit;
}

/**
 * WebRTC Connection Manager
 * Handles WebRTC signaling between clients and the server.
 */
export class WebRTCManager extends EventEmitter {
  private io: Server;
  private connections: Map<string, Connection> = new Map();

  constructor(httpServer: HttpServer) {
    super();
    this.io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`🔗 WebRTC client connected: ${socket.id}`);
      
      socket.on('webrtc-offer', (data: OfferData) => {
        console.log('📤 Received WebRTC Offer');
        this.handleOffer(socket, data);
      });
      
      socket.on('webrtc-answer', (data: AnswerData) => {
        console.log('📥 Received WebRTC Answer');
        this.handleAnswer(socket, data);
      });
      
      socket.on('webrtc-ice-candidate', (data: IceCandidateData) => {
        console.log('🧊 Received ICE Candidate');
        this.handleIceCandidate(socket, data);
      });
      
      socket.on('disconnect', () => {
        console.log(`🔌 WebRTC client disconnected: ${socket.id}`);
        this.connections.delete(socket.id);
      });
    });
  }

  private handleOffer(socket: Socket, data: OfferData) {
    this.connections.set(socket.id, {
      socket,
      offer: data.offer,
      language: data.language,
      timestamp: Date.now()
    });
    
    this.emit('webrtc-offer', {
      socketId: socket.id,
      offer: data.offer,
      language: data.language
    });
  }

  private handleAnswer(socket: Socket, data: AnswerData) {
    const connection = this.connections.get(socket.id);
    if (connection) {
      connection.answer = data.answer;
      this.emit('webrtc-answer', {
        socketId: socket.id,
        answer: data.answer
      });
    }
  }

  private handleIceCandidate(socket: Socket, data: IceCandidateData) {
    this.emit('webrtc-ice-candidate', {
      socketId: socket.id,
      candidate: data.candidate
    });
  }

  sendToClient(socketId: string, event: string, data: unknown) {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.socket.emit(event, data);
    }
  }

  getActiveConnections(): number {
    return this.connections.size;
  }

  getConnection(socketId: string): Connection | undefined {
    return this.connections.get(socketId);
  }
}

export default WebRTCManager;
