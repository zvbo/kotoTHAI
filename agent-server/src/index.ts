import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { ephemeralApp } from './ephemeral';
import { toolApp } from './tool-executor';
import { WebRTCManager } from './realtime/webrtc';
import { AgentBridge } from './realtime/agentBridge';
import { iapApp } from './iap';
import { summarizeApp } from './summarize';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 8788;
const HOST = '0.0.0.0';

app.use(cors());

app.use('/api', (req, _res, next) => {
  console.log(`[MIDDLEWARE] ${req.method} ${req.path}`);
  console.log('[MIDDLEWARE] Content-Type:', req.get('Content-Type'));
  next();
});

app.use(express.json());

const webrtcManager = new WebRTCManager(httpServer);
const agentBridge = new AgentBridge(webrtcManager);

app.use('/api', ephemeralApp);
app.use('/api/tools', toolApp);
app.use('/api/iap', iapApp);
app.use('/api', summarizeApp);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    realtime: {
      webrtcConnections: webrtcManager.getActiveConnections(),
      realtimeConnections: agentBridge.getActiveRealtimeConnections()
    }
  });
});

app.get('/api/realtime/status', (_req: Request, res: Response) => {
  res.json({
    status: 'ready',
    webrtcConnections: webrtcManager.getActiveConnections(),
    realtimeConnections: agentBridge.getActiveRealtimeConnections(),
    timestamp: new Date().toISOString()
  });
});

// JSON parsing error handler
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof Error && (err.name === 'SyntaxError' || (err as { type?: string }).type === 'entity.parse.failed')) {
    console.error('[JSON Parse Error]', {
      message: err.message,
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
