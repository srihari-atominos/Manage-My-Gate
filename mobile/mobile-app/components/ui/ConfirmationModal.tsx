import * as React from 'react';
import { Modal, Platform, View } from 'react-native';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react-native';
import { cva } from 'class-variance-authority';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type ConfirmationVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationVariant;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  className?: string;
}

export const CONFIRMATION_VARIANT_CONFIG = {
  danger: {
    iconBgClass: 'bg-destructive/10 border border-destructive/20',
    iconColorClass: 'text-destructive',
    icon: AlertTriangle,
    buttonClass: 'bg-red-600 active:bg-red-700',
    textClass: 'text-white font-bold',
  },
  warning: {
    iconBgClass: 'bg-amber-500/10 border border-amber-500/20',
    iconColorClass: 'text-amber-600 dark:text-amber-400',
    icon: AlertTriangle,
    buttonClass: 'bg-amber-500 active:bg-amber-600',
    textClass: 'text-white font-bold',
  },
  info: {
    iconBgClass: 'bg-blue-500/10 border border-blue-500/20',
    iconColorClass: 'text-blue-600 dark:text-blue-400',
    icon: Info,
    buttonClass: 'bg-blue-600 active:bg-blue-700',
    textClass: 'text-white font-bold',
  },
  success: {
    iconBgClass: 'bg-emerald-500/10 border border-emerald-500/20',
    iconColorClass: 'text-emerald-600 dark:text-emerald-400',
    icon: CheckCircle2,
    buttonClass: 'bg-emerald-600 active:bg-emerald-700',
    textClass: 'text-white font-bold',
  },
} as const;

const confirmationModalVariants = cva(
  cn(
    'bg-card rounded-3xl p-6 mx-6 w-full max-w-sm shadow-2xl border border-border/80',
    Platform.select({
      web: 'transition-all duration-200',
    })
  ),
  {
    variants: {
      variant: {
        danger: '',
        warning: '',
        info: '',
        success: '',
      },
    },
    defaultVariants: {
      variant: 'danger',
    },
  }
);

const ConfirmationModal = React.forwardRef<View, ConfirmationModalProps>(
  (
    {
      visible,
      title,
      message,
      confirmLabel = 'Confirm',
      cancelLabel = 'Cancel',
      variant = 'danger',
      onConfirm,
      onCancel,
      loading = false,
      className,
    },
    ref
  ) => {
    const validVariant: ConfirmationVariant = CONFIRMATION_VARIANT_CONFIG[variant] ? variant : 'danger';
    const config = CONFIRMATION_VARIANT_CONFIG[validVariant];
    const confirmButtonVariant = validVariant === 'danger' ? 'destructive' : 'default';

    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={loading ? undefined : onCancel}
      >
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View
            ref={ref}
            className={cn(confirmationModalVariants({ variant: validVariant }), className)}
          >
            {/* Icon circle header */}
            <View
              className={cn('w-12 h-12 rounded-full items-center justify-center self-center', config.iconBgClass)}
            >
              <Icon as={config.icon} size={24} className={config.iconColorClass} />
            </View>

            {/* Title */}
            <Text className="text-center mt-4 text-[18px] font-bold font-sans text-foreground">
              {title}
            </Text>

            {/* Message */}
            <Text variant="muted" className="text-center mt-2 text-[14px] font-sans text-muted-foreground">
              {message}
            </Text>

            {/* Action buttons */}
            <View className="flex-row gap-3 mt-6 justify-end">
              <Button
                variant="outline"
                disabled={loading}
                onPress={onCancel}
                className="flex-1 border-border active:bg-secondary/60"
              >
                <Text className="text-foreground">{cancelLabel}</Text>
              </Button>
              <Button
                variant={
                  validVariant === 'danger'
                    ? 'destructive'
                    : validVariant === 'success'
                    ? 'success'
                    : validVariant === 'warning'
                    ? 'warning-solid'
                    : 'info-solid'
                }
                disabled={loading}
                loading={loading}
                onPress={onConfirm}
                className="flex-1"
              >
                <Text>{confirmLabel}</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    );
  }
);

ConfirmationModal.displayName = 'ConfirmationModal';

export { ConfirmationModal, confirmationModalVariants };
export default ConfirmationModal;
