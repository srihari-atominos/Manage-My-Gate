import React, { useState, useEffect } from 'react';
import { usePlatformBilling } from '../../hooks/usePlatformBilling';
import NewEnquiryModal from '../../components/NewEnquiryModal';

// Tab Imports
import OverviewTab from '../../components/tabs/OverviewTab';
import PricingTab from '../../components/tabs/PricingTab';
import MeetingsTab from '../../components/tabs/MeetingsTab';
import ConversationsTab from '../../components/tabs/ConversationsTab';
import PaymentTab from '../../components/tabs/PaymentTab';
import ProvisioningTab from '../../components/tabs/ProvisioningTab';
import OnboardingTab from '../../components/tabs/OnboardingTab';

const tabs = [
  { id: 'Overview', label: 'Overview' },
  { id: 'Pricing & Quote', label: 'Pricing & Quote' },
  { id: 'Meetings', label: 'Meetings' },
  { id: 'Conversations', label: 'Conversations' },
  { id: 'Payment', label: 'Payment & Invoice' },
  { id: 'Provisioning', label: 'Provisioning' },
  { id: 'Onboarding', label: 'Onboarding' }
];

const EnquiriesPage = () => {
  const { 
    leads = [], 
    selectedLeadId, 
    selectedLead,
    activeTab, 
    isLoading,
    selectLead,
    changeTab,
    fetchLeads 
  } = usePlatformBilling();

  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [calculatedQuoteTotal, setCalculatedQuoteTotal] = useState(null);
  
  // Persist mock meetings across user switches without a backend
  const [mockMeetings, setMockMeetings] = useState({});

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    if (!isLoading && leads.length > 0 && !selectedLeadId) {
      const firstId = leads[0]._id || leads[0].id;
      selectLead(firstId);
    }
  }, [isLoading, leads, selectedLeadId, selectLead]);

  const filteredLeads = leads.filter(lead => {
    const matchesFilter = filter === 'ALL' || lead.status === filter;
    const matchesSearch = `${lead.organizationName} ${lead.contactName} ${lead.email}`.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const renderTabContent = () => {
    const leadKey = selectedLead?._id || selectedLead?.id || 'new-lead';
    
    // Make fallback data dynamic based on the lead to prove UI reactivity
    const isDemo = selectedLead?.status === 'DEMO_SCHEDULED';
    const isQual = selectedLead?.status === 'QUALIFIED';
    const mockProvStep = isDemo ? 4 : (isQual ? 2 : 0);
    const mockOnboardStep = isDemo ? 3 : (isQual ? 1 : 0);
    
    switch (activeTab) {
      case 'Overview': return <OverviewTab key={leadKey} lead={selectedLead} />;
      case 'Pricing & Quote': return <PricingTab key={leadKey} lead={selectedLead} onQuoteTotalChange={setCalculatedQuoteTotal} />;
      case 'Meetings': return (
        <MeetingsTab 
          key={leadKey} 
          lead={selectedLead} 
          savedMeetings={mockMeetings[leadKey]} 
          onMeetingsChange={(newMeetings) => setMockMeetings(prev => ({ ...prev, [leadKey]: newMeetings }))} 
        />
      );
      case 'Conversations': return <ConversationsTab key={leadKey} lead={selectedLead} />;
      case 'Payment': return <PaymentTab key={leadKey} postTrialTotal={calculatedQuoteTotal !== null ? calculatedQuoteTotal : (selectedLead?.postTrialTotal || (isDemo ? 120500 : 93409))} currentStatus={selectedLead?.status || '15-Day Free Trial'} trialExpiryDate={selectedLead?.trialExpiryDate || '19 Aug 2026'} paymentLink={selectedLead?.paymentLink || `https://pay.managemygate.com/q/${leadKey.substring(0,6)}`} />;
      case 'Provisioning': return <ProvisioningTab key={leadKey} currentStepIndex={selectedLead?.provisioningStepIndex ?? mockProvStep} />;
      case 'Onboarding': return <OnboardingTab key={leadKey} currentStepIndex={selectedLead?.onboardingStepIndex ?? mockOnboardStep} />;
      default: return <OverviewTab key={leadKey} lead={selectedLead} />;
    }
  };

  const getStatusColor = (s) => {
    return s === 'QUALIFIED' || s === 'DEMO_SCHEDULED' ? 'blue' : s === 'NEW' ? 'gray' : 'green';
  };

  return (
    <section id="page-enquiries" className="page">
      <div className="page-head">
        <div>
          <h1>Enquiry Management</h1>
          <div className="sub">Manage CRM leads, lifecycle, and pricing quotes.</div>
        </div>
        <button className="btn primary" onClick={() => setIsModalOpen(true)}>+ New Enquiry</button>
      </div>

      <div className="workspace">
        
        {/* Inquiry List Panel */}
        <div className="panel inquiry-list">
          <div className="inquiry-tools">
            <label htmlFor="inqSearch" className="hidden">Filter enquiries</label>
            <input 
              className="inquiry-search input" 
              id="inqSearch"
              placeholder="Search enquiries..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="filters">
              {['ALL', 'NEW', 'QUALIFIED', 'DEMO_SCHEDULED'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`filter ${filter === f ? 'active' : ''}`}
                >
                  {f === 'ALL' ? 'All' : f === 'DEMO_SCHEDULED' ? 'Demo' : f.charAt(0) + f.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          
          <div className="inquiries">
            {isLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
            ) : filteredLeads.map(lead => {
              const currentId = lead._id || lead.id;
              const isSelected = currentId === selectedLeadId;
              return (
                <div 
                  key={currentId} 
                  onClick={() => selectLead(currentId)}
                  className={`inq ${isSelected ? 'active' : ''}`}
                >
                  <div className="inq-top">
                    <div>
                      <div className="inq-name">{lead.organizationName}</div>
                      <div className="inq-org">{lead.contactName}</div>
                    </div>
                    <span className={`badge ${getStatusColor(lead.status)}`}>
                      {lead.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="inq-meta">
                    <span>{lead.unitCount} units · {lead.features} features</span>
                    <strong>₹{lead.amount}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="panel detail">
          {selectedLead ? (
            <>
              <div className="detail-head">
                <div className="detail-title">
                  <div>
                    <h2 id="detailOrg">{selectedLead.organizationName}</h2>
                    <div className="sub" id="detailContact">
                      {selectedLead.contactName} · {selectedLead.email}
                    </div>
                  </div>
                  <div className="title-meta">
                    <span className={`badge ${getStatusColor(selectedLead.status)}`}>
                      {selectedLead.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 7-TAB Navigation */}
              <nav className="tabs" aria-label="Enquiry Details Tabs">
                {tabs.map((tab) => {
                  const isActive = tab.id === activeTab;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => changeTab(tab.id)}
                      className={`tab ${isActive ? 'active' : ''}`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </nav>

              {/* Tab Content Area */}
              <div className="tab-content">
                {renderTabContent()}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Select an enquiry to view details.
            </div>
          )}
        </div>
        
      </div>
      
      <NewEnquiryModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </section>
  );
};

export default EnquiriesPage;
