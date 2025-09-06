import React from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import { Language } from '@/types';
import Colors from '@/constants/colors';
import { shadows, spacing } from '@/styles/designSystem';

type LanguageBubbleProps = {
  language: Language;
  position: 'left' | 'right';
  visible: boolean;
  text?: string;
};

export default function LanguageBubble({ 
  language, 
  position, 
  visible, 
  text 
}: LanguageBubbleProps) {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, animatedValue]);

  if (!visible && !text) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        position === 'left' ? styles.leftPosition : styles.rightPosition,
        {
          opacity: animatedValue,
          transform: [{
            translateY: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [-10, 0],
            })
          }]
        }
      ]}
    >
      <View style={[
        styles.bubble,
        position === 'left' ? styles.leftBubble : styles.rightBubble
      ]}>
        <View style={styles.languageInfo}>
          <Text style={styles.flag}>{language.flag}</Text>
          <Text style={styles.languageName}>{language.name}</Text>
        </View>
        {text && (
          <Text style={styles.bubbleText}>{text}</Text>
        )}
      </View>
      
      {/* 气泡尖角 */}
      <View style={[
        styles.arrow,
        position === 'left' ? styles.leftArrow : styles.rightArrow
      ]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -60,
    zIndex: 100,
    maxWidth: 200,
  },
  leftPosition: {
    left: 20,
  },
  rightPosition: {
    right: 20,
  },
  bubble: {
    backgroundColor: Colors.backgroundSecondary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    minWidth: 120,
    alignItems: 'center',
    ...shadows.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  leftBubble: {
    borderBottomLeftRadius: 4,
  },
  rightBubble: {
    borderBottomRightRadius: 4,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  flag: {
    fontSize: 18,
    marginRight: 6,
  },
  languageName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  bubbleText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  arrow: {
    position: 'absolute',
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.backgroundSecondary,
  },
  leftArrow: {
    left: 16,
  },
  rightArrow: {
    right: 16,
  },
});