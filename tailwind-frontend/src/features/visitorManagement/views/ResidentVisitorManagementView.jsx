import React from 'react';
import VisitorTopNav from '../components/VisitorTopNav.jsx';
import InvitationForm from '../components/InvitationForm.jsx';
import ActiveInvitesTable from '../components/ActiveInvitesTable.jsx';
import WalkInApprovalList from '../components/WalkInApprovalList.jsx';
import InvitationSuccessModal from '../components/InvitationSuccessModal.jsx';
import PageHeader from 'src/components/common/PageHeader';
import { UserPlus, Users, Truck, Wrench } from 'lucide-react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import useResidentVisitorManagement from '../hooks/useResidentVisitorManagement.js';
import '../styles/_visitorManagement.scss';

export const ResidentVisitorManagementView = () => {
  const {
    activeTab,
    setActiveTab,
    inviteMethod,
    setInviteMethod,
    guestPassType,
    setGuestPassType,
    cabPassType,
    setCabPassType,
    cabUsageType,
    setCabUsageType,
    servicePassType,
    setServicePassType,
    serviceUsageType,
    setServiceUsageType,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    passes,
    walkins,
    setWalkins,
    formData,
    handleInputChange,
    handleCreatePass,
    handleRevokePass,
    handleCopyPass,
    handleApproveEntry,
    handleDenyEntry,
    generatedPass,
    setGeneratedPass,
    logs
  } = useResidentVisitorManagement();

  console.log('[ResidentVisitorManagementView] generatedPass:', generatedPass);

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 visitor-management-module-wrapper">
      <PageHeader
        title="Visitor Management Console"
        subtitle="Manage personal invites, cabs/delivery passes, maintenance service permissions, and check gate approvals."
      />

      <VisitorTopNav activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="mt-4">
        <InvitationSuccessModal 
          visible={!!generatedPass} 
          onClose={() => setGeneratedPass(null)} 
          passData={generatedPass} 
        />

        {activeTab === 'create' ? (
          <div className="space-y-6">
            {/* Invitation Method Filter */}
            <div>
              <span className="text-2xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2.5">
                Invitation Method
              </span>
              <div className="flex gap-2 flex-wrap">
                {[
                  { id: 'guest', name: 'Guest Invite', icon: UserPlus },
                  { id: 'group', name: 'Group Invite', icon: Users },
                  { id: 'cab_delivery', name: 'Cab & Delivery', icon: Truck },
                  { id: 'service', name: 'Service Invite', icon: Wrench }
                ].map((method) => {
                  const isSelected = inviteMethod === method.id;
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => {
                        setInviteMethod(method.id);
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all inline-flex items-center gap-2 ${
                        isSelected
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-white dark:bg-meta-4 border-stroke dark:border-strokedark text-gray-500 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{method.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form and List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <InvitationForm 
                inviteMethod={inviteMethod}
                guestPassType={guestPassType}
                setGuestPassType={setGuestPassType}
                cabPassType={cabPassType}
                setCabPassType={setCabPassType}
                cabUsageType={cabUsageType}
                setCabUsageType={setCabUsageType}
                servicePassType={servicePassType}
                setServicePassType={setServicePassType}
                serviceUsageType={serviceUsageType}
                setServiceUsageType={setServiceUsageType}
                formData={formData}
                handleInputChange={handleInputChange}
                handleCreatePass={handleCreatePass}
              />

              <ActiveInvitesTable 
                passes={passes}
                inviteMethod={inviteMethod}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                itemsPerPage={itemsPerPage}
                handleCopyPass={handleCopyPass}
                handleRevokePass={handleRevokePass}
                setGeneratedPass={setGeneratedPass}
              />
            </div>
          </div>
        ) : (
          <WalkInApprovalList 
            walkins={walkins} 
            setWalkins={setWalkins} 
            onApprove={handleApproveEntry} 
            onDeny={handleDenyEntry}
            logs={logs}
          />
        )}
      </div>
    </div>
  );
};

export default ResidentVisitorManagementView;
