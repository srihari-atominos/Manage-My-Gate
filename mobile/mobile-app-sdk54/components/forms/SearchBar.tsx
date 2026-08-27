import React from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
}

export const SearchBar = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  onClear,
  className,
}: SearchBarProps) => {
  return (
    <View
      className={cn(
        'flex-row items-center rounded-2xl bg-card border border-border/80 px-3.5 py-2.5',
        className
      )}
    >
      <Search size={18} className="me-2.5 text-muted-foreground" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#737c88"
        className="flex-1 text-[15px] font-sans text-foreground p-0"
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => {
            onChangeText('');
            if (onClear) onClear();
          }}
          className="ms-2 rounded-full bg-muted-foreground/20 p-1"
        >
          <X size={14} className="text-muted-foreground" />
        </Pressable>
      )}
    </View>
  );
};
