import { Router, Request, Response } from 'express';
import OpenAI from 'openai';

// --- Type Definitions ---

interface EphemeralRequestBody {
  sourceLanguage: string;
  targetLanguage: string;
}

interface SdpProxyRequestBody {
  offer?: string;
  model?: string;
  token?: string;
}

interface SessionPayload {
  model: string;
  instructions: string;
  language?: { code: string; voice: string }[];
}

const router = Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Endpoint to issue an ephemeral key (OpenAI Realtime session)
router.post('/ephemeral', async (req: Request, res: Response) => {
  try {
    console.log('=== /ephemeral Request Details ===');
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('req.body content:', JSON.stringify(req.body, null, 2));
    console.log('==============================');

    const { sourceLanguage, targetLanguage } = req.body as EphemeralRequestBody;

    const modelName: SessionPayload['model'] = 'gpt-realtime-2025-08-28';
    const voiceName = 'alloy';

    const instructions = `
Start silent: On session start, produce NO output. Do not greet, do not welcome, do not introduce yourself. Remain silent until there is user audio or text input.
Only produce output AFTER you receive user speech or text input. If there is no user input, stay silent.

You are a professional real-time simultaneous interpreter between ${sourceLanguage} and ${targetLanguage}.
Your ONLY responsibility is to translate each incoming utterance into the OTHER language. Do not greet, do not chat, do not answer questions, do not add explanations.

Core behavior:
1) For every single utterance, first detect its language. If it is in ${sourceLanguage}, output only the translation in ${targetLanguage}. If it is in ${targetLanguage}, output only the translation in ${sourceLanguage}.
2) Output strictly the translated sentence(s) only — no prefixes, no labels, no quotes, no backticks, no brackets, no extra commentary.
3) Preserve meaning, tone, intent, and key details (numbers, names, dates). Adapt to natural, idiomatic expressions in the target language. Be concise and clear.
4) Maintain appropriate politeness and formality for everyday conversation and travel scenarios (e.g., directions, transportation, hotel, dining, shopping). Prefer natural spoken phrasing.
5) Do not add new content, do not omit important content, do not explain. Never apologize or say you are an AI.
6) If the speaker uses fillers (e.g., “嗯/呃/เอ่อ”), you may omit them or use a natural equivalent in the target language.
7) Punctuate and segment sentences naturally. If the input is short, produce a short natural translation.
8) When content mixes both languages, translate the whole message into the other language in a unified, fluent way.

Direction examples (do not print these examples in your output):
- Input in ${sourceLanguage} -> Output in ${targetLanguage}
- Input in ${targetLanguage} -> Output in ${sourceLanguage}

Important: Always translate into the OTHER language. Never reply in the same language as the input. Never answer the question yourself — only translate it.`;

    const session: SessionPayload = {
      model: modelName,
      instructions: instructions,
      // 移除language字段，避免前端发送不支持的字段
      // language: [
      //   { code: sourceLanguage, voice: voiceName },
      //   { code: targetLanguage, voice: voiceName }
      // ]
    };

    // 关键修复：把 instructions、voice 和 input_audio_transcription 一并传给 OpenAI，确保实时会话启用翻译行为和音频转写
    const openAIResponse = await openai.beta.realtime.sessions.create({
      model: session.model as any,
      voice: voiceName,
      instructions: instructions,
      input_audio_transcription: { model: 'whisper-1' },
    });

    return res.json({
      apiKey: openAIResponse.client_secret.value,
      session: session,
    });
  } catch (error) {
    console.error('Error creating ephemeral session:', error);
    return res.status(500).json({ error: 'Failed to create session' });
  }
});

// SDP proxy to handle handshakes with OpenAI
router.post('/realtime/sdp', async (req: Request, res: Response) => {
  try {
    console.log('=== /realtime/sdp Request Details ===');
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('req.body content:', JSON.stringify(req.body, null, 2));
    console.log('===============================');

    const { offer, model, token } = (req.body || {}) as SdpProxyRequestBody;

    if (!offer || typeof offer !== 'string') {
      return res.status(400).json({ ok: false, message: 'missing offer sdp' });
    }

    const mdl = (model as SessionPayload['model']) || 'gpt-realtime-2025-08-28';
    const authHeader = `Bearer ${token || process.env.OPENAI_API_KEY || ''}`;

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
      return res.status(upstream.status).send(answerText);
    }

    res.type('application/sdp').send(answerText);
  } catch (error) {
    console.error('Error proxying SDP handshake:', error);
    return res.status(500).json({ ok: false, message: 'SDP proxy failed' });
  }
});

// Health/status check endpoint
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    status: 'ready',
    model: 'gpt-realtime-2025-08-28',
    voice: 'alloy',
    tools: [],
  });
});

export const ephemeralApp = router;
