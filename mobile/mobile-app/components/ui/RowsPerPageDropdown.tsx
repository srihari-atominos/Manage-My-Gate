import React, { useState } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Pressable,
  Platform,
} from 'react-native';
import { ChevronDown, Check, X } from 'lucide-react-native';
import { Text } from './text';
import { cn } from '../../lib/utils';
import { useTranslation } from '@/src/utils/i18n';

export interface RowsPerPageDropdownProps {
  value: number;
  options?: number[];
  onChange: (value: number) => void;
  label?: string;
  className?: string;
}

export const RowsPerPageDropdown: React.FC<RowsPerPageDropdownProps> = ({
  value,
  options = [10, 20, 50, 100],
  onChange,
  label,
  className,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const displayLabel = label ?? t('rows_per_page', 'Rows per page');

  const handleSelect = (opt: number) => {
    onChange(opt);
    setIsOpen(false);
  };

  return (
    <View className={cn('flex-row items-center', className)}>
      {/* Compact Trigger Button */}
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
        className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-card border border-border/80 shadow-2xs hover:border-primary/50 transition-colors"
        accessibilityRole="button"
        accessibilityLabel={`${displayLabel}: ${value}`}
      >
        <Text className="text-[11px] font-medium text-muted-foreground font-sans">
          {displayLabel}
        </Text>
        <View className="flex-row items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/60 border border-border/40">
          <Text className="text-xs font-bold text-foreground font-sans">
            {value}
          </Text>
          <ChevronDown size={12} className="text-muted-foreground" />
        </View>
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center p-4"
          onPress={() => setIsOpen(false)}
        >
          <Pressable
            className="w-full max-w-[260px] bg-card border border-border/90 rounded-2xl p-3 shadow-2xl overflow-hidden"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between pb-2 mb-1 border-b border-border/60">
              <Text className="text-xs font-bold text-foreground font-sans uppercase tracking-wider">
                {displayLabel}
              </Text>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                className="p-1 rounded-full bg-secondary active:opacity-70"
                accessibilityLabel="Close"
              >
                <X size={12} className="text-muted-foreground" />
              </TouchableOpacity>
            </View>

            {/* Options List */}
            <View className="gap-1 py-1">
              {options.map((opt) => {
                const isSelected = opt === value;
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => handleSelect(opt)}
                    activeOpacity={0.7}
                    className={cn(
                      'flex-row items-center justify-between px-3 py-2 rounded-xl transition-colors',
                      isSelected
                        ? 'bg-primary/10 border border-primary/30'
                        : 'active:bg-muted/50'
                    )}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`${opt} rows`}
                  >
                    <Text
                      className={cn(
                        'text-xs font-sans',
                        isSelected
                          ? 'font-bold text-primary'
                          : 'font-medium text-foreground'
                      )}
                    >
                      {opt} {t('rows', 'rows')}
                    </Text>
                    {isSelected && (
                      <Check size={14} className="text-primary" strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default RowsPerPageDropdown;
