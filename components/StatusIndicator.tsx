import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ConversationStatus } from '@/types';
import { formatTime } from '@/utils/time';
import { colors, spacing, shadows, typography } from '@/styles/designSystem';

type StatusIndicatorProps = {
  status: ConversationStatus | 'recording';
  isActive: boolean;
  remainingTime: number;
  onPress: () => void;
};

export default function StatusIndicator({ 
  status, 
  isActive, 
  remainingTime, 
  onPress 
}: StatusIndicatorProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Start pulsing animation when active
  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
    
    return () => {
      pulseAnim.stopAnimation();
    };
  }, [isActive, pulseAnim]);

  // Get status text based on current status
  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return '点击开始';
      case 'listening':
        return '正在听取...';
      case 'translating':
        return '正在翻译...';
      case 'speaking':
        return '正在说话...';
      case 'error':
        return '错误';
      case 'weak_signal':
        return '信号弱...';
      case 'time_expired':
        return '时间已用尽';
      case 'recording':
        return '正在录音...';
      default:
        return '就绪';
    }
  };

  // Get indicator colors based on status (gradient colors)
  const getIndicatorColors = (): [string, string] => {
    switch (status) {
      case 'listening':
        return [colors.accent.green, colors.accent.green];
      case 'translating':
      case 'speaking':
        return [colors.accent.green, colors.accent.rust];
      case 'error':
      case 'time_expired':
        return [colors.accent.rust, colors.accent.rust];
      case 'weak_signal':
        return [colors.accent.rust, colors.accent.rust];
      case 'recording':
        return [colors.accent.green, colors.accent.green];
      default:
        return [colors.primary.beige, colors.primary.sand];
    }
  };

  const isDisabled = status === 'time_expired';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
                className={isDisabled ? 'opacity-60' : ''}
        style={styles.touchable}
        testID="status-indicator"
      >
        <Animated.View
          style={[
            styles.indicatorContainer,
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          <LinearGradient
            colors={getIndicatorColors()}
            style={styles.indicator}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.innerCircle}>
              <Text style={styles.statusText}>{getStatusText()}</Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
      
      <Text style={styles.timeText}>
        剩余: {formatTime(remainingTime)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  touchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    ...shadows.xl,
  },
  indicator: {
    width: '100%',
    height: '100%',
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  innerCircle: {
    width: '90%',
    height: '90%',
    borderRadius: 72,
    backgroundColor: colors.surface.paper,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border.light,
  },
  statusText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.h3,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  timeText: {
    marginTop: spacing.lg,
    fontSize: typography.fontSize.small,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.normal,
    letterSpacing: 0.3,
  },
});