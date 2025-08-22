import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { ephemeralApp } from './ephemeral';
import { toolApp } from './tool-executor';
import { WebRTCManager } from './realtime/webrtc';
import { AgentBridge } from './realtime/agentBridge';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 8787;

// 中间件
app.use(cors());
app.use(express.json());

// 初始化Realtime模块
const webrtcManager = new WebRTCManager(httpServer);
const agentBridge = new AgentBridge(webrtcManager);

// 路由
app.use('/api', ephemeralApp);
app.use('/api/tools', toolApp);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    realtime: {
      webrtcConnections: webrtcManager.getActiveConnections(),
      realtimeConnections: agentBridge.getActiveRealtimeConnections()
    }
  });
});

// Realtime状态端点
app.get('/api/realtime/status', (req, res) => {
  res.json({
    status: 'ready',
    webrtcConnections: webrtcManager.getActiveConnections(),
    realtimeConnections: agentBridge.getActiveRealtimeConnections(),
    timestamp: new Date().toISOString()
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 KotoBa Agent Server running on port ${PORT}`);
  console.log(`🔗 WebRTC signaling ready`);
  console.log(`🤖 OpenAI Realtime API bridge ready`);
});