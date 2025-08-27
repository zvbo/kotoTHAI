import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ALL_LANGUAGES } from '@/constants/languages';
import { Language } from '@/types';
import { colors, spacing, borderRadius, shadows, typography } from '@/styles/designSystem';

type LanguagePickerModalProps = {
  visible: boolean;
  selectedLanguage: Language;
  onSelect: (language: Language) => void;
  onClose: () => void;
  title?: string;
};

export default function LanguagePickerModal({
  visible,
  selectedLanguage,
  onSelect,
  onClose,
  title = '选择语言'
}: LanguagePickerModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <LinearGradient
          colors={[colors.surface.paper, colors.surface.white]}
          style={styles.modalContent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={20} color="#333" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={ALL_LANGUAGES}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.languageItemContainer}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                testID={`language-option-${item.code}`}
              >
                <LinearGradient
                  colors={selectedLanguage.code === item.code 
                    ? [colors.accent.green, colors.accent.rust]
                    : [colors.surface.white, colors.surface.paper]
                  }
                  style={[
                    styles.languageItem,
                    selectedLanguage.code === item.code && styles.selectedItem
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                <Text style={styles.languageFlag}>{item.flag}</Text>
                <View style={styles.languageInfo}>
                  <Text style={styles.languageName}>{item.name}</Text>
                  {item.nativeName && item.nativeName !== item.name && (
                    <Text style={styles.nativeName}>{item.nativeName}</Text>
                  )}
                </View>
                  {selectedLanguage.code === item.code && (
                    <View style={styles.selectedIndicator} />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
            style={styles.list}
          />
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    maxHeight: '75%',
    ...shadows.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.h3,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface.white,
  },
  list: {
    marginTop: spacing.md,
  },
  languageItemContainer: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  selectedItem: {
    borderColor: colors.accent.green,
    borderWidth: 2,
  },
  languageFlag: {
    fontSize: 28,
    marginRight: spacing.lg,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    letterSpacing: 0.3,
  },
  nativeName: {
    fontSize: typography.fontSize.small,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  selectedIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent.green,
    ...shadows.sm,
  },
});