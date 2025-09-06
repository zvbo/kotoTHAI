import { StyleSheet, Text, View, Pressable, GestureResponderEvent } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import Colors from '@/constants/colors';
import { Language } from '@/types';
import { shadows, spacing } from '@/styles/designSystem';
import { ALL_LANGUAGES } from '@/constants/languages';
import LanguageBubble from './LanguageBubble';

type LanguageSelectorProps = {
  sourceLanguage: Language;
  targetLanguage: Language;
  onSourcePress: () => void;
  onTargetPress: () => void;
  onSwapPress: () => void;
  disabled?: boolean;
  showSourcePicker?: boolean;
  showTargetPicker?: boolean;
  onSelectSource?: (lang: Language) => void;
  onSelectTarget?: (lang: Language) => void;
  showLanguageBubbles?: boolean;
  sourceBubbleText?: string;
  targetBubbleText?: string;
};

export default function LanguageSelector({
  sourceLanguage,
  targetLanguage,
  onSourcePress,
  onTargetPress,
  onSwapPress,
  disabled = false,
  showSourcePicker = false,
  showTargetPicker = false,
  onSelectSource,
  onSelectTarget,
  showLanguageBubbles = false,
  sourceBubbleText,
  targetBubbleText,
}: LanguageSelectorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.buttonWrapper}>
        {showLanguageBubbles && (
          <LanguageBubble
            language={sourceLanguage}
            position="left"
            visible={true}
            text={sourceBubbleText}
          />
        )}
        <LanguageButton 
          language={sourceLanguage} 
          onPress={() => {
            console.log('[LanguageSelector] Source button pressed.');
            onSourcePress();
          }}
          disabled={disabled}
          testID="source-language-button"
        />
        {showSourcePicker && (
          <View style={[styles.dropdown, styles.dropdownLeft]} pointerEvents="auto">
            {ALL_LANGUAGES.map((item) => {
              const selected = item.code === sourceLanguage.code;
              return (
                <Pressable
                  key={`src-${item.code}`}
                  style={({ pressed }) => [
                    styles.dropdownItem, 
                    selected && styles.dropdownItemSelected,
                    pressed && styles.dropdownItemPressed
                  ]}
                  onPress={(e: GestureResponderEvent) => {
                    console.log(`[LanguageSelector] Source dropdown item pressed: ${item.name}`);
                    e.stopPropagation();
                    onSelectSource?.(item);
                  }}
                  testID={`source-dropdown-${item.code}`}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <View className="flex-1">
                    <Text style={styles.dropdownItemText}>{item.name}</Text>
                    {item.nativeName && item.nativeName !== item.name && (
                      <Text style={styles.dropdownItemSubText}>{item.nativeName}</Text>
                    )}
                  </View>
                  {selected ? <Text style={styles.selectedDot}>●</Text> : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
      
      <Pressable 
        style={({ pressed }) => [
          styles.swapButton,
          pressed && styles.swapButtonPressed
        ]}
        onPress={() => {
          console.log('[LanguageSelector] Swap button pressed.');
          onSwapPress();
        }}
        disabled={disabled}
        testID="swap-languages-button"
      >
        <MaterialCommunityIcons 
          name="swap-horizontal" 
          size={20} 
          color={disabled ? Colors.textSecondary : Colors.primary} 
        />
      </Pressable>
      
      <View style={styles.buttonWrapper}>
        {showLanguageBubbles && (
          <LanguageBubble
            language={targetLanguage}
            position="right"
            visible={true}
            text={targetBubbleText}
          />
        )}
        <LanguageButton 
          language={targetLanguage} 
          onPress={() => {
            console.log('[LanguageSelector] Target button pressed.');
            onTargetPress();
          }} 
          disabled={disabled}
          testID="target-language-button"
        />
        {showTargetPicker && (
          <View style={[styles.dropdown, styles.dropdownRight]} pointerEvents="auto">
            {ALL_LANGUAGES.map((item) => {
              const selected = item.code === targetLanguage.code;
              return (
                <Pressable
                  key={`tgt-${item.code}`}
                  style={({ pressed }) => [
                    styles.dropdownItem, 
                    selected && styles.dropdownItemSelected,
                    pressed && styles.dropdownItemPressed
                  ]}
                  onPress={(e: GestureResponderEvent) => {
                    console.log(`[LanguageSelector] Target dropdown item pressed: ${item.name}`);
                    e.stopPropagation();
                    onSelectTarget?.(item);
                  }}
                  testID={`target-dropdown-${item.code}`}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <View className="flex-1">
                    <Text style={styles.dropdownItemText}>{item.name}</Text>
                    {item.nativeName && item.nativeName !== item.name && (
                      <Text style={styles.dropdownItemSubText}>{item.nativeName}</Text>
                    )}
                  </View>
                  {selected ? <Text style={styles.selectedDot}>●</Text> : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

type LanguageButtonProps = {
  language: Language;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
  bottomLabel?: string;
};

function LanguageButton({ language, onPress, disabled = false, testID, bottomLabel }: LanguageButtonProps) {
  return (
    <Pressable 
      style={({ pressed }) => [
        styles.languageButton, 
        disabled && styles.disabled,
        pressed && !disabled && styles.languageButtonPressed
      ]}
      onPress={(e: GestureResponderEvent) => {
        console.log(`[LanguageButton] Press event on ${bottomLabel} button.`);
        e.stopPropagation();
        onPress();
      }}
      disabled={disabled}
      testID={testID}
    >
      <Text style={styles.flag}>{language.flag}</Text>
      <Text style={styles.languageName}>{language.name}</Text>
      {language.nativeName && language.nativeName !== language.name && (
        <Text style={styles.nativeName}>{language.nativeName}</Text>
      )}
      {bottomLabel ? <Text style={styles.bottomLabel}>{bottomLabel}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    overflow: 'visible',
    zIndex: 50,
    position: 'relative',
  },
  buttonWrapper: {
    flex: 1,
    overflow: 'visible',
    zIndex: 60,
    position: 'relative',
  },
  languageButton: {
    backgroundColor: Colors.backgroundSecondary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 120,
    minHeight: 100,
    ...shadows.sm,
  },
  languageButtonPressed: {
    backgroundColor: Colors.border,
    transform: [{ scale: 0.98 }],
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
  bottomLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  swapButton: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 20,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 70,
  },
  swapButtonPressed: {
    backgroundColor: Colors.border,
    transform: [{ scale: 0.95 }],
  },
  disabled: {
    opacity: 0.6,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    zIndex: 100,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
    minWidth: 180,
    maxWidth: 240,
    paddingVertical: 6,
    ...shadows.lg,
    elevation: 10,
    overflow: 'visible',
  },
  dropdownLeft: {
    left: 0,
  },
  dropdownRight: {
    right: 0,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    minHeight: 50,
  },
  dropdownItemSelected: {
    backgroundColor: '#F2FBF5',
  },
  dropdownItemPressed: {
    backgroundColor: '#E8F5E8',
  },
  dropdownItemText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  dropdownItemSubText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  selectedDot: {
    marginLeft: 8,
    color: Colors.primary,
    fontSize: 12,
  },
});
