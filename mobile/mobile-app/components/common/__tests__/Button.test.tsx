import React from 'react';
import { View, Text as RNText } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { Camera } from 'lucide-react-native';
import { Button } from '../Button';

describe('Button (Common)', () => {
  it('exposes a button role, accessible state, and invokes onPress when clicked', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(
      <Button accessibilityLabel="Create user" onPress={onPress}>
        Create
      </Button>
    );

    const button = getByRole('button', { name: 'Create user' });
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityState).toEqual({ disabled: false });

    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('announces loading actions as disabled and busy, rendering loading text and blocking clicks', async () => {
    const onPress = jest.fn();
    const { getByRole, getByText } = await render(
      <Button accessibilityLabel="Submitting application" loading onPress={onPress}>
        Submit
      </Button>
    );

    const button = getByRole('button', { name: 'Submitting application' });
    expect(button.props.accessibilityState).toEqual({ disabled: true, busy: true });
    expect(getByText('Loading...')).toBeTruthy();

    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('announces disabled actions as disabled and blocks clicks', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(
      <Button accessibilityLabel="Save profile" disabled onPress={onPress}>
        Save
      </Button>
    );

    const button = getByRole('button', { name: 'Save profile' });
    expect(button.props.accessibilityState).toEqual({ disabled: true });

    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('enforces 44pt minimum touch target on mobile buttons', async () => {
    const { getByRole } = await render(
      <Button size="sm" accessibilityLabel="Action">
        Compact
      </Button>
    );

    const button = getByRole('button', { name: 'Action' });
    expect(button.props.className).toContain('min-h-11');
  });

  it('renders leftIcon and scales plain text child with adjustsFontSizeToFit', async () => {
    const { getByText } = await render(
      <Button leftIcon={Camera}>
        Take Live Photo
      </Button>
    );

    const textElement = getByText('Take Live Photo');
    expect(textElement.props.adjustsFontSizeToFit).toBe(true);
    expect(textElement.props.minimumFontScale).toBe(0.7);
    expect(textElement.props.numberOfLines).toBe(1);
  });

  it('safely renders custom React element children without wrapping inside nested Text', async () => {
    const { getByTestId, queryByText } = await render(
      <Button>
        <View testID="custom-child-view">
          <RNText testID="custom-child-text">Custom Content</RNText>
        </View>
      </Button>
    );

    expect(getByTestId('custom-child-view')).toBeTruthy();
    expect(getByTestId('custom-child-text')).toBeTruthy();
  });

  it('safely wraps interpolated text array children (like Send ({count}) Invites) in Text', async () => {
    const count = 5;
    const { getByText } = await render(
      <Button>
        Send ({count}) Invites
      </Button>
    );

    const textElement = getByText(/Send.*5.*Invites/);
    expect(textElement).toBeTruthy();
    expect(textElement.props.numberOfLines).toBe(1);
  });

  it('safely wraps numeric children in Text', async () => {
    const { getByText } = await render(
      <Button>
        {42}
      </Button>
    );

    expect(getByText('42')).toBeTruthy();
  });
});
