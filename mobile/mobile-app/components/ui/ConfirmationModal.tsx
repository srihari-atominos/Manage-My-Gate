import * as React from 'react';
import { Modal, Platform, View } from 'react-native';
import { AlertTriangle, Info } from 'lucide-react-native';
import { cva } from 'class-variance-authority';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type ConfirmationVariant = 'danger' | 'warning' | 'info';

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
  },
  warning: {
    iconBgClass: 'bg-amber-500/10 border border-amber-500/20',
    iconColorClass: 'text-amber-600 dark:text-amber-400',
    icon: AlertTriangle,
  },
  info: {
    iconBgClass: 'bg-primary/10 border border-primary/20',
    iconColorClass: 'text-primary',
    icon: Info,
  },
} as const;

const confirmationModalVariants = cva(
  cn(
    'bg-card rounded-2xl p-6 mx-6 w-full max-w-sm shadow-xl border border-border/40',
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
            <Text variant="large" className="text-center mt-4">
              {title}
            </Text>

            {/* Message */}
            <Text variant="muted" className="text-center mt-2">
              {message}
            </Text>

            {/* Action buttons */}
            <View className="flex-row gap-3 mt-6 justify-end">
              <Button
                variant="outline"
                disabled={loading}
                onPress={onCancel}
                className="flex-1"
              >
                <Text>{cancelLabel}</Text>
              </Button>
              <Button
                variant={confirmButtonVariant}
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
