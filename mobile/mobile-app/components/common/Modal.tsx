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
      <TouchableWithoutFeedback onPress={onClose}>
        <View className={cn('flex-1 items-center justify-center bg-black/50 p-4', className)}>
          <TouchableWithoutFeedback>
            <View
              className={cn(
                'w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg dark:bg-slate-900',
                contentClassName
              )}
            >
              {title && (
                <View className="mb-4 flex-row items-center justify-between">
                  <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">
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
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};
