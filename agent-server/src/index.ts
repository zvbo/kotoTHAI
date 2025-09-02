import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { ephemeralApp } from './ephemeral';
import { toolApp } from './tool-executor';
import { WebRTCManager } from './realtime/webrtc';
import { AgentBridge } from './realtime/agentBridge';
import { iapApp } from './iap';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 8788;
const HOST = '0.0.0.0';

// 中间件
app.use(cors());

// 【DEBUG】添加原始请求体记录中间件
app.use('/api', (req, res, next) => {
  console.log(`[MIDDLEWARE] ${req.method} ${req.path}`);
  console.log('[MIDDLEWARE] Content-Type:', req.get('Content-Type'));
  console.log('[MIDDLEWARE] Content-Length:', req.get('Content-Length'));
  // 注意：此处不读取 req 的数据流，避免影响 express.json()
  next();
});

app.use(express.json());

// 初始化Realtime模块
const webrtcManager = new WebRTCManager(httpServer);
const agentBridge = new AgentBridge(webrtcManager);

// 路由
app.use('/api', ephemeralApp);
app.use('/api/tools', toolApp);
app.use('/api/iap', iapApp);

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

// JSON 解析错误处理中间件（捕获 express.json 的解析异常）
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && (err.type === 'entity.parse.failed' || err instanceof SyntaxError)) {
    const contentType = req.get('Content-Type');
    const raw = (req as any).rawBodyString || 'N/A';
    console.error('[JSON Parse Error]', {
      message: err.message,
      contentType,
      raw,
      path: req.path,
      method: req.method,
    });
    return res.status(400).json({ ok: false, message: 'Invalid JSON', detail: err.message });
  }
  return next(err);
});

httpServer.listen(Number(PORT), HOST, () => {
  console.log(`🚀 kotoTHAI Agent Server running on http://${HOST}:${PORT}`);
  console.log(`🔗 WebRTC signaling ready`);
  console.log(`🤖 OpenAI Realtime API bridge ready`);
});