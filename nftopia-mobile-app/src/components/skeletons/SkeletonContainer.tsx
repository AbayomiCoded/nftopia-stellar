import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';

export interface SkeletonContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  padding?: boolean;
}

export const SkeletonContainer: React.FC<SkeletonContainerProps> = ({
  children,
  style,
  backgroundColor = colors.background,
  padding = false,
}) => {
  return (
    <View
      style={[
        styles.container,
        { backgroundColor },
        padding && styles.padding,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  padding: {
    padding: 16,
  },
});