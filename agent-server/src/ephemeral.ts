import express from 'express';
import OpenAI from 'openai';

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildInstructions(source?: string, target?: string) {
  const s = (source || 'zh').toLowerCase();
  const t = (target || 'ja').toLowerCase();
  const sourceLang = { zh: 'Chinese', ja: 'Japanese', en: 'English' }[s] || 'Chinese';
  const targetLang = { zh: 'Chinese', ja: 'Japanese', en: 'English' }[t] || 'Japanese';

  // 使用上一轮我们优化过的、更稳定可靠的英文指令集
  return `You are a professional real-time simultaneous interpreter between ${sourceLang} and ${targetLang}.
Your single and only role is to translate. Never act as a chatbot or an assistant.

**Strict Rules:**
1.  First, detect the input language.
2.  If the input is in ${sourceLang}, you MUST translate it ONLY into ${targetLang}.
3.  If the input is in ${targetLang}, you MUST translate it ONLY into ${sourceLang}.
4.  NEVER reply in the same language as the input. This is a critical rule.
5.  NEVER answer questions, add any commentary, or explain things. Just translate.
6.  Keep translations natural and conversational. Prioritize low latency.
7.  While prioritizing speed, you MUST preserve the original meaning and key details as much as possible. Do not over-simplify.
8.  If the input is noise, silence, or a language other than ${sourceLang} or ${targetLang}, you MUST remain silent and output nothing.`;
}

// 颁发临时密钥（OpenAI Realtime session）
router.post('/ephemeral', async (req, res) => {
  try {
    const { sourceLanguage, targetLanguage } = req.body || {};

    const session = await openai.beta.realtime.sessions.create({
      model: 'gpt-4o-mini-realtime-preview-2024-12-17',
      voice: 'Alloy',
      instructions: buildInstructions(sourceLanguage, targetLanguage),
      tools: [],
    });

    return res.json({
      apiKey: session.client_secret.value,
      session: {
        model: 'gpt-4o-mini-realtime-preview-2024-12-17',
        voice: 'Alloy',
      },
    });
  } catch (error) {
    console.error('Error creating ephemeral session:', error);
    return res.status(500).json({ error: 'Failed to create session' });
  }
});

// 获取会话/服务状态
router.get('/status', (_req, res) => {
  res.json({
    status: 'ready',
    model: 'gpt-4o-mini-realtime-preview-2024-12-17',
    voice: 'Alloy',
    tools: [],
  });
});

export const ephemeralApp = router;