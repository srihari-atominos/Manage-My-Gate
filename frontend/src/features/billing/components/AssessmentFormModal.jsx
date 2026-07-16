import React, { memo, useState, useMemo } from 'react';
import { useAssessmentForm } from '../hooks/useAssessmentForm';

// ── Constants ─────────────────────────────────────────────────────────────

const MOCK_UNITS = [
  { _id: 'u1', label: 'Villa 101 - Block A', sub: '2BHK' },
  { _id: 'u2', label: 'Villa 102 - Block A', sub: '3BHK' },
  { _id: 'u3', label: 'Villa 201 - Block B', sub: '1BHK' },
  { _id: 'u4', label: 'Villa 202 - Block B', sub: 'Studio' },
  { _id: 'u5', label: 'Villa 301 - Block C', sub: 'Penthouse' },
  { _id: 'u6', label: 'Villa 302 - Block C', sub: '2BHK' },
];

const MOCK_BLOCKS = [
  { _id: 'b1', label: 'Block A - North Tower',       sub: '24 Units' },
  { _id: 'b2', label: 'Block B - South Tower',       sub: '24 Units' },
  { _id: 'b3', label: 'Phase 1 - East Avenue Villas', sub: '12 Villas' },
];

const MOCK_USERS = [
  { _id: 'usr1', label: 'Ahmed Al-Rashid',  sub: 'Owner · Villa 101' },
  { _id: 'usr2', label: 'Priya Nair',       sub: 'Tenant · Villa 102' },
  { _id: 'usr3', label: 'James Thompson',   sub: 'Owner · Villa 201' },
  { _id: 'usr4', label: 'Sara Al-Mansouri', sub: 'Tenant · Villa 202' },
  { _id: 'usr5', label: 'David Chen',       sub: 'Owner · Villa 301' },
  { _id: 'usr6', label: 'Fatima Al-Zaabi',  sub: 'Owner · Villa 302' },
];

const UNIT_TYPES = ['Studio', '1BHK', '2BHK', '3BHK', '4BHK', 'Penthouse', 'Duplex'];

/**
 * TODO (config phase): Replace this static array with the result of
 * assessmentService.getRoles() filtered by isTenantRole === true.
 * The shape must match: { _id: string, name: string, isTenantRole: boolean }
 */
const MOCK_TENANT_ROLES = [
  { _id: 'role-1', name: 'Resident Owner',  isTenantRole: true },
  { _id: 'role-2', name: 'Resident Tenant', isTenantRole: true },
  { _id: 'role-3', name: 'Family Member',   isTenantRole: true },
];

const WEEK_DAYS = [
  { label: 'S', full: 'Sunday' },
  { label: 'M', full: 'Monday' },
  { label: 'T', full: 'Tuesday' },
  { label: 'W', full: 'Wednesday' },
  { label: 'T', full: 'Thursday' },
  { label: 'F', full: 'Friday' },
  { label: 'S', full: 'Saturday' },
];

const TIERED_LABELS = [
  { key: 'studio',    label: 'Studio'   },
  { key: 'bhk1',      label: '1 BHK'    },
  { key: 'bhk2',      label: '2 BHK'    },
  { key: 'bhk3',      label: '3 BHK'    },
  { key: 'bhk4',      label: '4 BHK'    },
  { key: 'penthouse', label: 'Penthouse' },
  { key: 'duplex',    label: 'Duplex'   },
];

// ── Shared style tokens (module-level — never recreated) ──────────────────

const BASE_INPUT = {
  width: '100%', padding: '10px 14px', fontSize: '13px', fontWeight: '500',
  border: '1px solid var(--border-light, #E2E8F0)', borderRadius: '10px',
  background: '#F8FAFC', color: 'var(--text-main, #0F172A)', outline: 'none',
  transition: 'border-color 0.2s',
};
const ERROR_INPUT  = { ...BASE_INPUT, border: '1.5px solid var(--danger, #EF4444)', background: '#FFF5F5' };
const AMOUNT_INPUT = { ...BASE_INPUT, width: '160px', paddingLeft: '28px' };
const LABEL_STYLE  = {
  display: 'block', fontSize: '11px', fontWeight: '700',
  textTransform: 'uppercase', letterSpacing: '0.7px',
  color: 'var(--text-muted, #64748B)', marginBottom: '7px',
};
const ERROR_TEXT = {
  display: 'flex', alignItems: 'center', gap: '5px',
  fontSize: '11px', fontWeight: '600', color: 'var(--danger, #EF4444)', marginTop: '6px',
};

