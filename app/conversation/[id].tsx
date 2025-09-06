import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import ConversationBubble from '@/components/ConversationBubble';
import { colors, spacing, borderRadius, shadows, typography } from '@/styles/designSystem';
import { Conversation, getConversationById, deleteConversation, updateConversationSummary } from '@/utils/storage';
import { summarizeConversation } from '@/utils/api';

export default function ConversationDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = String(params.id || '');

  const [loading, setLoading] = useState(true);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getConversationById(id);
      setConv(data);
    } catch (e) {
      console.error('[conversation detail] load error', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    load();
  }, [id, load]);

  const messages = useMemo(() => conv?.messages || [], [conv]);
  const createdText = useMemo(() => (conv ? new Date(conv.createdAt).toLocaleString() : ''), [conv]);

  const onDelete = useCallback(() => {
    if (!conv) return;
    Alert.alert('删除确认', '确定要删除这条对话吗？此操作不可恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive', onPress: async () => {
          try {
            setIsDeleting(true);
            await deleteConversation(conv.id);
            Alert.alert('已删除', '该对话已删除。');
            router.back();
          } catch (e) {
            console.error('[conversation detail] delete error', e);
            Alert.alert('删除失败', '请稍后重试');
          } finally {
            setIsDeleting(false);
          }
        }
      }
    ]);
  }, [conv, router]);

  const formatMessagesForSummary = useCallback((): string => {
    return messages.map(m => `${m.isUser ? '用户' : '助理'}: ${m.text || ''}${m.translatedText ? `\n译文: ${m.translatedText}` : ''}`).join('\n\n');
  }, [messages]);

  const onSummarize = useCallback(async () => {
    if (!conv) return;
    try {
      setIsSummarizing(true);
      const content = formatMessagesForSummary();
      const result = await summarizeConversation(content);
      const summary = result?.summary || '';
      if (!summary) throw new Error('empty summary');
      await updateConversationSummary(conv.id, summary);
      await load();
    } catch (e) {
      console.error('[conversation detail] summarize error', e);
      Alert.alert('生成失败', '请稍后重试');
    } finally {
      setIsSummarizing(false);
    }
  }, [conv, load, formatMessagesForSummary]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent.rust} />
        <Text style={styles.loadingText}>加载中…</Text>
      </View>
    );
  }

  if (!conv) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>未找到该对话</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>创建于 {createdText}</Text>
        {conv.summary ? (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>AI 总结</Text>
            <Text style={styles.summaryText}>{conv.summary}</Text>
          </View>
        ) : (
          <Text style={styles.noSummaryText}>暂无总结</Text>
        )}
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            className={isSummarizing ? 'opacity-60' : ''}
            style={[styles.actionBtn, styles.summarizeBtn]} 
            onPress={onSummarize} 
            disabled={isSummarizing}
          >
            <Text style={styles.actionText}>{isSummarizing ? '生成中…' : '生成 AI 总结'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={isDeleting ? 'opacity-60' : ''}
            style={[styles.actionBtn, styles.deleteBtn]} 
            onPress={onDelete} 
            disabled={isDeleting}
          >
            <Text style={styles.actionText}>删除对话</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <ConversationBubble message={item} />}
        contentContainerStyle={styles.messageListContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.beige,
  },
  container: {
    flex: 1,
    backgroundColor: colors.primary.beige,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.text.secondary,
  },
  notFoundText: {
    color: colors.text.secondary,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.body,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  summaryBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface.overlay,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  summaryTitle: {
    fontSize: typography.fontSize.body,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
  },
  summaryText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.small,
    lineHeight: typography.lineHeight.relaxed,
  },
  noSummaryText: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  summarizeBtn: {
    backgroundColor: colors.accent.green,
  },
  deleteBtn: {
    backgroundColor: colors.accent.rust,
  },
  actionText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.medium,
  },
  messageListContent: {
    paddingVertical: spacing.md,
  },
});