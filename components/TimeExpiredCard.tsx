import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Colors from '@/constants/colors';
import { shadows } from '@/styles/designSystem';

type TimeExpiredCardProps = {
  onPurchase: () => void;
};

export default function TimeExpiredCard({ onPurchase }: TimeExpiredCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>翻译时间已用尽</Text>
      
      <Text style={styles.message}>
        您已用尽所有免费翻译时间。购买更多时间以继续使用 KotoBa。
      </Text>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={onPurchase}
        testID="purchase-time-button"
      >
        <Text style={styles.buttonText}>购买时间</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    padding: 20,
    margin: 16,
    alignItems: 'center',
    // 修复：使用设计系统阴影，跨平台一致
    ...shadows.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '500',
  },
});