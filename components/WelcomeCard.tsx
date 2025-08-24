import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { formatTime } from '@/utils/time';
import { colors, spacing, borderRadius, shadows, typography } from '@/styles/designSystem';

type WelcomeCardProps = {
  remainingTime: number;
  onDismiss: () => void;
};

export default function WelcomeCard({ remainingTime, onDismiss }: WelcomeCardProps) {
  return (
    <View style={styles.overlay}>
      <LinearGradient
        colors={[colors.surface.paper, colors.surface.white]}
        style={styles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.title}>欢迎使用 KotoBa</Text>
        <Text style={styles.emoji}>言葉</Text>
        
        <Text style={styles.message}>
          您已获得 {formatTime(remainingTime)} 的免费翻译时长。
        </Text>
        
        <Text style={styles.description}>
          KotoBa 是您的极简主义 AI 旅行口译员。开启实时模式后，应用会自动聆听并进行双向同声传译，无需手动按下“开始/停止”。
        </Text>
        <Text style={styles.tip}>
          小提示：请选择说和听的语言。
        </Text>
        
        <TouchableOpacity 
          style={styles.buttonContainer} 
          onPress={onDismiss}
          testID="welcome-dismiss-button"
        >
          <LinearGradient
            colors={[colors.accent.green, colors.accent.rust]}
            style={styles.button}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>开始实时翻译</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '88%',
    maxWidth: 420,
    alignItems: 'center',
    ...shadows.xl,
    borderWidth: 2,
    borderColor: colors.border.light,
  },
  title: {
    fontSize: typography.fontSize.h2,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  emoji: {
    fontSize: 42,
    marginBottom: spacing.lg,
  },
  message: {
    fontSize: typography.fontSize.h3,
    fontWeight: typography.fontWeight.semibold,
    color: colors.accent.green,
    marginBottom: spacing.lg,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: typography.fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing.xl,
    letterSpacing: 0.3,
  },
  tip: {
    fontSize: typography.fontSize.small,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  button: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: 0.5,
  },
});