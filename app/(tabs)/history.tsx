import React, { useEffect, useState, useCallback } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, spacing, borderRadius, shadows, typography } from '@/styles/designSystem';
import { Conversation, getAllConversations } from '@/utils/storage';

export default function HistoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Conversation[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getAllConversations();
      setItems(list);
    } catch (e) {
      console.error('[history] load error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const renderItem = ({ item }: { item: Conversation }) => {
    const created = new Date(item.createdAt).toLocaleString();
    const preview = (item.summary || item.messages?.[0]?.text || item.messages?.[0]?.translatedText || '').slice(0, 40);
    return (
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/conversation/[id]', params: { id: item.id } })}
        style={{
          backgroundColor: colors.surface.overlay,
          marginHorizontal: spacing.md,
          marginVertical: spacing.sm,
          padding: spacing.md,
          borderRadius: borderRadius.lg,
          ...shadows.sm,
        }}
      >
        <Text style={{ fontSize: typography.fontSize.body, color: colors.text.primary, fontWeight: typography.fontWeight.medium }}>
          {created}
        </Text>
        <Text style={{ marginTop: spacing.xs, color: colors.text.secondary, fontSize: typography.fontSize.small }}>
          {preview || '（无预览）'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.primary.beige, paddingTop: spacing.md }}>
      <Text style={{ marginLeft: spacing.md, marginBottom: spacing.sm, color: colors.text.secondary }}>
        {loading ? '加载中…' : `共 ${items.length} 条对话`}
      </Text>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: spacing.md }}
        refreshing={loading}
        onRefresh={load}
      />
    </View>
  );
}