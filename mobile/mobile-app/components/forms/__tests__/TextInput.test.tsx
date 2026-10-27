import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DEFAULT_MAX_FONT_SIZE_MULTIPLIER } from '@/src/utils/responsiveTypography';
import { TextInput } from '../TextInput';

describe('shared TextInput', () => {
  it('keeps multiline fields usable with a long label and validation message', async () => {
    const { getByLabelText, getByText } = await render(
      <TextInput
        label="Detailed description for a long resident maintenance request"
        multiline
        value="Leaking tap near the kitchen sink"
        error="Please provide enough detail for the maintenance team to identify the issue."
      />
    );

    const input = getByLabelText(/detailed description/i);
    expect(input.props.maxFontSizeMultiplier).toBe(DEFAULT_MAX_FONT_SIZE_MULTIPLIER);
    expect(input.props.className).toContain('min-h-[88px]');
    expect(getByText(/please provide enough detail/i)).toBeTruthy();
  });

  it('keeps the clear action accessible and preserves the existing change callback', async () => {
    const onChangeText = jest.fn();
    const onClear = jest.fn();
    const { getByLabelText } = await render(
      <TextInput
        label="Visitor name"
        value="Alex Resident"
        clearable
        onClear={onClear}
        onChangeText={onChangeText}
      />
    );

    fireEvent.press(getByLabelText('Clear input'));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onChangeText).toHaveBeenCalledWith('');
  });
});
