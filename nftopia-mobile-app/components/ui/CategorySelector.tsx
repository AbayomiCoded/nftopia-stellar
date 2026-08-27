import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { spacing } from '@/constants/theme';
import { CATEGORIES, Category } from '@/constants/categories';
import CategoryChip from './CategoryChip';

export interface CategorySelectorProps {
  selectedCategoryId?: string | null;
  onSelectCategory: (category: Category) => void;
  testID?: string;
}

/**
 * Horizontal, scrollable row of category chips. Purely presentational +
 * selection UI — navigation into the marketplace and analytics tracking are
 * the caller's responsibility (see HomeScreen), so this stays easy to reuse
 * and to unit test the underlying category list independently.
 */
const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategoryId = null,
  onSelectCategory,
  testID,
}) => {
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      testID={testID}
    >
      {CATEGORIES.map((category) => (
        <CategoryChip
          key={category.id}
          category={category}
          label={t(category.labelKey)}
          selected={category.id === selectedCategoryId}
          onPress={onSelectCategory}
          testID={testID ? `${testID}-chip-${category.id}` : undefined}
        />
      ))}
    </ScrollView>
  );
};

export default CategorySelector;

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
});
