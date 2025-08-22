import express from 'express';
import { z } from 'zod';

const router = express.Router();

// 定义通用的工具实例类型，避免不同工具参数结构的联合类型冲突
type ToolInstance = {
  name: string;
  description: string;
  parameters: any; // 使用宽松类型以兼容不同的 JSON Schema 结构
  execute: (args: any) => Promise<any>;
};

// 工具调用请求的数据结构验证
const ToolCallSchema = z.object({
  name: z.string(),
  arguments: z.record(z.any()),
  id: z.string().optional(),
});

// 天气查询工具定义
const getWeatherTool = {
  name: 'get_weather',
  description: 'Get current weather information for a city',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: '城市名称'
      },
      unit: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius',
        description: '温度单位'
      }
    },
    required: ['location'],
    additionalProperties: false
  },
  async execute({ location, unit = 'celsius' }) {
    // 模拟天气API调用
    return {
      location,
      temperature: Math.round(Math.random() * 30 + 10),
      unit,
      condition: ['晴天', '多云', '小雨', '阴天'][Math.floor(Math.random() * 4)],
      humidity: Math.round(Math.random() * 50 + 30)
    };
  }
} as ToolInstance;

// 翻译工具定义
const translateTextTool = {
  name: 'translate_text',
  description: 'Translate text between languages',
  parameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: '要翻译的文本'
      },
      targetLanguage: {
        type: 'string',
        description: '目标语言代码，如 en, ja, zh'
      },
      sourceLanguage: {
        type: 'string',
        default: 'auto',
        description: '源语言代码，如果不指定则自动检测'
      }
    },
    required: ['text', 'targetLanguage'],
    additionalProperties: false
  },
  async execute({ text, targetLanguage, sourceLanguage = 'auto' }) {
    // 模拟翻译API调用
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
} as ToolInstance;

// 工具映射
const toolMap: Map<string, ToolInstance> = new Map<string, ToolInstance>([
  ['get_weather', getWeatherTool],
  ['translate_text', translateTextTool]
]);

// 工具执行路由
router.post('/execute', async (req, res) => {
  try {
    console.log('🔧 Tool execution request:', req.body);
    
    // 验证请求数据
    const toolCall = ToolCallSchema.parse(req.body);
    const { name, arguments: args, id } = toolCall;
    
    // 获取工具实例
    const toolInstance = toolMap.get(name);
    if (!toolInstance) {
      throw new Error(`Unknown tool: ${name}`);
    }
    
    // 执行工具
    const result = await toolInstance.execute(args);
    
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

// 获取可用工具列表
router.get('/list', (req, res) => {
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