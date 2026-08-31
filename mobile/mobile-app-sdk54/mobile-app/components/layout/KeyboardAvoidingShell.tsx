import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  KeyboardAvoidingViewProps,
  ScrollViewProps,
  View,
} from 'react-native';
import { cn } from '../../lib/utils';

export interface KeyboardAvoidingShellProps extends KeyboardAvoidingViewProps {
  children: React.ReactNode;
  scrollable?: boolean;
  scrollViewProps?: ScrollViewProps;
  contentContainerClassName?: string;
}

export const KeyboardAvoidingShell = ({
  children,
  scrollable = true,
  scrollViewProps,
  className,
  contentContainerClassName,
  ...props
}: KeyboardAvoidingShellProps) => {
  const behavior = Platform.OS === 'ios' ? 'padding' : undefined;

  const content = scrollable ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1 }}
      className={contentContainerClassName}
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View className={cn('flex-1', contentContainerClassName)}>
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={behavior}
      className={cn('flex-1 bg-background', className)}
      {...props}
    >
      {content}
    </KeyboardAvoidingView>
  );
};
