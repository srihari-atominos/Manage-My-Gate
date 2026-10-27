import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { FAB } from '../FAB';

describe('FAB Component', () => {
  it('renders with button role, accessibility label, and responds to press', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(
      <FAB
        label="Add Facility"
        onPress={onPress}
        draggable={false}
      />
    );

    const fab = getByRole('button', { name: 'Add Facility' });
    expect(fab).toBeTruthy();
    expect(fab.props.className).toContain('end-4');

    fireEvent.press(fab);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders default action name when label is omitted', async () => {
    const { getByRole } = await render(
      <FAB
        iconName="Plus"
        onPress={jest.fn()}
        draggable={false}
      />
    );

    const fab = getByRole('button', { name: 'Action button Plus' });
    expect(fab).toBeTruthy();
  });
});
