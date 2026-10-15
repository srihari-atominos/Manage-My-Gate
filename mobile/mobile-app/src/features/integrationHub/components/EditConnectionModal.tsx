import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/forms/TextInput';
import { IntegrationConnection, ProviderCatalogItem, UpdateConnectionPayload } from '../services/integrationHubApi';

interface EditConnectionModalProps {
  visible: boolean;
  onClose: () => void;
  connection: IntegrationConnection | null;
  catalog: ProviderCatalogItem[];
  onSubmit: (id: string, changes: UpdateConnectionPayload) => Promise<boolean>;
  isSubmitting: boolean;
  error?: string | null;
}

/**
 * Rename a connection and/or replace its keys. Saved secrets are never shown: leave a field empty to keep it,
 * type a new value to replace it. The server verifies the result with the provider before saving.
 */
export const EditConnectionModal: React.FC<EditConnectionModalProps> = ({
  visible,
  onClose,
  connection,
  catalog,
  onSubmit,
  isSubmitting,
  error,
}) => {
  const [accountLabel, setAccountLabel] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const provider = useMemo(
    () => catalog.find((item) => item.id === connection?.provider) || null,
    [catalog, connection?.provider]
  );

  useEffect(() => {
    if (connection) {
      setAccountLabel(connection.accountLabel || '');
      setValues({});
      setValidationError(null);
    }
  }, [connection?.id, visible]);

  const handleSubmit = async () => {
    setValidationError(null);
    if (!connection) return;
    const label = accountLabel.trim();
    if (!label) {
      setValidationError('Account label is required');
      return;
    }

    const changes: UpdateConnectionPayload = {};
    if (label !== connection.accountLabel) changes.accountLabel = label;
    const filled = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v && v.trim()).map(([k, v]) => [k, v.trim()])
    );
    if (Object.keys(filled).length > 0) changes.credentials = filled;

    if (!changes.accountLabel && !changes.credentials) {
      setValidationError('Change the label or type a new value for at least one field.');
      return;
    }

    const success = await onSubmit(connection.id, changes);
    if (success) onClose();
  };

  if (!visible || !connection) return null;

  const saved = new Set(connection.configuredKeys || []);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Edit Connection">
      <ScrollView className="max-h-[520px]" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View className="gap-3.5 pb-6">
          {(error || validationError) && (
            <View className="bg-destructive/10 p-3 rounded-xl border border-destructive/20 mb-1">
              <Text className="text-xs text-destructive font-medium text-start">
                ⚠️ {error || validationError}
              </Text>
            </View>
          )}

          <View className="bg-muted/40 p-3 rounded-xl border border-border">
            <Text className="text-xs font-bold text-foreground">
              {provider ? `${provider.icon || ''} ${provider.name}` : connection.provider.toUpperCase()}
            </Text>
            <Text className="text-[11px] text-muted-foreground mt-0.5">
              Rename it, or replace a key (for example after rotating it at the provider). Saved values stay hidden.
            </Text>
          </View>

          <TextInput
            label="Account Label *"
            placeholder="e.g. Production Razorpay"
            value={accountLabel}
            onChangeText={setAccountLabel}
          />

          {provider && provider.fields.length > 0 ? (
            <View className="gap-3 pt-2 border-t border-border/40">
              <Text className="text-xs font-bold text-foreground text-start uppercase tracking-wider">
                Replace keys (optional)
              </Text>
              {provider.fields.map((field) => (
                <TextInput
                  key={field.name}
                  label={field.label}
                  value={values[field.name] || ''}
                  onChangeText={(val: string) => setValues((prev) => ({ ...prev, [field.name]: val }))}
                  placeholder={saved.has(field.name) ? '•••••••• saved. Leave empty to keep' : field.placeholder || `Enter ${field.label}`}
                  secureTextEntry={field.type === 'password'}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              ))}
            </View>
          ) : null}

          <View className="flex-row gap-3 pt-4 mt-2 border-t border-border/60">
            <Button variant="outline" onPress={onClose} className="flex-1 rounded-xl">
              <Text className="text-xs font-semibold text-foreground">Cancel</Text>
            </Button>
            <Button variant="default" onPress={handleSubmit} disabled={isSubmitting} className="flex-1 rounded-xl">
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-xs font-semibold text-primary-foreground">Save Changes</Text>
              )}
            </Button>
          </View>
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

export default EditConnectionModal;
