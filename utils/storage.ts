import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConversationMessage } from '@/types';

export type Conversation = {
  id: string;
  createdAt: number; // timestamp in ms
  messages: ConversationMessage[];
  summary?: string;
};

const STORAGE_KEY = 'conversation_history';

// Type guard to check if an object is a valid Conversation
function isConversation(item: unknown): item is Conversation {
  if (typeof item !== 'object' || item === null) return false;
  const conv = item as Conversation;
  return typeof conv.id === 'string' && typeof conv.createdAt === 'number' && Array.isArray(conv.messages);
}

export async function getAllConversations(): Promise<Conversation[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Use a type guard for safe filtering
    return parsed.filter(isConversation);
  } catch (e) {
    console.error('[storage] getAllConversations error:', e);
    return [];
  }
}

export async function saveConversation(messages: ConversationMessage[]): Promise<void> {
  try {
    const history = await getAllConversations();
    const newConversation: Conversation = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      createdAt: Date.now(),
      messages,
    };
    const updated = [newConversation, ...history];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('[storage] saveConversation error:', e);
    throw e;
  }
}

export async function getConversationById(id: string): Promise<Conversation | null> {
  try {
    const history = await getAllConversations();
    return history.find(c => c.id === id) ?? null;
  } catch (e) {
    console.error('[storage] getConversationById error:', e);
    return null;
  }
}

export async function updateConversationSummary(id: string, summary: string): Promise<void> {
  try {
    const history = await getAllConversations();
    const idx = history.findIndex(c => c.id === id);
    if (idx === -1) return; // not found
    history[idx] = { ...history[idx], summary };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('[storage] updateConversationSummary error:', e);
    throw e;
  }
}

export async function deleteConversation(id: string): Promise<void> {
  try {
    const history = await getAllConversations();
    const updated = history.filter(c => c.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('[storage] deleteConversation error:', e);
    throw e;
  }
}
