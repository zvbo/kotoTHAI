import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowLeftRight } from 'lucide-react-native';

import Colors from '@/constants/colors';
import { Language } from '@/types';
import { shadows } from '@/styles/designSystem';

type LanguageSelectorProps = {
  sourceLanguage: Language;
  targetLanguage: Language;
  onSourcePress: () => void;
  onTargetPress: () => void;
  onSwapPress: () => void;
  disabled?: boolean;
};

export default function LanguageSelector({
  sourceLanguage,
  targetLanguage,
  onSourcePress,
  onTargetPress,
  onSwapPress,
  disabled = false
}: LanguageSelectorProps) {
  return (
    <View style={styles.container}>
      <LanguageButton 
        language={sourceLanguage} 
        onPress={() => {}} // Source language is fixed (Chinese)
        disabled={true} // Always disabled since Chinese is fixed
        testID="source-language-button"
      />
      
      <TouchableOpacity 
        style={styles.swapButton} 
        onPress={onTargetPress} // Just open target language picker
        disabled={disabled}
        testID="swap-languages-button"
      >
        <ArrowLeftRight size={20} color={disabled ? Colors.textSecondary : Colors.primary} />
      </TouchableOpacity>
      
      <LanguageButton 
        language={targetLanguage} 
        onPress={onTargetPress} 
        disabled={disabled}
        testID="target-language-button"
      />
    </View>
  );
}

type LanguageButtonProps = {
  language: Language;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
};

function LanguageButton({ language, onPress, disabled = false, testID }: LanguageButtonProps) {
  return (
    <TouchableOpacity 
      style={[styles.languageButton, disabled && styles.disabled]} 
      onPress={onPress}
      disabled={disabled}
      testID={testID}
    >
      <Text style={styles.flag}>{language.flag}</Text>
      <Text style={styles.languageName}>{language.name}</Text>
      {language.nativeName && language.nativeName !== language.name && (
        <Text style={styles.nativeName}>{language.nativeName}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  languageButton: {
    backgroundColor: Colors.backgroundSecondary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 120,
    // 移除原生端专用的 shadow* 与 elevation，改用跨平台阴影
    ...shadows.sm,
  },
  flag: {
    fontSize: 24,
    marginBottom: 4,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  nativeName: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  swapButton: {
    backgroundColor: Colors.background,
    padding: 10,
    borderRadius: 20,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disabled: {
    opacity: 0.6,
  },
});