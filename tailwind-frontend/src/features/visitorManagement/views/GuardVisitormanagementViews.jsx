import React from 'react';
import VisitorTopNav from '../components/VisitorTopNav.jsx';
import GuardInviteVisitorForm from '../components/GuardInviteVisitorForm.jsx';
import GuardScannerConsole from '../components/GuardScannerConsole.jsx';
import LiveEntriesTable from '../components/LiveEntriesTable.jsx';
import VillaDirectoryList from '../components/VillaDirectoryList.jsx';
import PageHeader from 'src/components/common/PageHeader';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import useGuardVisitorManagement from '../hooks/useGuardVisitorManagement.js';
import '../styles/_visitorManagement.scss';

export const GuardVisitormanagementViews = () => {
  const {
    activeTab,
    setActiveTab,
    dbVillas,
    dbUsers,
    loadingDirectory,
    passes,
    liveEntries,
    directoryVillas,
    handleInitiateWalkIn,
    handleCheckInSuccess,
    handleCheckOutSuccess
  } = useGuardVisitorManagement();

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 visitor-management-module-wrapper">
      <PageHeader
        title="Security Guard Console"
        subtitle="Verify guest QR tickets, register walk-in entries, dial unit intercom directory, and review live logs."
      />

      <VisitorTopNav activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mt-4">
        {activeTab === 'invite' && (
          <GuardInviteVisitorForm 
            dbVillas={dbVillas} 
            dbUsers={dbUsers} 
            loadingDirectory={loadingDirectory} 
            onInitiateWalkIn={handleInitiateWalkIn} 
            onCheckInSuccess={handleCheckInSuccess} 
          />
        )}

        {activeTab === 'scanner' && (
          <GuardScannerConsole 
            passes={passes} 
            liveEntries={liveEntries} 
            onCheckInSuccess={handleCheckInSuccess} 
            onCheckOutSuccess={handleCheckOutSuccess} 
          />
        )}

        {activeTab === 'live' && (
          <LiveEntriesTable 
            liveEntries={liveEntries} 
            onCheckOutSuccess={handleCheckOutSuccess} 
          />
        )}

        {activeTab === 'directory' && (
          <VillaDirectoryList 
            villas={directoryVillas} 
          />
        )}
      </div>
    </div>
  );
};

export default GuardVisitormanagementViews;
