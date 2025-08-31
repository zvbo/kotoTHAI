import { useCallback, useState, useEffect, useRef } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as StoreReview from 'expo-store-review';
// 移除外部浏览器/深链，改用应用内路由
// import * as WebBrowser from 'expo-web-browser';
// import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import Colors from '@/constants/colors';
import { useAppContext } from '@/context/AppContext';
import { formatTime } from '@/utils/time';
import { shadows } from '@/styles/designSystem';
import { PURCHASE_OPTIONS, type PurchaseOptionItem, IAP_PRODUCT_ID_BY_OPTION, IAP_PRODUCT_IDS, OPTION_BY_IAP_PRODUCT_ID } from '../../constants/purchases';
import * as RNIap from 'react-native-iap';
import { verifyIAP } from '@/utils/api';

export default function SettingsScreen() {
  const { userState, resetUserTime, addTime } = useAppContext();
  const [showPurchaseOptions, setShowPurchaseOptions] = useState(false);
  // IAP 相关状态
  const [iapReady, setIapReady] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [processing, setProcessing] = useState(false);
  // optionId -> 显示的本地化价格
  const [priceByOption, setPriceByOption] = useState<Record<PurchaseOptionItem['id'], string>>({} as any);
  const purchaseUpdateSub = useRef<any>(null);
  const purchaseErrorSub = useRef<any>(null);

  // 初始化 IAP & 拉取商品
  useEffect(() => {
    // 仅在原生 iOS 环境下启用 IAP，避免在 Web/Safari 中触发 E_IAP_NOT_AVAILABLE
    if (Platform.OS !== 'ios') {
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const ok = await RNIap.initConnection();
        if (!ok) return;
        // iOS 无需 flushPending（Android 专有），若 SDK 提供 clearTransactionIOS 则安全清理一次
        try { await (RNIap as any).clearTransactionIOS?.(); } catch {}
        if (!mounted) return;
        setIapReady(true);
        setLoadingProducts(true);
        // v13 兼容：某些环境下需要对象参数；加 any 规避类型差异
        const prods = await (RNIap as any).getProducts?.({ skus: IAP_PRODUCT_IDS }) ?? await (RNIap as any).getProducts(IAP_PRODUCT_IDS);
        const next: Partial<Record<PurchaseOptionItem['id'], string>> = {};
        for (const p of prods || []) {
          const optionId = OPTION_BY_IAP_PRODUCT_ID[p.productId];
          if (optionId) {
            // 优先 localizedPrice / priceString
            next[optionId] = p.localizedPrice || p.priceString || p.price || '';
          }
        }
        if (!mounted) return;
        setPriceByOption(prev => ({ ...prev, ...(next as any) }));
      } catch (e) {
        console.warn('[IAP] init/getProducts failed:', e);
      } finally {
        setLoadingProducts(false);
      }
    })();

    // 订阅购买事件（仅 iOS 原生）
    purchaseUpdateSub.current = RNIap.purchaseUpdatedListener(async (purchase: any) => {
      try {
        if (!purchase) return;
        const receipt: string | undefined = purchase.transactionReceipt || purchase.originalJson || purchase.receipt;
        const productId: string | undefined = purchase.productId;
        const transactionId: string | undefined = purchase.transactionId || purchase.transactionIdIOS || purchase.transactionIdentifier;
        if (!receipt || !productId) return;

        setProcessing(true);
        const verify = await verifyIAP({ platform: 'ios', productId, receipt, transactionId });
        if (verify?.ok && verify.grantSeconds) {
          addTime(verify.grantSeconds);
          try {
            await (RNIap as any).finishTransaction?.({ purchase, isConsumable: true }) ?? (RNIap as any).finishTransaction(purchase, true);
          } catch (finErr) {
            console.warn('[IAP] finishTransaction failed:', finErr);
          }
          Alert.alert('购买成功', '已为您添加时长，感谢支持！');
        } else {
          Alert.alert('购买未完成', verify?.message || '校验失败，请稍后重试');
        }
      } catch (err) {
        console.error('[IAP] purchaseUpdated handler error:', err);
        Alert.alert('购买异常', '处理购买时出错，请稍后重试');
      } finally {
        setProcessing(false);
      }
    });

    purchaseErrorSub.current = RNIap.purchaseErrorListener((err: any) => {
      console.warn('[IAP] purchase error:', err);
      if (err?.code !== 'E_USER_CANCELLED') {
        Alert.alert('购买失败', err?.message || '请稍后重试');
      }
      setProcessing(false);
    });

    return () => {
      mounted = false;
      try { purchaseUpdateSub.current?.remove?.(); } catch {}
      try { purchaseErrorSub.current?.remove?.(); } catch {}
      try { RNIap.endConnection(); } catch {}
    };
  }, [addTime]);

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

  // 真实购买流程
  const handlePurchase = useCallback(async (id: PurchaseOptionItem['id'], title: string, price: string) => {
    if (Platform.OS !== 'ios') {
      Alert.alert('暂不支持', '当前版本仅支持 iOS 内购');
      return;
    }
    const productId = IAP_PRODUCT_ID_BY_OPTION[id];
    if (!productId) {
      Alert.alert('商品不可用', '请稍后再试');
      return;
    }
    try {
      setProcessing(true);
      // 不自动完成交易，等待服务端确认
      await (RNIap as any).requestPurchase?.({ sku: productId, andDangerouslyFinishTransactionAutomatically: false })
        ?? (RNIap as any).requestPurchase(productId, false);
    } catch (e: any) {
      console.warn('[IAP] requestPurchase failed:', e);
      Alert.alert('购买失败', e?.message || '请稍后再试');
      setProcessing(false);
    }
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Time status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>翻译时长</Text>
        <View style={styles.timeCard}>
          <Text style={styles.timeValue}>{formatTime(userState.remainingTime)}</Text>
          <Text style={styles.timeLabel}>剩余</Text>
          
          <TouchableOpacity 
            style={[styles.addTimeButton, (!iapReady || processing) && { opacity: 0.7 }]}
            onPress={() => setShowPurchaseOptions(true)}
            disabled={!iapReady || processing}
            testID="add-time-button"
          >
            <Text style={styles.addTimeButtonText}>{processing ? '处理中…' : '添加时长'}</Text>
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
          
          {loadingProducts && (
            <View style={{ paddingVertical: 8 }}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          )}
          
          <View style={styles.purchaseOptions}>
            {PURCHASE_OPTIONS.map((opt: PurchaseOptionItem) => (
              <PurchaseOption
                key={opt.id}
                title={opt.title}
                price={priceByOption[opt.id] || opt.priceDisplay}
                onPress={() => handlePurchase(opt.id, opt.title, priceByOption[opt.id] || opt.priceDisplay)}
                featured={opt.featured}
              />
            ))}
          </View>
        </View>
      )}
      
      {/* Rate app */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>支持 kotoTHAI</Text>
        
        <TouchableOpacity 
          style={styles.optionButton}
          onPress={handleRequestReview}
          testID="rate-app-button"
        >
          <MaterialCommunityIcons name="star-outline" size={20} color={Colors.secondary} />
          <Text style={styles.optionText}>为 kotoTHAI 评分</Text>
        </TouchableOpacity>
      </View>
      
      {/* About & Help */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>关于</Text>
        
        <TouchableOpacity 
          style={styles.optionButton}
          onPress={() => router.push('/about/privacy')}
        >
          <MaterialCommunityIcons name="information-outline" size={20} color={Colors.primary} />
          <Text style={styles.optionText}>隐私政策</Text>
          <MaterialCommunityIcons name="open-in-new" size={16} color={Colors.textSecondary} style={styles.externalIcon} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.optionButton}
          onPress={() => router.push('/about/terms')}
        >
          <MaterialCommunityIcons name="information-outline" size={20} color={Colors.primary} />
          <Text style={styles.optionText}>服务条款</Text>
          <MaterialCommunityIcons name="open-in-new" size={16} color={Colors.textSecondary} style={styles.externalIcon} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.optionButton}
          onPress={() => router.push('/about/support')}
        >
          <MaterialCommunityIcons name="help-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.optionText}>帮助与支持</Text>
          <MaterialCommunityIcons name="open-in-new" size={16} color={Colors.textSecondary} style={styles.externalIcon} />
        </TouchableOpacity>
      </View>
      
      {/* App version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>kotoTHAI v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

type PurchaseOptionProps = {
  title: string;
  price: string;
  onPress: () => void;
  featured?: boolean;
};

function PurchaseOption({ title, price, onPress, featured = false }: PurchaseOptionProps) {
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
      <Text style={styles.purchaseHours}>{title}</Text>
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