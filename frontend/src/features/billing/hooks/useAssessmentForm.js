import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useAssessment } from '../../assessment/hooks/useAssessment';
import { fetchRoles } from '../../roleBuilder/services/roleApi';
import { fetchVillas } from '../../villa/services/villaService';
import { fetchUsers } from '../../userManagement/services/userApi';

/**
 * Custom Hook: useAssessmentForm
 * 
 * Manages all form states, input validation, dynamic API loaders,
 * and handles submit serialization for the AssessmentFormModal component.
 * Adheres to the "Thin View" architectural pattern.
 */
export const useAssessmentForm = ({ onClose, onSuccess, assessment = null }) => {
  const activeOrgId = useSelector((state) => state.workspace?.activeOrganizationId);
  const { saveAssessment, editAssessment } = useAssessment();

  // Dynamic Lists
  const [roles, setRoles]   = useState([]);
  const [units, setUnits]   = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [users, setUsers]   = useState([]);

  // Search States
  const [userSearch, setUserSearch] = useState('');
  const [unitSearch, setUnitSearch] = useState('');

  // Form Fields State
  const [name, setName]                 = useState('');
  const [type, setType]                 = useState('RECURRING');
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [selectedDays, setSelectedDays] = useState([]);
  const [genDayOption, setGenDayOption] = useState('FIRST');
  const [customDay, setCustomDay]       = useState('');
  const [triggerMode, setTriggerMode]   = useState('IMMEDIATE');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [collectionMethod, setCollectionMethod]   = useState('LUMP_SUM');
  const [totalInstallments, setTotalInstallments] = useState('');
  const [validated, setValidated]       = useState(false);

  // Calculation Method States
  const [calcMethod, setCalcMethod]   = useState('FLAT_RATE');
  const [flatAmount, setFlatAmount]   = useState('');
  const [ratePerSqFt, setRatePerSqFt] = useState('');
  const [tieredRates, setTieredRates] = useState({
    studio: '', bhk1: '', bhk2: '', bhk3: '', bhk4: '', penthouse: '', duplex: '',
  });

  // Target Scope States
  const [scopeType, setScopeType]                 = useState('ALL_COMMUNITY');
  const [targetRole, setTargetRole]               = useState('BOTH');
  const [checkedRoles, setCheckedRoles]           = useState([]);
  const [selectedIds, setSelectedIds]             = useState([]);
  const [selectedUnitTypes, setSelectedUnitTypes] = useState([]);

  // Populate form fields if editing an existing assessment template
  useEffect(() => {
    if (assessment) {
      setName(assessment.name || '');
      setType(assessment.type || 'RECURRING');
      setBillingCycle(assessment.billingCycle || 'MONTHLY');
      setTriggerMode(assessment.triggerMode || 'IMMEDIATE');
      setScheduledDateTime(assessment.scheduledDateTime || '');
      setCollectionMethod(assessment.collectionMethod || 'LUMP_SUM');
      setTotalInstallments(assessment.totalInstallments ? String(assessment.totalInstallments) : '');

      const day = assessment.generationDay;
      if (day === 'LAST_DAY_OF_MONTH') {
        setGenDayOption('LAST');
        setCustomDay('');
      } else {
        setGenDayOption('CUSTOM');
        setCustomDay(day ? String(day) : '');
      }

      const calc = assessment.calculationMethod || {};
      setCalcMethod(calc.type || 'FLAT_RATE');
      setFlatAmount(calc.flatAmount ? String(calc.flatAmount) : '');
      setRatePerSqFt(calc.ratePerSqFt ? String(calc.ratePerSqFt) : '');
      setTieredRates(calc.tieredRates || {
        studio: '', bhk1: '', bhk2: '', bhk3: '', bhk4: '', penthouse: '', duplex: '',
      });

      const scope = assessment.targetScope || {};
      setScopeType(scope.type || 'ALL_COMMUNITY');
      setSelectedIds(scope.scopeIds || []);
      setCheckedRoles(scope.targetRoleIds || []);
    }
  }, [assessment]);

  // Load static or initial lists (roles, blocks) on mount
  useEffect(() => {
    let active = true;
    const loadStaticData = async () => {
      try {
        const rolesRes = await fetchRoles({ page: 1, limit: 100 });
        if (active && rolesRes?.data) {
          const tenantRoles = rolesRes.data.filter(r => r.isTenantRole === true);
          if (tenantRoles.length > 0) {
            setRoles(tenantRoles);
            // Fix race condition: Only auto-check all roles when creating new assessment
            if (!assessment) {
              setCheckedRoles(tenantRoles.map(r => r._id || r.id));
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch dynamic roles:', err);
      }

      try {
        const villasRes = await fetchVillas({ page: 1, limit: 200 });
        if (active && villasRes?.data) {
          const villaList = villasRes.data;
          const blockNames = [...new Set(villaList.map(v => v.block || v.blockOrBuilding).filter(Boolean))];
          const formattedBlocks = blockNames.map((bName, idx) => {
            const count = villaList.filter(v => (v.block || v.blockOrBuilding) === bName).length;
            return {
              _id: bName,
              label: bName,
              sub: `${count} Unit${count > 1 ? 's' : ''}`,
            };
          });
          setBlocks(formattedBlocks);
        }
      } catch (err) {
        console.error('Failed to fetch dynamic blocks:', err);
      }
    };

    loadStaticData();
    return () => { active = false; };
  }, [assessment]);

  // Debounced User Search
  useEffect(() => {
    let active = true;
    const delayDebounceFn = setTimeout(async () => {
      try {
        const usersRes = await fetchUsers({ page: 1, limit: 150, search: userSearch });
        if (active && usersRes?.data) {
          const userList = usersRes.data.map(u => ({
            _id: u._id || u.id,
            label: u.name || u.username,
            sub: u.email || 'Resident',
          }));
          setUsers(userList);
        }
      } catch (err) {
        console.error('Failed to fetch dynamic users on search:', err);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(delayDebounceFn);
    };
  }, [userSearch]);

  // Debounced Unit Search
  useEffect(() => {
    let active = true;
    const delayDebounceFn = setTimeout(async () => {
      try {
        const villasRes = await fetchVillas({ page: 1, limit: 200, search: unitSearch });
        if (active && villasRes?.data) {
          const villaList = villasRes.data;
          const formattedUnits = villaList.map(v => ({
            _id: v._id,
            label: `${v.villaNumber || v.unitNumber || '—'} - ${v.block || v.blockOrBuilding || ''}`,
            sub: v.type || 'Unit',
          }));
          setUnits(formattedUnits);
        }
      } catch (err) {
        console.error('Failed to fetch dynamic villas on search:', err);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(delayDebounceFn);
    };
  }, [unitSearch]);

  // Handlers
  const handleTypeChange = useCallback((val) => {
    setType(val);
    setBillingCycle('MONTHLY');
    setSelectedDays([]);
    setGenDayOption('FIRST');
    setCustomDay('');
    setTriggerMode('IMMEDIATE');
    setScheduledDateTime('');
    setCollectionMethod('LUMP_SUM');
    setTotalInstallments('');
    setValidated(false);
  }, []);

  const handleBillingCycleChange = useCallback((val) => {
    setBillingCycle(val);
    setSelectedDays([]);
    setGenDayOption('FIRST');
    setCustomDay('');
  }, []);

  const handleToggleDay = useCallback((idx) =>
    setSelectedDays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx])
  , []);

  const handleToggleId    = useCallback((id)  => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]), []);
  const handleSelectAll   = useCallback((ids) => setSelectedIds(p => Array.from(new Set([...p, ...ids]))), []);
  const handleDeselectAll = useCallback((ids) => setSelectedIds(p => p.filter(id => !ids.includes(id))), []);
  const handleToggleUType = useCallback((t)   => setSelectedUnitTypes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]), []);
  const handleScopeChange = useCallback((val) => { setScopeType(val); setSelectedIds([]); setSelectedUnitTypes([]); }, []);

  const handleTieredRate = useCallback((key, val) =>
    setTieredRates(p => ({ ...p, [key]: val }))
  , []);

  // Validation
  const errors = useMemo(() => {
    const e = {};
    if (!name.trim()) e.name = 'Assessment name is required.';

    const isRecurring = type === 'RECURRING' || (type === 'CAPITAL_REPAIR' && collectionMethod === 'INSTALLMENT');
    const isOneTime   = type === 'ONE_TIME'  || (type === 'CAPITAL_REPAIR' && collectionMethod === 'LUMP_SUM');

    if (isRecurring) {
      if (billingCycle === 'WEEKLY' && selectedDays.length === 0)
        e.selectedDays = 'Please select at least one day of the week.';
      if (billingCycle !== 'WEEKLY' && genDayOption === 'CUSTOM') {
        const n = Number(customDay);
        if (!customDay || n < 1 || n > 31) e.customDay = true;
      }
      if (type === 'CAPITAL_REPAIR') {
        const n = Number(totalInstallments);
        if (!totalInstallments || n < 2) e.totalInstallments = 'Minimum 2 installments required.';
      }
    }
    if (isOneTime && triggerMode === 'SCHEDULED' && !scheduledDateTime)
      e.scheduledDateTime = true;

    return e;
  }, [name, type, billingCycle, selectedDays, genDayOption, customDay, triggerMode, scheduledDateTime, collectionMethod, totalInstallments]);

  const handleSave = useCallback(async () => {
    setValidated(true);
    if (Object.keys(errors).length > 0) return;

    try {
      const isOneTime = type === 'ONE_TIME' || (type === 'CAPITAL_REPAIR' && collectionMethod === 'LUMP_SUM');

      const payload = {
        communityId: activeOrgId,
        name: name.trim(),
        type: type,
        billingCycle: isOneTime ? 'AD_HOC' : billingCycle,
        generationDay: isOneTime
          ? 'LAST_DAY_OF_MONTH'
          : (genDayOption === 'LAST'
              ? 'LAST_DAY_OF_MONTH'
              : (genDayOption === 'FIRST' ? 1 : Number(customDay))),
        triggerMode,
        scheduledDateTime: triggerMode === 'SCHEDULED' ? scheduledDateTime : undefined,
        collectionMethod,
        totalInstallments: collectionMethod === 'INSTALLMENT' ? Number(totalInstallments || 0) : undefined,
        targetScope: {
          type: scopeType,
          scopeIds: scopeType === 'ALL_COMMUNITY' ? [] : selectedIds,
          targetRoleIds: checkedRoles,
        },
        calculationMethod: {
          type: calcMethod,
          flatAmount: calcMethod === 'FLAT_RATE' ? Number(flatAmount || 0) : 0,
          ratePerSqFt: calcMethod === 'PER_SQ_FT' ? Number(ratePerSqFt || 0) : 0,
          tieredRates: calcMethod === 'TIERED_BHK' ? {
            studio: Number(tieredRates.studio || 0),
            bhk1: Number(tieredRates.bhk1 || 0),
            bhk2: Number(tieredRates.bhk2 || 0),
            bhk3: Number(tieredRates.bhk3 || 0),
            bhk4: Number(tieredRates.bhk4 || 0),
            penthouse: Number(tieredRates.penthouse || 0),
            duplex: Number(tieredRates.duplex || 0),
          } : undefined,
        },
      };

      if (assessment?._id) {
        await editAssessment(assessment._id, payload).unwrap();
      } else {
        await saveAssessment(payload).unwrap();
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save assessment template:', err);
    }
  }, [errors, name, type, billingCycle, genDayOption, customDay, scopeType, selectedIds, checkedRoles, calcMethod, flatAmount, ratePerSqFt, tieredRates, collectionMethod, activeOrgId, assessment, saveAssessment, editAssessment, onSuccess, onClose]);

  const scopeRows = useMemo(() => {
    if (scopeType === 'SPECIFIC_USERS') return users;
    if (scopeType === 'VILLA_BLOCK') return blocks;
    return units;
  }, [scopeType, users, blocks, units]);

  const showRecurring = type === 'RECURRING' || (type === 'CAPITAL_REPAIR' && collectionMethod === 'INSTALLMENT');
  const showOneTime   = type === 'ONE_TIME'  || (type === 'CAPITAL_REPAIR' && collectionMethod === 'LUMP_SUM');
  const showScopeTable = ['VILLA_BLOCK', 'SPECIFIC_UNITS', 'SPECIFIC_USERS'].includes(scopeType);
  const showUTypeChips = scopeType === 'UNIT_TYPE';

  const activeErrors = validated ? errors : {};
  const hasErrors    = validated && Object.keys(errors).length > 0;

  return {
    // States
    name, setName,
    type, setType,
    billingCycle, setBillingCycle,
    selectedDays, setSelectedDays,
    genDayOption, setGenDayOption,
    customDay, setCustomDay,
    triggerMode, setTriggerMode,
    scheduledDateTime, setScheduledDateTime,
    collectionMethod, setCollectionMethod,
    totalInstallments, setTotalInstallments,
    calcMethod, setCalcMethod,
    flatAmount, setFlatAmount,
    ratePerSqFt, setRatePerSqFt,
    tieredRates, setTieredRates,
    scopeType, setScopeType,
    targetRole, setTargetRole,
    checkedRoles, setCheckedRoles,
    selectedIds, setSelectedIds,
    selectedUnitTypes, setSelectedUnitTypes,
    userSearch, setUserSearch,
    unitSearch, setUnitSearch,

    // Lists
    roles,
    units,
    blocks,
    users,
    scopeRows,

    // Layout/Computed flags
    showRecurring,
    showOneTime,
    showScopeTable,
    showUTypeChips,
    activeErrors,
    hasErrors,

    // Callback handlers
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
  };
};

export default useAssessmentForm;