// ── Pure top-level sub-components (memo-wrapped) ──────────────────────────
// Defined OUTSIDE the modal — stable references, no unnecessary re-renders.

const FadePanel = memo(({ children }) => (
  <div style={{ animation: 'billingFadeIn 0.22s ease' }}>
    {children}
  </div>
));
FadePanel.displayName = 'FadePanel';

const FieldError = memo(({ msg }) =>
  msg ? (
    <p style={ERROR_TEXT}>
      <i className="fa-solid fa-circle-exclamation" />
      {msg}
    </p>
  ) : null
);
FieldError.displayName = 'FieldError';

const SectionLabel = memo(({ icon, title, step }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', marginTop: '4px' }}>
    <div style={{
      width: '26px', height: '26px', borderRadius: '50%',
      background: 'var(--primary-light, #E5F3FF)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '12px', fontWeight: '800', color: 'var(--primary, #0084FF)', flexShrink: 0,
    }}>{step}</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
      <i className={`fa-solid ${icon}`} style={{ color: 'var(--primary, #0084FF)', fontSize: '14px' }} />
      <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main, #0F172A)' }}>{title}</span>
    </div>
    <div style={{ flex: 1, height: '1px', background: 'var(--border-light, #E2E8F0)' }} />
  </div>
));
SectionLabel.displayName = 'SectionLabel';

const PillGroup = memo(({ options, value, onChange, fullWidth = false }) => (
  <div style={{
    display: 'flex', gap: '6px', flexWrap: 'wrap',
    background: '#F1F5F9', padding: '4px', borderRadius: '10px',
    width: fullWidth ? '100%' : 'fit-content',
  }}>
    {options.map((opt) => {
      const isActive = value === opt.value;
      return (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)} style={{
          flex: fullWidth ? 1 : undefined,
          padding: '7px 14px', borderRadius: '7px', fontSize: '13px', fontWeight: '600',
          border: 'none',
          background: isActive ? '#fff' : 'transparent',
          color: isActive ? 'var(--primary, #0084FF)' : 'var(--text-muted, #64748B)',
          boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          cursor: 'pointer', transition: 'all 0.18s ease', whiteSpace: 'nowrap',
        }}>
          {opt.label}
        </button>
      );
    })}
  </div>
));
PillGroup.displayName = 'PillGroup';

const WeekDayPicker = memo(({ selectedDays, onToggle, hasError }) => (
  <div>
    <label style={LABEL_STYLE}>Invoice Generation Day(s)</label>
    <div style={{
      display: 'flex', gap: '8px', padding: '6px',
      background: hasError ? '#FFF5F5' : '#F1F5F9',
      borderRadius: '12px',
      border: hasError ? '1.5px solid var(--danger, #EF4444)' : '1.5px solid transparent',
      transition: 'all 0.2s', width: 'fit-content',
    }}>
      {WEEK_DAYS.map((d, idx) => {
        const isOn = selectedDays.includes(idx);
        return (
          <button key={idx} type="button" title={d.full} onClick={() => onToggle(idx)} style={{
            width: '36px', height: '36px', borderRadius: '8px',
            border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: '700',
            background: isOn ? 'var(--primary, #0084FF)' : '#fff',
            color: isOn ? '#fff' : 'var(--text-muted, #64748B)',
            boxShadow: isOn ? '0 2px 6px rgba(0,132,255,0.3)' : '0 1px 2px rgba(0,0,0,0.06)',
            transition: 'all 0.18s ease',
            transform: isOn ? 'scale(1.08)' : 'scale(1)',
          }}>
            {d.label}
          </button>
        );
      })}
    </div>
  </div>
));
WeekDayPicker.displayName = 'WeekDayPicker';

