import React from 'react';
import { fireEvent, render, act, cleanup } from '@testing-library/react-native';
import { PhoneInput } from '../PhoneInput';

describe('PhoneInput', () => {
  afterEach(async () => {
    await act(async () => {
      cleanup();
    });
  });

  it('renders with label and default country', async () => {
    const { getByText, unmount } = await render(
      <PhoneInput label="Phone Number" value="+971501234567" defaultCountry="AE" />
    );

    expect(getByText('Phone Number')).toBeTruthy();
    expect(getByText('+971')).toBeTruthy();
    unmount();
  });

  it('opens country picker modal and closes on Android hardware back via requestClose', async () => {
    const { getByLabelText, getByTestId, queryByTestId, unmount } = await render(
      <PhoneInput label="Phone Number" defaultCountry="IN" />
    );

    // Press country picker button
    const countryButton = getByLabelText(/Selected country/i);
    await act(async () => {
      fireEvent.press(countryButton);
    });

    const modal = getByTestId('country-picker-modal');
    expect(modal).toBeTruthy();

    // Trigger Android hardware back
    await act(async () => {
      fireEvent(modal, 'requestClose');
    });

    // Modal should now be closed / not visible
    expect(queryByTestId('country-picker-modal')).toBeNull();
    unmount();
  });
});
