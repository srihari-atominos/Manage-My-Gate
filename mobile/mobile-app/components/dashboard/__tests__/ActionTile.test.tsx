import React from 'react';
import { Text as RNText } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { useReducedMotion } from 'react-native-reanimated';

import ActionTile from '../ActionTile';

describe('ActionTile press feedback', () => {
  it('keeps its label, accessibility role and onPress callback', async () => {
    const onPress = jest.fn();
    const { getByRole, getByText } = await render(
      <ActionTile icon={<RNText>i</RNText>} label="Visitors" onPress={onPress} />,
    );

    const tile = getByRole('button', { name: /Visitors/ });
    expect(getByText('Visitors')).toBeTruthy();

    await fireEvent(tile, 'pressIn');
    await fireEvent(tile, 'pressOut');
    await fireEvent.press(tile);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('invokes onPress on every rapid tap without delay', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(
      <ActionTile icon={<RNText>i</RNText>} label="Visitors" onPress={onPress} />,
    );
    const tile = getByRole('button', { name: /Visitors/ });
    for (let i = 0; i < 5; i += 1) await fireEvent.press(tile);
    expect(onPress).toHaveBeenCalledTimes(5);
  });

  it('skips press animation but still fires onPress when Reduce Motion is enabled', async () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    const onPress = jest.fn();
    const { getByRole, toJSON } = await render(
      <ActionTile icon={<RNText>i</RNText>} label="Visitors" onPress={onPress} />,
    );
    const before = JSON.stringify(toJSON());
    const tile = getByRole('button', { name: /Visitors/ });
    await fireEvent(tile, 'pressIn');
    expect(JSON.stringify(toJSON())).toBe(before);
    await fireEvent.press(tile);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
  });
});
