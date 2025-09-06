import { useCallback, useState, useEffect, useRef } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as StoreReview from 'expo-store-review';
import { router } from 'expo-router';
import type { Product, Purchase, PurchaseError } from 'react-native-iap';
import type { EmitterSubscription } from 'react-native';
import {
  initConnection,
  getProducts,
  purchaseUpdatedListener,
  purchaseErrorListener,
  requestPurchase,
  finishTransaction,
  clearTransactionIOS,
} from 'react-native-iap';

import Colors from '@/constants/colors';
import { useAppContext } from '@/context/AppContext';
import { formatTime } from '@/utils/time';
import { shadows } from '@/styles/designSystem';
import { PURCHASE_OPTIONS, type PurchaseOptionItem, IAP_PRODUCT_ID_BY_OPTION, IAP_PRODUCT_IDS, OPTION_BY_IAP_PRODUCT_ID } from '../../constants/purchases';
import { verifyIAP } from '@/utils/api';

export default function SettingsScreen() {
  const { userState, resetUserTime, addTime } = useAppContext();
  const [showPurchaseOptions, setShowPurchaseOptions] = useState(false);
  // IAP 相关状态
  const [iapReady, setIapReady] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [priceByOption, setPriceByOption] = useState<Record<string, string>>({});
  const purchaseUpdateSub = useRef<EmitterSubscription | null>(null);
  const purchaseErrorSub = useRef<EmitterSubscription | null>(null);

  // 初始化 IAP & 拉取商品
  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    let mounted = true;
    const initializeIap = async () => {
      try {
        await initConnection();
        // iOS 无需 flushPending（Android 专有），若 SDK 提供 clearTransactionIOS 则安全清理一次
        if (clearTransactionIOS) {
          await clearTransactionIOS();
        }
        if (!mounted) return;
        setIapReady(true);
        setLoadingProducts(true);
        
        const prods: Product[] = await getProducts({ skus: IAP_PRODUCT_IDS });
        const next: Record<string, string> = {};
        for (const p of prods) {
          const optionId = OPTION_BY_IAP_PRODUCT_ID[p.productId];
          if (optionId) {
            next[optionId] = p.localizedPrice || p.price || '';
          }
        }
        if (!mounted) return;
        setPriceByOption(prev => ({ ...prev, ...next }));
      } catch (e) {
        console.warn('[IAP] init/getProducts failed:', e);
      } finally {
        if (mounted) {
          setLoadingProducts(false);
        }
      }
    };

    initializeIap();

    purchaseUpdateSub.current = purchaseUpdatedListener(async (purchase: Purchase) => {
      try {
        const receipt = purchase.transactionReceipt;
        const { productId, transactionId } = purchase;
        if (!receipt || !productId) return;

        setProcessing(true);
        const verify = await verifyIAP({ platform: 'ios', productId, receipt, transactionId });
        if (verify?.ok && verify.grantSeconds) {
          addTime(verify.grantSeconds);
          try {
            await finishTransaction({ purchase, isConsumable: true });
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

    purchaseErrorSub.current = purchaseErrorListener((err: PurchaseError) => {
      console.warn('[IAP] purchase error:', err);
      if (err?.code !== 'E_USER_CANCELLED') {
        Alert.alert('购买失败', err?.message || '请稍后重试');
      }
      setProcessing(false);
    });

    return () => {
      mounted = false;
      purchaseUpdateSub.current?.remove();
      purchaseErrorSub.current?.remove();
    };
  }, [addTime]);

  const handleRequestReview = useCallback(async () => {
    try {
      if (Platform.OS !== 'web' && (await StoreReview.hasAction())) {
        await StoreReview.requestReview();
      } else {
        Alert.alert('感谢支持', '您的支持对我们非常重要！');
      }
    } catch {
      Alert.alert('暂不可用', '当前无法打开评分页面，请稍后再试');
    }
  }, []);

  const handlePurchase = useCallback(async (id: PurchaseOptionItem['id']) => {
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
      await requestPurchase({ sku: productId, andDangerouslyFinishTransactionAutomaticallyIOS: false });
    } catch (e) {
      const error = e as PurchaseError;
      console.warn('[IAP] requestPurchase failed:', error);
      if (error.code !== 'E_USER_CANCELLED') {
        Alert.alert('购买失败', error?.message || '请稍后再试');
      }
      setProcessing(false);
    }
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>翻译时长</Text>
        <View style={styles.timeCard}>
          <Text style={styles.timeValue}>{formatTime(userState.remainingTime)}</Text>
          <Text style={styles.timeLabel}>剩余</Text>
          
          <TouchableOpacity 
            className={(!iapReady || processing) ? 'opacity-70' : ''}
            style={styles.addTimeButton}
            onPress={() => {
              if (Platform.OS !== 'ios') {
                Alert.alert('暂不支持', '购买目前仅支持在 iPhone 上进行，请在 iOS 设备上打开应用完成购买。');
                return;
              }
              setShowPurchaseOptions(true);
            }}
            disabled={Platform.OS === 'ios' ? (!iapReady || processing) : processing}
            testID="add-time-button"
          >
            <Text style={styles.addTimeButtonText}>{processing ? '处理中…' : '添加时长'}</Text>
          </TouchableOpacity>

          {__DEV__ && (
            <TouchableOpacity
              style={[styles.addTimeButton, styles.devButton]}
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
      
      {showPurchaseOptions && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>购买选项</Text>
          
          {loadingProducts && (
            <View className="py-2">
              <ActivityIndicator color={Colors.primary} />
            </View>
          )}
          
          <View style={styles.purchaseOptions}>
            {PURCHASE_OPTIONS.map((opt: PurchaseOptionItem) => (
              <PurchaseOption
                key={opt.id}
                title={opt.title}
                price={priceByOption[opt.id] || opt.priceDisplay}
                onPress={() => handlePurchase(opt.id)}
                featured={opt.featured}
              />
            ))}
          </View>
        </View>
      )}
      
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
  devButton: {
    marginTop: 8,
    backgroundColor: Colors.secondary,
  },
  addTimeButtonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '500',
  },
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
