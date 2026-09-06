import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

/**
 * Notice Board Screen-Level Error Boundary
 * Prevents errors inside specific notice screens from crashing the entire mobile app shell.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[NoticeBoard ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center p-6 bg-background">
          <Text className="text-foreground text-lg font-bold mb-2 text-center">Something went wrong</Text>
          <Text className="text-muted-foreground text-sm text-center mb-6">
            {this.state.error?.message || 'An unexpected error occurred in this screen.'}
          </Text>
          <Button onPress={this.handleReset}>Try Again</Button>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
