import React from 'react';
import CIcon from '@coreui/icons-react';
import { cilCopy, cilTrash, cilBan, cilQrCode } from '@coreui/icons';

export const ActiveInvitesTable = ({
  passes,
  inviteMethod,
  searchQuery,
  setSearchQuery,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  handleCopyPass,
  handleRevokePass,
  setGeneratedPass
}) => {
  const formatPassId = (id) => {
    if (!id || id.length <= 10) return id;
    return `${id.slice(0, 6)}...${id.slice(-4)}`;
  };

  // Filter and Paginate Passes
  const filteredPasses = (passes || []).filter(pass => {
    if (!pass) return false;
    const passMethod = pass.method || (
      (pass.passType === 'CAB' || pass.passType === 'DELIVERY') ? 'cab_delivery' :
      pass.passType === 'SERVICE' ? 'service' :
      pass.passType === 'GUEST' && (pass.usageLimit?.maxUses > 5) ? 'group' : 'guest'
    );
    const matchesMethod = passMethod === inviteMethod;

    const name = pass.visitorName || pass.visitorDetails?.name || '';
    const passId = pass.id || pass._id || '';

    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          passId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMethod && matchesSearch;
  });

  const totalPages = Math.ceil(filteredPasses.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPasses = filteredPasses.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="card card-hover invite-table-card">
      
      {/* Content wrapper with flex: 1 to push pagination down */}
      <div className="flex-grow-1">
        <div className="invite-table-header">
          <h3 style={{ fontSize: '18px' }}>
            <i className="fa-solid fa-list-check card-title-icon"></i> Active Invites
          </h3>
          
          {/* Search Box */}
          <input 
            type="text" 
            className="form-control invite-table-search" 
            placeholder="Search by name or code..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {currentPasses.length === 0 ? (
          <div className="empty-state-container" style={{ minHeight: '220px' }}>
            <i className="fa-solid fa-folder-open empty-state-icon-history"></i>
            <span className="empty-state-text-sub">No active invitations found.</span>
          </div>
        ) : (
          <div className="overflow-auto px-2 mx-n2">
            <table className="custom-table">
              <thead>
                <tr>
                  <th className="ps-4">Pass Code & Guest</th>
                  <th>Validity</th>
                  <th>Status / Uses</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentPasses.map(pass => {
                  const passId = pass.id || pass._id;
                  const displayPassCode = pass.shortKey || passId;
                  const name = pass.visitorName || pass.visitorDetails?.name || '—';
                  const details = pass.details || (
                    pass.visitorDetails?.idProofType && pass.visitorDetails.idProofType !== 'None'
                      ? `${pass.visitorDetails.idProofType}: ${pass.visitorDetails.idProofNumber || ''}`
                      : 'Pre-approved entry'
                  );
                  
                  let validityText = pass.validity;
                  if (pass.validity?.startDate && pass.validity?.endDate) {
                    const start = new Date(pass.validity.startDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
                    const end = new Date(pass.validity.endDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
                    validityText = `${start} - ${end}`;
                  }

                  const isActive = pass.status === 'ACTIVE' || pass.status === 'PENDING';
                  const usesText = pass.usageLimit 
                    ? `Entries: ${pass.usageLimit.currentUses || 0} / ${pass.usageLimit.maxUses}`
                    : pass.uses;

                  return (
                    <tr key={passId}>
                      <td className="ps-4">
                        <div className="table-cell-bold">{name}</div>
                        <div className="item-header-row mt-1">
                          <span 
                            className={`badge-pass-id ${pass.isIdProofPass ? 'id-proof-pass' : 'active-pass'}`}
                            onClick={() => {
                              if (!pass.isIdProofPass && setGeneratedPass) {
                                setGeneratedPass(pass);
                              }
                            }}
                            title={pass.isIdProofPass ? `Pass ID: ${displayPassCode} (ID-Proof Pass)` : `Pass ID: ${displayPassCode} | Click to view QR Code`}
                          >
                            {formatPassId(displayPassCode)}
                          </span>
                          <span className="table-cell-sub">{details}</span>
                        </div>
                      </td>
                      <td>
                        <span className="table-cell-muted">{validityText}</span>
                      </td>
                      <td>
                        <span className={`pass-status-pill ${isActive ? 'active' : 'inactive'}`}>
                          {pass.status}
                        </span>
                        {usesText && <div className="table-cell-sub fw-semibold">{usesText}</div>}
                      </td>
                      <td className="text-end">
                        <div className="table-actions-container">
                          {pass.isIdProofPass ? (
                            <button 
                              className="btn btn-secondary btn-action-icon disabled" 
                              disabled
                              title="No QR Code for ID-Proof Passes"
                            >
                              <CIcon icon={cilQrCode} size="sm" style={{ color: 'var(--text-light, #94A3B8)' }} />
                            </button>
                          ) : (
                            <button 
                              className="btn btn-secondary btn-action-icon" 
                              onClick={() => setGeneratedPass && setGeneratedPass(pass)}
                              title="View QR Code"
                            >
                              <CIcon icon={cilQrCode} size="sm" style={{ color: 'var(--primary, #0084FF)' }} />
                            </button>
                          )}
                          <button 
                            className="btn btn-secondary btn-action-icon" 
                            onClick={() => handleCopyPass(pass)}
                            title="Copy Pass ID"
                          >
                            <CIcon icon={cilCopy} size="sm" style={{ color: 'var(--slate-600, #475569)' }} />
                          </button>
                          {isActive ? (
                            <button 
                              className="btn btn-secondary btn-action-icon" 
                              onClick={() => handleRevokePass(passId)}
                              title="Revoke Invite"
                            >
                              <CIcon icon={cilTrash} size="sm" style={{ color: 'var(--danger, #E55353)' }} />
                            </button>
                          ) : (
                            <button 
                              className="btn btn-secondary btn-action-icon" 
                              disabled
                              title="Pass already inactive"
                            >
                              <CIcon icon={cilBan} size="sm" style={{ color: 'var(--text-light, #94A3B8)' }} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination control stuck at the absolute bottom of the card */}
      {totalPages > 1 && (
        <div className="table-pagination-footer">
          <span className="table-cell-muted">
            Page {currentPage} of {totalPages} ({filteredPasses.length} total entries)
          </span>
          <div className="table-pagination-buttons">
            <button 
              className="btn btn-secondary" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              <i className="fa-solid fa-chevron-left me-1"></i> Previous
            </button>
            <button 
              className="btn btn-secondary" 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Next <i className="fa-solid fa-chevron-right ms-1"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveInvitesTable;
