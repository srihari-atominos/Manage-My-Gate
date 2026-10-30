import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Check, ChevronRight, RotateCcw, Send } from 'lucide-react-native';
import { AIDeselectableChip } from './AIDeselectableChip';
import type { InteractiveOptionItem, InteractiveOptionGroup } from '../services/aiAssistantApi';

export interface AIInteractiveOptionsProps {
  messageId: string;
  options: InteractiveOptionItem[];
  interactiveConfig?: InteractiveOptionGroup;
  disabled?: boolean;
  onSelectOption?: (optionText: string) => void;
  onDeselectOption?: (optionText: string) => void;
  onMultiSelectSubmit?: (selectedValues: string[]) => void;
}

export const AIInteractiveOptions: React.FC<AIInteractiveOptionsProps> = ({
  messageId,
  options,
  interactiveConfig,
  disabled = false,
  onSelectOption,
  onDeselectOption,
  onMultiSelectSubmit,
}) => {
  if (!options || options.length === 0) return null;

  const mode = interactiveConfig?.mode || 'single';
  const allowDeselect = interactiveConfig?.allowDeselect !== false;
  const allowCustomText = interactiveConfig?.allowCustomText !== false;
  const customPlaceholder = interactiveConfig?.customPlaceholder;
  const title = interactiveConfig?.title || (mode === 'multiple' ? 'Select all that apply:' : 'Select an Option:');

  // Local selection state for multi-select
  const initialSelected = options
    .filter((o) => o.selected)
    .map((o) => o.value || o.id || o.label);
  const [selectedValues, setSelectedValues] = useState<string[]>(initialSelected);

  // Check if options have rich descriptions (render as cards instead of chips)
  const hasRichDescriptions = options.some((o) => Boolean(o.description));

  const handleCardPress = (opt: InteractiveOptionItem) => {
    if (disabled) return;
    const optVal = opt.value || opt.id || opt.label;
    const isCurrentlySelected = mode === 'multiple'
      ? selectedValues.includes(optVal)
      : opt.selected || selectedValues.includes(optVal);

    if (mode === 'single') {
      if (isCurrentlySelected && allowDeselect) {
        setSelectedValues([]);
        onDeselectOption?.(`deselect ${optVal}`);
      } else {
        setSelectedValues([optVal]);
        onSelectOption?.(opt.label || optVal);
      }
    } else {
      // Multiple selection
      const updated = isCurrentlySelected
        ? selectedValues.filter((v) => v !== optVal)
        : [...selectedValues, optVal];
      setSelectedValues(updated);
    }
  };

  const handleClearAll = () => {
    if (disabled) return;
    setSelectedValues([]);
    onDeselectOption?.('clear selection');
  };

  const handleMultiSubmit = () => {
    if (disabled || selectedValues.length === 0) return;
    if (onMultiSelectSubmit) {
      onMultiSelectSubmit(selectedValues);
    } else {
      const selectedLabels = options
        .filter((o) => selectedValues.includes(o.value || o.id || o.label))
        .map((o) => o.label || o.value)
        .join(', ');
      onSelectOption?.(selectedLabels);
    }
  };

  return (
    <View
      testID={`ai-interactive-options-${messageId}`}
      className="mt-3 gap-2 border-t border-border/40 pt-2.5"
    >
      {/* Header Row: Title & Clear CTA */}
      <View className="flex-row items-center justify-between">
        <Text className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </Text>
        {selectedValues.length > 0 && allowDeselect && (
          <Pressable
            testID={`clear-options-${messageId}`}
            disabled={disabled}
            onPress={handleClearAll}
            hitSlop={6}
            className="flex-row items-center gap-1 active:opacity-75"
            accessibilityRole="button"
            accessibilityLabel="Clear selection"
          >
            <RotateCcw size={10} className="text-muted-foreground" />
            <Text className="text-[10px] font-medium text-muted-foreground">Clear</Text>
          </Pressable>
        )}
      </View>

      {/* Options Rendering: Rich Cards vs Compact Chip Grid */}
      {hasRichDescriptions ? (
        <View className="gap-2">
          {options.map((opt, idx) => {
            const optVal = opt.value || opt.id || opt.label;
            const isSelected = mode === 'multiple'
              ? selectedValues.includes(optVal)
              : opt.selected || selectedValues.includes(optVal);

            return (
              <Pressable
                key={opt.id || optVal || idx}
                testID={`ai-option-card-${opt.id || optVal}`}
                disabled={disabled}
                onPress={() => handleCardPress(opt)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected, disabled }}
                accessibilityLabel={`${opt.label}${opt.badge ? ` (${opt.badge})` : ''}: ${opt.description || ''}`}
                className={`p-3 rounded-xl border transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-2xs'
                    : 'border-border/80 bg-secondary/40 active:bg-secondary/80'
                } flex-row items-center justify-between`}
              >
                <View className="flex-1 me-2.5">
                  <View className="flex-row items-center gap-1.5 flex-wrap">
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-primary font-bold' : 'text-foreground'
                      }`}
                    >
                      {opt.label}
                    </Text>
                    {opt.badge && (
                      <View
                        className={`px-1.5 py-0.2 rounded-full border ${
                          isSelected
                            ? 'bg-primary/20 border-primary/30'
                            : 'bg-primary/10 border-primary/20'
                        }`}
                      >
                        <Text className="text-[9px] font-bold text-primary">
                          {opt.badge}
                        </Text>
                      </View>
                    )}
                  </View>
                  {opt.description && (
                    <Text
                      className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed"
                      numberOfLines={2}
                    >
                      {opt.description}
                    </Text>
                  )}
                </View>

                {/* Selection Indicator */}
                <View
                  className={`w-6 h-6 rounded-full items-center justify-center shrink-0 border ${
                    isSelected
                      ? 'bg-primary border-primary'
                      : 'border-border/80 bg-card'
                  }`}
                >
                  {isSelected ? (
                    <Check size={12} color="white" strokeWidth={3} />
                  ) : (
                    <ChevronRight size={13} className="text-muted-foreground" />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-1.5">
          {options.map((opt, idx) => {
            const optVal = opt.value || opt.id || opt.label;
            const isSelected = mode === 'multiple'
              ? selectedValues.includes(optVal)
              : opt.selected || selectedValues.includes(optVal);

            return (
              <AIDeselectableChip
                key={opt.id || optVal || idx}
                id={opt.id || optVal}
                label={opt.label}
                value={optVal}
                badge={opt.badge}
                selected={isSelected}
                disabled={disabled}
                allowDeselect={allowDeselect}
                onPress={() => handleCardPress(opt)}
                onDeselect={() => {
                  if (mode === 'single') {
                    setSelectedValues([]);
                    onDeselectOption?.(`deselect ${optVal}`);
                  } else {
                    setSelectedValues(selectedValues.filter((v) => v !== optVal));
                  }
                }}
              />
            );
          })}
        </View>
      )}

      {/* Multi-Select Submit Action Button */}
      {mode === 'multiple' && (
        <View className="pt-2 flex-row justify-end">
          <Pressable
            testID={`submit-multiselect-${messageId}`}
            disabled={disabled || selectedValues.length === 0}
            onPress={handleMultiSubmit}
            className={`px-3 py-1.5 rounded-lg flex-row items-center gap-1.5 ${
              selectedValues.length === 0 || disabled
                ? 'bg-primary/40'
                : 'bg-primary active:bg-primary/90 shadow-2xs'
            }`}
            accessibilityRole="button"
            accessibilityLabel={`Apply selection, ${selectedValues.length} selected`}
          >
            <Send size={12} color="white" />
            <Text className="text-xs font-bold text-primary-foreground">
              Apply ({selectedValues.length})
            </Text>
          </Pressable>
        </View>
      )}

      {/* Custom Text Prompt Guidance */}
      {allowCustomText && (
        <Text className="text-[10px] text-muted-foreground italic mt-0.5">
          {customPlaceholder || 'Or type your own answer below...'}
        </Text>
      )}
    </View>
  );
};

export default AIInteractiveOptions;
