import React from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';
import { cn } from '../../lib/utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ScrollContainerProps extends ScrollViewProps {
  children: React.ReactNode;
  withBottomInset?: boolean;
  className?: string;
  contentClassName?: string;
}

export const ScrollContainer = ({
  children,
  withBottomInset = true,
  className,
  contentClassName,
  ...props
}: ScrollContainerProps) => {
  const insets = useSafeAreaInsets();
  
  return (
    <ScrollView
      className={cn('flex-1 bg-slate-50 dark:bg-slate-950', className)}
      contentContainerStyle={[
        { paddingBottom: withBottomInset ? Math.max(insets.bottom, 24) : 0 },
      ]}
      showsVerticalScrollIndicator={false}
      {...props}
    >
      <ScrollView className={cn('p-4', contentClassName)}>
        {children}
      </ScrollView>
    </ScrollView>
  );
};
