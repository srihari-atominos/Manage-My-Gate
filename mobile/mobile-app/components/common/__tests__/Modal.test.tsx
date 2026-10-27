import React from 'react';
import { Text as RNText } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { Modal } from '../Modal';

describe('Modal (Common)', () => {
  it('renders title and children when visible', async () => {
    const onClose = jest.fn();
    const { getByText, getByLabelText } = await render(
      <Modal visible onClose={onClose} title="Test Dialog Title">
        <RNText>Modal body content</RNText>
      </Modal>
    );

    expect(getByText('Test Dialog Title')).toBeTruthy();
    expect(getByText('Modal body content')).toBeTruthy();
    expect(getByLabelText('Close modal')).toBeTruthy();
  });

  it('invokes onClose when the close icon button is pressed', async () => {
    const onClose = jest.fn();
    const { getByLabelText } = await render(
      <Modal visible onClose={onClose} title="Dismissible Dialog">
        <RNText>Body</RNText>
      </Modal>
    );

    fireEvent.press(getByLabelText('Close modal'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('invokes onClose when the backdrop is pressed', async () => {
    const onClose = jest.fn();
    const { getByTestId } = await render(
      <Modal visible onClose={onClose} title="Backdrop Test">
        <RNText>Body</RNText>
      </Modal>
    );

    fireEvent.press(getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('invokes onClose when Android hardware back is triggered via requestClose', async () => {
    const onClose = jest.fn();
    const { getByTestId } = await render(
      <Modal visible onClose={onClose} title="Hardware Back Test">
        <RNText>Body</RNText>
      </Modal>
    );

    fireEvent(getByTestId('app-modal'), 'requestClose');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
