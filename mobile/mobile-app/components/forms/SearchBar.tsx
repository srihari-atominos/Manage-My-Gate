import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSearchDebounced?: (debouncedText: string) => void;
  debounceMs?: number;
  placeholder?: string;
  onClear?: () => void;
  loading?: boolean;
  className?: string;
  containerClassName?: string;
  onSubmitEditing?: () => void;
}

export const SearchBar = ({
  value,
  onChangeText,
  onSearchDebounced,
  debounceMs = 350,
  placeholder = 'Search...',
  onClear,
  loading = false,
  className,
  containerClassName,
  onSubmitEditing,
}: SearchBarProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const debounceTimerRef = useRef<any>(null);

  useEffect(() => {
    if (onSearchDebounced) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        onSearchDebounced(value);
      }, debounceMs);
    }
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [value, debounceMs, onSearchDebounced]);

  return (
    <View
      className={cn(
        'flex-row items-center rounded-2xl bg-card border px-3.5 py-2.5 transition-colors',
        'border-border/80',
        isFocused && 'border-primary ring-2 ring-primary/20',
        containerClassName,
        className
      )}
    >
      <Search size={18} className="me-2.5 text-muted-foreground shrink-0" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#737c88"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="flex-1 text-[15px] font-sans text-foreground p-0 min-h-[24px]"
        style={{ outlineStyle: 'none' } as any}
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
        accessibilityRole="search"
        accessibilityLabel={placeholder}
      />

      {loading && (
        <ActivityIndicator size="small" color="#FF5E00" className="ms-2" />
      )}

      {!loading && value.length > 0 && (
        <Pressable
          onPress={() => {
            onChangeText('');
            if (onClear) onClear();
            if (onSearchDebounced) onSearchDebounced('');
          }}
          className="ms-2 rounded-full bg-muted-foreground/20 p-1"
          accessibilityRole="button"
          accessibilityLabel="Clear search text"
        >
          <X size={14} className="text-muted-foreground" />
        </Pressable>
      )}
    </View>
  );
};
