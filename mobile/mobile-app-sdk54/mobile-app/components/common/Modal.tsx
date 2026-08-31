import React from 'react';
import { Modal as RNModal, View, Text, Pressable, TouchableWithoutFeedback, ModalProps as RNModalProps } from 'react-native';
import { X } from 'lucide-react-native';
import { cn } from '../../lib/utils';
import { IconButton } from './IconButton';

export interface ModalProps extends RNModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export const Modal = ({
  visible,
  onClose,
  title,
  children,
  className,
  contentClassName,
  ...props
}: ModalProps) => {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      {...props}
    >
      <View className={cn('flex-1 items-center justify-center p-4', className)}>
        <Pressable 
          className="absolute inset-0 bg-black/50" 
          onPress={onClose} 
        />
        <View
          className={cn(
            'w-full max-w-sm rounded-2xl bg-card border border-border p-5 shadow-xl',
            contentClassName
          )}
        >
          {Boolean(title) && (
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xl font-bold font-sans text-foreground">
                {title}
              </Text>
              <IconButton
                icon={X}
                size="sm"
                variant="ghost"
                onPress={onClose}
                accessibilityLabel="Close modal"
              />
            </View>
          )}
          {children}
        </View>
      </View>
    </RNModal>
  );
};
