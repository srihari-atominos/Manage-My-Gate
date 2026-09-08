import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  KeyboardAvoidingViewProps,
  ScrollViewProps,
  View,
  Keyboard,
  TouchableWithoutFeedback,
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
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1 }}
      className={contentContainerClassName}
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  ) : (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View className={cn('flex-1', contentContainerClassName)}>
        {children}
      </View>
    </TouchableWithoutFeedback>
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
