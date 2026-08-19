import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
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
    const { getByText } = render(
      <VisitorPassCard
        pass={mockPass}
        onPress={mockOnPress}
        onShowQR={mockOnShowQR}
        villaBadge="42B"
      />
    );

    expect(getByText('Alice Swiggy')).toBeTruthy();
    expect(getByText(/Villa: 42B/)).toBeTruthy();
    expect(getByText(/Ph: \+966500000055/)).toBeTruthy();
    expect(getByText('ACTIVE')).toBeTruthy();
    expect(getByText('Pass Code')).toBeTruthy();
  });

  it('triggers onPress callback when card is pressed', () => {
    const { getByText } = render(
      <VisitorPassCard
        pass={mockPass}
        onPress={mockOnPress}
        onShowQR={mockOnShowQR}
      />
    );

    fireEvent.press(getByText('Alice Swiggy'));
    expect(mockOnPress).toHaveBeenCalledWith(mockPass);
  });

  it('triggers onShowQR callback when Pass Code button is pressed', () => {
    const { getByText } = render(
      <VisitorPassCard
        pass={mockPass}
        onPress={mockOnPress}
        onShowQR={mockOnShowQR}
      />
    );

    fireEvent.press(getByText('Pass Code'));
    expect(mockOnShowQR).toHaveBeenCalledWith(mockPass);
  });
});
