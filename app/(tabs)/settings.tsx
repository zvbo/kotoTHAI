import { useCallback, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ExternalLink, HelpCircle, Info, Star } from 'lucide-react-native';
import * as StoreReview from 'expo-store-review';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import Colors from '@/constants/colors';
import { useAppContext } from '@/context/AppContext';
import { formatTime } from '@/utils/time';
import { shadows } from '@/styles/designSystem';

export default function SettingsScreen() {
  const { userState, markAsRated, conversationMode, setConversationMode, resetUserTime } = useAppContext();
  const [showPurchaseOptions, setShowPurchaseOptions] = useState(false);

  // Handle review request
  const handleRequestReview = useCallback(async () => {
    if (userState.hasRated) {
      Alert.alert(
        "已评价",
        "您已经获得了评价KotoBa的免费时长奖励。感谢您的支持！"
      );
      return;
    }
    
    // Mark as rated first to ensure the user gets the reward
    markAsRated();
    
    // Request review if available on this platform
    if (Platform.OS !== 'web' && await StoreReview.hasAction()) {
      await StoreReview.requestReview();
    } else {
      Alert.alert(
        "谢谢！",
        "您的免费时长已添加。此平台不支持评价功能。"
      );
    }
  }, [userState.hasRated, markAsRated]);

  // Mock purchase functions
  const handlePurchase = useCallback((hours: number, price: string) => {
    Alert.alert(
      "购买功能暂不可用",
      "这是一个演示应用。此版本未实现应用内购买功能。",
      [{ text: "确定" }]
    );
  }, []);

  // Open external links
  const openLink = useCallback(async (url: string) => {
    try {
      if (await Linking.canOpenURL(url)) {
        await WebBrowser.openBrowserAsync(url);
      }
    } catch (error) {
      console.error('Error opening link:', error);
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
            style={styles.addTimeButton}
            onPress={() => setShowPurchaseOptions(true)}
            testID="add-time-button"
          >
            <Text style={styles.addTimeButtonText}>添加时长</Text>
          </TouchableOpacity>

          {/* 仅开发环境显示：一键重置免费时长到 10 分钟 */}
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
      
      {/* Conversation display mode */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>显示模式</Text>
        <View style={styles.segment}>
          <TouchableOpacity
            style={[
              styles.segmentItem,
              (conversationMode !== 'full') && styles.segmentItemActive,
            ]}
            onPress={() => setConversationMode('translation_only')}
            testID="mode-translation-only"
          >
            <Text style={[styles.segmentText, (conversationMode !== 'full') && styles.segmentTextActive]}>仅译文</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentItem,
              (conversationMode === 'full') && styles.segmentItemActive,
            ]}
            onPress={() => setConversationMode('full')}
            testID="mode-full"
          >
            <Text style={[styles.segmentText, (conversationMode === 'full') && styles.segmentTextActive]}>原文 + 译文</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hintText}>
          仅译文：界面更简洁，适合边走边用；完整模式：同时显示原文与译文，便于学习和核对。
        </Text>
      </View>
      
      {/* Purchase options */}
      {showPurchaseOptions && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>购买选项</Text>
          
          <View style={styles.purchaseOptions}>
            <PurchaseOption
              title="咖啡时光包"
              hours={2}
              price="¥20"
              onPress={() => handlePurchase(2, "¥20")}
            />
            
            <PurchaseOption
              title="商务包"
              hours={8}
              price="¥40"
              onPress={() => handlePurchase(8, "¥40")}
              featured
            />
            
            <PurchaseOption
              title="深度旅行包"
              hours={20}
              price="¥100"
              onPress={() => handlePurchase(20, "¥100")}
            />
          </View>
        </View>
      )}
      
      {/* Rate app */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>支持 KotoBa</Text>
        
        <TouchableOpacity 
          style={styles.optionButton}
          onPress={handleRequestReview}
          disabled={userState.hasRated}
          testID="rate-app-button"
        >
          <Star size={20} color={Colors.secondary} />
          <Text style={styles.optionText}>
            {userState.hasRated 
              ? "感谢您为 KotoBa 评分！" 
              : "为 KotoBa 评分并获得5分钟免费时长"}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* About & Help */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>关于</Text>
        
        <TouchableOpacity 
          style={styles.optionButton}
          onPress={() => openLink("https://example.com/privacy")}
        >
          <Info size={20} color={Colors.primary} />
          <Text style={styles.optionText}>隐私政策</Text>
          <ExternalLink size={16} color={Colors.textSecondary} style={styles.externalIcon} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.optionButton}
          onPress={() => openLink("https://example.com/terms")}
        >
          <Info size={20} color={Colors.primary} />
          <Text style={styles.optionText}>服务条款</Text>
          <ExternalLink size={16} color={Colors.textSecondary} style={styles.externalIcon} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.optionButton}
          onPress={() => openLink("https://example.com/help")}
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
  hours: number;
  price: string;
  onPress: () => void;
  featured?: boolean;
};

function PurchaseOption({ title, hours, price, onPress, featured = false }: PurchaseOptionProps) {
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
      <Text style={styles.purchaseHours}>{hours} 小时</Text>
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
  // === 新增：显示模式分段控件 ===
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