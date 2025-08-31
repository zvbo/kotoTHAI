import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Colors from '@/constants/colors';
import { TERMS_OF_SERVICE } from '@/constants/legal';

export default function TermsOfServiceScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>{TERMS_OF_SERVICE.title}</Text>
      <Text style={styles.lastUpdated}>生效日期：{TERMS_OF_SERVICE.effectiveDate}</Text>

      <Text style={styles.content}>{TERMS_OF_SERVICE.intro}</Text>

      {TERMS_OF_SERVICE.sections.map((sec, idx) => (
        <View style={styles.section} key={idx}>
          <Text style={styles.sectionTitle}>{sec.title}</Text>
          <Text style={styles.sectionContent}>{sec.content}</Text>
        </View>
      ))}

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