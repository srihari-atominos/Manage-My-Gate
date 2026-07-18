import React, { useState, useCallback, memo } from 'react';
import '../styles/_assessment.scss';

// ── Mock data ─────────────────────────────────────────────────────────────

const SCOPE_OPTIONS = [
  { value: 'ALL_COMMUNITY',  label: 'All Community'  },
  { value: 'VILLA_BLOCK',    label: 'Villa / Block'  },
  { value: 'UNIT_TYPE',      label: 'Unit Type'      },
  { value: 'SPECIFIC_UNITS', label: 'Specific Units' },
  { value: 'SPECIFIC_USERS', label: 'Specific Users' },
];

const MOCK_ROLES = [
  { _id: '1', name: 'Resident Owner',  isTenantRole: true  },
  { _id: '2', name: 'Resident Tenant', isTenantRole: true  },
  { _id: '3', name: 'Family Member',   isTenantRole: true  },
  { _id: '4', name: 'Admin',           isTenantRole: false }, // filtered out
];

const MOCK_UNITS = [
  { _id: 'u1', label: 'Villa 101', block: 'Block A', type: '2BHK' },
  { _id: 'u2', label: 'Villa 102', block: 'Block A', type: '3BHK' },
  { _id: 'u3', label: 'Villa 201', block: 'Block B', type: '1BHK' },
  { _id: 'u4', label: 'Villa 202', block: 'Block B', type: 'Studio' },
  { _id: 'u5', label: 'Villa 301', block: 'Block C', type: 'Penthouse' },
  { _id: 'u6', label: 'Villa 302', block: 'Block C', type: '2BHK' },
  { _id: 'u7', label: 'Villa 401', block: 'Block D', type: '4BHK' },
];

// Filter roles to only those where isTenantRole === true
const TENANT_ROLES = MOCK_ROLES.filter(r => r.isTenantRole === true);

// ── Inner sub-components (all module-level for stable references) ─────────

/** Single scope pill button */
const ScopePill = memo(({ option, isActive, onClick }) => (
  <button
    type="button"
    className={`assessment-scope-pill${isActive ? ' assessment-scope-pill--active' : ''}`}
    onClick={() => onClick(option.value)}
    aria-pressed={isActive}
  >
    {option.label}
  </button>
));
ScopePill.displayName = 'ScopePill';

/** Role checkbox row */
const RoleItem = memo(({ role, isChecked, onToggle }) => (
  <label
    className={`assessment-role-item${isChecked ? ' assessment-role-item--checked' : ''}`}
    onClick={() => onToggle(role._id)}
  >
    <input
      type="checkbox"
      className="assessment-role-item__checkbox"
      checked={isChecked}
      onChange={() => onToggle(role._id)}
      onClick={e => e.stopPropagation()}
    />
    <span className="assessment-role-item__label">{role.name}</span>
    <span className="assessment-role-item__badge">Tenant / Unit</span>
  </label>
));
RoleItem.displayName = 'RoleItem';

/** Scrollable unit checklist */
const UnitChecklist = memo(({ selectedUnitIds, onToggle, onSelectAll, onDeselectAll }) => {
  const allSelected = MOCK_UNITS.every(u => selectedUnitIds.includes(u._id));

  return (
    <div className="assessment-unit-list">
      <div className="assessment-unit-list__toolbar">
        <span className="fw-semibold" style={{ fontSize: '12px', color: '#64748B' }}>
          Select units to include
        </span>
        <div className="d-flex align-items-center gap-2">
          {selectedUnitIds.length > 0 && (
            <span className="assessment-unit-list__count-badge">
              {selectedUnitIds.length} selected
            </span>
          )}
          <button
            type="button"
            className="assessment-unit-list__select-all-btn"
            onClick={() => allSelected
              ? onDeselectAll(MOCK_UNITS.map(u => u._id))
              : onSelectAll(MOCK_UNITS.map(u => u._id))
            }
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      </div>

      {MOCK_UNITS.map(unit => {
        const isChecked = selectedUnitIds.includes(unit._id);
        return (
          <label
            key={unit._id}
            className={`assessment-unit-item${isChecked ? ' assessment-unit-item--checked' : ''}`}
            onClick={() => onToggle(unit._id)}
          >
            <input
              type="checkbox"
              className="assessment-unit-item__checkbox"
              checked={isChecked}
              onChange={() => onToggle(unit._id)}
              onClick={e => e.stopPropagation()}
            />
            <span className="assessment-unit-item__text">
              {unit.label} — {unit.block}
            </span>
            <span className="assessment-unit-item__meta">{unit.type}</span>
          </label>
        );
      })}
    </div>
  );
});
UnitChecklist.displayName = 'UnitChecklist';

// ── AssessmentDrawer ──────────────────────────────────────────────────────

/**
 * AssessmentDrawer
 *
 * Slide-over panel for configuring community billing rules.
 * Props:
 *   visible  {boolean} — controls render
 *   onClose  {function} — close handler
 *   assessment {object} — mock assessment to display (optional)
 */
