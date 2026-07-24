import React, { useState } from 'react';
import { CButton, CSpinner } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCalendar, cilPeople, cilTrash, cilShareAlt, cilCheckCircle } from '@coreui/icons';
import { useAuth } from '../../auth/hooks/useAuth';
import dayjs from 'dayjs';

const PollCard = ({ poll, onVote, onDelete, onPublish, onClosePoll }) => {
  const { user, checkPermission } = useAuth();
  const [isVoting, setIsVoting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // A user has voted if any option's votes array contains them, OR we just trust the backend.
  // Wait, backend only sends `votesCount`, it doesn't send the array of who voted for privacy!
  const hasVoted = poll.hasVoted || false;
  const votedOptionIndex = poll.votedOptionIndex;
  const isAdmin = checkPermission('notices:manage_notices') || user?.isPlatformSuperAdmin;
  
  const userIdStr = String(user?.id || user?._id || '');
  const creatorIdStr = String(poll.createdBy?._id || poll.createdBy || '');
  const isCreator = userIdStr === creatorIdStr && userIdStr !== '';
  
  const canDelete = isAdmin || isCreator;
  const canManage = isCreator; // Publish/Close

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votesCount, 0);

  const handleVote = async (optionIndex) => {
    if (poll.status !== 'Active' || isVoting || optionIndex === votedOptionIndex) return;
    setIsVoting(true);
    try {
      await onVote(poll._id, optionIndex);
    } catch (err) {
      import('react-hot-toast').then(({ toast }) => {
        toast.error(err?.message || 'Failed to record vote');
      });
    } finally {
      setIsVoting(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this poll?')) {
      setIsDeleting(true);
      await onDelete(poll._id);
      setIsDeleting(false);
    }
  };

  return (
    <div className="poll-card">
      <div className="poll-header">
        <h3 className="poll-question">{poll.question}</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="poll-visibility-badge" style={{ fontSize: '12px', background: '#f8f9fa', padding: '4px 8px', borderRadius: '4px', border: '1px solid #dee2e6' }}>
            {poll.visibility === 'Community Admin Only' ? '👨💼' : poll.visibility === 'Residents Only' ? '🏠' : '🌍'} {poll.visibility || 'Everyone'}
          </span>
          <span className={`poll-status status-${poll.status.toLowerCase()}`}>
            {poll.status}
          </span>
        </div>
      </div>

      {poll.description && (
        <p className="poll-description">{poll.description}</p>
      )}

      <div className="poll-meta" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        <div className="meta-item">
          <CIcon icon={cilCalendar} size="sm" />
          <span>Created: {dayjs(poll.createdAt).format('MMM DD, YYYY')}</span>
        </div>
        <div className="meta-item">
          <CIcon icon={cilCalendar} size="sm" />
          <span>Ends: {dayjs(poll.endDate).format('MMM DD, YYYY h:mm A')}</span>
        </div>
        <div className="meta-item">
          <CIcon icon={cilPeople} size="sm" />
          <span>By: {poll.createdBy?.name || 'Unknown'} {poll.createdBy?.unit ? `(${poll.createdBy.unit})` : ''}</span>
        </div>
        <div className="meta-item">
          <CIcon icon={cilPeople} size="sm" />
          <span>{totalVotes} Votes</span>
        </div>
        {poll.status === 'Active' && (
          <div className="meta-item" style={{ gridColumn: '1 / -1', color: dayjs(poll.endDate).diff(dayjs(), 'day') < 1 ? '#d32f2f' : 'inherit' }}>
            <small>
              {dayjs(poll.endDate).diff(dayjs(), 'day') > 0 
                ? `${dayjs(poll.endDate).diff(dayjs(), 'day')} days remaining` 
                : dayjs(poll.endDate).diff(dayjs(), 'hour') > 0
                  ? `${dayjs(poll.endDate).diff(dayjs(), 'hour')} hours remaining`
                  : 'Closing soon'}
            </small>
          </div>
        )}
      </div>

      <div className="poll-options">
        {poll.options.map((option, index) => {
          const percentage = totalVotes > 0 ? Math.round((option.votesCount / totalVotes) * 100) : 0;
          const showResults = poll.status === 'Closed' || hasVoted;
          const isSelected = hasVoted && index === votedOptionIndex;

          return (
            <div 
              key={index}
              className={`poll-option ${showResults ? 'has-voted' : ''} ${poll.status !== 'Active' ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => poll.status === 'Active' && handleVote(index)}
              style={isSelected ? { borderColor: '#6f42c1', backgroundColor: 'rgba(111, 66, 193, 0.05)' } : {}}
            >
              <div 
                className="progress-bar" 
                style={{ width: showResults ? `${percentage}%` : '0%', backgroundColor: isSelected ? 'rgba(111, 66, 193, 0.3)' : undefined }}
              />
              <div className="option-content">
                <span className="option-text" style={isSelected ? { fontWeight: 'bold', color: '#6f42c1' } : {}}>
                  {isSelected && <CIcon icon={cilCheckCircle} size="sm" className="me-2" />}
                  {option.text}
                </span>
                {showResults && (
                  <span className="option-percentage">{percentage}%</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(hasVoted && poll.status === 'Active') && (
        <div style={{ marginTop: '16px', color: '#2e7d32', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CIcon icon={cilCheckCircle} size="sm" />
          Your vote has been recorded. You can click another option to change it.
        </div>
      )}

      {(canManage || canDelete) && (
        <div className="poll-actions mt-3 d-flex gap-2">
          {canManage && poll.status === 'Draft' && (
            <CButton 
              color="success" 
              variant="outline" 
              size="sm" 
              onClick={() => {
                if (window.confirm('Are you sure you want to publish this poll?')) {
                  onPublish(poll._id);
                }
              }}
              aria-label="Publish poll"
            >
              <CIcon icon={cilShareAlt} className="me-1" /> Publish
            </CButton>
          )}
          
          {canManage && poll.status === 'Active' && (
            <CButton 
              color="warning" 
              variant="outline" 
              size="sm" 
              onClick={() => {
                if (window.confirm('Are you sure you want to close this poll?')) {
                  onClosePoll(poll._id);
                }
              }}
              aria-label="Close poll"
            >
              <CIcon icon={cilCheckCircle} className="me-1" /> Close
            </CButton>
          )}

          {canDelete && (
            <CButton 
              color="danger" 
              variant="outline" 
              size="sm" 
              onClick={handleDelete}
              disabled={isDeleting}
              aria-label="Delete poll"
            >
              {isDeleting ? <CSpinner size="sm" /> : <><CIcon icon={cilTrash} className="me-1" /> Delete</>}
            </CButton>
          )}
        </div>
      )}
    </div>
  );
};

export default PollCard;
