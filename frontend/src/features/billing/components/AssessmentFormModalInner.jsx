import React, { memo } from 'react'
import PropTypes from 'prop-types'
import { useAssessmentForm } from '../hooks/useAssessmentForm'
import ScopeSelectorTable from './ScopeSelectorTable.jsx'

const UNIT_TYPES = ['Studio', '1BHK', '2BHK', '3BHK', '4BHK', 'Penthouse', 'Duplex']

const WEEK_DAYS = [
  { label: 'S', full: 'Sunday' },
  { label: 'M', full: 'Monday' },
  { label: 'T', full: 'Tuesday' },
  { label: 'W', full: 'Wednesday' },
  { label: 'T', full: 'Thursday' },
  { label: 'F', full: 'Friday' },
  { label: 'S', full: 'Saturday' },
]

const TIERED_LABELS = [
  { key: 'studio', label: 'Studio' },
  { key: 'bhk1', label: '1 BHK' },
  { key: 'bhk2', label: '2 BHK' },
  { key: 'bhk3', label: '3 BHK' },
  { key: 'bhk4', label: '4 BHK' },
  { key: 'penthouse', label: 'Penthouse' },
  { key: 'duplex', label: 'Duplex' },
]

const FadePanel = memo(({ children }) => <div className="animate-fade-in">{children}</div>)
FadePanel.displayName = 'FadePanel'

const FieldError = memo(({ msg }) =>
  msg ? (
    <p className="text-danger small fw-semibold d-flex align-items-center gap-1 mt-1 mb-0">
      <i className="fa-solid fa-circle-exclamation me-1" />
      {msg}
    </p>
  ) : null,
)
FieldError.displayName = 'FieldError'

const SectionLabel = memo(({ icon, title, step }) => (
  <div className="d-flex align-items-center gap-2 mb-3 mt-1">
    <div className="rounded-circle bg-primary-subtle text-primary fw-extrabold d-flex align-items-center justify-content-center small me-1 avatar-size-26">
      {step}
    </div>
    <div className="d-flex align-items-center gap-2">
      <i className={`fa-solid ${icon} text-primary me-1`} />
      <span className="fw-bold text-dark fs-6">{title}</span>
    </div>
    <div className="flex-fill border-top border-light ms-2" />
  </div>
))
SectionLabel.displayName = 'SectionLabel'

const PillGroup = memo(({ options, value, onChange, fullWidth = false }) => (
  <div
    className={`d-flex gap-1 flex-wrap bg-light p-1 rounded-3 ${fullWidth ? 'w-100' : 'w-auto'}`}
  >
    {options.map((opt) => {
      const isActive = value === opt.value
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`btn btn-sm rounded-2 text-nowrap border-0 fw-semibold px-3 py-1 ${fullWidth ? 'flex-fill' : ''} ${isActive ? 'bg-white text-primary shadow-sm' : 'bg-transparent text-muted'}`}
        >
          {opt.label}
        </button>
      )
    })}
  </div>
))
PillGroup.displayName = 'PillGroup'

const WeekDayPicker = memo(({ selectedDays, onToggle, hasError }) => (
  <div>
    <label className="assessment-form-label">Invoice Generation Day(s)</label>
    <div
      className={`d-flex gap-2 p-1 rounded-3 w-auto ${hasError ? 'bg-danger-subtle border border-danger' : 'bg-light'}`}
    >
      {WEEK_DAYS.map((d, idx) => {
        const isOn = selectedDays.includes(idx)
        return (
          <button
            key={idx}
            type="button"
            title={d.full}
            onClick={() => onToggle(idx)}
            className={`btn btn-sm rounded-2 fw-bold avatar-size-36 ${isOn ? 'btn-primary text-white shadow-sm' : 'bg-white text-muted shadow-xs'}`}
          >
            {d.label}
          </button>
        )
      })}
    </div>
  </div>
))
WeekDayPicker.displayName = 'WeekDayPicker'

