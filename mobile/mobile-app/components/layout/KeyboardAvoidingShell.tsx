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
  const defaultBehavior = Platform.OS === 'ios' ? 'padding' : 'height';
  const activeBehavior = props.behavior ?? defaultBehavior;

  const content = scrollable ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      {...scrollViewProps}
      contentContainerStyle={[
        { flexGrow: 1, paddingBottom: 60 },
        scrollViewProps?.contentContainerStyle,
      ]}
      className={contentContainerClassName}
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
      behavior={activeBehavior}
      className={cn('flex-1 bg-background', className)}
      {...props}
    >
      {content}
    </KeyboardAvoidingView>
  );
};
