import React, { useState, useMemo, memo } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CBadge,
} from '@coreui/react'
import FinanceRunwayTrajectoryChart from './FinanceRunwayTrajectoryChart.jsx'

const money = (val) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(val || 0))

/**
 * FinanceRunwaySimulatorModal
 *
 * Interactive Runtime Flow simulator enabling committee members and finance admins
 * to test what-if scenarios, adjust parameters dynamically in real time, and project
 * how many months the remaining funds can balance operations.
 */
const FinanceRunwaySimulatorModal = memo(({ visible, onClose, initialRunway = {}, overview = {} }) => {
  // Baseline initial figures derived from actual recorded financials
  const baselineBalance = useMemo(
    () => Number(initialRunway?.remainingBalance ?? overview?.netSurplusOrDeficit ?? 0),
    [initialRunway, overview],
  )
  const baselineExpenses = useMemo(
    () =>
      Number(
        initialRunway?.averageMonthlyExpenses ||
          overview?.reconciledExpensePayments ||
          overview?.totalExpensesIncurred ||
          0,
      ),
    [initialRunway, overview],
  )
  const baselineCollections = useMemo(
    () =>
      Number(
        initialRunway?.averageMonthlyCollections ||
          overview?.netCollectionsAfterRefunds ||
          overview?.grossSuccessfulCollections ||
          0,
      ),
    [initialRunway, overview],
  )

  // Runtime State (Interactive Sliders & Inputs)
  const [startingBalance, setStartingBalance] = useState(baselineBalance)
  const [monthlyExpenses, setMonthlyExpenses] = useState(baselineExpenses)
  const [collectionEfficiency, setCollectionEfficiency] = useState(100)
  const [bufferMonths, setBufferMonths] = useState(0)
  const [oneTimeOutlay, setOneTimeOutlay] = useState(0)

  // Sync state if modal reopens with different baseline
  React.useEffect(() => {
    if (visible) {
      setStartingBalance(baselineBalance)
      setMonthlyExpenses(baselineExpenses)
      setCollectionEfficiency(100)
      setBufferMonths(0)
      setOneTimeOutlay(0)
    }
  }, [visible, baselineBalance, baselineExpenses])

  // Real-time Runtime Calculations
  const effectiveInflow = useMemo(() => {
    return (baselineCollections * (collectionEfficiency / 100))
  }, [baselineCollections, collectionEfficiency])

  const netMonthlyBurn = useMemo(() => {
    return monthlyExpenses - effectiveInflow
  }, [monthlyExpenses, effectiveInflow])

  const effectiveAvailableBalance = useMemo(() => {
    return Math.max(0, startingBalance - oneTimeOutlay)
  }, [startingBalance, oneTimeOutlay])

  const requiredBufferAmount = useMemo(() => {
    return monthlyExpenses * bufferMonths
  }, [monthlyExpenses, bufferMonths])

  const balanceAboveBuffer = useMemo(() => {
    return Math.max(0, effectiveAvailableBalance - requiredBufferAmount)
  }, [effectiveAvailableBalance, requiredBufferAmount])

  // Runway Duration (Months to Balance)
  const { runwayMonths, isSelfSustaining, healthStatus, depletionDate } = useMemo(() => {
    if (effectiveAvailableBalance <= 0) {
      return {
        runwayMonths: 0,
        isSelfSustaining: false,
        healthStatus: 'CRITICAL',
        depletionDate: 'Immediate',
      }
    }

    if (netMonthlyBurn <= 0) {
      return {
        runwayMonths: null,
        isSelfSustaining: true,
        healthStatus: 'SURPLUS',
        depletionDate: 'Indefinite (Cash Positive)',
      }
    }

    const months = balanceAboveBuffer > 0 ? balanceAboveBuffer / netMonthlyBurn : 0
    const roundedMonths = Math.round(months * 10) / 10

    let status = 'HEALTHY'
    if (roundedMonths >= 6) status = 'HEALTHY'
    else if (roundedMonths >= 3) status = 'CAUTION'
    else status = 'CRITICAL'

    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + Math.round(roundedMonths * 30.4375))
    const formattedDate = targetDate.toLocaleDateString('en-IN', {
      month: 'short',
      year: 'numeric',
    })

    return {
      runwayMonths: roundedMonths,
      isSelfSustaining: false,
      healthStatus: status,
      depletionDate: formattedDate,
    }
  }, [effectiveAvailableBalance, balanceAboveBuffer, netMonthlyBurn])

  // Target Inflow required to balance for 12 months
  const targetMonthlyInflowFor12Months = useMemo(() => {
    const targetMonths = 12
    const needed = monthlyExpenses - effectiveAvailableBalance / targetMonths
    return Math.max(0, Math.round(needed))
  }, [monthlyExpenses, effectiveAvailableBalance])

  // Milestone Projections
  const milestones = useMemo(() => {
    const points = [
      { months: 1, label: 'Month 1' },
      { months: 3, label: 'Month 3' },
      { months: 6, label: 'Month 6' },
      { months: 12, label: 'Month 12' },
      { months: 24, label: 'Month 24' },
    ]

    return points.map((p) => {
      const projected = effectiveAvailableBalance - netMonthlyBurn * p.months
      return {
        ...p,
        projectedBalance: Math.round(projected),
      }
    })
  }, [effectiveAvailableBalance, netMonthlyBurn])

  // Scenario Presets
  const applyPreset = (preset) => {
    if (preset === 'baseline') {
      setStartingBalance(baselineBalance)
      setMonthlyExpenses(baselineExpenses)
      setCollectionEfficiency(100)
      setBufferMonths(0)
      setOneTimeOutlay(0)
    } else if (preset === 'zero_inflow') {
      setCollectionEfficiency(0)
      setBufferMonths(0)
    } else if (preset === 'conservative') {
      setCollectionEfficiency(80)
      setMonthlyExpenses(Math.round(baselineExpenses * 1.15))
      setBufferMonths(1)
    } else if (preset === 'balanced') {
      // Set expenses to match collections
      setMonthlyExpenses(Math.round(baselineCollections))
      setCollectionEfficiency(100)
      setBufferMonths(2)
    }
  }

  const getHealthBadge = () => {
    if (isSelfSustaining) {
      return <CBadge color="success">Self-Sustaining (Surplus)</CBadge>
    }
    if (healthStatus === 'HEALTHY') {
      return <CBadge color="success">Healthy Runway (≥ 6 Months)</CBadge>
    }
    if (healthStatus === 'CAUTION') {
      return <CBadge color="warning">Caution (3 – 6 Months)</CBadge>
    }
    return <CBadge color="danger">Critical (&lt; 3 Months)</CBadge>
  }

  return (
    <CModal visible={visible} onClose={onClose} size="lg" alignment="center">
      <CModalHeader closeButton>
        <CModalTitle className="d-flex align-items-center">
          <i className="fa-solid fa-calculator text-primary me-2" />
          Community Balance Runway Simulator
        </CModalTitle>
      </CModalHeader>

      <CModalBody className="p-4">
        {/* Preset Scenario Buttons */}
        <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
          <span className="small text-muted fw-semibold me-1">Scenario Presets:</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => applyPreset('baseline')}
          >
            Live Baseline
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => applyPreset('zero_inflow')}
          >
            Worst-Case (Zero Collections)
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-warning"
            onClick={() => applyPreset('conservative')}
          >
            Conservative (-20% Dues, +15% Cost)
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => applyPreset('balanced')}
          >
            Break-Even Target
          </button>
        </div>

        {/* Runtime Metric Display Strip */}
        <div className="card shadow-xs border-primary bg-primary-subtle p-3 mb-4 rounded-3">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-5 border-end-md">
              <div className="small text-muted text-uppercase fw-semibold">
                Projected Runway to Balance
              </div>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <span className="fs-2 fw-bold text-dark">
                  {isSelfSustaining ? 'Indefinite' : `${runwayMonths} Mos`}
                </span>
                {getHealthBadge()}
              </div>
              <div className="small text-muted mt-1">
                <i className="fa-regular fa-calendar me-1" />
                Depletion Horizon: <strong>{depletionDate}</strong>
              </div>
            </div>

            <div className="col-12 col-md-7">
              <div className="row g-2 text-center text-md-start">
                <div className="col-6">
                  <div className="small text-muted">Net Monthly Flow</div>
                  <div
                    className={`fw-bold small ${
                      netMonthlyBurn > 0 ? 'text-danger' : 'text-success'
                    }`}
                  >
                    {netMonthlyBurn > 0
                      ? `- ${money(netMonthlyBurn)} / mo`
                      : `+ ${money(Math.abs(netMonthlyBurn))} / mo`}
                  </div>
                </div>
                <div className="col-6">
                  <div className="small text-muted">Available Above Buffer</div>
                  <div className="fw-bold small text-dark">
                    {money(balanceAboveBuffer)}
                  </div>
                </div>
                <div className="col-12 mt-1">
                  <div className="small text-muted">
                    12-Month Breakeven Inflow Needed:{' '}
                    <strong>{money(targetMonthlyInflowFor12Months)} / mo</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Parameter Controls (Runtime Flow) */}
        <div className="row g-3">
          {/* Starting Balance Input */}
          <div className="col-12 col-md-6">
            <CFormLabel className="small fw-semibold d-flex justify-content-between">
              <span>Remaining / Starting Balance</span>
              <span className="text-primary fw-bold">{money(startingBalance)}</span>
            </CFormLabel>
            <CFormInput
              type="number"
              value={startingBalance}
              onChange={(e) => setStartingBalance(Number(e.target.value) || 0)}
              className="mb-1"
            />
            <input
              type="range"
              className="form-range"
              min={0}
              max={Math.max(500000, baselineBalance * 2.5)}
              step={10000}
              value={startingBalance}
              onChange={(e) => setStartingBalance(Number(e.target.value))}
            />
          </div>

          {/* Monthly Operational Expenses Input */}
          <div className="col-12 col-md-6">
            <CFormLabel className="small fw-semibold d-flex justify-content-between">
              <span>Monthly Operating Expenses</span>
              <span className="text-danger fw-bold">{money(monthlyExpenses)}</span>
            </CFormLabel>
            <CFormInput
              type="number"
              value={monthlyExpenses}
              onChange={(e) => setMonthlyExpenses(Number(e.target.value) || 0)}
              className="mb-1"
            />
            <input
              type="range"
              className="form-range"
              min={0}
              max={Math.max(200000, baselineExpenses * 2.5)}
              step={5000}
              value={monthlyExpenses}
              onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
            />
          </div>

          {/* Expected Dues Collection Rate */}
          <div className="col-12 col-md-6">
            <CFormLabel className="small fw-semibold d-flex justify-content-between">
              <span>Dues Collection Efficiency</span>
              <span className="text-success fw-bold">
                {collectionEfficiency}% ({money(effectiveInflow)}/mo)
              </span>
            </CFormLabel>
            <input
              type="range"
              className="form-range mt-2"
              min={0}
              max={120}
              step={5}
              value={collectionEfficiency}
              onChange={(e) => setCollectionEfficiency(Number(e.target.value))}
            />
            <div className="d-flex justify-content-between small text-muted">
              <span>0% (Crisis)</span>
              <span>50%</span>
              <span>100% (Normal)</span>
              <span>120% (Arrear Catchup)</span>
            </div>
          </div>

          {/* Emergency Safety Buffer Reserve */}
          <div className="col-12 col-md-3">
            <CFormLabel className="small fw-semibold">
              Emergency Reserve Buffer
            </CFormLabel>
            <CFormSelect
              value={bufferMonths}
              onChange={(e) => setBufferMonths(Number(e.target.value))}
            >
              <option value={0}>0 Months (No buffer)</option>
              <option value={1}>1 Month ({money(monthlyExpenses)})</option>
              <option value={2}>2 Months ({money(monthlyExpenses * 2)})</option>
              <option value={3}>3 Months ({money(monthlyExpenses * 3)})</option>
              <option value={6}>6 Months ({money(monthlyExpenses * 6)})</option>
            </CFormSelect>
          </div>

          {/* One-off Capital Outlay */}
          <div className="col-12 col-md-3">
            <CFormLabel className="small fw-semibold">
              One-Off Capital Outlay
            </CFormLabel>
            <CFormInput
              type="number"
              placeholder="e.g. 50000"
              value={oneTimeOutlay || ''}
              onChange={(e) => setOneTimeOutlay(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* Milestone Trajectory Visualization */}
        <FinanceRunwayTrajectoryChart
          milestones={milestones}
          startingBalance={effectiveAvailableBalance}
        />
      </CModalBody>

      <CModalFooter>
        <CButton
          color="secondary"
          variant="ghost"
          onClick={() => applyPreset('baseline')}
        >
          Reset to Live Baseline
        </CButton>
        <CButton color="primary" onClick={onClose}>
          Done
        </CButton>
      </CModalFooter>
    </CModal>
  )
})

FinanceRunwaySimulatorModal.displayName = 'FinanceRunwaySimulatorModal'
export default FinanceRunwaySimulatorModal
