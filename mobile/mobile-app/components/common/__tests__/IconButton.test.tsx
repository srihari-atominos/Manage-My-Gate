import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Plus } from 'lucide-react-native';

import { IconButton } from '../IconButton';

describe('IconButton', () => {
  it('uses a mobile-sized target and exposes its accessible button name', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(
      <IconButton
        icon={Plus}
        size="sm"
        accessibilityLabel="Add visitor"
        onPress={onPress}
      />,
    );

    const button = getByRole('button', { name: 'Add visitor' });
    expect(button.props.className).toContain('h-11 w-11');

    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('reports disabled state and prevents presses', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(
      <IconButton
        icon={Plus}
        accessibilityLabel="Add visitor"
        disabled
        onPress={onPress}
      />,
    );

    const button = getByRole('button', { name: 'Add visitor' });
    expect(button.props.accessibilityState).toEqual({ disabled: true });

    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
