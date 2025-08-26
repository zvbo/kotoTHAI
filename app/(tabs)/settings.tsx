import { useCallback, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ExternalLink, HelpCircle, Info, Star } from 'lucide-react-native';
import * as StoreReview from 'expo-store-review';
// 移除外部浏览器/深链，改用应用内路由
// import * as WebBrowser from 'expo-web-browser';
// import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import Colors from '@/constants/colors';
import { useAppContext } from '@/context/AppContext';
import { formatTime } from '@/utils/time';
import { shadows } from '@/styles/designSystem';
import { PURCHASE_OPTIONS, type PurchaseOptionItem } from '../../constants/purchases';

export default function SettingsScreen() {
  const { userState, resetUserTime, addTime } = useAppContext();
  const [showPurchaseOptions, setShowPurchaseOptions] = useState(false);

  // 合规的评分请求：不承诺奖励，不修改用户状态
  const handleRequestReview = useCallback(async () => {
    try {
      if (Platform.OS !== 'web' && (await StoreReview.hasAction())) {
        await StoreReview.requestReview();
      } else {
        Alert.alert('感谢支持', '您的支持对我们非常重要！');
      }
    } catch (e) {
      Alert.alert('暂不可用', '当前无法打开评分页面，请稍后再试');
    }
  }, []);

  // 测试版购买：根据选项 id 增加相应分钟数，可叠加
  const handlePurchase = useCallback((id: PurchaseOptionItem['id'], durationLabel: string, price: string) => {
    let seconds = 0;
    switch (id) {
      case '10m':
        seconds = 10 * 60; // 10 分钟
        break;
      case '30m':
        seconds = 30 * 60; // 30 分钟
        break;
      case '2h':
        seconds = 120 * 60; // 2 小时 = 120 分钟
        break;
      default:
        seconds = 0;
    }

    if (seconds > 0) {
      addTime(seconds);
      setShowPurchaseOptions(false);
      Alert.alert('已添加时长（测试）', `已为您增加 ${durationLabel}（${price}）。您可以多次购买叠加使用。`, [{ text: '好的' }]);
    }
  }, [addTime]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Time status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>翻译时长</Text>
        <View style={styles.timeCard}>
          <Text style={styles.timeValue}>{formatTime(userState.remainingTime)}</Text>
          <Text style={styles.timeLabel}>剩余</Text>
          
          <TouchableOpacity 
            style={styles.addTimeButton}
            onPress={() => setShowPurchaseOptions(true)}
            testID="add-time-button"
          >
            <Text style={styles.addTimeButtonText}>添加时长</Text>
          </TouchableOpacity>

          {__DEV__ && (
            <TouchableOpacity
              style={[styles.addTimeButton, { marginTop: 8, backgroundColor: Colors.secondary }]}
              onPress={() => {
                resetUserTime();
                Alert.alert('已重置', '免费时长已重置为 10 分钟（仅开发环境可见）');
              }}
              testID="reset-time-button"
            >
              <Text style={styles.addTimeButtonText}>重置免费时长（测试）</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 显示模式模块已按产品要求下线（web / iOS 均不显示） */}
      
      {/* Purchase options */}
      {showPurchaseOptions && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>购买选项</Text>
          
          <View style={styles.purchaseOptions}>
            {PURCHASE_OPTIONS.map((opt: PurchaseOptionItem) => (
              <PurchaseOption
                key={opt.id}
                title={opt.title}
                durationLabel={opt.durationLabel}
                price={opt.priceDisplay}
                onPress={() => handlePurchase(opt.id, opt.durationLabel, opt.priceDisplay)}
                featured={opt.featured}
              />
            ))}
          </View>
        </View>
      )}
      
      {/* Rate app */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>支持 KotoBa</Text>
        
        <TouchableOpacity 
          style={styles.optionButton}
          onPress={handleRequestReview}
          testID="rate-app-button"
        >
          <Star size={20} color={Colors.secondary} />
          <Text style={styles.optionText}>为 KotoBa 评分</Text>
        </TouchableOpacity>
      </View>
      
      {/* About & Help */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>关于</Text>
        
        <TouchableOpacity 
          style={styles.optionButton}
          onPress={() => router.push('/about/privacy')}
        >
          <Info size={20} color={Colors.primary} />
          <Text style={styles.optionText}>隐私政策</Text>
          <ExternalLink size={16} color={Colors.textSecondary} style={styles.externalIcon} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.optionButton}
          onPress={() => router.push('/about/terms')}
        >
          <Info size={20} color={Colors.primary} />
          <Text style={styles.optionText}>服务条款</Text>
          <ExternalLink size={16} color={Colors.textSecondary} style={styles.externalIcon} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.optionButton}
          onPress={() => router.push('/about/support')}
        >
          <HelpCircle size={20} color={Colors.primary} />
          <Text style={styles.optionText}>帮助与支持</Text>
          <ExternalLink size={16} color={Colors.textSecondary} style={styles.externalIcon} />
        </TouchableOpacity>
      </View>
      
      {/* App version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>KotoBa v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

type PurchaseOptionProps = {
  title: string;
  durationLabel: string;
  price: string;
  onPress: () => void;
  featured?: boolean;
};

function PurchaseOption({ title, durationLabel, price, onPress, featured = false }: PurchaseOptionProps) {
  return (
    <TouchableOpacity 
      style={[
        styles.purchaseOption,
        featured && styles.featuredOption
      ]}
      onPress={onPress}
    >
      {featured && <View style={styles.featuredBadge}><Text style={styles.featuredText}>最超值</Text></View>}
      <Text style={[styles.purchaseTitle, featured && styles.featuredTitle]}>{title}</Text>
      <Text style={styles.purchaseHours}>{durationLabel}</Text>
      <Text style={[styles.purchasePrice, featured && styles.featuredPrice]}>{price}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  timeCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  timeValue: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  addTimeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addTimeButtonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '500',
  },
  // （样式中保留 segment/hint 等旧样式以兼容将来的需求，但已不再渲染）
  segment: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 4,
    ...shadows.sm,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentItemActive: {
    backgroundColor: Colors.primary,
  },
  segmentText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: Colors.textLight,
  },
  hintText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  // ==============================
  purchaseOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  purchaseOption: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    width: '31%',
    alignItems: 'center',
    // 修复：使用设计系统阴影，跨平台一致
    ...shadows.md,
    position: 'relative',
  },
  featuredOption: {
    backgroundColor: Colors.primary,
    transform: [{ scale: 1.05 }],
  },
  featuredBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredText: {
    color: Colors.textLight,
    fontSize: 10,
    fontWeight: '700',
  },
  purchaseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  featuredTitle: {
    color: Colors.textLight,
  },
  purchaseHours: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  purchasePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  featuredPrice: {
    color: Colors.textLight,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  optionText: {
    fontSize: 16,
    color: Colors.textPrimary,
    marginLeft: 12,
    flex: 1,
  },
  externalIcon: {
    marginLeft: 8,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  versionText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});