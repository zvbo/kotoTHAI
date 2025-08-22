import { useState } from 'react';
import { Platform } from 'react-native';

import { ConversationMessage, Language } from '@/types';

export default function useTranslation() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transcribe audio to text
  const transcribeAudio = async (
    audioFile: { uri: string; name: string; type: string } | null,
    sourceLanguage: Language
  ): Promise<string | null> => {
    if (!audioFile) {
      setError('No audio file to transcribe');
      return null;
    }

    setIsTranslating(true);
    setError(null);

    try {
      const formData = new FormData();
      
      // Append audio file
      if (Platform.OS === 'web') {
        // For web, we need to fetch the file and convert it to a blob
        const response = await fetch(audioFile.uri);
        const blob = await response.blob();
        formData.append('audio', blob, audioFile.name);
      } else {
        // For native platforms
        formData.append('audio', audioFile as any);
      }
      
      // Append language code
      formData.append('language', sourceLanguage.code);

      // Send to transcription API
      const response = await fetch('https://toolkit.rork.com/stt/transcribe/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Transcription result:', data);
      
      return data.text || '';
    } catch (err) {
      console.error('Transcription error:', err);
      setError('Failed to transcribe audio');
      return null;
    } finally {
      setIsTranslating(false);
    }
  };

  // Translate text using AI
  const translateText = async (
    text: string,
    sourceLanguage: Language,
    targetLanguage: Language
  ): Promise<string | null> => {
    if (!text) {
      return '';
    }

    setIsTranslating(true);
    setError(null);

    try {
      // Prepare messages for the LLM
      const messages = [
        {
          role: 'system',
          content: `You are a professional translator. Translate the following text from ${sourceLanguage.name} to ${targetLanguage.name}. Provide only the translation, no explanations.`
        },
        {
          role: 'user',
          content: text
        }
      ];

      // Send to translation API
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Translation result:', data);
      
      return data.completion || '';
    } catch (err) {
      console.error('Translation error:', err);
      setError('Failed to translate text');
      return null;
    } finally {
      setIsTranslating(false);
    }
  };

  // Create a conversation message
  const createMessage = async (
    text: string,
    sourceLanguage: Language,
    targetLanguage: Language,
    isUser: boolean
  ): Promise<ConversationMessage | null> => {
    try {
      const translatedText = await translateText(text, sourceLanguage, targetLanguage);
      
      if (translatedText === null) {
        return null;
      }
      
      return {
        id: Date.now().toString(),
        text,
        translatedText,
        sourceLanguage: sourceLanguage.code,
        targetLanguage: targetLanguage.code,
        timestamp: Date.now(),
        isUser
      };
    } catch (err) {
      console.error('Error creating message:', err);
      setError('Failed to create message');
      return null;
    }
  };

  return {
    isTranslating,
    error,
    transcribeAudio,
    translateText,
    createMessage
  };
}