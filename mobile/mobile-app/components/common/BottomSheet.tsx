import React, { forwardRef } from 'react';
import { View, Text } from 'react-native';
import GorhomBottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { cn } from '../../lib/utils';

export interface BottomSheetProps {
  snapPoints?: string[];
  children: React.ReactNode;
  title?: string;
  className?: string;
  onChange?: (index: number) => void;
}

export const BottomSheet = forwardRef<GorhomBottomSheet, BottomSheetProps>(
  ({ snapPoints = ['50%', '90%'], children, title, className, onChange }, ref) => {
    return (
      <GorhomBottomSheet
        ref={ref}
        snapPoints={snapPoints}
        enablePanDownToClose
        index={-1}
        onChange={onChange}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
        )}
        backgroundStyle={{ backgroundColor: 'transparent' }}
        handleIndicatorStyle={{ backgroundColor: '#94a3b8' }}
      >
        <BottomSheetView className={cn('flex-1 px-4 pb-8 bg-card rounded-t-3xl', className)}>
          {title && (
            <Text className="mb-4 text-xl font-bold text-foreground">
              {title}
            </Text>
          )}
          {children}
        </BottomSheetView>
      </GorhomBottomSheet>
    );
  }
);
BottomSheet.displayName = 'BottomSheet';

