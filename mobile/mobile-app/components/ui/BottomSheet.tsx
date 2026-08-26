import React from 'react';
import { View, Modal, TouchableOpacity, Pressable, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  'text-lg font-bold text-foreground'
);

const bottomSheetContentVariants = cva('px-4 pb-6');

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
}: AppBottomSheetProps) {
  if (!visible) return null;
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom + 20, 36);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <Pressable className="flex-1 bg-black/60 justify-end" onPress={onClose}>
          <Pressable
            className="w-full bg-card border-t border-border rounded-t-3xl max-h-[90vh] shadow-2xl overflow-hidden flex-col"
            onPress={(e) => e.stopPropagation()}
          >
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
              className="w-full shrink"
              style={{ maxHeight: '86%' }}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 8,
                paddingBottom: bottomPadding,
                flexGrow: 0,
              }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export {
  bottomSheetHeaderVariants,
  bottomSheetTitleVariants,
};
export default BottomSheet;
