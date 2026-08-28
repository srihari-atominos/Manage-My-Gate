import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { cn } from '../../lib/utils';

export interface AbsoluteOverlayProps extends ViewProps {
  children: React.ReactNode;
  visible?: boolean;
  backgroundColor?: string;
  className?: string;
}

export const AbsoluteOverlay = ({
  children,
  visible = true,
  backgroundColor = 'rgba(0, 0, 0, 0.5)',
  className,
  ...props
}: AbsoluteOverlayProps) => {
  if (!visible) return null;

  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor, zIndex: 100 }]}
      className={cn('items-center justify-center', className)}
      {...props}
    >
      {children}
    </View>
  );
};
