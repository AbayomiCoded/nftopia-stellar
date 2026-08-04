import React from 'react';
import { View, StyleSheet } from 'react-native';

export interface StaggerConfig {
  enabled: boolean;
  delay: number;
  increment: number;
}

export const defaultStaggerConfig: StaggerConfig = {
  enabled: true,
  delay: 100,
  increment: 50,
};

export const createStaggeredSkeletons = (
  count: number,
  renderItem: (index: number) => React.ReactNode,
  staggerConfig: StaggerConfig = defaultStaggerConfig
): React.ReactNode[] => {
  const items: React.ReactNode[] = [];

  for (let i = 0; i < count; i++) {
    const delay = staggerConfig.enabled
      ? staggerConfig.delay + i * staggerConfig.increment
      : 0;

    items.push(
      <View
        key={`skeleton-${i}`}
        style={[
          styles.staggeredItem,
          { animationDelay: `${delay}ms` },
        ]}
      >
        {renderItem(i)}
      </View>
    );
  }

  return items;
};

export const createSkeletonArray = <T,>(
  count: number,
  item: T
): T[] => {
  return Array.from({ length: count }, () => ({ ...item }));
};

const styles = StyleSheet.create({
  staggeredItem: {
    opacity: 1,
  },
});