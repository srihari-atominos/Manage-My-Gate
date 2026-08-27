import React from 'react';
import { RefreshControl, RefreshControlProps } from 'react-native';

export interface PullToRefreshProps extends RefreshControlProps {
  // Inherits all standard RefreshControl props
}

export const PullToRefresh = (props: PullToRefreshProps) => {
  return (
    <RefreshControl
      tintColor="#0f172a" // slate-900
      colors={['#0f172a']} // For Android
      {...props}
    />
  );
};
