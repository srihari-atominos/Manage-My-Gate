import React from 'react';
import { fireEvent, render, act, cleanup } from '@testing-library/react-native';
import { ConfirmationModal } from '../ConfirmationModal';

describe('ConfirmationModal', () => {
  afterEach(async () => {
    await act(async () => {
      cleanup();
    });
  });

  it('renders title, message, and triggers confirm/cancel callbacks', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    const { getByText, unmount } = await render(
      <ConfirmationModal
        visible
        title="Delete Item"
        message="Are you sure you want to delete this item?"
        confirmLabel="Yes, Delete"
        cancelLabel="No, Keep"
        variant="danger"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(getByText('Delete Item')).toBeTruthy();
    expect(getByText('Are you sure you want to delete this item?')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText('No, Keep'));
    });
    expect(onCancel).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.press(getByText('Yes, Delete'));
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('invokes onCancel when Android hardware back is triggered and not loading', async () => {
    const onCancel = jest.fn();

    const { getByTestId, unmount } = await render(
      <ConfirmationModal
        visible
        title="Confirm Action"
        message="Proceed?"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );

    await act(async () => {
      fireEvent(getByTestId('confirmation-modal'), 'requestClose');
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('prevents onCancel on Android hardware back when loading is true', async () => {
    const onCancel = jest.fn();

    const { getByTestId, unmount } = await render(
      <ConfirmationModal
        visible
        loading
        title="Deleting..."
        message="Please wait"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );

    await act(async () => {
      fireEvent(getByTestId('confirmation-modal'), 'requestClose');
    });
    expect(onCancel).not.toHaveBeenCalled();
    unmount();
  });
});
