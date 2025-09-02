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
    zh: 'Use natural, conversational Mainland Chinese. Avoid internet slang unless present in the source. Do not omit or summarize content; preserve full meaning.',
    en: 'Use natural, idiomatic spoken English. Avoid over-formality. Do not omit or summarize content; preserve full meaning.',
    th: 'Use natural, conversational Thai. Do not omit or summarize content; preserve full meaning. Avoid overly formal written style.',
  };

  const src = NAME[L] || 'Chinese';
  const tgt = NAME[S] || 'Thai';
  const tgtStyle = STYLE[S] || STYLE['en'];

  // 单向翻译：仅当输入主要是源语言 L 时才翻译为 S
  return `You are a low-latency, **2-way** simultaneous interpreter.

Listen in both ${src} and ${tgt}. If the input is mainly ${src}, speak only in ${tgt}. If the input is mainly ${tgt}, speak only in ${src}. Never output the same language as the input.

HARD RULES:

- User questions only need to be translated, not for you to have a conversation with the user
- For every incoming segment, translate it ONLY into ${tgt} and ${src}.
- If the input is NOT mainly ${src} or ${tgt} (noise, silence, or other languages), output nothing.
- If the input is mainly ${src}, translate it into ${tgt}.
- If the input is mainly ${tgt}, translate it into ${src}.
- Never chat, explain, or add meta commentary. Do not echo the source.
- Output the complete content. Keep numbers, dates, units, and named entities accurate; leave standard proper names in their original form when appropriate.
- Never shorten or summarize. If an utterance is long, continue speaking until the entire content is delivered.
- If user speech resumes while you are speaking, stop immediately and wait for the next segment.

SEGMENT POLICY:

- Treat every segment as independent; ignore previous segments when deciding whether to translate.
- Mixed-language input: if ${src} content is ≥70%, proceed; if ${tgt} content is ≥70%, proceed; if unclear, stay silent until confident.

SILENCE/NOISE:

- If the input is silence/noise or not ${src} or ${tgt}, produce no output.

EXAMPLES (illustrative only):

[${src} → ${tgt}]

User: <${src} sentence>

Assistant: <${tgt} translation>`;
}

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
    
    // 前端传入 sourceLanguage/targetLanguage，这里直接映射为 listen/speak
    const { sourceLanguage, targetLanguage } = req.body || {};

    const session = await openai.beta.realtime.sessions.create({
      model: 'gpt-realtime-2025-08-28',
      modalities: ['text', 'audio'],
      voice: 'marin',
      instructions: buildInstructions(sourceLanguage, targetLanguage),
      // 低温采样，稳定输出
      temperature: 0.7,
      // 说话检测：服务端 VAD，减少延迟，同时尽量等待完整句段
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 2200,
        create_response: true,
      } as any,
      // 语音转写模型
      input_audio_transcription: { model: 'gpt-4o-transcribe' },
      tools: [],
    } as any);

    const instructions = buildInstructions(sourceLanguage, targetLanguage);

    return res.json({
      apiKey: session.client_secret.value,
      session: {
        model: 'gpt-realtime-2025-08-28',
        output_modalities: ['audio'],
        instructions, // 显式下发给前端，避免被本地兜底覆盖
        audio: {
          input: {
            format: 'pcm16',
            turn_detection: { type: 'semantic_vad', create_response: true },
          },
          output: {
            format: 'g711_ulaw',
            voice: 'marin',
            speed: 1.0,
          },
        },
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
    model: 'gpt-realtime-2025-08-28',
    voice: 'marin',
    tools: [],
  });
});

export const ephemeralApp = router;