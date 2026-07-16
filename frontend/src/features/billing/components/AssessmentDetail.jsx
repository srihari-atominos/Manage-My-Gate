import React, { memo, useState, useEffect } from 'react';
import { fetchRoles } from '../../roleBuilder/services/roleApi';
import CIcon from '@coreui/icons-react';
import { cilPencil, cilCheckCircle, cilPeople, cilInfo } from '@coreui/icons';

/**
 * AssessmentDetail
 *
 * Right-panel component of the Assessment Manager tab.
 * Shows the dynamic configuration details (scope, targets, calculation method)
 * for the selected assessment template.
 *
 * Props:
 *   assessment {Object}  — selected assessment template object
 *   onConfigure {Function} — configure drawer callback
 */
export const AssessmentDetail = memo(({ assessment = null, onEdit }) => {
  const [allRoles, setAllRoles] = useState([]);

  useEffect(() => {
    let active = true;
    const loadRoles = async () => {
      try {
        const res = await fetchRoles({ page: 1, limit: 100 });
        if (active && res?.data) {
          setAllRoles(res.data);
        }
      } catch (err) {
        console.error('Failed to load roles in details:', err);
      }
    };
    loadRoles();
    return () => { active = false; };
  }, []);

  if (!assessment) {
    return (
      <div
        className="card card-hover card-accent-primary"
        style={{ display: 'flex', flexDirection: 'column', minHeight: '480px' }}
      >
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <CIcon icon={cilPeople} style={{ color: 'var(--primary, #0084FF)', width: '20px', height: '20px' }} />
            Configured Residents
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)', marginTop: '4px', marginBottom: 0 }}>
            People and units linked to the selected assessment template.
          </p>
        </div>

        <div className="empty-state-container" style={{ flex: 1, padding: '40px 16px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--primary-light, #E5F3FF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <CIcon
              icon={cilInfo}
              style={{ fontSize: '24px', color: 'var(--primary, #0084FF)', width: '24px', height: '24px' }}
            />
          </div>
          <span className="empty-state-text-main" style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)' }}>No assessment selected</span>
          <span
            className="empty-state-text-sub"
            style={{ marginTop: '6px', textAlign: 'center', maxWidth: '240px', fontSize: '12px', color: 'var(--text-muted)' }}
          >
            Select an assessment template from the list to view its configured residents and units.
          </span>
        </div>
      </div>
    );
  }

  // Helper to format target roles list
  const getRoleNames = () => {
    const roleIds = assessment.targetScope?.targetRoleIds || [];
    if (roleIds.length === 0) return 'None';
    return roleIds
      .map(id => {
        const found = allRoles.find(r => r._id === id);
        return found ? found.name : 'Resident';
      })
      .join(', ');
  };

  const getScopeLabel = (type) => {
    if (type === 'ALL_COMMUNITY') return '🌍 All Community';
    if (type === 'VILLA_BLOCK') return '🏢 Villa / Block';
    if (type === 'UNIT_TYPE') return '📐 Unit Type';
    if (type === 'SPECIFIC_UNITS') return '🏡 Specific Units';
    return '👥 Specific Users';
  };

  const calc = assessment.calculationMethod || {};

  return (
    <div
      className="card card-hover card-accent-primary"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '480px' }}
    >
      {/* ── Card Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <CIcon icon={cilCheckCircle} style={{ color: 'var(--success, #10B981)', width: '18px', height: '18px' }} />
            Active Configuration
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)', marginTop: '4px', marginBottom: 0 }}>
            Details for {assessment.name}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => onEdit && onEdit(assessment)}
          style={{ fontSize: '12px', fontWeight: '600', padding: '6px 12px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          <CIcon icon={cilPencil} style={{ width: '12px', height: '12px' }} /> Edit Template
        </button>
      </div>

      {/* ── Detail Panel list ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Name & Type */}
        <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid var(--border-light, #E2E8F0)' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>Assessment Name</div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginTop: '4px' }}>{assessment.name}</div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <span className="badge bg-primary-subtle text-primary" style={{ fontSize: '10px' }}>{assessment.type}</span>
            <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: '10px' }}>Cycle: {assessment.billingCycle}</span>
          </div>
        </div>

        {/* Target Scope */}
        <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid var(--border-light, #E2E8F0)' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>Target Scope</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
              {getScopeLabel(assessment.targetScope?.type)}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {assessment.targetScope?.scopeIds?.length || 0} linked targets
            </span>
          </div>

          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dotted var(--border-light, #E2E8F0)' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>CHARGED ROLES</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary)', marginTop: '4px' }}>
              {getRoleNames()}
            </div>
          </div>
        </div>

        {/* Calculation Rules */}
        <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid var(--border-light, #E2E8F0)' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>Calculation Method</div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginTop: '4px' }}>
            {calc.type === 'FLAT_RATE' && `₹${(calc.flatAmount || 0).toLocaleString('en-IN')} Flat amount per resident`}
            {calc.type === 'PER_SQ_FT' && `₹${(calc.ratePerSqFt || 0).toLocaleString('en-IN')} per square foot of unit area`}
            {calc.type === 'TIERED_BHK' && 'Tiered rates based on BHK unit layout'}
          </div>

          {calc.type === 'TIERED_BHK' && calc.tieredRates && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginTop: '10px', fontSize: '12px' }}>
              <div>Studio: <strong>₹{calc.tieredRates.studio || 0}</strong></div>
              <div>1 BHK: <strong>₹{calc.tieredRates.bhk1 || 0}</strong></div>
              <div>2 BHK: <strong>₹{calc.tieredRates.bhk2 || 0}</strong></div>
              <div>3 BHK: <strong>₹{calc.tieredRates.bhk3 || 0}</strong></div>
              <div>4 BHK: <strong>₹{calc.tieredRates.bhk4 || 0}</strong></div>
              <div>Penthouse: <strong>₹{calc.tieredRates.penthouse || 0}</strong></div>
            </div>
          )}
        </div>

      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div
        className="table-pagination-footer"
        style={{ marginTop: '20px', borderTop: '1px solid var(--border-light, #E2E8F0)', paddingTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        <i className="fa-solid fa-circle-info text-primary" style={{ fontSize: '13px' }} />
        <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)', fontWeight: '500' }}>
          This template billing run triggers automatically on generation day.
        </span>
      </div>
    </div>
  );
});
AssessmentDetail.displayName = 'AssessmentDetail';

export default AssessmentDetail;
