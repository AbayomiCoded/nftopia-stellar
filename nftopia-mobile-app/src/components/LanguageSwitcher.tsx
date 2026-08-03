import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { Language, LANGUAGE_OPTIONS, SUPPORTED_LANGUAGES, changeLanguage, getCurrentLanguage } from '@/src/i18n';

interface LanguageSwitcherProps {
  variant?: 'full' | 'compact' | 'icon';
  onLanguageChange?: (language: Language) => void;
}

export function LanguageSwitcher({ variant = 'full', onLanguageChange }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const currentLanguage = getCurrentLanguage();

  const handleLanguageSelect = async (language: Language) => {
    await changeLanguage(language);
    setModalVisible(false);
    if (onLanguageChange) {
      onLanguageChange(language);
    }
  };

  const currentOption = LANGUAGE_OPTIONS[currentLanguage];

  const renderLanguageOption = ({ item }: { item: Language }) => {
    const option = LANGUAGE_OPTIONS[item];
    const isActive = item === currentLanguage;

    return (
      <TouchableOpacity
        style={[styles.optionItem, isActive && styles.optionItemActive]}
        onPress={() => handleLanguageSelect(item)}
      >
        <Text style={styles.optionFlag}>{option.flag}</Text>
        <View style={styles.optionTextContainer}>
          <Text style={[styles.optionName, isActive && styles.optionNameActive]}>
            {option.nativeName}
          </Text>
          <Text style={[styles.optionCode, isActive && styles.optionCodeActive]}>
            {option.name}
          </Text>
        </View>
        {isActive && (
          <View style={styles.activeIndicator}>
            <Text style={styles.activeIndicatorText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (variant === 'compact') {
    return (
      <>
        <TouchableOpacity
          style={styles.compactButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.compactFlag}>{currentOption.flag}</Text>
          <Text style={styles.compactCode}>{currentOption.code.toUpperCase()}</Text>
        </TouchableOpacity>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('profile.language')}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalClose}>{t('common.close')}</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={SUPPORTED_LANGUAGES}
                renderItem={renderLanguageOption}
                keyExtractor={(item) => item}
                contentContainerStyle={styles.optionsList}
              />
            </View>
          </Pressable>
        </Modal>
      </>
    );
  }

  if (variant === 'icon') {
    return (
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.iconFlag}>{currentOption.flag}</Text>
      </TouchableOpacity>
    );
  }

  // Full variant
  return (
    <>
      <TouchableOpacity
        style={styles.fullButton}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.fullButtonContent}>
          <Text style={styles.fullFlag}>{currentOption.flag}</Text>
          <View style={styles.fullTextContainer}>
            <Text style={styles.fullNativeName}>{currentOption.nativeName}</Text>
            <Text style={styles.fullCode}>{currentOption.name}</Text>
          </View>
          <Text style={styles.fullArrow}>▼</Text>
        </View>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile.language')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={SUPPORTED_LANGUAGES}
              renderItem={renderLanguageOption}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.optionsList}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Full variant
  fullButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.sm,
  },
  fullButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullFlag: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  fullTextContainer: {
    flex: 1,
  },
  fullNativeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  fullCode: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  fullArrow: {
    fontSize: 12,
    color: colors.textTertiary,
    marginLeft: spacing.sm,
  },

  // Compact variant
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  compactFlag: {
    fontSize: 16,
  },
  compactCode: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },

  // Icon variant
  iconButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  iconFlag: {
    fontSize: 24,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '80%',
    minHeight: '40%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.info,
  },
  optionsList: {
    paddingVertical: spacing.sm,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionItemActive: {
    backgroundColor: colors.infoBackground,
  },
  optionFlag: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    color: colors.text,
  },
  optionNameActive: {
    fontWeight: '600',
    color: colors.info,
  },
  optionCode: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  optionCodeActive: {
    color: colors.info,
  },
  activeIndicator: {
    backgroundColor: colors.info,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  activeIndicatorText: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: 'bold',
  },
});