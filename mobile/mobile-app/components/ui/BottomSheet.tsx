import React from 'react';
import { View, Modal, TouchableOpacity, Pressable, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { X } from 'lucide-react-native';
import { cva } from 'class-variance-authority';

export interface AppBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  snapPoints?: (string | number)[];
  children: React.ReactNode;
  enableDynamicSizing?: boolean;
}

const bottomSheetHeaderVariants = cva(
  'w-full pb-2.5 border-b border-border items-center justify-between flex-row px-5 py-3'
);

const bottomSheetTitleVariants = cva(
  'text-base font-extrabold text-foreground'
);

const bottomSheetContentVariants = cva('px-4 pb-6');

function BottomSheet({
  visible,
  onClose,
  title,
  children,
}: AppBottomSheetProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/60 justify-end" onPress={onClose}>
        <Pressable className="bg-card border-t border-border rounded-t-3xl max-h-[85vh] shadow-2xl overflow-hidden" onPress={(e) => e.stopPropagation()}>
          {/* Top grab handle */}
          <View className="items-center pt-2.5 pb-1 bg-card">
            <View className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </View>

          {/* Title Header with Close X */}
          {Boolean(title) && (
            <View className={bottomSheetHeaderVariants()}>
              <Text className={bottomSheetTitleVariants()}>{title}</Text>
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
                className="p-1.5 rounded-full bg-muted/60 border border-border"
              >
                <X size={16} className="text-foreground" />
              </TouchableOpacity>
            </View>
          )}

          {/* Scrollable Body Content */}
          <ScrollView
            className="px-4 pt-2 pb-6 max-h-[75vh]"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export {
  BottomSheet,
  bottomSheetHeaderVariants,
  bottomSheetTitleVariants,
};
