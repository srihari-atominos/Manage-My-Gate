import React from 'react';
import { View, Modal, TouchableOpacity, Pressable, ScrollView, Dimensions } from 'react-native';
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
  'w-full pb-2.5 border-b border-border/80 items-center justify-between flex-row px-5 py-3.5'
);

const bottomSheetTitleVariants = cva(
  'text-[17px] font-bold font-sans text-foreground tracking-tight'
);

const bottomSheetContentVariants = cva('px-4 pb-6');

function BottomSheet({
  visible,
  onClose,
  title,
  children,
}: AppBottomSheetProps) {
  if (!visible) return null;

  const screenHeight = Dimensions.get('window').height;
  const sheetMaxHeight = Math.round(screenHeight * 0.88);
  const scrollMaxHeight = sheetMaxHeight - 65;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        {/* Backdrop */}
        <Pressable 
          className="absolute inset-0 bg-black/60" 
          onPress={onClose} 
        />
        
        {/* Content Box */}
        <View
          style={{ maxHeight: sheetMaxHeight }}
          className="bg-card border-t border-border/80 rounded-t-3xl shadow-2xl overflow-hidden flex-col w-full"
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
                className="p-1.5 rounded-full bg-secondary border border-border/60"
              >
                <X size={16} className="text-foreground" />
              </TouchableOpacity>
            </View>
          )}

          {/* Scrollable Body Content */}
          <ScrollView
            style={{ maxHeight: scrollMaxHeight }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 60 }}
            showsVerticalScrollIndicator={true}
            bounces={true}
            alwaysBounceVertical={false}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export {
  BottomSheet,
  bottomSheetHeaderVariants,
  bottomSheetTitleVariants,
};