const GenDayRadioGroup = memo(({ value, onChange, customDay, onCustomDay, hasCustomError }) => {
  const radioRow = (opt, label, extra) => {
    const isActive = value === opt;
    return (
      <label
        onClick={() => onChange(opt)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '11px 14px', borderRadius: '10px', cursor: 'pointer',
          border: `1.5px solid ${isActive ? 'var(--primary, #0084FF)' : 'var(--border-light, #E2E8F0)'}`,
          background: isActive ? 'var(--primary-light, #E5F3FF)' : '#F8FAFC',
          transition: 'all 0.18s ease', marginBottom: '8px',
        }}
      >
        <div style={{
          width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${isActive ? 'var(--primary, #0084FF)' : '#CBD5E1'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isActive && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary, #0084FF)' }} />}
        </div>
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main, #0F172A)' }}>{label}</span>
        {extra}
      </label>
    );
  };

  return (
    <div>
      <label style={LABEL_STYLE}>Invoice Generation Day</label>
      {radioRow('FIRST', 'First day of the month')}
      {radioRow('LAST',  'Last day of the month')}
      {radioRow(
        'CUSTOM',
        'Custom date',
        value === 'CUSTOM' && (
          <input
            type="number" min={1} max={31}
            value={customDay}
            onClick={e => e.stopPropagation()}
            onChange={e => onCustomDay(e.target.value)}
            placeholder="1–31"
            style={{
              ...BASE_INPUT,
              width: '90px', marginLeft: '8px',
              border: hasCustomError
                ? '1.5px solid var(--danger, #EF4444)'
                : '1.5px solid var(--primary, #0084FF)',
            }}
          />
        )
      )}
      {value === 'CUSTOM' && hasCustomError && (
        <FieldError msg="Please enter a valid date between 1 and 31." />
      )}
    </div>
  );
});
GenDayRadioGroup.displayName = 'GenDayRadioGroup';

const TriggerModeSection = memo(({ triggerMode, onTriggerMode, scheduledDateTime, onScheduledDateTime, hasDateError }) => (
  <div>
    <label style={LABEL_STYLE}>Invoice Generation Schedule</label>
    <PillGroup
      value={triggerMode}
      onChange={onTriggerMode}
      options={[
        { value: 'IMMEDIATE', label: '⚡ Immediate'      },
        { value: 'SCHEDULED', label: '📅 Scheduled Date' },
      ]}
    />
    {triggerMode === 'SCHEDULED' && (
      <div style={{ marginTop: '14px', position: 'relative' }}>
        <i className="fa-solid fa-calendar-days" style={{
          position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
          color: hasDateError ? 'var(--danger, #EF4444)' : 'var(--text-muted)',
          fontSize: '14px', pointerEvents: 'none',
        }} />
        <input
          type="datetime-local"
          value={scheduledDateTime}
          onChange={e => onScheduledDateTime(e.target.value)}
          style={{ ...(hasDateError ? ERROR_INPUT : BASE_INPUT), paddingLeft: '42px' }}
        />
        {hasDateError && <FieldError msg="Please select a future date and time." />}
      </div>
    )}
  </div>
));
TriggerModeSection.displayName = 'TriggerModeSection';

const RecurringSubSection = memo(({
  billingCycle, onBillingCycle,
  selectedDays, onToggleDay,
  genDayOption, onGenDayOption,
  customDay, onCustomDay,
  errors,
}) => (
  <div>
    <div style={{ marginBottom: '16px' }}>
      <label style={LABEL_STYLE}>Billing Cycle</label>
      <PillGroup
        value={billingCycle} onChange={onBillingCycle}
        options={[
          { value: 'WEEKLY',    label: 'Weekly'    },
          { value: 'MONTHLY',   label: 'Monthly'   },
          { value: 'QUARTERLY', label: 'Quarterly' },
          { value: 'ANNUALLY',  label: 'Annually'  },
        ]}
      />
    </div>

    {billingCycle === 'WEEKLY' && (
      <>
        <WeekDayPicker selectedDays={selectedDays} onToggle={onToggleDay} hasError={!!errors.selectedDays} />
        <FieldError msg={errors.selectedDays} />
      </>
    )}

    {billingCycle !== 'WEEKLY' && (
      <GenDayRadioGroup
        value={genDayOption} onChange={onGenDayOption}
        customDay={customDay} onCustomDay={onCustomDay}
        hasCustomError={!!errors.customDay}
      />
    )}
  </div>
));
RecurringSubSection.displayName = 'RecurringSubSection';

const ScopeTable = memo(({ rows, selectedIds, onToggle, onSelectAll, onDeselectAll, searchPlaceholder }) => {
  const [search, setSearch] = useState('');
  const filtered = useMemo(
    () => rows.filter(r => r.label.toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  );
  const allSelected = filtered.length > 0 && filtered.every(r => selectedIds.includes(r._id));

  return (
    <div style={{ border: '1px solid var(--border-light, #E2E8F0)', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 14px', background: '#F8FAFC',
        borderBottom: '1px solid var(--border-light, #E2E8F0)',
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <i className="fa-solid fa-magnifying-glass" style={{
            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
            color: '#94A3B8', fontSize: '12px', pointerEvents: 'none',
          }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={searchPlaceholder} style={{
              width: '100%', padding: '7px 10px 7px 30px', fontSize: '13px',
              border: '1px solid var(--border-light, #E2E8F0)', borderRadius: '7px',
              background: '#fff', color: 'var(--text-main)', outline: 'none',
            }} />
        </div>
        {selectedIds.length > 0 && (
          <span style={{
            fontSize: '11px', fontWeight: '700', padding: '3px 10px',
            background: 'var(--primary-light, #E5F3FF)', color: 'var(--primary, #0084FF)',
            borderRadius: '50px', whiteSpace: 'nowrap',
          }}>{selectedIds.length} selected</span>
        )}
        <button type="button"
          onClick={() => allSelected ? onDeselectAll(filtered.map(r => r._id)) : onSelectAll(filtered.map(r => r._id))}
          style={{
            padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
            border: '1px solid var(--border-light, #E2E8F0)',
            background: allSelected ? 'var(--danger-bg, #FEE2E2)' : '#fff',
            color: allSelected ? 'var(--danger, #EF4444)' : 'var(--text-muted, #64748B)',
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '32px 16px',
            color: 'var(--text-light, #94A3B8)', gap: '8px',
          }}>
            <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '20px' }} />
            <span style={{ fontSize: '13px' }}>No results for "{search}"</span>
          </div>
        ) : filtered.map((row, idx) => {
          const isChecked = selectedIds.includes(row._id);
          return (
            <label key={row._id || idx} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '11px 14px',
              borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-light, #E2E8F0)' : 'none',
              cursor: 'pointer',
              background: isChecked ? 'var(--primary-light, #E5F3FF)' : '#fff',
              transition: 'background 0.15s ease',
            }}>
              <input type="checkbox" checked={isChecked} onChange={() => onToggle(row._id)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary, #0084FF)', cursor: 'pointer' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main, #0F172A)' }}>{row.label}</div>
                {row.sub && <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)', marginTop: '1px' }}>{row.sub}</div>}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
});
ScopeTable.displayName = 'ScopeTable';

// ── Inner Modal — all state and logic lives here ───────────────────────────
// Separated from the outer guard so hooks are never called conditionally.

const AssessmentFormModalInner = memo(({ onClose, onSuccess, assessment = null }) => {
  const {
    name, setName,
    type,
    billingCycle,
    selectedDays,
    genDayOption, setGenDayOption,
    customDay, setCustomDay,
    triggerMode, setTriggerMode,
    scheduledDateTime, setScheduledDateTime,
    collectionMethod, setCollectionMethod,
    totalInstallments, setTotalInstallments,
    calcMethod, setCalcMethod,
    flatAmount, setFlatAmount,
    ratePerSqFt, setRatePerSqFt,
    tieredRates,
    scopeType,
    checkedRoles, setCheckedRoles,
    selectedIds,
    selectedUnitTypes,
    roles,
    scopeRows,
    showRecurring,
    showOneTime,
    showScopeTable,
    showUTypeChips,
    activeErrors,
    hasErrors,
    handleTypeChange,
    handleBillingCycleChange,
    handleToggleDay,
    handleToggleId,
    handleSelectAll,
    handleDeselectAll,
    handleToggleUType,
    handleScopeChange,
    handleTieredRate,
    handleSave,
  } = useAssessmentForm({ onClose, onSuccess, assessment });

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="billing-modal-overlay" onClick={onClose} aria-modal="true" role="dialog" aria-label="Create Assessment">
      <div className="billing-modal-box" onClick={e => e.stopPropagation()}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="billing-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="billing-modal-header__icon">
              <i className="fa-solid fa-file-invoice" />
            </div>
            <div>
              <h3 className="billing-modal-header__title">{assessment ? 'Edit Assessment Template' : 'New Assessment Template'}</h3>
              <p className="billing-modal-header__sub">{assessment ? 'Update billing rules and target scope' : 'Configure billing rules and target scope'}</p>
            </div>
          </div>
          <button type="button" className="billing-modal-close" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div className="billing-modal-body">

          {/* ══ SECTION 1 — Basic Information ══════════════════════════ */}
          <SectionLabel step="1" icon="fa-circle-info" title="Basic Information" />

          {/* Name */}
          <div style={{ marginBottom: '18px' }}>
            <label style={LABEL_STYLE}>Assessment Name</label>
            <input
              type="text" value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Monthly Maintenance Charge"
              style={activeErrors.name ? ERROR_INPUT : BASE_INPUT}
            />
            <FieldError msg={activeErrors.name} />
          </div>

          {/* Type selector */}
          <div style={{ marginBottom: '20px' }}>
            <label style={LABEL_STYLE}>Assessment Type</label>
            <PillGroup fullWidth value={type} onChange={handleTypeChange}
              options={[
                { value: 'RECURRING',     label: '🔁 Recurring'     },
                { value: 'ONE_TIME',      label: '⚡ One-Time'       },
                { value: 'CAPITAL_REPAIR',label: '🏗️ Capital Repair' },
              ]}
            />
          </div>

          {/* Dynamic sub-panel */}
          <div style={{
            padding: '18px', borderRadius: '12px',
            border: '1px solid var(--border-light, #E2E8F0)',
            background: '#F8FAFF', marginBottom: '4px',
          }}>
            {/* ── RECURRING ────────────────────────────────────────── */}
            {type === 'RECURRING' && (
              <FadePanel>
                <RecurringSubSection
                  billingCycle={billingCycle}   onBillingCycle={handleBillingCycleChange}
                  selectedDays={selectedDays}   onToggleDay={handleToggleDay}
                  genDayOption={genDayOption}   onGenDayOption={setGenDayOption}
                  customDay={customDay}          onCustomDay={setCustomDay}
                  errors={activeErrors}
                />
              </FadePanel>
            )}

            {/* ── ONE-TIME ──────────────────────────────────────────── */}
            {type === 'ONE_TIME' && (
              <FadePanel>
                <TriggerModeSection
                  triggerMode={triggerMode}             onTriggerMode={setTriggerMode}
                  scheduledDateTime={scheduledDateTime} onScheduledDateTime={setScheduledDateTime}
                  hasDateError={!!activeErrors.scheduledDateTime}
                />
              </FadePanel>
            )}

            {/* ── CAPITAL REPAIR ────────────────────────────────────── */}
            {type === 'CAPITAL_REPAIR' && (
              <FadePanel>
                <div style={{ marginBottom: '20px' }}>
                  <label style={LABEL_STYLE}>Collection Method</label>
                  <PillGroup fullWidth value={collectionMethod} onChange={setCollectionMethod}
                    options={[
                      { value: 'LUMP_SUM',    label: '💰 Lump Sum (One-Time)'         },
                      { value: 'INSTALLMENT', label: '📆 Installment Plan (Recurring)' },
                    ]}
                  />
                </div>

                {collectionMethod === 'LUMP_SUM' && (
                  <FadePanel>
                    <TriggerModeSection
                      triggerMode={triggerMode}             onTriggerMode={setTriggerMode}
                      scheduledDateTime={scheduledDateTime} onScheduledDateTime={setScheduledDateTime}
                      hasDateError={!!activeErrors.scheduledDateTime}
                    />
                  </FadePanel>
                )}

                {collectionMethod === 'INSTALLMENT' && (
                  <FadePanel>
                    <RecurringSubSection
                      billingCycle={billingCycle}   onBillingCycle={handleBillingCycleChange}
                      selectedDays={selectedDays}   onToggleDay={handleToggleDay}
                      genDayOption={genDayOption}   onGenDayOption={setGenDayOption}
                      customDay={customDay}          onCustomDay={setCustomDay}
                      errors={activeErrors}
                    />
                    <div style={{ marginTop: '18px', paddingTop: '18px', borderTop: '1px solid var(--border-light, #E2E8F0)' }}>
                      <label style={LABEL_STYLE}>Total Installments</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input type="number" min={2}
                          value={totalInstallments}
                          onChange={e => setTotalInstallments(e.target.value)}
                          placeholder="e.g. 4"
                          style={{ ...(activeErrors.totalInstallments ? ERROR_INPUT : BASE_INPUT), width: '140px' }}
                        />
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Min. 2 installments</span>
                      </div>
                      <FieldError msg={activeErrors.totalInstallments} />
                    </div>
                  </FadePanel>
                )}
              </FadePanel>
            )}
          </div>

          <div style={{ height: '1px', background: 'var(--border-light, #E2E8F0)', margin: '24px 0' }} />

          {/* ══ SECTION 2 — Calculation Method ═════════════════════════ */}
          <SectionLabel step="2" icon="fa-calculator" title="Calculation Method" />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div style={{ flexShrink: 0 }}>
              <label style={LABEL_STYLE}>Method</label>
              <PillGroup value={calcMethod} onChange={setCalcMethod}
                options={[
                  { value: 'FLAT_RATE',   label: 'Flat Rate'  },
                  { value: 'PER_SQ_FT',  label: 'Per Sq.Ft'  },
                  { value: 'TIERED_BHK', label: 'Tiered BHK' },
                ]}
              />
            </div>

            {calcMethod === 'FLAT_RATE' && (
              <div style={{ flexShrink: 0 }}>
                <label style={LABEL_STYLE}>Amount (₹)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>₹</span>
                  <input type="number" min={0} value={flatAmount} onChange={e => setFlatAmount(e.target.value)} placeholder="0.00" style={AMOUNT_INPUT} />
                </div>
              </div>
            )}

            {calcMethod === 'PER_SQ_FT' && (
              <div style={{ flexShrink: 0 }}>
                <label style={LABEL_STYLE}>Rate per Sq.Ft (₹)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>₹</span>
                  <input type="number" min={0} step="0.01" value={ratePerSqFt} onChange={e => setRatePerSqFt(e.target.value)} placeholder="0.00" style={AMOUNT_INPUT} />
                </div>
              </div>
            )}
          </div>

          {calcMethod === 'TIERED_BHK' && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px',
              padding: '16px', background: '#F8FAFC', borderRadius: '12px',
              border: '1px solid var(--border-light, #E2E8F0)', marginBottom: '4px',
            }}>
              {TIERED_LABELS.map(({ key, label }) => (
                <div key={key}>
                  <label style={{ ...LABEL_STYLE, marginBottom: '5px' }}>{label}</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>₹</span>
                    <input type="number" min={0} value={tieredRates[key]}
                      onChange={e => handleTieredRate(key, e.target.value)}
                      placeholder="0"
                      style={{ ...BASE_INPUT, fontSize: '13px', paddingLeft: '28px', paddingTop: '8px', paddingBottom: '8px' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ height: '1px', background: 'var(--border-light, #E2E8F0)', margin: '24px 0' }} />

          {/* ══ SECTION 3 — Target Scope ════════════════════════════════ */}
          <SectionLabel step="3" icon="fa-users" title="Target Scope" />

          <div style={{ marginBottom: '16px' }}>
            <label style={LABEL_STYLE}>Who gets billed?</label>
            <PillGroup fullWidth value={scopeType} onChange={handleScopeChange}
              options={[
                { value: 'ALL_COMMUNITY',  label: 'All Community'  },
                { value: 'VILLA_BLOCK',    label: 'Villa / Block'  },
                { value: 'UNIT_TYPE',      label: 'Unit Type'      },
                { value: 'SPECIFIC_UNITS', label: 'Specific Units' },
                { value: 'SPECIFIC_USERS', label: 'Specific Users' },
              ]}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={LABEL_STYLE}>Charge To</label>
            <p style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)', marginBottom: '10px', marginTop: '-2px' }}>
              Select which resident roles will receive this invoice.
            </p>
            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '8px' }} role="group" aria-label="Charge to roles">
              {roles.map((role, idx) => {
                const roleId = role._id || role.id;
                const isChecked = checkedRoles.includes(roleId);
                return (
                  <label
                    key={roleId || role.name || idx}
                    onClick={() =>
                      setCheckedRoles(prev =>
                        prev.includes(roleId)
                          ? prev.filter(id => id !== roleId)
                          : [...prev, roleId]
                      )
                    }
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      padding: '8px 14px', borderRadius: '50px', cursor: 'pointer',
                      border: `1.5px solid ${isChecked ? 'var(--primary, #0084FF)' : 'var(--border-light, #E2E8F0)'}`,
                      background: isChecked ? 'var(--primary-light, #E5F3FF)' : '#F8FAFC',
                      transition: 'all 0.18s ease',
                      userSelect: 'none', whiteSpace: 'nowrap',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      onClick={e => e.stopPropagation()}
                      style={{ width: '14px', height: '14px', accentColor: 'var(--primary, #0084FF)', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: '600', color: isChecked ? 'var(--primary, #0084FF)' : 'var(--text-main, #0F172A)' }}>
                      {role.name}
                    </span>
                  </label>
                );
              })}
            </div>
            {checkedRoles.length === 0 && (
              <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--danger, #EF4444)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <i className="fa-solid fa-circle-exclamation" />
                Please select at least one role.
              </p>
            )}
          </div>

          {scopeType === 'ALL_COMMUNITY' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 16px',
              background: 'var(--success-bg, #D1FAE5)', border: '1px solid #A7F3D0', borderRadius: '10px',
            }}>
              <i className="fa-solid fa-circle-check" style={{ color: 'var(--success, #10B981)', fontSize: '18px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#065F46' }}>Applies to everyone</div>
                <div style={{ fontSize: '12px', color: '#065F46', marginTop: '2px', opacity: 0.8 }}>
                  All active residents in the community will receive an invoice.
                </div>
              </div>
            </div>
          )}

          {showUTypeChips && (
            <div>
              <label style={{ ...LABEL_STYLE, marginBottom: '10px' }}>Select Unit Types</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {UNIT_TYPES.map(t => {
                  const isSelected = selectedUnitTypes.includes(t);
                  return (
                    <button key={t} type="button" onClick={() => handleToggleUType(t)} style={{
                      padding: '8px 16px', borderRadius: '50px', fontSize: '13px', fontWeight: '600',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--primary, #0084FF)' : 'var(--border-light, #E2E8F0)',
                      background: isSelected ? 'var(--primary-light, #E5F3FF)' : '#fff',
                      color: isSelected ? 'var(--primary, #0084FF)' : 'var(--text-muted, #64748B)',
                      cursor: 'pointer', transition: 'all 0.18s ease',
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                    }}>
                      {isSelected && <i className="fa-solid fa-check" style={{ fontSize: '11px' }} />}
                      {t}
                    </button>
                  );
                })}
              </div>
              {selectedUnitTypes.length > 0 && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--primary)', fontWeight: '600' }}>
                  {selectedUnitTypes.length} unit type{selectedUnitTypes.length > 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          )}

          {showScopeTable && (
            <ScopeTable
              rows={scopeRows} selectedIds={selectedIds}
              onToggle={handleToggleId} onSelectAll={handleSelectAll} onDeselectAll={handleDeselectAll}
              searchPlaceholder={scopeType === 'SPECIFIC_USERS' ? 'Search residents by name...' : 'Search units or villas...'}
            />
          )}

        </div>{/* end body */}

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="billing-modal-footer">
          {hasErrors && (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 14px', borderRadius: '8px',
              background: 'var(--danger-bg, #FEE2E2)', color: 'var(--danger, #EF4444)',
              fontSize: '12px', fontWeight: '600',
            }}>
              <i className="fa-solid fa-triangle-exclamation" />
              Please fix the highlighted fields before saving.
            </div>
          )}
          <button type="button" className="btn btn-secondary billing-modal-footer__cancel" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary billing-modal-footer__save" onClick={handleSave}>
            <i className="fa-solid fa-check" /> Save Assessment
          </button>
        </div>

      </div>
    </div>
  );
});
AssessmentFormModalInner.displayName = 'AssessmentFormModalInner';

// ── Outer guard — separates visibility from hook calls ────────────────────
// Rules of Hooks: hooks cannot be called conditionally.
// The inner component is only mounted when visible=true, so its state
// is also automatically reset every time the modal is closed and reopened.

export const AssessmentFormModal = ({ visible, onClose, onSuccess, assessment }) => {
  if (!visible) return null;
  return <AssessmentFormModalInner onClose={onClose} onSuccess={onSuccess} assessment={assessment} />;
};

export default AssessmentFormModal;
