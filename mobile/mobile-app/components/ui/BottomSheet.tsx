import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { cva } from 'class-variance-authority';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { THEME } from '@/lib/theme';
import { cn } from '@/lib/utils';

export interface AppBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  snapPoints?: (string | number)[];
  children: React.ReactNode;
  enableDynamicSizing?: boolean;
}

const bottomSheetHeaderVariants = cva(
  'w-full pb-2 mb-4 border-b border-border items-center justify-center'
);

const bottomSheetTitleVariants = cva(
  'text-center font-semibold text-lg text-foreground'
);

const bottomSheetContentVariants = cva('px-4 pb-4');

function BottomSheet({
  visible,
  onClose,
  title,
  snapPoints = ['50%'],
  children,
  enableDynamicSizing = false,
}: AppBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const currentTheme = THEME[isDark ? 'dark' : 'light'];

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose]
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={enableDynamicSizing ? undefined : snapPoints}
      enableDynamicSizing={enableDynamicSizing}
      onChange={handleSheetChanges}
      onDismiss={onClose}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: currentTheme.background,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
      }}
      handleIndicatorStyle={{
        backgroundColor: currentTheme.mutedForeground,
        width: 40,
        height: 4,
        borderRadius: 2,
      }}
    >
      <BottomSheetView className={bottomSheetContentVariants()}>
        {title ? (
          <View className={bottomSheetHeaderVariants()}>
            <Text className={bottomSheetTitleVariants()}>{title}</Text>
          </View>
        ) : null}
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

export {
  BottomSheet,
  bottomSheetContentVariants,
  bottomSheetHeaderVariants,
  bottomSheetTitleVariants,
};
