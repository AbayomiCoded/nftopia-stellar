import React from 'react';
import { SharedElement as RNSharedElement } from 'react-navigation-shared-element';
import { View, StyleSheet } from 'react-native';

interface SharedElementProps {
  id: string;
  children: React.ReactNode;
  style?: any;
}

export const SharedElement: React.FC<SharedElementProps> = ({
  id,
  children,
  style,
}) => {
  return (
    <RNSharedElement id={id} style={[styles.container, style]}>
      {children}
    </RNSharedElement>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});