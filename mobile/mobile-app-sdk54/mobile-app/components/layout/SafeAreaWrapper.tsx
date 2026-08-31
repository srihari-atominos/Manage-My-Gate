import React from 'react';
import { View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '../../lib/utils';

export interface SafeAreaWrapperProps extends ViewProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  className?: string;
  backgroundColorClassName?: string;
}

export const SafeAreaWrapper = ({
  children,
  edges = ['top', 'bottom', 'left', 'right'],
  className,
  backgroundColorClassName = 'bg-background',
  ...props
}: SafeAreaWrapperProps) => {
  const insets = useSafeAreaInsets();

  const style = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  return (
    <View
      className={cn('flex-1', backgroundColorClassName, className)}
      style={[style, props.style]}
      {...props}
    >
      {children}
    </View>
  );
};