const AssessmentDrawer = ({ visible, onClose, assessment }) => {
  // Scope state
  const [scopeType, setScopeType]       = useState('ALL_COMMUNITY');

  // Role checkbox state (pre-select all tenant roles)
  const [checkedRoles, setCheckedRoles] = useState(TENANT_ROLES.map(r => r._id));

  // Unit selection state
  const [selectedUnits, setSelectedUnits] = useState([]);

  // Stable handlers
  const handleToggleRole = useCallback((id) =>
    setCheckedRoles(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  , []);

  const handleToggleUnit = useCallback((id) =>
    setSelectedUnits(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  , []);

  const handleSelectAllUnits   = useCallback((ids) =>
    setSelectedUnits(prev => Array.from(new Set([...prev, ...ids])))
  , []);

  const handleDeselectAllUnits = useCallback((ids) =>
    setSelectedUnits(prev => prev.filter(id => !ids.includes(id)))
  , []);

  const handleScopeChange = useCallback((val) => {
    setScopeType(val);
    if (val !== 'SPECIFIC_UNITS') setSelectedUnits([]);
  }, []);

  if (!visible) return null;

  const displayName = assessment?.name ?? 'Monthly Maintenance Charge';
  const displayCycle = assessment?.billingCycle ?? 'Monthly';

  return (
    <div className="assessment-os-theme">
      <div
        className="assessment-drawer-overlay"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Assessment Configuration"
      >
        <div
          className="assessment-drawer-panel"
          onClick={e => e.stopPropagation()}
        >

          {/* ── Header ────────────────────────────────────────────────── */}
          <div className="assessment-drawer-header">
            <div className="d-flex align-items-center gap-3">
              <div className="assessment-drawer-header__icon-wrap">
                <i className="fa-solid fa-sliders" />
              </div>
              <div>
                <h4 className="assessment-drawer-header__title">{displayName}</h4>
                <p className="assessment-drawer-header__sub">
                  {displayCycle} · Assessment Configuration
                </p>
              </div>
            </div>
            <button
              type="button"
              className="assessment-drawer-header__close"
              onClick={onClose}
              aria-label="Close drawer"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          {/* ── Body ──────────────────────────────────────────────────── */}
          <div className="assessment-drawer-body">

            {/* SECTION: Who Gets Billed */}
            <p className="assessment-drawer-section-label">
              <i className="fa-solid fa-users me-1" />
              Who gets billed?
            </p>

            <div className="assessment-scope-pills" role="group" aria-label="Target scope">
              {SCOPE_OPTIONS.map(opt => (
                <ScopePill
                  key={opt.value}
                  option={opt}
                  isActive={scopeType === opt.value}
                  onClick={handleScopeChange}
                />
              ))}
            </div>

            {/* SECTION: Charge To — Role Checkbox Grid */}
            <p className="assessment-drawer-section-label">
              <i className="fa-solid fa-id-badge me-1" />
              Charge To
            </p>

            <div className="assessment-role-grid" role="group" aria-label="Charge to roles">
              {TENANT_ROLES.map(role => (
                <RoleItem
                  key={role._id}
                  role={role}
                  isChecked={checkedRoles.includes(role._id)}
                  onToggle={handleToggleRole}
                />
              ))}
            </div>

            {/* SECTION: Unit Selection — only when SPECIFIC_UNITS */}
            {scopeType === 'SPECIFIC_UNITS' && (
              <>
                <p className="assessment-drawer-section-label">
                  <i className="fa-solid fa-building me-1" />
                  Select Units
                </p>
                <UnitChecklist
                  selectedUnitIds={selectedUnits}
                  onToggle={handleToggleUnit}
                  onSelectAll={handleSelectAllUnits}
                  onDeselectAll={handleDeselectAllUnits}
                />
              </>
            )}

            {/* ALL_COMMUNITY banner */}
            {scopeType === 'ALL_COMMUNITY' && (
              <div className="d-flex align-items-center gap-2 p-3 rounded-3 mb-3"
                style={{ background: '#D1FAE5', border: '1px solid #A7F3D0' }}>
                <i className="fa-solid fa-circle-check text-success" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#065F46' }}>
                  All active residents in the community will be charged.
                </span>
              </div>
            )}

            {/* ── Mid-cycle Warning Banner ──────────────────────────── */}
            <div className="assessment-mid-cycle-warning" role="alert">
              <i className="fa-solid fa-triangle-exclamation assessment-mid-cycle-warning__icon" />
              <p className="assessment-mid-cycle-warning__text">
                <strong>Note:</strong> Changes to active recurring assessments will only apply
                to future billing cycles starting next month.
              </p>
            </div>

          </div>{/* end body */}

          {/* ── Footer ────────────────────────────────────────────────── */}
          <div className="assessment-drawer-footer">
            <button
              type="button"
              className="btn btn-light fw-semibold"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary fw-semibold px-4"
              onClick={() => {
                console.log('[AssessmentDrawer] Save config:', {
                  scopeType,
                  checkedRoles,
                  selectedUnits,
                });
              }}
            >
              <i className="fa-solid fa-check me-2" />
              Save Configuration
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AssessmentDrawer;
