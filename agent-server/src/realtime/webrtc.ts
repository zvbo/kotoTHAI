import { EventEmitter } from 'events';
import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

/**
 * WebRTC连接管理器
 * 处理客户端与服务器之间的WebRTC信令
 */
export class WebRTCManager extends EventEmitter {
  private io: Server;
  private connections: Map<string, any> = new Map();

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
    this.io.on('connection', (socket) => {
      console.log(`🔗 WebRTC客户端连接: ${socket.id}`);
      
      // 处理WebRTC信令
      socket.on('webrtc-offer', (data) => {
        console.log('📤 收到WebRTC Offer');
        this.handleOffer(socket, data);
      });
      
      socket.on('webrtc-answer', (data) => {
        console.log('📥 收到WebRTC Answer');
        this.handleAnswer(socket, data);
      });
      
      socket.on('webrtc-ice-candidate', (data) => {
        console.log('🧊 收到ICE候选');
        this.handleIceCandidate(socket, data);
      });
      
      socket.on('disconnect', () => {
        console.log(`🔌 WebRTC客户端断开: ${socket.id}`);
        this.connections.delete(socket.id);
      });
    });
  }

  private handleOffer(socket: any, data: any) {
    // 存储连接信息
    this.connections.set(socket.id, {
      socket,
      offer: data.offer,
      language: data.language, // 记录用户选择的语言（ja/en/th/ko）
      timestamp: Date.now()
    });
    
    // 触发offer事件，让Agent Bridge处理
    this.emit('webrtc-offer', {
      socketId: socket.id,
      offer: data.offer,
      language: data.language // 透传语言给 AgentBridge
    });
  }

  private handleAnswer(socket: any, data: any) {
    const connection = this.connections.get(socket.id);
    if (connection) {
      connection.answer = data.answer;
      this.emit('webrtc-answer', {
        socketId: socket.id,
        answer: data.answer
      });
    }
  }

  private handleIceCandidate(socket: any, data: any) {
    this.emit('webrtc-ice-candidate', {
      socketId: socket.id,
      candidate: data.candidate
    });
  }

  /**
   * 向客户端发送WebRTC信令
   */
  sendToClient(socketId: string, event: string, data: any) {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.socket.emit(event, data);
    }
  }

  /**
   * 获取活跃连接数
   */
  getActiveConnections(): number {
    return this.connections.size;
  }

  /**
   * 获取连接信息
   */
  getConnection(socketId: string) {
    return this.connections.get(socketId);
  }
}

export default WebRTCManager;