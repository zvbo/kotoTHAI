import express from 'express';
import OpenAI from 'openai';

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 单向同传提示词（Listen -> Speak）
// 支持: zh | en | th
function buildInstructions(listen?: string, speak?: string) {
  const code = (x?: string) => (x || 'zh').toLowerCase();
  const L = code(listen);   // 源语言（Listen）
  const S = code(speak);    // 目标语言（Speak）

  // 语言英文名
  const NAME: Record<string, string> = {
    zh: 'Chinese',
    en: 'English',
    th: 'Thai',
  };

  // 语言本地显示名（可选，用于示例区/风格说明）
  const LOCAL: Record<string, string> = {
    zh: '中文',
    en: 'English',
    th: 'ไทย',
  };

  // 目标语言风格规则（可按需增改）
  const STYLE: Record<string, string> = {
    zh: 'Use natural, conversational Mainland Chinese. Avoid internet slang unless present in the source.',
    en: 'Use natural, idiomatic spoken English. Avoid over-formality.',
    th: 'Use natural, conversational Thai. Keep sentences concise and avoid overly formal written style.',
  };

  const src = NAME[L] || 'Chinese';
  const tgt = NAME[S] || 'Thai';
  const tgtStyle = STYLE[S] || STYLE['en'];

  // 单向翻译：仅当输入主要是源语言 L 时才翻译为 S
  return `You are a low-latency, **one-way** simultaneous interpreter.

Listen in ${src}. Speak only in ${tgt}. Translation direction is fixed and must never reverse.

HARD RULES:

- User questions only need to be translated, not for you to have a conversation with the user
- For every incoming segment, translate it ONLY into ${tgt}.
- If the input is NOT mainly ${src} (noise, silence, or other languages), output nothing.
- Never chat, explain, or add meta commentary. Do not echo the source.
- - Output the complete content.Keep numbers, dates, units, and named entities accurate; leave standard proper names in their original form when appropriate.
- If user speech resumes while you are speaking, stop immediately and wait for the next segment.

OUTPUT STYLE (for ${tgt} / ${LOCAL[S] || tgt}):

- ${tgtStyle}

SEGMENT POLICY:

- Treat every segment as independent; ignore previous segments when deciding whether to translate.
- Mixed-language input: if ${src} content is ≥70%, proceed; if unclear, stay silent until confident.

SILENCE/NOISE:

- If the input is silence/noise or not ${src}, produce no output.

EXAMPLES (illustrative only):

[${src} → ${tgt}]

User: <${src} sentence>

Assistant: <${tgt} translation>`;
}

// 颁发临时密钥（OpenAI Realtime session）
router.post('/ephemeral', async (req, res) => {
  try {
    // 前端传入 sourceLanguage/targetLanguage，这里直接映射为 listen/speak
    const { sourceLanguage, targetLanguage } = req.body || {};

    const session = await openai.beta.realtime.sessions.create({
      model: 'gpt-4o-mini-realtime-preview-2024-12-17',
      modalities: ['text', 'audio'],
      voice: 'alloy',
      instructions: buildInstructions(sourceLanguage, targetLanguage),
      // 低温采样，稳定输出
      temperature: 0.7,
      // 说话检测：服务端 VAD，减少延迟
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 1700,
        create_response: true,
      } as any,
      // 语音转写模型
      input_audio_transcription: { model: 'gpt-4o-transcribe' },
      tools: [],
    } as any);

    return res.json({
      apiKey: session.client_secret.value,
      session: {
        model: 'gpt-4o-mini-realtime-preview-2024-12-17',
        voice: 'alloy',
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
    voice: 'alloy',
    tools: [],
  });
});

export const ephemeralApp = router;