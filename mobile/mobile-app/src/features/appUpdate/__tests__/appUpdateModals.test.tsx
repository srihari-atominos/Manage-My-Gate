import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { UpdatePromptModal } from '../components/UpdatePromptModal';
import { MandatoryUpdateModal } from '../components/MandatoryUpdateModal';
import { AppReleasePolicy } from '../services/appUpdateService';

jest.mock('expo-constants', () => ({
  expoConfig: {
    version: '1.0.8',
    android: {
      versionCode: 30,
    },
  },
}));

describe('UpdatePromptModal — Component Behavior', () => {
  const mockNormalPolicy: AppReleasePolicy = {
    platform: 'android',
    applicationId: 'com.atominosconsulting.nahom',
    hasUpdate: true,
    action: 'OPTIONAL',
    isSupported: true,
    latestVersion: '1.2.0',
    latestVersionCode: 32,
    releaseType: 'NORMAL',
    releaseNotes: ['Feature improvements and bug fixes'],
    gracePeriodDays: 0,
    gracePeriodDeadline: null,
    daysRemaining: null,
    minSupportedVersion: null,
    minSupportedVersionCode: null,
    storeUrl: 'https://play.google.com/store/apps/details?id=com.atominosconsulting.nahom',
  };

  it('renders optional update prompt with version information and notes', async () => {
    const onUpdateNow = jest.fn();
    const onCompleteUpdate = jest.fn();
    const onLater = jest.fn();

    const view = await render(
      <UpdatePromptModal
        visible={true}
        policy={mockNormalPolicy}
        downloadProgress={0}
        isDownloading={false}
        isDownloaded={false}
        onUpdateNow={onUpdateNow}
        onCompleteUpdate={onCompleteUpdate}
        onLater={onLater}
      />
    );

    expect(await view.findByText('New update available')).toBeTruthy();
    expect(await view.findByText('To enjoy our newest features tap the button below')).toBeTruthy();

    const updateNowBtn = await view.findByText('Update the app');
    fireEvent.press(updateNowBtn);
    expect(onUpdateNow).toHaveBeenCalled();

    const laterBtn = await view.findByText('Not now');
    fireEvent.press(laterBtn);
    expect(onLater).toHaveBeenCalled();
  });

  it('renders clean prompt for IMPORTANT release and can be dismissed via close icon', async () => {
    const onLater = jest.fn();
    const mockImportantPolicy: AppReleasePolicy = {
      ...mockNormalPolicy,
      releaseType: 'IMPORTANT',
      gracePeriodDays: 7,
      daysRemaining: 4,
    };

    const view = await render(
      <UpdatePromptModal
        visible={true}
        policy={mockImportantPolicy}
        downloadProgress={0}
        isDownloading={false}
        isDownloaded={false}
        onUpdateNow={jest.fn()}
        onCompleteUpdate={jest.fn()}
        onLater={onLater}
      />
    );

    expect(await view.findByText('New update available')).toBeTruthy();
    expect(view.queryByText('4 days remaining to update')).toBeNull();

    const closeBtn = await view.findByLabelText('Close update dialog');
    fireEvent.press(closeBtn);
    expect(onLater).toHaveBeenCalled();
  });

  it('renders restart button when download completes', async () => {
    const onCompleteUpdate = jest.fn();

    const view = await render(
      <UpdatePromptModal
        visible={true}
        policy={mockNormalPolicy}
        downloadProgress={100}
        isDownloading={false}
        isDownloaded={true}
        onUpdateNow={jest.fn()}
        onCompleteUpdate={onCompleteUpdate}
        onLater={jest.fn()}
      />
    );

    const restartBtn = await view.findByText('Restart to Apply');
    expect(restartBtn).toBeTruthy();
    fireEvent.press(restartBtn);
    expect(onCompleteUpdate).toHaveBeenCalled();
  });
});

describe('MandatoryUpdateModal — Component Behavior', () => {
  const mockCriticalPolicy: AppReleasePolicy = {
    platform: 'android',
    applicationId: 'com.atominosconsulting.nahom',
    hasUpdate: true,
    action: 'MANDATORY',
    isSupported: false,
    latestVersion: '1.2.0',
    latestVersionCode: 32,
    releaseType: 'CRITICAL',
    releaseNotes: ['Critical security upgrade'],
    gracePeriodDays: 0,
    gracePeriodDeadline: null,
    daysRemaining: 0,
    minSupportedVersion: null,
    minSupportedVersionCode: null,
    storeUrl: 'https://play.google.com/store/apps/details?id=com.atominosconsulting.nahom',
  };

  it('renders mandatory blocking screen with action buttons', async () => {
    const onUpdateNow = jest.fn();
    const onOpenStore = jest.fn();
    const onRetryCheck = jest.fn();

    const view = await render(
      <MandatoryUpdateModal
        visible={true}
        policy={mockCriticalPolicy}
        onUpdateNow={onUpdateNow}
        onOpenStore={onOpenStore}
        onRetryCheck={onRetryCheck}
        isChecking={false}
      />
    );

    expect(await view.findByText('NAHOM Update Required')).toBeTruthy();
    expect(await view.findByText('v1.0.8')).toBeTruthy();
    expect(await view.findByText('v1.2.0')).toBeTruthy();
    expect(await view.findByText('Critical security upgrade')).toBeTruthy();

    const updateNowBtn = await view.findByText('Update Now');
    fireEvent.press(updateNowBtn);
    expect(onUpdateNow).toHaveBeenCalled();

    const storeBtn = await view.findByText('Open Google Play Store');
    fireEvent.press(storeBtn);
    expect(onOpenStore).toHaveBeenCalled();

    const retryBtn = await view.findByText('Check Again');
    fireEvent.press(retryBtn);
    expect(onRetryCheck).toHaveBeenCalled();
  });
});
