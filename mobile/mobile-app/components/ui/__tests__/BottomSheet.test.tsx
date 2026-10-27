import React from 'react';
import { Text as RNText } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { BottomSheet } from '../BottomSheet';

describe('BottomSheet', () => {
  it('renders its title and dismisses from the accessible grab handle', async () => {
    const onClose = jest.fn();
    const { getByLabelText, getByText } = await render(
      <BottomSheet
        visible
        onClose={onClose}
        title="A long sheet title that must keep the close action available"
      >
        <RNText>Sheet content</RNText>
      </BottomSheet>
    );

    expect(getByText(/long sheet title/i)).toBeTruthy();
    fireEvent.press(getByLabelText('Close sheet'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render sheet content while hidden', async () => {
    const { queryByText } = await render(
      <BottomSheet visible={false} onClose={jest.fn()} title="Hidden sheet">
        <RNText>Hidden content</RNText>
      </BottomSheet>
    );

    expect(queryByText('Hidden content')).toBeNull();
  });

  it('dismisses when Android hardware back is triggered via requestClose', async () => {
    const onClose = jest.fn();
    const { getByTestId } = await render(
      <BottomSheet visible onClose={onClose} title="Dismissible Sheet">
        <RNText>Body</RNText>
      </BottomSheet>
    );

    fireEvent(getByTestId('bottom-sheet-modal'), 'requestClose');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
