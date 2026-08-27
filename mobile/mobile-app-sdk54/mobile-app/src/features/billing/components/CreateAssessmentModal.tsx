import React, { useState } from 'react';
import { View, Modal, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect, DropdownOption } from '@/components/forms/DropdownSelect';
import { Icon } from '@/components/ui/icon';
import { X, Landmark, Plus, Sliders } from 'lucide-react-native';
import billingService from '../services/billingService';

interface CreateAssessmentModalProps {
  visible: boolean;
  communityId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const TYPE_OPTIONS: DropdownOption[] = [
  { label: 'Recurring Subscription', value: 'RECURRING' },
  { label: 'One-Time Levy', value: 'ONE_TIME' },
  { label: 'Capital Repair Fund', value: 'CAPITAL_REPAIR' },
];

const CYCLE_OPTIONS: DropdownOption[] = [
  { label: 'Monthly Billing', value: 'MONTHLY' },
  { label: 'Quarterly Billing', value: 'QUARTERLY' },
  { label: 'Annual Billing', value: 'ANNUALLY' },
  { label: 'Ad-Hoc / Custom', value: 'AD_HOC' },
];

const METHOD_OPTIONS: DropdownOption[] = [
  { label: 'Flat Rate per Unit (₹)', value: 'FLAT_RATE' },
  { label: 'Rate per Sq. Ft. (₹/sqft)', value: 'PER_SQ_FT' },
];

export const CreateAssessmentModal: React.FC<CreateAssessmentModalProps> = ({
  visible,
  communityId,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('RECURRING');
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [generationDay, setGenerationDay] = useState('1');
  const [calculationType, setCalculationType] = useState('FLAT_RATE');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setType('RECURRING');
    setBillingCycle('MONTHLY');
    setGenerationDay('1');
    setCalculationType('FLAT_RATE');
    setAmount('');
    setErrorMsg(null);
  };

  const handleModalClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please enter an assessment rule name.');
      return;
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('Please enter a valid assessment rate or flat amount greater than 0.');
      return;
    }

    const genDayNum = Number(generationDay);
    if (isNaN(genDayNum) || genDayNum < 1 || genDayNum > 28) {
      setErrorMsg('Generation day must be a number between 1 and 28.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, any> = {
        communityId,
        name: name.trim(),
        type,
        billingCycle,
        generationDay: genDayNum,
        targetScope: {
          type: 'ALL_COMMUNITY',
        },
        calculationMethod: {
          type: calculationType,
          ...(calculationType === 'FLAT_RATE'
            ? { flatAmount: numericAmount }
            : { ratePerSqFt: numericAmount }),
        },
      };

      await billingService.createAssessment(payload);

      setIsSubmitting(false);
      resetForm();
      Alert.alert(
        'Assessment Created!',
        `Successfully created maintenance assessment rule '${name.trim()}'.`,
        [{ text: 'OK', onPress: () => onSuccess() }]
      );
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      const message = err?.response?.data?.message || err?.message || 'Failed to create assessment rule.';
      setErrorMsg(message);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleModalClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-card border-t border-border rounded-t-3xl max-h-[92%] shadow-2xl overflow-hidden flex-col">
          {/* Modal Navigation Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-border bg-card">
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center me-3">
                <Icon as={Landmark} size={20} className="text-primary" />
              </View>
              <View>
                <Text className="text-base font-extrabold text-foreground">Create Assessment Rule</Text>
                <Text className="text-xs text-muted-foreground">Define maintenance calculation formula</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleModalClose}
              activeOpacity={0.7}
              className="w-8 h-8 rounded-full bg-muted/60 items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Close modal"
            >
              <Icon as={X} size={18} className="text-muted-foreground" />
            </TouchableOpacity>
          </View>

          {/* Form Scroll Area */}
          <ScrollView className="flex-1 p-5 gap-4" showsVerticalScrollIndicator={false}>
            {errorMsg ? (
              <View className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 mb-2">
                <Text className="text-xs font-bold text-destructive">{errorMsg}</Text>
              </View>
            ) : null}

            {/* Assessment Name */}
            <TextInput
              label="Assessment Name"
              placeholder="e.g. Monthly Maintenance 2026"
              value={name}
              onChangeText={setName}
            />

            {/* Assessment Type Dropdown */}
            <DropdownSelect
              label="Assessment Type"
              options={TYPE_OPTIONS}
              value={type}
              onValueChange={setType}
              placeholder="Select Type"
            />

            {/* Billing Cycle Dropdown */}
            <DropdownSelect
              label="Billing Cycle"
              options={CYCLE_OPTIONS}
              value={billingCycle}
              onValueChange={setBillingCycle}
              placeholder="Select Billing Cycle"
            />

            {/* Generation Day */}
            <TextInput
              label="Monthly Generation Day (1 - 28)"
              placeholder="1"
              keyboardType="number-pad"
              value={generationDay}
              onChangeText={setGenerationDay}
            />

            {/* Calculation Method */}
            <DropdownSelect
              label="Calculation Method"
              options={METHOD_OPTIONS}
              value={calculationType}
              onValueChange={setCalculationType}
              placeholder="Select Calculation Method"
            />

            {/* Assessment Rate or Amount */}
            <TextInput
              label={
                calculationType === 'FLAT_RATE'
                  ? 'Flat Maintenance Fee per Villa (₹)'
                  : 'Rate per Square Foot (₹ / sq.ft.)'
              }
              placeholder={calculationType === 'FLAT_RATE' ? 'e.g. 2500' : 'e.g. 3.5'}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />

            <View className="h-6" />
          </ScrollView>

          {/* Modal Footer CTAs */}
          <View className="p-4 border-t border-border bg-card flex-row gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onPress={handleModalClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              variant="default"
              size="lg"
              className="flex-1 bg-primary"
              onPress={handleSubmit}
              loading={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Save & Create Assessment Rule"
            >
              Create Rule
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CreateAssessmentModal;
