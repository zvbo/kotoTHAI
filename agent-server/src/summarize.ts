import { Router, Request, Response } from 'express';
import OpenAI from 'openai';

// --- Type Definitions ---

interface SummarizeRequestBody {
  content?: string;
  prompt?: string;
}

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post('/summarize', async (req: Request, res: Response) => {
  try {
    const { content, prompt } = req.body as SummarizeRequestBody;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ ok: false, message: 'missing content' });
    }

    const userPrompt = (typeof prompt === 'string' && prompt.trim().length > 0)
      ? prompt.trim()
      : '请用中文给出一段简洁的总结，并补充 3-5 个可继续讨论的话题。';

    const MAX_LEN = 20000;
    const clipped = content.length > MAX_LEN ? content.slice(0, MAX_LEN) : content;

    const systemInstruction = [
      '你是一个专业的对话总结助手。',
      '要求：',
      '1) 先给出这个对话的 3-6 句话的中文总结（信息全面、简洁清晰）。',
      '2) 然后给出 3-5 个可继续讨论的不同方向的话题（用项目符号列出）。',
      '3) 禁止编造事实，若信息不足请直接说明。',
    ].join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-nano-2025-08-07',
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `${userPrompt}\n\n以下为需要总结的对话内容：\n\n${clipped}` },
      ],
    });

    const summary = completion.choices?.[0]?.message?.content?.trim();
    if (!summary) {
      return res.status(500).json({ ok: false, message: 'empty completion' });
    }

    return res.json({ ok: true, summary });
  } catch (err: unknown) {
    console.error('[summarize] error:', err);
    const error = err as Error & { status?: number };
    const status = typeof error.status === 'number' ? error.status : 500;
    const message = error.message || 'summarize failed';
    return res.status(status).json({ ok: false, message });
  }
});

export const summarizeApp = router;