const GenDayRadioGroup = memo(({ value, onChange, customDay, onCustomDay, hasCustomError }) => {
  const radioRow = (opt, label, extra) => {
    const isActive = value === opt
    return (
      <label
        onClick={() => onChange(opt)}
        className={`d-flex align-items-center gap-2 p-2 px-3 rounded-3 border mb-2 cursor-pointer ${isActive ? 'border-primary bg-primary-subtle' : 'border-light bg-light'}`}
      >
        <div
          className={`rounded-circle d-flex align-items-center justify-content-center border me-1 avatar-size-18 ${isActive ? 'border-primary' : 'border-secondary'}`}
        >
          {isActive && <div className="rounded-circle bg-primary avatar-size-8" />}
        </div>
        <span className="fw-semibold small text-dark">{label}</span>
        {extra}
      </label>
    )
  }

  return (
    <div>
      <label className="assessment-form-label">Invoice Generation Day</label>
      {radioRow('FIRST', 'First day of the month')}
      {radioRow('LAST', 'Last day of the month')}
      {radioRow(
        'CUSTOM',
        'Custom date',
        value === 'CUSTOM' && (
          <input
            type="number"
            min={1}
            max={31}
            value={customDay}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onCustomDay(e.target.value)}
            placeholder="1–31"
            className={`form-control form-control-sm ms-2 input-w-90 ${hasCustomError ? 'border-danger bg-danger-subtle' : 'border-primary'}`}
          />
        ),
      )}
      {value === 'CUSTOM' && hasCustomError && (
        <FieldError msg="Please enter a valid date between 1 and 31." />
      )}
    </div>
  )
})
GenDayRadioGroup.displayName = 'GenDayRadioGroup'

const TriggerModeSection = memo(
  ({ triggerMode, onTriggerMode, scheduledDateTime, onScheduledDateTime, hasDateError }) => (
    <div>
      <label className="assessment-form-label">Invoice Generation Schedule</label>
      <PillGroup
        value={triggerMode}
        onChange={onTriggerMode}
        options={[
          { value: 'IMMEDIATE', label: '⚡ Immediate' },
          { value: 'SCHEDULED', label: '📅 Scheduled Date' },
        ]}
      />
      {triggerMode === 'SCHEDULED' && (
        <div className="mt-3 position-relative">
          <i
            className={`fa-solid fa-calendar-days position-absolute top-50 start-0 translate-middle-y ms-3 ${hasDateError ? 'text-danger' : 'text-muted'} small`}
          />
          <input
            type="datetime-local"
            value={scheduledDateTime}
            onChange={(e) => onScheduledDateTime(e.target.value)}
            className={`assessment-form-input ps-5 ${hasDateError ? 'assessment-form-input--error' : ''}`}
          />
          {hasDateError && <FieldError msg="Please select a future date and time." />}
        </div>
      )}
    </div>
  ),
)
TriggerModeSection.displayName = 'TriggerModeSection'

const RecurringSubSection = memo(
  ({
    billingCycle,
    onBillingCycle,
    selectedDays,
    onToggleDay,
    genDayOption,
    onGenDayOption,
    customDay,
    onCustomDay,
    errors,
  }) => (
    <div>
      <div className="mb-3">
        <label className="assessment-form-label">Billing Cycle</label>
        <PillGroup
          value={billingCycle}
          onChange={onBillingCycle}
          options={[
            { value: 'WEEKLY', label: 'Weekly' },
            { value: 'MONTHLY', label: 'Monthly' },
            { value: 'QUARTERLY', label: 'Quarterly' },
            { value: 'ANNUALLY', label: 'Annually' },
          ]}
        />
      </div>

      {billingCycle === 'WEEKLY' && (
        <>
          <WeekDayPicker
            selectedDays={selectedDays}
            onToggle={onToggleDay}
            hasError={!!errors.selectedDays}
          />
          <FieldError msg={errors.selectedDays} />
        </>
      )}

      {billingCycle !== 'WEEKLY' && (
        <GenDayRadioGroup
          value={genDayOption}
          onChange={onGenDayOption}
          customDay={customDay}
          onCustomDay={onCustomDay}
          hasCustomError={!!errors.customDay}
        />
      )}
    </div>
  ),
)
RecurringSubSection.displayName = 'RecurringSubSection'

