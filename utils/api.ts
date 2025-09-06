// API utility functions for translation

// Test function to call OpenAI API
export async function testOpenAIAPI() {
  try {
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1'
      },
      body: JSON.stringify({
        prompt: {
          id: 'pmpt_6892eb521bec8190827db101f3e69be701c8a37aae89910b',
          version: '1'
        }
      })
    });

    const data = await response.json();
    console.log('OpenAI API Response:', data);
    return data;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}

// Translation function using the toolkit API
export async function translateText(text: string, sourceLanguage: string, targetLanguage: string) {
  try {
    const response = await fetch('https://toolkit.rork.com/text/llm/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the following text from ${sourceLanguage} to ${targetLanguage}. Only return the translation, no explanations.`
          },
          {
            role: 'user',
            content: text
          }
        ]
      })
    });

    const data = await response.json();
    return data.completion;
  } catch (error) {
    console.error('Translation API Error:', error);
    throw error;
  }
}

// Speech-to-text function using the toolkit API
// Enhanced transcription using OpenAI Whisper API with fallback
export async function transcribeAudio(audioFile: { uri: string; name: string; type: string }, language?: string) {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  const model = process.env.EXPO_PUBLIC_WHISPER_MODEL || 'whisper-1';
  
  // Try OpenAI Whisper API first if API key is available
  if (apiKey) {
    try {
      const formData = new FormData();
      // RN-specific file upload format. The `any` cast is a pragmatic workaround
      // for the discrepancy between standard Blob types and RN's file object.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formData.append('file', audioFile as any);
      formData.append('model', model);
      
      if (language) {
        formData.append('language', language);
      }
      
      // Use response_format for better structured output
      formData.append('response_format', 'json');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Whisper transcription successful');
      return { text: data.text, source: 'whisper' };
    } catch (error) {
      console.warn('Whisper transcription failed, falling back to toolkit API:', error);
    }
  } else {
    console.warn('OpenAI API key not found, using fallback transcription service');
  }

  // Fallback to original API
  try {
    const formData = new FormData();
    formData.append('audio', audioFile as any);
    if (language) {
      formData.append('language', language);
    }

    const response = await fetch('https://toolkit.rork.com/stt/transcribe/', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Toolkit API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Fallback transcription successful');
    return { ...data, source: 'toolkit' };
  } catch (fallbackError) {
    console.error('All transcription services failed:', fallbackError);
    throw new Error('语音转文字服务暂时不可用，请稍后重试');
  }
}

// ================= IAP helpers =================

export function getAgentServerURL(): string {
  const envUrl = process.env.EXPO_PUBLIC_AGENT_SERVER_URL as string | undefined;
  return envUrl && envUrl.length > 0 ? envUrl : 'http://localhost:8788';
}

export type VerifyIAPRequest = {
  platform: 'ios' | 'android';
  productId: string;
  receipt: string;
  transactionId?: string;
};

export type VerifyIAPResponse = {
  ok: boolean;
  grantSeconds?: number;
  option?: string;
  transactionId?: string;
  message?: string;
};

export async function verifyIAP(body: VerifyIAPRequest): Promise<VerifyIAPResponse> {
  const base = getAgentServerURL();
  const resp = await fetch(`${base}/api/iap/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await resp.json()) as VerifyIAPResponse;
  return data;
}

// ================= Summarize helpers =================
export async function summarizeConversation(formattedText: string): Promise<{ summary: string }> {
  const base = getAgentServerURL();
  const resp = await fetch(`${base}/api/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: formattedText, prompt: '总结上述的内容，并根据你的总结给出3-5个进一步讨论的话题，中文' }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`summarize failed: ${resp.status} ${text}`);
  }
  const data = await resp.json();
  if (!data || typeof data.summary !== 'string') {
    throw new Error('invalid summarize response');
  }
  return { summary: data.summary };
}
