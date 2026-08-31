import React, { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextInput } from '@/components/forms/TextInput';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { KeyRound, Search, X } from 'lucide-react-native';

export interface ManualCodeEntrySheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmitCode: (code: string) => void;
  loading?: boolean;
  title?: string;
  description?: string;
  placeholder?: string;
  label?: string;
  keyboardType?: 'default' | 'number-pad' | 'numeric';
}

export const ManualCodeEntrySheet: React.FC<ManualCodeEntrySheetProps> = ({
  visible,
  onClose,
  onSubmitCode,
  loading = false,
  title = 'Manual Pass Code Verification',
  description = 'If the optical QR code cannot be scanned, manually enter the 6-digit PIN or reference pass code.',
  placeholder = 'e.g. 982341 or BK-982341',
  label = 'Pass Reference / PIN Code',
  keyboardType = 'default',
}) => {
  const [code, setCode] = useState('');
  const [inputError, setInputError] = useState<string | undefined>(undefined);

  const handleSubmit = () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setInputError('Please enter a valid pass code or PIN.');
      return;
    }
    setInputError(undefined);
    onSubmitCode(trimmed);
  };

  const handleClose = () => {
    setCode('');
    setInputError(undefined);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose} title={title}>
      <View className="gap-4 pb-2">
        {Boolean(description) && (
          <Text className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </Text>
        )}

        {/* Input Card Container */}
        <View className="bg-card border border-border rounded-2xl p-4 gap-3">
          <TextInput
            label={label}
            placeholder={placeholder}
            value={code}
            onChangeText={(val) => {
              setCode(val);
              if (inputError) setInputError(undefined);
            }}
            error={inputError}
            keyboardType={keyboardType}
            autoCapitalize="characters"
            leftIcon={KeyRound}
            inputClassName="font-mono text-base tracking-widest uppercase font-bold"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </View>

        {/* Actions */}
        <View className="gap-2.5 pt-1">
          <Button
            variant="default"
            onPress={handleSubmit}
            disabled={!code.trim() || loading}
            className="w-full h-12 bg-primary flex-row items-center justify-center gap-2"
            accessibilityRole="button"
            accessibilityLabel="Verify Pass Code"
          >
            <Icon as={Search} size={16} className="text-primary-foreground" />
            <Text className="text-sm font-bold text-primary-foreground">
              {loading ? 'Verifying Code...' : 'Verify Pass Code'}
            </Text>
          </Button>

          <Button
            variant="outline"
            onPress={handleClose}
            disabled={loading}
            className="w-full h-12 flex-row items-center justify-center gap-2"
            accessibilityRole="button"
            accessibilityLabel="Cancel Manual Entry"
          >
            <Icon as={X} size={16} className="text-foreground" />
            <Text className="text-sm font-bold text-foreground">Cancel</Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};

export default ManualCodeEntrySheet;
