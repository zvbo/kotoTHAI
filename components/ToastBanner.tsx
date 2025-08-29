import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, borderRadius, shadows, typography } from '@/styles/designSystem';

type ToastBannerProps = {
  message: string;
  type?: 'info' | 'success' | 'error';
  duration?: number; // ms
  onHide?: () => void;
};

export default function ToastBanner({ message, type = 'info', duration = 2200, onHide }: ToastBannerProps) {
  const translateY = useRef(new Animated.Value(-40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -40, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
      ]).start(({ finished }) => {
        if (finished) onHide?.();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onHide, opacity, translateY]);

  const background = type === 'success' ? colors.accent.green : type === 'error' ? colors.accent.rust : colors.surface.overlay;
  const textColor = type === 'info' ? colors.text.primary : colors.text.inverse;
  const borderCol = type === 'info' ? colors.border.light : 'transparent';

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrapper, { transform: [{ translateY }], opacity }]}>      
      <View style={[styles.toast, { backgroundColor: background, borderColor: borderCol }]}>        
        <Text style={[styles.text, { color: textColor }]}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: spacing.lg,
    left: 0,
    right: 0,
    alignItems: 'center',
    // 提升层级，覆盖 LanguageSelector 的下拉（zIndex 100）
    zIndex: 1001,
  },
  toast: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    ...shadows.md,
  },
  text: {
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.medium,
    letterSpacing: 0.2,
  },
});