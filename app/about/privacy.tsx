import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Colors from '@/constants/colors';

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>隐私政策</Text>
      <Text style={styles.lastUpdated}>最后更新：2024年12月</Text>
      
      <Text style={styles.content}>
        朱媛媛（以下简称"我们"或"开发者"）开发的kotoTHAI应用程序（以下简称"本应用"）重视用户隐私保护。本隐私政策说明我们如何收集、使用和保护您在使用本应用时的个人信息。
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. 我们收集哪些信息</Text>
        <Text style={styles.sectionContent}>
          • 语音与文本内容：您在使用翻译/语音对话功能时的音频数据与对应文本（转写/翻译结果）。{"\n"}
          • 使用数据与日志：为改进稳定性与排障所需的崩溃日志、错误信息与基本设备信息（如系统版本、机型）。{"\n"}
          • 账户信息（如适用）：若未来提供账号体系，可能包含昵称、头像、邮箱等。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. 信息如何使用</Text>
        <Text style={styles.sectionContent}>
          • 服务提供：将您的音频/文本发送至第三方 AI 服务商（如 OpenAI）进行转写、翻译与语音合成，仅用于完成您发起的请求。{"\n"}
          • 安全与质量：用于防止滥用、优化性能、排查问题与改进功能。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. 第三方共享</Text>
        <Text style={styles.sectionContent}>
          • 技术处理方：我们会将必要数据传输给 OpenAI 等服务提供商以完成实时转写/翻译/合成。这些服务提供商仅为实现该功能而处理数据。{"\n"}
          • 法律要求：在法律法规或监管要求的范围内，我们可能披露必要信息。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. 数据保留与删除</Text>
        <Text style={styles.sectionContent}>
          • 我们不长期保存您的原始音频；仅为完成您的请求在必要时间内处理与临时缓存。{"\n"}
          • 文本内容与使用日志会按最小化与合规原则保存，用于服务质量与问题追踪；您可通过"联系我们"申请删除。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. 儿童隐私</Text>
        <Text style={styles.sectionContent}>
          本应用面向一般用户，不面向 13 岁以下儿童。如您是未成年人，请在监护人同意与指导下使用。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. 安全性</Text>
        <Text style={styles.sectionContent}>
          采取加密传输、访问控制等合理的安全措施，降低数据风险。但互联网传输与存储不能保证绝对安全。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>7. 您的权利</Text>
        <Text style={styles.sectionContent}>
          访问、更正、删除您的个人信息；撤回同意；获取数据副本（在符合法律规定的前提下）。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>8. 跨境传输</Text>
        <Text style={styles.sectionContent}>
          因使用第三方 AI 与云服务，数据可能在您所在国家/地区之外被处理。我们会确保合法的跨境传输机制并尽力保护您的权益。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>9. 变更</Text>
        <Text style={styles.sectionContent}>
          我们可能更新本政策并在应用内或官网显著位置提示。重要变更会提前通知。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>10. 适用法律</Text>
        <Text style={styles.sectionContent}>
          本隐私政策适用于文莱、柬埔寨、印度尼西亚、老挝、马来西亚、缅甸、菲律宾、新加坡、泰国和越南的法律法规。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>11. 联系我们</Text>
        <Text style={styles.sectionContent}>
          如有任何隐私相关问题，请联系开发者朱媛媛。
        </Text>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2024 朱媛媛 - kotoTHAI</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  lastUpdated: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  content: {
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 24,
    marginBottom: 24,
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
  sectionContent: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});