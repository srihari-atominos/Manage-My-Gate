import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { useReducedMotion } from 'react-native-reanimated';

import { Button } from '../button';

describe('Button', () => {
  it('exposes a button role and invokes its callback when enabled', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(
      <Button accessibilityLabel="Save changes" onPress={onPress}>Save</Button>,
    );

    const button = getByRole('button', { name: 'Save changes' });
    expect(button.props.accessibilityRole).toBe('button');

    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('announces loading actions as disabled and busy, without invoking them', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(
      <Button accessibilityLabel="Save changes" loading onPress={onPress}>Save</Button>,
    );

    const button = getByRole('button', { name: 'Save changes' });
    expect(button.props.accessibilityState).toEqual({ disabled: true, busy: true });

    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Button press feedback', () => {
  const touchEvent = { nativeEvent: { touches: [], changedTouches: [], identifier: 1, timestamp: 0 }, persist: () => {} };
  const flat = (style: any): any[] => [].concat(style ?? []).flat(Infinity).filter(Boolean);

  it('applies a transform only while pressed and enabled', async () => {
    const { getByRole } = await render(<Button accessibilityLabel="Go" onPress={jest.fn()}>Go</Button>);
    const button = getByRole('button', { name: 'Go' });
    const hasScale = () => flat(button.props.style).some((s) => Array.isArray(s.transform));
    expect(hasScale()).toBe(false);
    await fireEvent(button, 'responderGrant', touchEvent);
    expect(hasScale()).toBe(true);
  });

  it('keeps caller style and onPressIn/onPressOut handlers', async () => {
    const onPressIn = jest.fn();
    const { getByRole } = await render(
      <Button accessibilityLabel="Go" style={{ marginTop: 7 }} onPressIn={onPressIn}>Go</Button>,
    );
    const button = getByRole('button', { name: 'Go' });
    expect(flat(button.props.style).some((s) => s.marginTop === 7)).toBe(true);
    await fireEvent(button, 'responderGrant', touchEvent);
    expect(onPressIn).toHaveBeenCalled();
    expect(flat(button.props.style).some((s) => s.marginTop === 7)).toBe(true);
  });

  it('does not apply press feedback while loading', async () => {
    const { getByRole } = await render(<Button accessibilityLabel="Go" loading onPress={jest.fn()}>Go</Button>);
    const button = getByRole('button', { name: 'Go' });
    await fireEvent(button, 'responderGrant', touchEvent);
    expect(flat(button.props.style).some((s) => Array.isArray(s.transform))).toBe(false);
  });

  it('does not scale while pressed when Reduce Motion is enabled', async () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    const onPress = jest.fn();
    const { getByRole } = await render(<Button accessibilityLabel="Go" onPress={onPress}>Go</Button>);
    const button = getByRole('button', { name: 'Go' });
    await fireEvent(button, 'responderGrant', touchEvent);
    expect(flat(button.props.style).some((s) => Array.isArray(s.transform))).toBe(false);
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
  });
});
