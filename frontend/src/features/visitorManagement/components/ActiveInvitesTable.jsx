import React from 'react';

export const ActiveInvitesTable = ({
  passes,
  inviteMethod,
  searchQuery,
  setSearchQuery,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  handleCopyPass,
  handleRevokePass
}) => {
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
    <div className="card card-hover" style={{ borderTop: '4px solid var(--primary)', display: 'flex', flexDirection: 'column', minHeight: '430px' }}>
      
      {/* Content wrapper with flex: 1 to push pagination down */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '18px' }}>
            <i className="fa-solid fa-list-check" style={{ color: 'var(--primary)', marginRight: '8px' }}></i> Active Invites
          </h3>
          
          {/* Search Box */}
          <input 
            type="text" 
            className="form-control" 
            style={{ maxWidth: '220px', padding: '8px 12px', fontSize: '13px' }}
            placeholder="Search by name or code..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {currentPasses.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '220px', color: 'var(--text-light)' }}>
            <i className="fa-solid fa-folder-open" style={{ fontSize: '36px', marginBottom: '12px' }}></i>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>No active invitations found.</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Pass Code & Guest</th>
                  <th>Validity</th>
                  <th>Status / Uses</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentPasses.map(pass => {
                  const passId = pass.id || pass._id;
                  const name = pass.visitorName || pass.visitorDetails?.name || '—';
                  const details = pass.details || (pass.visitorDetails?.idProofType ? `${pass.visitorDetails.idProofType}: ${pass.visitorDetails.idProofNumber || ''}` : 'Pre-approved entry');
                  
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
                      <td>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)' }}>{name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '600', color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '2px 6px', borderRadius: '4px' }}>
                            {passId}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>{details}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>{validityText}</span>
                      </td>
                      <td>
                        {isActive ? (
                          <span style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: '50px', fontSize: '11px', fontWeight: '700', backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
                            {pass.status}
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: '50px', fontSize: '11px', fontWeight: '700', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>
                            {pass.status}
                          </span>
                        )}
                        {usesText && <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px', fontWeight: '600' }}>{usesText}</div>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '12px' }}
                            onClick={() => handleCopyPass(pass)}
                            title="Copy invite code info"
                          >
                            <i className="fa-solid fa-copy"></i>
                          </button>
                          {isActive && (
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '12px', color: 'var(--danger)' }}
                              onClick={() => handleRevokePass(passId)}
                              title="Revoke pass"
                            >
                              <i className="fa-solid fa-trash-can"></i>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>
            Page {currentPage} of {totalPages} ({filteredPasses.length} total entries)
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px' }}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              <i className="fa-solid fa-chevron-left" style={{ marginRight: '4px' }}></i> Previous
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px' }}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Next <i className="fa-solid fa-chevron-right" style={{ marginLeft: '4px' }}></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveInvitesTable;
