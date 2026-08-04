import React from 'react';
import { View, StyleSheet, DimensionValue } from 'react-native';
import { Skeleton } from './Skeleton';
import { Shimmer } from './Shimmer';
import { spacing as themeSpacing, borderRadius as themeBorderRadius } from '@/constants/theme';

export interface SkeletonRectProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: any;
  animated?: boolean;
}

export const SkeletonRect: React.FC<SkeletonRectProps> = ({
  width = '100%',
  height = 20,
  borderRadius = themeBorderRadius.sm,
  style,
  animated = true,
}) => {
  return (
    <Skeleton
      width={width}
      height={height}
      borderRadius={borderRadius}
      animated={animated}
      style={style}
    />
  );
};

export interface SkeletonCircleProps {
  size?: number;
  animated?: boolean;
}

export const SkeletonCircle: React.FC<SkeletonCircleProps> = ({
  size = 40,
  animated = true,
}) => {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius={size / 2}
      animated={animated}
    />
  );
};

export interface SkeletonTextProps {
  width?: DimensionValue;
  height?: number;
  numberOfLines?: number;
  spacing?: number;
  animated?: boolean;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  width = '100%',
  height = 16,
  numberOfLines = 1,
  spacing = themeSpacing.xs,
  animated = true,
}) => {
  return (
    <View style={styles.textContainer}>
      {Array.from({ length: numberOfLines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === numberOfLines - 1 && numberOfLines > 1 ? '60%' : width}
          height={height}
          animated={animated}
          style={index > 0 ? { marginTop: spacing } : undefined}
        />
      ))}
    </View>
  );
};

export interface SkeletonButtonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  animated?: boolean;
}

export const SkeletonButton: React.FC<SkeletonButtonProps> = ({
  width = 120,
  height = 44,
  borderRadius = themeBorderRadius.md,
  animated = true,
}) => {
  return (
    <Skeleton
      width={width}
      height={height}
      borderRadius={borderRadius}
      animated={animated}
    />
  );
};

export interface SkeletonAvatarProps {
  size?: number;
  animated?: boolean;
}

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  size = 50,
  animated = true,
}) => {
  return <SkeletonCircle size={size} animated={animated} />;
};

const styles = StyleSheet.create({
  textContainer: {
    width: '100%',
  },
});