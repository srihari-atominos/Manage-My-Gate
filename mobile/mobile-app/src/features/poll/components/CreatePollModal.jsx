import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { Button } from '@/components/common/Button';
import { Text } from '@/components/ui/text';

/**
 * CreatePollModal Component (Pure JSX)
 * BottomSheet form modal for creating a new community poll with full governance attributes:
 * - Question, Description
 * - Options (2 to 10 options)
 * - Quorum Percentage
 * - Choice Type (SINGLE_CHOICE / MULTIPLE_CHOICE)
 * - Voting Mode (ONE_PER_USER / ONE_PER_UNIT)
 * - Results Visibility (ALWAYS / AFTER_VOTE / AFTER_EXPIRY / ADMIN_ONLY)
 * - Anonymous toggle
 */
export function CreatePollModal({
  visible,
  onClose,
  onSubmit,
  loading = false,
}) {
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [quorumPercentage, setQuorumPercentage] = useState('0');
  const [choiceType, setChoiceType] = useState('SINGLE_CHOICE');
  const [maxChoices, setMaxChoices] = useState('1');
  const [votingMode, setVotingMode] = useState('ONE_PER_USER');
  const [resultsVisibility, setResultsVisibility] = useState('ALWAYS');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Default end date 7 days from now
  const defaultEndDate = new Date();
  defaultEndDate.setDate(defaultEndDate.getDate() + 7);
  const [endDate, setEndDate] = useState(defaultEndDate.toISOString().slice(0, 10));

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (text, index) => {
    const updated = [...options];
    updated[index] = text;
    setOptions(updated);
  };

  const resetForm = () => {
    setQuestion('');
    setDescription('');
    setOptions(['', '']);
    setQuorumPercentage('0');
    setChoiceType('SINGLE_CHOICE');
    setMaxChoices('1');
    setVotingMode('ONE_PER_USER');
    setResultsVisibility('ALWAYS');
    setIsAnonymous(false);
    setValidationError('');
  };

  const handleSubmit = async () => {
    setValidationError('');
    if (question.trim().length < 5) {
      setValidationError('Poll question must be at least 5 characters.');
      return;
    }

    const validOptions = options.map((opt) => opt.trim()).filter((opt) => opt.length > 0);
    if (validOptions.length < 2) {
      setValidationError('Please provide at least 2 non-empty options.');
      return;
    }

    // Check unique options
    const uniqueOptions = new Set(validOptions.map((o) => o.toLowerCase()));
    if (uniqueOptions.size !== validOptions.length) {
      setValidationError('All poll options must be unique.');
      return;
    }

    const payload = {
      question: question.trim(),
      description: description.trim() || undefined,
      options: validOptions.map((text) => ({ text })),
      quorumPercentage: parseInt(quorumPercentage, 10) || 0,
      choiceType,
      maxChoices: choiceType === 'MULTIPLE_CHOICE' ? parseInt(maxChoices, 10) || 2 : 1,
      votingMode,
      resultsVisibility,
      isAnonymous,
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    try {
      await onSubmit(payload);
      resetForm();
      onClose();
    } catch (err) {
      setValidationError(err?.message || 'Failed to create poll');
    }
  };

  const choiceTypeOptions = [
    { label: 'Single Choice (1 Option)', value: 'SINGLE_CHOICE' },
    { label: 'Multiple Choice (Select Multiple)', value: 'MULTIPLE_CHOICE' },
  ];

  const votingModeOptions = [
    { label: 'One Vote per Registered User', value: 'ONE_PER_USER' },
    { label: 'One Vote per Unit / Villa', value: 'ONE_PER_UNIT' },
  ];

  const resultsVisibilityOptions = [
    { label: 'Always Visible (Live)', value: 'ALWAYS' },
    { label: 'Visible After Voting', value: 'AFTER_VOTE' },
    { label: 'Visible After Expiry / Close', value: 'AFTER_EXPIRY' },
    { label: 'Admin Only', value: 'ADMIN_ONLY' },
  ];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Create Community Poll"
    >
      <ScrollView className="max-h-[75vh] py-2" keyboardShouldPersistTaps="handled">
        {/* Validation error */}
        {Boolean(validationError) && (
          <View className="bg-destructive/10 p-3 rounded-xl border border-destructive/20 mb-3">
            <Text className="text-xs text-destructive font-semibold">{validationError}</Text>
          </View>
        )}

        {/* Question Input */}
        <View className="mb-3">
          <TextInput
            label="Question *"
            placeholder="e.g. Should we renovate the clubhouse pool?"
            value={question}
            onChangeText={(t) => {
              setQuestion(t);
              setValidationError('');
            }}
          />
        </View>

        {/* Description Input */}
        <View className="mb-3">
          <TextInput
            label="Description (Optional)"
            placeholder="Provide context or budget constraints..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Options List */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-sm font-medium text-foreground">
              Poll Options (2 to 10) *
            </Text>
            {options.length < 10 && (
              <TouchableOpacity
                onPress={handleAddOption}
                className="flex-row items-center gap-1"
                accessibilityRole="button"
                accessibilityLabel="Add Option"
              >
                <Plus size={14} color="#2563eb" />
                <Text className="text-xs font-semibold text-primary">Add Option</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="gap-2">
            {options.map((opt, index) => (
              <View key={index} className="flex-row items-center gap-2">
                <View className="flex-1">
                  <TextInput
                    placeholder={`Option ${index + 1}`}
                    value={opt}
                    onChangeText={(t) => handleOptionChange(t, index)}
                  />
                </View>
                {options.length > 2 && (
                  <TouchableOpacity
                    onPress={() => handleRemoveOption(index)}
                    className="p-2 rounded-lg bg-destructive/10 items-center justify-center"
                    accessibilityRole="button"
                    accessibilityLabel={`Remove Option ${index + 1}`}
                  >
                    <Trash2 size={16} color="#dc2626" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Choice Type Dropdown */}
        <View className="mb-3">
          <DropdownSelect
            label="Ballot Selection Type"
            options={choiceTypeOptions}
            value={choiceType}
            onValueChange={setChoiceType}
          />
        </View>

        {/* Max choices for multiple choice */}
        {choiceType === 'MULTIPLE_CHOICE' && (
          <View className="mb-3">
            <TextInput
              label="Maximum Selectable Choices"
              placeholder="e.g. 2"
              keyboardType="number-pad"
              value={maxChoices}
              onChangeText={setMaxChoices}
            />
          </View>
        )}

        {/* Voting Mode */}
        <View className="mb-3">
          <DropdownSelect
            label="Voting Governance Mode"
            options={votingModeOptions}
            value={votingMode}
            onValueChange={setVotingMode}
          />
        </View>

        {/* Results Visibility */}
        <View className="mb-3">
          <DropdownSelect
            label="Results Visibility Policy"
            options={resultsVisibilityOptions}
            value={resultsVisibility}
            onValueChange={setResultsVisibility}
          />
        </View>

        {/* Quorum Percentage Input */}
        <View className="mb-3">
          <TextInput
            label="Quorum Percentage Requirement (0-100%)"
            placeholder="0 for no quorum"
            keyboardType="number-pad"
            value={quorumPercentage}
            onChangeText={setQuorumPercentage}
          />
        </View>

        {/* Anonymous Ballot Toggle */}
        <TouchableOpacity
          onPress={() => setIsAnonymous(!isAnonymous)}
          activeOpacity={0.7}
          className="flex-row items-center justify-between p-3.5 rounded-xl border border-border bg-card mb-5"
        >
          <View className="flex-1 me-3">
            <Text className="text-sm font-bold text-foreground">Anonymous Ballot</Text>
            <Text className="text-xs text-muted-foreground">
              Voter identities and choice selections remain encrypted & concealed
            </Text>
          </View>
          <View
            className={`w-6 h-6 rounded-md border items-center justify-center ${
              isAnonymous ? 'bg-primary border-primary' : 'border-muted-foreground'
            }`}
          >
            {isAnonymous && <Text className="text-white text-xs font-bold">✓</Text>}
          </View>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View className="flex-row items-center gap-3 pt-2 pb-6">
          <Button
            variant="outline"
            className="flex-1"
            onPress={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            className="flex-1"
            onPress={handleSubmit}
            loading={loading}
          >
            Create Poll
          </Button>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

export default CreatePollModal;
