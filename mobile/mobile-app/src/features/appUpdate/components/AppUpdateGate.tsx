import React from 'react';
import useAppUpdate from '../hooks/useAppUpdate';
import { UpdatePromptModal } from './UpdatePromptModal';
import { MandatoryUpdateModal } from './MandatoryUpdateModal';

export const AppUpdateGate: React.FC = () => {
  const {
    policy,
    isLoading,
    isOptionalModalVisible,
    isMandatoryModalVisible,
    downloadProgress,
    isDownloading,
    isDownloaded,
    checkNow,
    dismissPrompt,
    triggerUpdate,
    completeUpdate,
    openPlayStore,
  } = useAppUpdate();

  return (
    <>
      {/* Optional Update Dialog (NORMAL and active IMPORTANT releases) */}
      <UpdatePromptModal
        visible={isOptionalModalVisible}
        policy={policy}
        downloadProgress={downloadProgress}
        isDownloading={isDownloading}
        isDownloaded={isDownloaded}
        onUpdateNow={() => triggerUpdate('FLEXIBLE')}
        onCompleteUpdate={completeUpdate}
        onLater={dismissPrompt}
      />

      {/* Mandatory Blocking Screen (CRITICAL and expired IMPORTANT releases) */}
      <MandatoryUpdateModal
        visible={isMandatoryModalVisible}
        policy={policy}
        onUpdateNow={() => triggerUpdate('IMMEDIATE')}
        onOpenStore={openPlayStore}
        onRetryCheck={() => checkNow(true)}
        isChecking={isLoading}
      />
    </>
  );
};

export default AppUpdateGate;
