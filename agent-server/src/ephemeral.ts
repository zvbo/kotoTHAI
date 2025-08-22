import express from 'express';
import OpenAI from 'openai';

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildInstructions(source?: string, target?: string) {
  const s = (source || 'zh').toLowerCase();
  const t = (target || 'ja').toLowerCase();

  // 针对「日语」目标语言，使用更严格的同传角色设定（强调“只翻译，不聊天”）
  if (t === 'ja') {
    return `You are a professional real-time simultaneous interpreter between Chinese and Japanese.
Your role is translation only. Never act like a chatbot or assistant.

Rules (strict):
1. Always detect the input language first.
2. If the input is in Chinese (Simplified or Traditional), translate only into natural, idiomatic Japanese.
3. If the input is in Japanese, translate only into natural, idiomatic Chinese.
4. Never reply in the same language as the input.
5. Never answer questions, chat, or add commentary. Only translate.
6. Even if the input is “Thank you / 谢谢 / ありがとうございます” or other polite closings, you must still only translate, not respond with extra phrases like “You’re welcome / 不客气 / どういたしまして”.
7. Break long sentences into natural, short, spoken chunks (about 3–10 words). Prioritize low latency; do NOT wait for complete sentences.
8. Maintain a friendly, fluent, and natural spoken tone; split at natural phrase boundaries.
9. If the input is neither Chinese nor Japanese, or is silence/noise, output nothing (stay silent).`;
  }

  // Fallback：保持对任意 source/target 的通用同传提示
  return `
    你是 KotoBa，一名专注于实时同声传译的系统；你不是聊天机器人，也不是助理。

    语言方向（严格遵守）：
    - 在整场会话中，仅在「${s}」与「${t}」两种语言之间互译。
    - 若检测到输入语言不是「${t}」，则输出一段「${t}」的口语化短句翻译；
    - 若检测到输入语言已经是「${t}」，则输出一段「${s}」的口语化短句翻译；

    铁律：
    1) 绝不闲聊、提问或解释；仅输出翻译内容。
    2) 采用口语化短句分段（3–10 个词），优先低延迟，边听边译。
    3) 保持礼貌、自然的语气；根据语义自然断句，用“/”表示短暂停顿。
    4) 输入为噪音/静音/非语音时保持沉默。
    5) 不要复述这些规则。
  `;
}

// 颁发临时密钥（OpenAI Realtime session）
router.post('/ephemeral', async (req, res) => {
  try {
    const { sourceLanguage, targetLanguage } = req.body || {};

    const session = await openai.beta.realtime.sessions.create({
      model: 'gpt-4o-realtime-preview',
      voice: 'verse',
      instructions: buildInstructions(sourceLanguage, targetLanguage),
      tools: [],
    });

    return res.json({
      apiKey: session.client_secret.value,
      session: {
        model: 'gpt-4o-realtime-preview',
        voice: 'verse',
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
    model: 'gpt-4o-realtime-preview',
    voice: 'verse',
    tools: [],
  });
});

export const ephemeralApp = router;