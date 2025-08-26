import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Colors from '@/constants/colors';

export default function HelpSupportScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>帮助与支持</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>如何使用</Text>
        <Text style={styles.sectionContent}>
          • 首页长按麦克风开始讲话，松手结束，我们会自动进行转写与翻译。{"\n"}
          • 若网络不佳，可稍后重试。建议在安静环境下使用以获得更好识别效果。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>常见问题</Text>
        <Text style={styles.sectionContent}>
          • 为什么没有看到原文？当前默认显示“仅译文”，您可以在后续版本的显示设置中切换模式。{"\n"}
          • 翻译不准确？请尽量清晰发音、缩短单次语句长度，或在网络更好的环境使用。{"\n"}
          • 购买后未到账？请稍等片刻或重新打开应用；若仍异常，请联系我们处理。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>联系我们</Text>
        <Text style={styles.sectionContent}>
          如需技术支持、退款咨询（按平台政策）或其他问题反馈，请联系开发者朱媛媛。
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2024 朱媛媛 - KotoBa</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  contentContainer: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16, textAlign: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginBottom: 12 },
  sectionContent: { fontSize: 16, color: Colors.textSecondary, lineHeight: 24 },
  footer: { alignItems: 'center', marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: Colors.border },
  footerText: { fontSize: 14, color: Colors.textSecondary },
});