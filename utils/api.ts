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
export async function transcribeAudio(audioFile: { uri: string; name: string; type: string }, language?: string) {
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

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Speech-to-text API Error:', error);
    throw error;
  }
}