export const AssessmentFormModalInner = memo(({ onClose, onSuccess, assessment = null }) => {
  const {
    name,
    setName,
    type,
    billingCycle,
    selectedDays,
    genDayOption,
    setGenDayOption,
    customDay,
    setCustomDay,
    triggerMode,
    setTriggerMode,
    scheduledDateTime,
    setScheduledDateTime,
    collectionMethod,
    setCollectionMethod,
    totalInstallments,
    setTotalInstallments,
    calcMethod,
    setCalcMethod,
    flatAmount,
    setFlatAmount,
    ratePerSqFt,
    setRatePerSqFt,
    tieredRates,
    scopeType,
    checkedRoles,
    setCheckedRoles,
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
    userSearch,
    setUserSearch,
    unitSearch,
    setUnitSearch,
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
  } = useAssessmentForm({ onClose, onSuccess, assessment })

  return (
    <div
      className="billing-modal-overlay"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Create Assessment"
    >
      <div className="billing-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="billing-modal-header">
          <div className="d-flex align-items-center gap-3">
            <div className="billing-modal-header__icon">
              <i className="fa-solid fa-file-invoice" />
            </div>
            <div>
              <h3 className="billing-modal-header__title">
                {assessment ? 'Edit Assessment Template' : 'New Assessment Template'}
              </h3>
              <p className="billing-modal-header__sub">
                {assessment
                  ? 'Update billing rules and target scope'
                  : 'Configure billing rules and target scope'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="billing-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div className="billing-modal-body">
          {/* ══ SECTION 1 — Basic Information ══════════════════════════ */}
          <SectionLabel step="1" icon="fa-circle-info" title="Basic Information" />

          {/* Name */}
          <div className="mb-3">
            <label className="assessment-form-label">Assessment Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monthly Maintenance Charge"
              className={`assessment-form-input ${activeErrors.name ? 'assessment-form-input--error' : ''}`}
            />
            <FieldError msg={activeErrors.name} />
          </div>

          {/* Type selector */}
          <div className="mb-3">
            <label className="assessment-form-label">Assessment Type</label>
            <PillGroup
              fullWidth
              value={type}
              onChange={handleTypeChange}
              options={[
                { value: 'RECURRING', label: '🔁 Recurring' },
                { value: 'ONE_TIME', label: '⚡ One-Time' },
                { value: 'CAPITAL_REPAIR', label: '🏗️ Capital Repair' },
              ]}
            />
          </div>

          {/* Dynamic sub-panel */}
          <div className="p-3 rounded-3 border border-light bg-light mb-2">
            {/* ── RECURRING ────────────────────────────────────────── */}
            {type === 'RECURRING' && (
              <FadePanel>
                <RecurringSubSection
                  billingCycle={billingCycle}
                  onBillingCycle={handleBillingCycleChange}
                  selectedDays={selectedDays}
                  onToggleDay={handleToggleDay}
                  genDayOption={genDayOption}
                  onGenDayOption={setGenDayOption}
                  customDay={customDay}
                  onCustomDay={setCustomDay}
                  errors={activeErrors}
                />
              </FadePanel>
            )}

            {/* ── ONE-TIME ──────────────────────────────────────────── */}
            {type === 'ONE_TIME' && (
              <FadePanel>
                <TriggerModeSection
                  triggerMode={triggerMode}
                  onTriggerMode={setTriggerMode}
                  scheduledDateTime={scheduledDateTime}
                  onScheduledDateTime={setScheduledDateTime}
                  hasDateError={!!activeErrors.scheduledDateTime}
                />
              </FadePanel>
            )}

            {/* ── CAPITAL REPAIR ────────────────────────────────────── */}
            {type === 'CAPITAL_REPAIR' && (
              <FadePanel>
                <div className="mb-3">
                  <label className="assessment-form-label">Collection Method</label>
                  <PillGroup
                    fullWidth
                    value={collectionMethod}
                    onChange={setCollectionMethod}
                    options={[
                      { value: 'LUMP_SUM', label: '💰 Lump Sum (One-Time)' },
                      { value: 'INSTALLMENT', label: '📆 Installment Plan (Recurring)' },
                    ]}
                  />
                </div>

                {collectionMethod === 'LUMP_SUM' && (
                  <FadePanel>
                    <TriggerModeSection
                      triggerMode={triggerMode}
                      onTriggerMode={setTriggerMode}
                      scheduledDateTime={scheduledDateTime}
                      onScheduledDateTime={setScheduledDateTime}
                      hasDateError={!!activeErrors.scheduledDateTime}
                    />
                  </FadePanel>
                )}

                {collectionMethod === 'INSTALLMENT' && (
                  <FadePanel>
                    <RecurringSubSection
                      billingCycle={billingCycle}
                      onBillingCycle={handleBillingCycleChange}
                      selectedDays={selectedDays}
                      onToggleDay={handleToggleDay}
                      genDayOption={genDayOption}
                      onGenDayOption={setGenDayOption}
                      customDay={customDay}
                      onCustomDay={setCustomDay}
                      errors={activeErrors}
                    />
                    <div className="mt-3 pt-3 border-top border-light">
                      <label className="assessment-form-label">Total Installments</label>
                      <div className="d-flex align-items-center gap-2">
                        <input
                          type="number"
                          min={2}
                          value={totalInstallments}
                          onChange={(e) => setTotalInstallments(e.target.value)}
                          placeholder="e.g. 4"
                          className={`assessment-form-input input-w-140 ${activeErrors.totalInstallments ? 'assessment-form-input--error' : ''}`}
                        />
                        <span className="text-muted small fw-medium">Min. 2 installments</span>
                      </div>
                      <FieldError msg={activeErrors.totalInstallments} />
                    </div>
                  </FadePanel>
                )}
              </FadePanel>
            )}
          </div>

          <div className="my-4 border-top border-light" />

          {/* ══ SECTION 2 — Calculation Method ═════════════════════════ */}
          <SectionLabel step="2" icon="fa-calculator" title="Calculation Method" />

          <div className="d-flex align-items-start gap-3 flex-wrap mb-3">
            <div>
              <label className="assessment-form-label">Method</label>
              <PillGroup
                value={calcMethod}
                onChange={setCalcMethod}
                options={[
                  { value: 'FLAT_RATE', label: 'Flat Rate' },
                  { value: 'PER_SQ_FT', label: 'Per Sq.Ft' },
                  { value: 'TIERED_BHK', label: 'Tiered BHK' },
                ]}
              />
            </div>

            {calcMethod === 'FLAT_RATE' && (
              <div>
                <label className="assessment-form-label">Amount (₹)</label>
                <div className="position-relative">
                  <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted fw-bold small">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={flatAmount}
                    onChange={(e) => setFlatAmount(e.target.value)}
                    placeholder="0.00"
                    className="assessment-form-input ps-4 input-w-160"
                  />
                </div>
              </div>
            )}

            {calcMethod === 'PER_SQ_FT' && (
              <div>
                <label className="assessment-form-label">Rate per Sq.Ft (₹)</label>
                <div className="position-relative">
                  <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted fw-bold small">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={ratePerSqFt}
                    onChange={(e) => setRatePerSqFt(e.target.value)}
                    placeholder="0.00"
                    className="assessment-form-input ps-4 input-w-160"
                  />
                </div>
              </div>
            )}
          </div>

          {calcMethod === 'TIERED_BHK' && (
            <div className="row row-cols-4 g-2 p-3 bg-light rounded-3 border border-light mb-2">
              {TIERED_LABELS.map(({ key, label }) => (
                <div key={key}>
                  <label className="assessment-form-label mb-1">{label}</label>
                  <div className="position-relative">
                    <span className="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted fw-bold extra-small">
                      ₹
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={tieredRates[key]}
                      onChange={(e) => handleTieredRate(key, e.target.value)}
                      placeholder="0"
                      className="assessment-form-input ps-3 py-1 fs-7"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="my-4 border-top border-light" />

          {/* ══ SECTION 3 — Target Scope ════════════════════════════════ */}
          <SectionLabel step="3" icon="fa-users" title="Target Scope" />

          <div className="mb-3">
            <label className="assessment-form-label">Who gets billed?</label>
            <PillGroup
              fullWidth
              value={scopeType}
              onChange={handleScopeChange}
              options={[
                { value: 'ALL_COMMUNITY', label: 'All Community' },
                { value: 'VILLA_BLOCK', label: 'Villa / Block' },
                { value: 'UNIT_TYPE', label: 'Unit Type' },
                { value: 'SPECIFIC_UNITS', label: 'Specific Units' },
                { value: 'SPECIFIC_USERS', label: 'Specific Users' },
              ]}
            />
          </div>

          <div className="mb-3">
            <label className="assessment-form-label">Charge To</label>
            <p className="text-muted small mt-n1 mb-2">
              Select which resident roles will receive this invoice.
            </p>
            <div className="d-flex flex-wrap gap-2" role="group" aria-label="Charge to roles">
              {roles.map((role, idx) => {
                const roleId = role._id || role.id
                const isChecked = checkedRoles.includes(roleId)
                return (
                  <label
                    key={roleId || role.name || idx}
                    onClick={() =>
                      setCheckedRoles((prev) =>
                        prev.includes(roleId)
                          ? prev.filter((id) => id !== roleId)
                          : [...prev, roleId],
                      )
                    }
                    className={`btn btn-sm rounded-pill px-3 py-1 d-inline-flex align-items-center gap-2 cursor-pointer ${isChecked ? 'btn-outline-primary bg-primary-subtle text-primary' : 'btn-outline-secondary text-dark'}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      onClick={(e) => e.stopPropagation()}
                      className="form-check-input me-1"
                    />
                    <span className="fw-semibold small me-1">{role.name}</span>
                  </label>
                )
              })}
            </div>
            {checkedRoles.length === 0 && (
              <p className="text-danger small fw-semibold mt-2 d-flex align-items-center gap-1">
                <i className="fa-solid fa-circle-exclamation me-1" />
                Please select at least one role.
              </p>
            )}
          </div>

          {scopeType === 'ALL_COMMUNITY' && (
            <div className="d-flex align-items-center gap-3 p-3 bg-success-subtle border border-success rounded-3">
              <i className="fa-solid fa-circle-check text-success fs-5 me-1" />
              <div>
                <div className="fw-bold text-success-emphasis small">Applies to everyone</div>
                <div className="text-success-emphasis extra-small opacity-75">
                  All active residents in the community will receive an invoice.
                </div>
              </div>
            </div>
          )}

          {showUTypeChips && (
            <div>
              <label className="assessment-form-label mb-2">Select Unit Types</label>
              <div className="d-flex gap-2 flex-wrap">
                {UNIT_TYPES.map((t) => {
                  const isSelected = selectedUnitTypes.includes(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleToggleUType(t)}
                      className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold d-inline-flex align-items-center gap-1 ${isSelected ? 'btn-primary text-white' : 'btn-outline-secondary text-muted'}`}
                    >
                      {isSelected && <i className="fa-solid fa-check me-1 small" />}
                      {t}
                    </button>
                  )
                })}
              </div>
              {selectedUnitTypes.length > 0 && (
                <div className="mt-2 text-primary small fw-semibold">
                  {selectedUnitTypes.length} unit type{selectedUnitTypes.length > 1 ? 's' : ''}{' '}
                  selected
                </div>
              )}
              {activeErrors.selectedUnitTypes && (
                <FieldError msg={activeErrors.selectedUnitTypes} />
              )}
            </div>
          )}

          {showScopeTable && (
            <div>
              <ScopeSelectorTable
                rows={scopeRows}
                selectedIds={selectedIds}
                onToggle={handleToggleId}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                searchPlaceholder={
                  scopeType === 'SPECIFIC_USERS'
                    ? 'Search residents by name...'
                    : 'Search units or villas...'
                }
                search={
                  scopeType === 'SPECIFIC_USERS'
                    ? userSearch
                    : scopeType === 'SPECIFIC_UNITS'
                      ? unitSearch
                      : undefined
                }
                onSearchChange={
                  scopeType === 'SPECIFIC_USERS'
                    ? setUserSearch
                    : scopeType === 'SPECIFIC_UNITS'
                      ? setUnitSearch
                      : undefined
                }
              />
              {activeErrors.selectedIds && (
                <div className="mt-2">
                  <FieldError msg={activeErrors.selectedIds} />
                </div>
              )}
            </div>
          )}
        </div>
        {/* end body */}

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="billing-modal-footer">
          {hasErrors && (
            <div className="flex-fill d-flex align-items-center gap-2 p-2 px-3 rounded-2 bg-danger-subtle text-danger small fw-semibold me-2">
              <i className="fa-solid fa-triangle-exclamation me-1" />
              Please fix the highlighted fields before saving.
            </div>
          )}
          <button
            type="button"
            className="btn btn-secondary billing-modal-footer__cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary billing-modal-footer__save"
            onClick={handleSave}
          >
            <i className="fa-solid fa-check me-1" /> Save Assessment
          </button>
        </div>
      </div>
    </div>
  )
})

AssessmentFormModalInner.displayName = 'AssessmentFormModalInner'

AssessmentFormModalInner.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  assessment: PropTypes.object,
}

export default AssessmentFormModalInner
