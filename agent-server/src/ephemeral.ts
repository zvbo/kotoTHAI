import express from 'express';
import OpenAI from 'openai';

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 颁发临时密钥（OpenAI Realtime session）
router.post('/ephemeral', async (req, res) => {
  try {
    // 【DEBUG】记录详细的请求信息以诊断 JSON 解析问题
    console.log('=== /ephemeral 请求详情 ===');
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('User-Agent:', req.get('User-Agent'));
    console.log('req.body type:', typeof req.body);
    console.log('req.body content:', JSON.stringify(req.body, null, 2));
    console.log('req.rawBody (if available):', (req as any).rawBody);
    console.log('=== End Request Details ===');

    // 1. 从请求体中获取前端选择的语言
    const { sourceLanguage, targetLanguage } = req.body;

    // 2. 严格按照用户要求定义模型和语音
    const modelName = 'gpt-realtime-2025-08-28'; // <-- 严格使用此模型名称
    const voiceName = 'alloy';

    // 3. 构建一个简洁、明确的指令，强制模型扮演“翻译员”角色
    const instructions = `You are a real-time translator. Your only function is to translate the user's speech between ${sourceLanguage} and ${targetLanguage}. Do not add any commentary. Provide only the translation.`;

    // 4. 构建最终的 session 对象，融合指令和语言配置
    const session = {
      model: modelName,
      instructions: instructions,
      language: [
        { code: sourceLanguage, voice: voiceName },
        { code: targetLanguage, voice: voiceName }
      ]
    } as any;

    // 调用 OpenAI 创建一次会话以获取临时 client_secret（ephemeral key）
    const openAIResponse = await openai.beta.realtime.sessions.create({
      model: session.model,
    } as any);

    // 5. 确保返回的是这个最终的 session 对象
    return res.json({
      apiKey: (openAIResponse as any)?.client_secret?.value || (openAIResponse as any)?.apiKey,
      session: session,
    });
  } catch (error) {
    console.error('Error creating ephemeral session:', error);
    return res.status(500).json({ error: 'Failed to create session' });
  }
});

// 新增：SDP 代理（后端代办与 OpenAI 的 SDP 握手）
router.post('/realtime/sdp', async (req, res) => {
  try {
    console.log('=== /realtime/sdp 请求详情 ===');
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('User-Agent:', req.get('User-Agent'));
    console.log('req.body type:', typeof req.body);
    console.log('req.body content:', JSON.stringify(req.body, null, 2));
    console.log('=== End Request Details ===');

    const { offer, model, token } = (req.body || {}) as {
      offer?: string;
      model?: string;
      token?: string; // 可传入前一步颁发的临时密钥（ephemeral client_secret）
    };

    if (!offer || typeof offer !== 'string') {
      return res.status(400).json({ ok: false, message: 'missing offer sdp' });
    }

    const mdl = (model && typeof model === 'string' && model.length > 0)
      ? model
      : 'gpt-realtime-2025-08-28';

    const authHeader = `Bearer ${token && token.length > 0 ? token : (process.env.OPENAI_API_KEY || '')}`;

    const upstream = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(mdl)}`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/sdp',
        'OpenAI-Beta': 'realtime=v1',
      },
      body: offer,
    });

    const answerText = await upstream.text();
    if (!upstream.ok) {
      // 透传上游错误（便于定位）
      return res.status(upstream.status).send(answerText);
    }

    // 返回与 OpenAI 一致的内容类型，前端可直接 setRemoteDescription
    res.type('application/sdp').send(answerText);
  } catch (error) {
    console.error('Error proxying SDP handshake:', error);
    return res.status(500).json({ ok: false, message: 'SDP proxy failed' });
  }
});

// 获取会话/服务状态
router.get('/status', (_req, res) => {
  res.json({
    status: 'ready',
    model: 'gpt-realtime-2025-08-28',
    voice: 'alloy',
    tools: [],
  });
});

export const ephemeralApp = router;