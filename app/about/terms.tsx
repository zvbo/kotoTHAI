import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Colors from '@/constants/colors';

export default function TermsOfServiceScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>服务条款</Text>
      <Text style={styles.lastUpdated}>最后更新：2024年12月</Text>

      <Text style={styles.content}>
        欢迎使用 kotoTHAI。本服务条款是您（“用户”）与朱媛媛（“我们”或“开发者”）之间关于使用本应用的法律协议。请在使用前仔细阅读并同意以下条款。
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. 服务内容</Text>
        <Text style={styles.sectionContent}>
          本应用提供语音转写、翻译和语音合成功能，并可能不断更新与优化。我们保留随时修改、暂停或终止部分或全部服务的权利。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. 合理使用</Text>
        <Text style={styles.sectionContent}>
          您应遵守适用法律法规与社会公序良俗，不得利用本应用从事违法、侵权、骚扰、欺诈或其他不当行为。我们有权在合理怀疑滥用时采取限制或终止服务的措施。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. 付费与退款</Text>
        <Text style={styles.sectionContent}>
          • 应用内购买（IAP）：若通过 Apple App Store 购买服务或时长，价格与结算以平台显示为准，遵循平台的支付与退款政策。{"\n"}
          • 消费型商品：翻译时长等消耗型权益在兑换后不提供退货或转移，除非适用法律另有规定。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. 知识产权</Text>
        <Text style={styles.sectionContent}>
          本应用中的商标、Logo、界面设计、代码与文档等受法律保护。未经授权，您不得复制、修改、发布、二次销售或用于商业目的。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. 第三方服务</Text>
        <Text style={styles.sectionContent}>
          为实现转写、翻译与合成，我们会将必要数据传输给 OpenAI 等服务提供商。第三方服务商可能制定了各自的条款与隐私政策，请您一并查阅并遵守。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. 免责声明</Text>
        <Text style={styles.sectionContent}>
          在适用法律允许的最大范围内，我们不对服务的连续性、准确性或适配性作出明示或默示保证。因不可抗力、第三方原因或用户使用不当导致的损失，我们不承担相应责任。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>7. 终止</Text>
        <Text style={styles.sectionContent}>
          如您严重或多次违反本条款，我们可暂停或终止对您的服务；您也可以随时停止使用并卸载本应用。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>8. 适用法律与争议解决</Text>
        <Text style={styles.sectionContent}>
          本条款适用以下国家/地区的相关法律：文莱、柬埔寨、印度尼西亚、老挝、马来西亚、缅甸、菲律宾、新加坡、泰国和越南。若发生争议，双方应先友好协商；协商不成的，可向您的居住地或我们所在地有管辖权的法院提起诉讼（不排除适用的强制性消费者保护法律赋予的权利）。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>9. 条款更新</Text>
        <Text style={styles.sectionContent}>
          我们可能根据业务或法律要求更新本条款，并在应用内以适当方式通知。更新后，您继续使用即视为接受变更。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>10. 联系方式</Text>
        <Text style={styles.sectionContent}>
          如对本条款有疑问或争议处理事宜，请联系开发者朱媛媛。
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2024 朱媛媛 - kotoTHAI</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  contentContainer: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  lastUpdated: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  content: { fontSize: 16, color: Colors.textPrimary, lineHeight: 24, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginBottom: 12 },
  sectionContent: { fontSize: 16, color: Colors.textSecondary, lineHeight: 24 },
  footer: { alignItems: 'center', marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: Colors.border },
  footerText: { fontSize: 14, color: Colors.textSecondary },
});