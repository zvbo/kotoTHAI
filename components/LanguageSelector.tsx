import { StyleSheet, Text, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import Colors from '@/constants/colors';
import { Language } from '@/types';
import { shadows } from '@/styles/designSystem';
import { ALL_LANGUAGES } from '@/constants/languages';

type LanguageSelectorProps = {
  sourceLanguage: Language;
  targetLanguage: Language;
  onSourcePress: () => void;
  onTargetPress: () => void;
  onSwapPress: () => void;
  disabled?: boolean;
  // 新增：控制与回调（用于内联下拉列表）
  showSourcePicker?: boolean;
  showTargetPicker?: boolean;
  onSelectSource?: (lang: Language) => void;
  onSelectTarget?: (lang: Language) => void;
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
}: LanguageSelectorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.buttonWrapper}>
        <LanguageButton 
          language={sourceLanguage} 
          onPress={() => {
            console.log('[LanguageSelector] Source button pressed.');
            onSourcePress();
          }}
          disabled={disabled}
          testID="source-language-button"
          bottomLabel="listen"
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
                  onPress={(e: any) => {
                    console.log(`[LanguageSelector] Source dropdown item pressed: ${item.name}`);
                    try { e?.stopPropagation?.(); } catch {}
                    onSelectSource?.(item);
                  }}
                  testID={`source-dropdown-${item.code}`}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <View style={{ flex: 1 }}>
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
        <LanguageButton 
          language={targetLanguage} 
          onPress={() => {
            console.log('[LanguageSelector] Target button pressed.');
            onTargetPress();
          }} 
          disabled={disabled}
          testID="target-language-button"
          bottomLabel="speak"
        />
        {showTargetPicker && (
          <View style={[styles.dropdown, styles.dropdownRight]}
            // Web 上避免事件透传到下层按钮
            pointerEvents="auto"
          >
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
                  onPress={(e: any) => {
                    console.log(`[LanguageSelector] Target dropdown item pressed: ${item.name}`);
                    try { e?.stopPropagation?.(); } catch {}
                    onSelectTarget?.(item);
                  }}
                  testID={`target-dropdown-${item.code}`}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <View style={{ flex: 1 }}>
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
      onPress={(e: any) => {
        console.log(`[LanguageButton] Press event on ${bottomLabel} button.`);
        try { e?.stopPropagation?.(); } catch {}
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
    justifyContent: 'center',
    marginVertical: 20,
    position: 'relative',
  },
  buttonWrapper: {
    position: 'relative',
    zIndex: 1, // 确保各自容器形成堆叠上下文
  },
  languageButton: {
    backgroundColor: Colors.backgroundSecondary,
    paddingVertical: 16,  // 增大点击区域
    paddingHorizontal: 20, // 增大点击区域
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 120,
    minHeight: 100,  // 设置最小高度
    // 移除原生端专用的 shadow* 与 elevation，改用跨平台阴影
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
    padding: 16,  // 增大点击区域
    borderRadius: 20,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 48,  // 设置最小宽高
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapButtonPressed: {
    backgroundColor: Colors.border,
    transform: [{ scale: 0.95 }],
  },
  disabled: {
    opacity: 0.6,
  },
  // 下拉菜单样式
  dropdown: {
    position: 'absolute',
    top: '100%',
    zIndex: 9999,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
    minWidth: 180,
    maxWidth: 240,
    paddingVertical: 6,
    ...shadows.lg,
    elevation: 10,  // Android
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
    paddingVertical: 14,  // 增大点击区域
    paddingHorizontal: 16, // 增大点击区域
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    minHeight: 50,  // 设置最小高度
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