import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Colors from '@/constants/colors';
import { PRIVACY_POLICY } from '@/constants/legal';

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>{PRIVACY_POLICY.title}</Text>
      <Text style={styles.lastUpdated}>最后更新日期：{PRIVACY_POLICY.lastUpdated}</Text>

      <Text style={styles.content}>{PRIVACY_POLICY.intro}</Text>

      {PRIVACY_POLICY.sections.map((sec, idx) => (
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