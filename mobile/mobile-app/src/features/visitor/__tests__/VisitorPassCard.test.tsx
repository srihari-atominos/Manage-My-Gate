import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { VisitorPassCard } from '../components/VisitorPassCard';
import { VisitorPass } from '../store/visitorPassSlice';

describe('VisitorPassCard UI Component', () => {
  const mockPass: VisitorPass = {
    _id: 'pass-101',
    visitorName: 'Alice Swiggy',
    phone: '+966500000055',
    purpose: 'Food Delivery',
    status: 'ACTIVE',
    code: '992011',
  };

  const mockOnPress = jest.fn();
  const mockOnShowQR = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders visitor pass card with visitor name and details correctly', () => {
    let tree: any;
    act(() => {
      tree = ReactTestRenderer.create(
        <VisitorPassCard
          pass={mockPass}
          onPress={mockOnPress}
          onShowQR={mockOnShowQR}
          villaBadge="42B"
        />
      );
    });

    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Alice Swiggy');
    expect(json).toContain('Villa: 42B');
    expect(json).toContain('Ph: +966500000055');
    expect(json).toContain('ACTIVE');
    expect(json).toContain('Pass Code');
  });

  it('triggers onPress callback when card is pressed', () => {
    let tree: any;
    act(() => {
      tree = ReactTestRenderer.create(
        <VisitorPassCard
          pass={mockPass}
          onPress={mockOnPress}
          onShowQR={mockOnShowQR}
        />
      );
    });

    const listCardPressable = tree.root.findByProps({ title: 'Alice Swiggy' });
    expect(listCardPressable).toBeTruthy();
    act(() => {
      listCardPressable.props.onPress();
    });
    expect(mockOnPress).toHaveBeenCalledWith(mockPass);
  });

  it('triggers onShowQR callback when Pass Code button is pressed', () => {
    let tree: any;
    act(() => {
      tree = ReactTestRenderer.create(
        <VisitorPassCard
          pass={mockPass}
          onPress={mockOnPress}
          onShowQR={mockOnShowQR}
        />
      );
    });

    const buttonInstance = tree.root.findByProps({ variant: 'outline', size: 'sm' });
    expect(buttonInstance).toBeTruthy();
    act(() => {
      buttonInstance.props.onPress({ stopPropagation: jest.fn() });
    });
    expect(mockOnShowQR).toHaveBeenCalledWith(mockPass);
  });
});
