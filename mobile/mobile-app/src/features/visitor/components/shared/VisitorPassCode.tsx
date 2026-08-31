import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, Clipboard, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Copy, Check, KeyRound } from 'lucide-react-native';

export interface VisitorPassCodeProps {
  code: string;
  label?: string;
}

export const VisitorPassCode: React.FC<VisitorPassCodeProps> = ({
  code,
  label = 'Gate Security Pass Code',
}) => {
  const [copied, setCopied] = useState(false);

  const cleanCode = (code || '').replace(/^PASS-?/i, '').trim();
  const formattedCode = cleanCode.length === 6 ? `${cleanCode.slice(0, 3)} ${cleanCode.slice(3)}` : cleanCode;

  const handleCopy = useCallback(() => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(cleanCode);
    } else if (Clipboard && typeof Clipboard.setString === 'function') {
      Clipboard.setString(cleanCode);
    }

    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }, [cleanCode]);

  return (
    <View className="bg-muted/40 border border-border rounded-2xl p-4 items-center justify-center gap-2">
      <View className="flex-row items-center gap-1.5">
        <KeyRound size={16} className="text-muted-foreground" />
        <Text variant="small" className="text-muted-foreground font-semibold">
          {label}
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleCopy}
        activeOpacity={0.7}
        className="flex-row items-center gap-3 bg-card border border-border px-5 py-2.5 rounded-xl active:bg-muted/60"
        accessibilityRole="button"
        accessibilityLabel={`Copy pass code ${code}`}
      >
        <Text className="text-2xl font-black font-mono tracking-widest text-primary">
          {formattedCode}
        </Text>

        <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
          {copied ? (
            <Check size={16} className="text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Copy size={16} className="text-primary" />
          )}
        </View>
      </TouchableOpacity>

      <Text variant="muted" className="text-[11px] text-center">
        {copied ? 'Copied code to clipboard!' : 'Tap code box to copy 6-digit entry code'}
      </Text>
    </View>
  );
};
