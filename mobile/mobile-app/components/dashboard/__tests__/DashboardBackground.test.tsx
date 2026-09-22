import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import Svg from 'react-native-svg';
import { DashboardBackground } from '../DashboardBackground';
import { useColorScheme } from 'nativewind';

jest.mock('nativewind', () => ({
  useColorScheme: jest.fn(),
}));

describe('DashboardBackground Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly in light mode', () => {
    (useColorScheme as jest.Mock).mockReturnValue({
      colorScheme: 'light',
    });

    let renderer: any;
    act(() => {
      renderer = ReactTestRenderer.create(<DashboardBackground testID="test-bg" />);
    });

    const root = renderer.root;
    const view = root.findByProps({ testID: 'test-bg' });
    expect(view).toBeDefined();

    const svg = root.findByType(Svg);
    expect(svg).toBeDefined();
    expect(svg.props.viewBox).toBe('0 0 400 900');
    expect(svg.props.preserveAspectRatio).toBe('xMidYMid slice');
  });

  it('renders correctly in dark mode', () => {
    (useColorScheme as jest.Mock).mockReturnValue({
      colorScheme: 'dark',
    });

    let renderer: any;
    act(() => {
      renderer = ReactTestRenderer.create(<DashboardBackground testID="test-bg-dark" />);
    });

    const root = renderer.root;
    const view = root.findByProps({ testID: 'test-bg-dark' });
    expect(view).toBeDefined();

    const svg = root.findByType(Svg);
    expect(svg).toBeDefined();
    expect(svg.props.viewBox).toBe('0 0 400 900');
  });

  it('applies custom style when provided', () => {
    (useColorScheme as jest.Mock).mockReturnValue({
      colorScheme: 'light',
    });

    const customStyle = { opacity: 0.85 };
    let renderer: any;
    act(() => {
      renderer = ReactTestRenderer.create(
        <DashboardBackground testID="test-bg-custom" style={customStyle} />
      );
    });

    const root = renderer.root;
    const view = root.findByProps({ testID: 'test-bg-custom' });
    expect(view).toBeDefined();
  });
});
