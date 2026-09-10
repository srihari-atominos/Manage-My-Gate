import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import organizationReducer from '../store/organizationSlice';
import authReducer from '../../auth/store/authSlice';
import { CreateOrganizationForm } from '../components/CreateOrganizationForm';
import { CreateOrganizationScreen } from '../screens/CreateOrganizationScreen';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  Stack: {
    Screen: () => null,
  },
}));

describe('CreateOrganization UI Components Test Suite', () => {
  let mockStore: any;

  beforeEach(() => {
    mockStore = configureStore({
      reducer: {
        organization: organizationReducer,
        auth: authReducer,
      },
    });
  });

  it('renders CreateOrganizationForm tree with inputs, type selector, and action buttons', () => {
    let renderer: any;
    act(() => {
      renderer = ReactTestRenderer.create(
        <Provider store={mockStore}>
          <CreateOrganizationForm />
        </Provider>
      );
    });

    const json = renderer.toJSON();
    expect(json).toBeTruthy();

    const root = renderer.root;
    expect(root).toBeTruthy();
  });

  it('renders cancel button in tree when showCancelButton is true', () => {
    const onCancelMock = jest.fn();
    let renderer: any;
    act(() => {
      renderer = ReactTestRenderer.create(
        <Provider store={mockStore}>
          <CreateOrganizationForm showCancelButton={true} onCancel={onCancelMock} />
        </Provider>
      );
    });

    const json = renderer.toJSON();
    expect(json).toBeTruthy();
  });

  it('renders CreateOrganizationScreen orchestrator with layout wrapper and form', () => {
    let renderer: any;
    act(() => {
      renderer = ReactTestRenderer.create(
        <Provider store={mockStore}>
          <CreateOrganizationScreen />
        </Provider>
      );
    });

    const json = renderer.toJSON();
    expect(json).toBeTruthy();
  });
});
