import React from 'react';
import VisitorTopNav from '../components/VisitorTopNav.jsx';
import InvitationForm from '../components/InvitationForm.jsx';
import ActiveInvitesTable from '../components/ActiveInvitesTable.jsx';
import WalkInApprovalList from '../components/WalkInApprovalList.jsx';
import VisitorLogsTable from '../components/VisitorLogsTable.jsx';
import BlacklistSettings from '../components/BlacklistSettings.jsx';
import InvitationSuccessModal from '../components/InvitationSuccessModal.jsx';
import PageHeader from 'src/components/common/PageHeader';
import { ArrowRightLeft, QrCode, UserMinus, TrendingUp, UserPlus, Users, Truck, Wrench } from 'lucide-react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import useAdminVisitorManagement from '../hooks/useAdminVisitorManagement.js';
import '../styles/_visitorManagement.scss';

export const AdminVisitorManagementViews = () => {
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
    blacklist,
    setBlacklist,
    logs
  } = useAdminVisitorManagement();

  // Metrics calculations
  const totalEntries = logs.length;
  const activePassesCount = passes.filter(p => p.status === 'ACTIVE' || p.status === 'Active' || p.status === 'PENDING' || p.status === 'Pending').length;
  const blacklistCount = blacklist.length;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 visitor-management-module-wrapper">
      <PageHeader
        title="Admin Portal Console"
        subtitle="Review community traffic logs, manage pre-approvals database, configure blacklist rules, and inspect stats."
      />

      <VisitorTopNav activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mt-4 space-y-6">
        <InvitationSuccessModal 
          visible={!!generatedPass} 
          onClose={() => setGeneratedPass(null)} 
          passData={generatedPass} 
        />

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark flex items-center gap-4.5">
                <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-black dark:text-white">{totalEntries}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Gate Entries</p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark flex items-center gap-4.5">
                <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-success/10 text-success">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-black dark:text-white">{activePassesCount}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Active Passes</p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark flex items-center gap-4.5">
                <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-danger/10 text-danger">
                  <UserMinus className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-black dark:text-white">{blacklistCount}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Banned Profiles</p>
                </div>
              </div>
            </div>

            {/* Peak Hour Traffic Chart Placeholder */}
            <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
              <h3 className="text-base font-bold flex items-center gap-2 text-black dark:text-white mb-6">
                <TrendingUp className="h-4.5 w-4.5 text-primary shrink-0" />
                <span>Peak Hour Traffic Trends</span>
              </h3>
              
              <div className="h-48 flex items-end gap-2 border-b border-l border-stroke dark:border-strokedark pb-1.5 pl-1.5">
                {[
                  { hour: '08:00', height: 'h-1/5', entries: 12 },
                  { hour: '10:00', height: 'h-4/5', entries: 48 },
                  { hour: '12:00', height: 'h-3/5', entries: 35 },
                  { hour: '14:00', height: 'h-2/5', entries: 24 },
                  { hour: '16:00', height: 'h-3/5', entries: 38 },
                  { hour: '18:00', height: 'h-5/5', entries: 59 },
                  { hour: '20:00', height: 'h-2/5', entries: 21 },
                  { hour: '22:00', height: 'h-1/5', entries: 8 }
                ].map((bar) => (
                  <div key={bar.hour} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                    <div className="w-full bg-slate-100 dark:bg-meta-4 group-hover:bg-primary/20 rounded-t h-36 flex items-end">
                      <div className={`w-full bg-primary rounded-t transition-all group-hover:bg-primary-hover ${bar.height}`} />
                    </div>
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 font-semibold">{bar.hour}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-3 font-medium">
                Peak visitor entry frequencies captured at security gates within the last 24 hours.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'create' && (
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
        )}

        {activeTab === 'walkin' && (
          <WalkInApprovalList 
            walkins={walkins} 
            setWalkins={setWalkins} 
            onApprove={handleApproveEntry} 
            onDeny={handleDenyEntry}
            logs={logs}
          />
        )}

        {activeTab === 'logs' && (
          <VisitorLogsTable 
            logs={logs} 
          />
        )}

        {activeTab === 'blacklist' && (
          <BlacklistSettings 
            blacklist={blacklist} 
            setBlacklist={setBlacklist} 
          />
        )}
      </div>
    </div>
  );
};

export default AdminVisitorManagementViews;
