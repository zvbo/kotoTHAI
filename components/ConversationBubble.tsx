import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ConversationMessage } from '@/types';
import { colors, spacing, borderRadius, shadows, typography } from '@/styles/designSystem';

type ConversationBubbleProps = {
  message: ConversationMessage;
};

export default function ConversationBubble({ message }: ConversationBubbleProps) {
  const isUser = message.isUser;
  const hasOriginal = typeof message.text === 'string' && message.text.trim().length > 0;
  const hasTranslation = typeof message.translatedText === 'string' && message.translatedText.trim().length > 0;
  // 针对泰语（th）在 iOS 上的显示问题：禁用 letterSpacing 与 italic
  const isThaiOriginal = hasOriginal && message.sourceLanguage === 'th';
  const isThaiTranslation = hasTranslation && message.targetLanguage === 'th';
  const isPartial = message.partial;
  
  const getBubbleGradient = (): [string, string] => {
    return isUser 
      ? [colors.primary.beige, colors.primary.sand]
      : [colors.surface.paper, colors.surface.white];
  };

  return (
    <View style={[
      styles.container,
      isUser ? styles.userContainer : styles.otherContainer,
      isPartial && styles.partialContainer
    ]}>
      <LinearGradient
        colors={getBubbleGradient()}
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.otherBubble,
          isPartial && styles.partialBubble
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.contentContainer}>
          {hasOriginal && (
            <Text style={[
              styles.originalText,
              isUser ? styles.userText : styles.otherText,
              isThaiOriginal && styles.thaiTextAdjust,
            ]}>
              {message.text}
              {isPartial && message.streamingKind === 'source' ? ' …' : ''}
            </Text>
          )}

          {hasOriginal && hasTranslation && (
            <View style={[
              styles.separator,
              { backgroundColor: isUser ? colors.border.light : colors.border.medium }
            ]} />
          )}
          
          {hasTranslation && (
            <Text style={[
              styles.translatedText,
              isUser ? styles.userText : styles.otherText,
              isThaiTranslation && styles.thaiTextAdjust,
            ]}>
              {message.translatedText}
              {isPartial && message.streamingKind === 'target' ? ' …' : ''}
            </Text>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
    maxWidth: '85%',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  otherContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: borderRadius.xl,
    ...shadows.md,
    borderWidth: 1,
  },
  userBubble: {
    borderColor: colors.border.light,
  },
  otherBubble: {
    borderColor: colors.border.medium,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  originalText: {
    fontSize: typography.fontSize.body,
    lineHeight: typography.lineHeight.relaxed,
    fontWeight: typography.fontWeight.medium,
    letterSpacing: 0.3,
  },
  translatedText: {
    fontSize: typography.fontSize.small,
    lineHeight: typography.lineHeight.normal,
    fontStyle: 'italic',
    fontWeight: typography.fontWeight.normal,
    letterSpacing: 0.2,
  },
  // 针对泰语的样式兜底：禁用字距与斜体，避免组合附标分离导致的占位点
  thaiTextAdjust: {
    letterSpacing: 0,
    fontStyle: 'normal',
  },
  userText: {
    color: colors.text.primary,
  },
  otherText: {
    color: colors.text.primary,
  },
  separator: {
    height: 1,
    marginVertical: spacing.sm,
    opacity: 0.6,
  },
  partialContainer: {
    opacity: 0.95,
  },
  partialBubble: {
    borderStyle: 'dashed',
  },
});