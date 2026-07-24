import React, { useEffect, useState, useCallback, useRef } from 'react';
import { CSpinner, CButton, CNav, CNavItem, CNavLink, CFormInput, CFormSelect } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilSearch } from '@coreui/icons';
import { usePolls } from '../hooks/usePolls';
import { usePollSocket } from '../hooks/usePollSocket';
import NoticeBoardTopNav from '../../noticeBoard/components/NoticeBoardTopNav';
import PollCard from '../components/PollCard';
import CreatePollModal from '../components/CreatePollModal';
import '../styles/_poll.scss';
import { useAuth } from '../../auth/hooks/useAuth';

const PollDashboardView = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('active');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('latest');
  const searchTimeout = useRef(null);

  usePollSocket(activeTab, searchQuery, sortOption); // Initialize socket listeners with dependencies
  const { 
    activePolls, closedPolls, myPolls, 
    loadActivePolls, loadClosedPolls, loadMyPolls,
    submitNewPoll, submitVote, publishPoll, closePoll, deletePoll
  } = usePolls();
  


  const fetchPolls = useCallback((tab, search = searchQuery, sort = sortOption) => {
    const params = { page: 1, limit: 20, search, sort };
    if (tab === 'active') loadActivePolls(params);
    if (tab === 'closed') loadClosedPolls(params);
    if (tab === 'my') loadMyPolls(params);
  }, [loadActivePolls, loadClosedPolls, loadMyPolls, searchQuery, sortOption]);

  useEffect(() => {
    fetchPolls(activeTab, searchQuery, sortOption);
  }, [activeTab]); // Fetch only on tab change or explicit search/sort change

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchPolls(activeTab, val, sortOption);
    }, 500);
  };

  const handleSortChange = (e) => {
    const val = e.target.value;
    setSortOption(val);
    fetchPolls(activeTab, searchQuery, val);
  };

  const handleCreatePoll = async (pollData) => {
    await submitNewPoll(pollData);
    if (activeTab !== 'my') {
      setActiveTab('my'); // Redirect to my polls so they can publish it
    } else {
      fetchPolls('my'); // Refresh if already on 'my' tab
    }
  };

  const currentList = 
    activeTab === 'active' ? activePolls :
    activeTab === 'closed' ? closedPolls :
    myPolls;

  return (
    <div className="poll-dashboard-container">
      <NoticeBoardTopNav />

      <div className="poll-tabs-header mt-4">
        <h2>Community Polls</h2>
        <CButton color="primary" onClick={() => setCreateModalVisible(true)}>
          <CIcon icon={cilPlus} className="me-2" />
          Create Poll
        </CButton>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <CNav variant="tabs" className="border-0">
          <CNavItem>
            <CNavLink 
              active={activeTab === 'active'} 
              onClick={() => setActiveTab('active')}
              style={{ cursor: 'pointer' }}
            >
              Active Polls
            </CNavLink>
          </CNavItem>

          <CNavItem>
            <CNavLink 
              active={activeTab === 'my'} 
              onClick={() => setActiveTab('my')}
              style={{ cursor: 'pointer' }}
            >
              My Polls
            </CNavLink>
          </CNavItem>
        </CNav>

        <div className="d-flex gap-3 align-items-center">
          <div className="position-relative" style={{ width: '250px' }}>
            <CFormInput
              type="text"
              placeholder="Search polls..."
              value={searchQuery}
              onChange={handleSearchChange}
              style={{ paddingLeft: '36px' }}
            />
            <CIcon icon={cilSearch} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6c757d' }} />
          </div>
          <CFormSelect value={sortOption} onChange={handleSortChange} style={{ width: '150px' }}>
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
            <option value="endingSoon">Ending Soon</option>
          </CFormSelect>
        </div>
      </div>

      <div className="poll-list-wrapper">
        {currentList.loading && currentList.data.length === 0 ? (
          <div className="poll-grid" style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {[1, 2, 3].map(n => (
              <div key={n} className="poll-card skeleton-card">
                <div className="skeleton-line title"></div>
                <div className="skeleton-line text"></div>
                <div className="skeleton-line option"></div>
                <div className="skeleton-line option"></div>
              </div>
            ))}
          </div>
        ) : currentList.error ? (
          <div className="alert alert-danger">{currentList.error}</div>
        ) : currentList.data.length === 0 ? (
          <div className="text-center py-5 text-muted empty-state">
            <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>📊</div>
            <h4>No polls found</h4>
            <p>Try adjusting your search filters or create a new poll.</p>
          </div>
        ) : (
          <div className="poll-grid" style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {currentList.data.map(poll => (
              <PollCard 
                key={poll._id} 
                poll={poll} 
                onVote={submitVote}
                onDelete={deletePoll}
                onPublish={publishPoll}
                onClosePoll={closePoll}
              />
            ))}
          </div>
        )}
      </div>

      <CreatePollModal 
        visible={createModalVisible} 
        setVisible={setCreateModalVisible}
        onSubmit={handleCreatePoll}
      />
    </div>
  );
};

export default PollDashboardView;
