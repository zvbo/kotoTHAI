import { Router, Request, Response } from 'express';
import { z } from 'zod';

// --- Type Definitions ---

type ToolParameters = Record<string, unknown>;
type ToolArguments = Record<string, unknown>;

interface ToolInstance {
  name: string;
  description: string;
  parameters: ToolParameters;
  execute: (args: ToolArguments) => Promise<Record<string, unknown>>;
}

const router = Router();

const ToolCallSchema = z.object({
  name: z.string(),
  arguments: z.record(z.unknown()),
  id: z.string().optional(),
});

const getWeatherTool: ToolInstance = {
  name: 'get_weather',
  description: 'Get current weather information for a city',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string', description: '城市名称' },
      unit: { type: 'string', enum: ['celsius', 'fahrenheit'], default: 'celsius', description: '温度单位' }
    },
    required: ['location'],
    additionalProperties: false
  },
  async execute({ location, unit = 'celsius' }) {
    return {
      location,
      temperature: Math.round(Math.random() * 30 + 10),
      unit,
      condition: ['晴天', '多云', '小雨', '阴天'][Math.floor(Math.random() * 4)],
      humidity: Math.round(Math.random() * 50 + 30)
    };
  }
};

const translateTextTool: ToolInstance = {
  name: 'translate_text',
  description: 'Translate text between languages',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: '要翻译的文本' },
      targetLanguage: { type: 'string', description: '目标语言代码，如 en, ja, zh' },
      sourceLanguage: { type: 'string', default: 'auto', description: '源语言代码，如果不指定则自动检测' }
    },
    required: ['text', 'targetLanguage'],
    additionalProperties: false
  },
  async execute({ text, targetLanguage, sourceLanguage = 'auto' }) {
    const translations: Record<string, Record<string, string>> = {
      'hello': { zh: '你好', ja: 'こんにちは', en: 'hello' },
      'goodbye': { zh: '再见', ja: 'さようなら', en: 'goodbye' },
      'thank you': { zh: '谢谢', ja: 'ありがとう', en: 'thank you' }
    };
    const key = String(text ?? '').toLowerCase();
    const lang = String(targetLanguage ?? '');
    return {
      originalText: text,
      translatedText: translations[key]?.[lang] ?? `[翻译] ${text}`,
      sourceLanguage,
      targetLanguage
    };
   }
};

const toolMap: Map<string, ToolInstance> = new Map<string, ToolInstance>([
  ['get_weather', getWeatherTool],
  ['translate_text', translateTextTool]
]);

router.post('/execute', async (req: Request, res: Response) => {
  try {
    console.log('🔧 Tool execution request:', req.body);
    const toolCall = ToolCallSchema.parse(req.body);
    const { name, arguments: args, id } = toolCall;
    
    const toolInstance = toolMap.get(name);
    if (!toolInstance) {
      throw new Error(`Unknown tool: ${name}`);
    }
    
    const result = await toolInstance.execute(args as ToolArguments);
    
    console.log('✅ Tool execution result:', result);
    
    return res.json({
      ok: true,
      result,
      id,
    });
    
  } catch (error) {
    console.error('❌ Tool execution error:', error);
    return res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/list', (_req: Request, res: Response) => {
  const availableTools = Array.from(toolMap.values()).map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  }));
  
  res.json({
    tools: availableTools,
    count: availableTools.length,
  });
});

export const toolApp = router;
