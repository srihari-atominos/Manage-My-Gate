import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { View, BackHandler } from 'react-native';
import { DraggableSpeedDial, SpeedDialAction } from '../../../components/ui/DraggableSpeedDial';

// Mock Lucide Icons
const MockIconComponent: React.FC<{ size?: number; className?: string; color?: string }> = () => (
  <View testID="mock-icon-component" />
);

describe('DraggableSpeedDial Component', () => {
  it('renders without error when actions provide JSX elements as icon (e.g., <UserPlus />)', async () => {
    const actionsWithJsx: SpeedDialAction[] = [
      {
        id: 'invite_user',
        label: 'Invite User',
        icon: <View testID="jsx-icon-element" />,
        onPress: jest.fn(),
      },
      {
        id: 'bulk_create',
        label: 'Bulk Create',
        icon: <View testID="jsx-icon-bulk" />,
        onPress: jest.fn(),
      },
    ];

    await render(
      <DraggableSpeedDial actions={actionsWithJsx} accessibilityLabel="User Actions" />
    );

    expect(screen.getByLabelText('User Actions')).toBeTruthy();
    expect(screen.getByTestId('jsx-icon-element')).toBeTruthy();
    expect(screen.getByTestId('jsx-icon-bulk')).toBeTruthy();
  });

  it('renders without error when actions provide Component functions as icon (e.g., UserPlus)', async () => {
    const actionsWithComponent: SpeedDialAction[] = [
      {
        id: 'action_func',
        label: 'Function Action',
        icon: MockIconComponent,
        onPress: jest.fn(),
      },
    ];

    await render(
      <DraggableSpeedDial actions={actionsWithComponent} />
    );

    expect(screen.getByTestId('mock-icon-component')).toBeTruthy();
    expect(screen.getByText('Function Action')).toBeTruthy();
  });

  it('toggles open/close state on click', async () => {
    const handleOpenChange = jest.fn();
    const actions: SpeedDialAction[] = [
      { id: '1', label: 'Item 1', icon: <View />, onPress: jest.fn() },
    ];

    await render(
      <DraggableSpeedDial actions={actions} onOpenChange={handleOpenChange} />
    );

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Quick action menu'));
    });

    expect(handleOpenChange).toHaveBeenCalledWith(true);
  });

  it('triggers action onPress when sub-action button is pressed', async () => {
    const handlePress = jest.fn();
    const actions: SpeedDialAction[] = [
      {
        id: 'test_press',
        label: 'Test Action',
        icon: <View testID="test-icon" />,
        onPress: handlePress,
      },
    ];

    await render(
      <DraggableSpeedDial actions={actions} />
    );

    // Open dial first
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Quick action menu'));
    });

    // Press action button
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Test Action'));
    });

    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  it('exposes expanded accessibilityState and updates it on toggle', async () => {
    const actions: SpeedDialAction[] = [
      { id: '1', label: 'Item 1', icon: <View />, onPress: jest.fn() },
    ];

    await render(<DraggableSpeedDial actions={actions} />);
    const toggleButton = screen.getByLabelText('Quick action menu');

    expect(toggleButton.props.accessibilityState).toEqual({ expanded: false });

    await act(async () => {
      fireEvent.press(toggleButton);
    });

    expect(toggleButton.props.accessibilityState).toEqual({ expanded: true });
  });

  it('closes open speed dial and consumes Android hardware back press', async () => {
    let backPressHandler: (() => boolean) | null = null;
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'hardwareBackPress') {
        backPressHandler = handler as () => boolean;
      }
      return { remove: jest.fn() } as any;
    });

    const handleOpenChange = jest.fn();
    const actions: SpeedDialAction[] = [
      { id: '1', label: 'Item 1', icon: <View />, onPress: jest.fn() },
    ];

    await render(
      <DraggableSpeedDial actions={actions} onOpenChange={handleOpenChange} />
    );

    // Initially closed: backPressHandler should not be registered
    expect(backPressHandler).toBeNull();

    // Open the dial
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Quick action menu'));
    });

    expect(handleOpenChange).toHaveBeenCalledWith(true);
    expect(backPressHandler).toBeDefined();

    // Simulate Android hardware back press
    let consumed = false;
    await act(async () => {
      if (backPressHandler) {
        consumed = backPressHandler();
      }
    });

    expect(consumed).toBe(true);
    expect(handleOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByLabelText('Quick action menu').props.accessibilityState).toEqual({ expanded: false });
  });
});
