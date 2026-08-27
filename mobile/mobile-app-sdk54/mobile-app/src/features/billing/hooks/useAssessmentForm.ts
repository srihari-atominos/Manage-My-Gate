import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import billingService from '../services/billingService';
import { fetchVillas, fetchVillaBlocks } from '../../villa/services/villaService';
import apiClient from '../../../services/apiClient';

interface UseAssessmentFormProps {
  communityId?: string;
  assessment?: any;
}

export const useAssessmentForm = ({ communityId, assessment = null }: UseAssessmentFormProps = {}) => {
  const reduxOrgId = useSelector((state: any) =>
    state.workspace?.activeOrganizationId ||
    state.auth?.activeOrganizationId ||
    state.auth?.user?.orgId ||
    state.auth?.user?.organizationId ||
    state.auth?.user?.org?._id ||
    state.auth?.user?.activeOrgId ||
    state.auth?.user?.activeOrganizationId
  );

  const effectiveCommunityId = communityId || reduxOrgId;
  // ── Step 1: Rule Identity ───────────────────────────────────────────────
  const [name, setName] = useState('');
  const [type, setType] = useState('RECURRING');

  // ── Step 2: Schedule & Frequency ────────────────────────────────────────
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [genDayOption, setGenDayOption] = useState('FIRST');
  const [customDay, setCustomDay] = useState('');
  const [triggerMode, setTriggerMode] = useState('IMMEDIATE');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [collectionMethod, setCollectionMethod] = useState('LUMP_SUM');
  const [totalInstallments, setTotalInstallments] = useState('');

  // ── Step 3: Calculation Formula & Floorplan Rates ──────────────────────
  const [calcMethod, setCalcMethod] = useState('FLAT_RATE');
  const [flatAmount, setFlatAmount] = useState('');
  const [ratePerSqFt, setRatePerSqFt] = useState('');
  const [tieredRates, setTieredRates] = useState({
    studio: '',
    bhk1: '',
    bhk2: '',
    bhk3: '',
    bhk4: '',
    penthouse: '',
    duplex: '',
  });

  // ── Step 4: Target Scope & Resident Roles ──────────────────────────────
  const [scopeType, setScopeType] = useState('ALL_COMMUNITY');
  const [checkedRoles, setCheckedRoles] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedUnitTypes, setSelectedUnitTypes] = useState<string[]>([]);

  // Search & Dynamic List State
  const [searchQuery, setSearchQuery] = useState('');
  const [roles, setRoles] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Submission UI States
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-fill form if editing existing assessment
  useEffect(() => {
    if (assessment) {
      setName(assessment.name || '');
      setType(assessment.type || 'RECURRING');
      setBillingCycle(assessment.billingCycle || 'MONTHLY');
      setTriggerMode(assessment.triggerMode || 'IMMEDIATE');
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
      setTieredRates(
        calc.tieredRates || {
          studio: '',
          bhk1: '',
          bhk2: '',
          bhk3: '',
          bhk4: '',
          penthouse: '',
          duplex: '',
        }
      );

      const scope = assessment.targetScope || {};
      setScopeType(scope.type || 'ALL_COMMUNITY');
      setSelectedIds(scope.scopeIds || []);
      setCheckedRoles(scope.targetRoleIds || []);
    }
  }, [assessment]);

  // Load static or initial roles and blocks on mount
  useEffect(() => {
    let active = true;
    const loadStaticData = async () => {
      try {
        const rolesRes: any = await apiClient.get('/roles?page=1&limit=100');
        const rawData = rolesRes?.data || rolesRes;
        const rolesList: any[] = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData?.data)
          ? rawData.data
          : Array.isArray(rolesRes?.roles)
          ? rolesRes.roles
          : [];

        if (active) {
          let tenantRoles = rolesList.filter((r: any) => r.isTenantRole === true);
          if (tenantRoles.length === 0 && rolesList.length > 0) {
            tenantRoles = rolesList.filter((r: any) =>
              ['Resident Owner', 'Resident Tenant', 'Family Member', 'Resident'].some((name) =>
                (r.name || '').toLowerCase().includes(name.toLowerCase())
              )
            );
            if (tenantRoles.length === 0) {
              tenantRoles = rolesList;
            }
          }

          const normalizedRoles = tenantRoles.map((r: any) => ({
            ...r,
            _id: String(r._id || r.id),
          }));

          setRoles(normalizedRoles);

          if (!assessment || checkedRoles.length === 0) {
            const roleIds = normalizedRoles.map((r: any) => r._id).filter(Boolean);
            setCheckedRoles(roleIds);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch dynamic roles in mobile form:', err);
      }

      try {
        const villasRes: any = await fetchVillas({ page: 1, limit: 200 });
        const villaList = Array.isArray(villasRes) ? villasRes : villasRes?.data || [];
        if (active && Array.isArray(villaList)) {
          const blockNames = [
            ...new Set(villaList.map((v: any) => v.block || v.blockOrBuilding).filter(Boolean)),
          ];
          const formattedBlocks = blockNames.map((bName: any) => {
            const count = villaList.filter((v: any) => (v.block || v.blockOrBuilding) === bName).length;
            return {
              _id: bName,
              label: bName,
              sub: `${count} Unit${count > 1 ? 's' : ''}`,
            };
          });
          setBlocks(formattedBlocks);
        }
      } catch (err) {
        console.warn('Failed to fetch dynamic blocks in mobile form:', err);
      }
    };

    loadStaticData();
    return () => {
      active = false;
    };
  }, [assessment]);

  // Debounced User Search
  useEffect(() => {
    if (scopeType !== 'SPECIFIC_USERS') return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const res: any = await apiClient.get('/users', {
          params: { page: 1, limit: 150, search: searchQuery },
        });
        const userList = Array.isArray(res) ? res : res?.data || [];
        if (active && Array.isArray(userList)) {
          const formatted = userList.map((u: any) => ({
            _id: u._id || u.id,
            label: u.name || u.username,
            sub: u.email || 'Resident',
          }));
          setUsers(formatted);
        }
      } catch (err) {
        console.warn('Failed to search users in mobile form:', err);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, scopeType]);

  // Debounced Unit Search
  useEffect(() => {
    if (scopeType !== 'SPECIFIC_UNITS') return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const villasRes: any = await fetchVillas({ page: 1, limit: 200, search: searchQuery });
        const villaList = Array.isArray(villasRes) ? villasRes : villasRes?.data || [];
        if (active && Array.isArray(villaList)) {
          const formatted = villaList.map((v: any) => ({
            _id: v._id || v.id,
            label: `${v.villaNumber || v.unitNumber || '—'} - ${v.block || v.blockOrBuilding || ''}`,
            sub: v.type || 'Unit',
          }));
          setUnits(formatted);
        }
      } catch (err) {
        console.warn('Failed to search units in mobile form:', err);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, scopeType]);

  // Role Names Map
  const roleNamesMap = useMemo(() => {
    const map: Record<string, string> = {};
    roles.forEach((r) => {
      map[r._id || r.id] = r.name;
    });
    return map;
  }, [roles]);

  // Handlers
  const handleToggleDay = useCallback((idx: number) => {
    setSelectedDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
    );
  }, []);

  const handleToggleRole = useCallback((roleId: string) => {
    setCheckedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  }, []);

  const handleToggleId = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
  }, []);

  const handleDeselectAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
  }, []);

  const handleToggleUnitType = useCallback((uType: string) => {
    setSelectedUnitTypes((prev) =>
      prev.includes(uType) ? prev.filter((x) => x !== uType) : [...prev, uType]
    );
  }, []);

  const handleTieredRate = useCallback((key: keyof typeof tieredRates, val: string) => {
    setTieredRates((prev) => ({ ...prev, [key]: val }));
  }, []);

  const scopeRows = useMemo(() => {
    if (scopeType === 'SPECIFIC_USERS') return users;
    if (scopeType === 'VILLA_BLOCK') return blocks;
    return units;
  }, [scopeType, users, blocks, units]);

  const resetForm = useCallback(() => {
    setName('');
    setType('RECURRING');
    setBillingCycle('MONTHLY');
    setSelectedDays([]);
    setGenDayOption('FIRST');
    setCustomDay('');
    setTriggerMode('IMMEDIATE');
    setScheduledDate('');
    setScheduledTime('');
    setCollectionMethod('LUMP_SUM');
    setTotalInstallments('');
    setCalcMethod('FLAT_RATE');
    setFlatAmount('');
    setRatePerSqFt('');
    setTieredRates({
      studio: '',
      bhk1: '',
      bhk2: '',
      bhk3: '',
      bhk4: '',
      penthouse: '',
      duplex: '',
    });
    setScopeType('ALL_COMMUNITY');
    setCheckedRoles(roles.map((r) => r._id || r.id));
    setSelectedIds([]);
    setSelectedUnitTypes([]);
    setSearchQuery('');
    setFormError(null);
    setIsSubmitting(false);
  }, [roles]);

  const submitAssessmentRule = useCallback(async () => {
    if (isSubmitting) return false;

    setFormError(null);

    if (!effectiveCommunityId || !/^[0-9a-fA-F]{24}$/.test(effectiveCommunityId)) {
      setFormError('Active Community / Organization ID is missing or invalid. Please re-select your organization context.');
      return false;
    }

    setIsSubmitting(true);

    try {
      const isOneTime =
        type === 'ONE_TIME' || (type === 'CAPITAL_REPAIR' && collectionMethod === 'LUMP_SUM');

      let combinedScheduledDateTime: string | undefined = undefined;
      if (triggerMode === 'SCHEDULED' && scheduledDate) {
        combinedScheduledDateTime = `${scheduledDate}T${scheduledTime || '09:00:00'}`;
      }

      // Filter targetRoleIds to ensure only valid Mongo ObjectIds are sent
      const validTargetRoleIds = checkedRoles.filter((id) => /^[0-9a-fA-F]{24}$/.test(id));

      const payload: Record<string, any> = {
        communityId: effectiveCommunityId,
        name: name.trim(),
        type,
        billingCycle: isOneTime ? 'AD_HOC' : billingCycle,
        generationDay: isOneTime
          ? 'LAST_DAY_OF_MONTH'
          : genDayOption === 'LAST'
          ? 'LAST_DAY_OF_MONTH'
          : genDayOption === 'FIRST'
          ? 1
          : Number(customDay || 1),
        triggerMode,
        scheduledDateTime: combinedScheduledDateTime,
        collectionMethod,
        totalInstallments:
          collectionMethod === 'INSTALLMENT' ? Number(totalInstallments || 0) : undefined,
        targetScope: {
          type: scopeType,
          scopeIds: scopeType === 'ALL_COMMUNITY' ? [] : selectedIds,
          targetRoleIds: validTargetRoleIds,
        },
        calculationMethod: {
          type: calcMethod,
          flatAmount: calcMethod === 'FLAT_RATE' ? Number(flatAmount || 0) : 0,
          ratePerSqFt: calcMethod === 'PER_SQ_FT' ? Number(ratePerSqFt || 0) : 0,
          tieredRates:
            calcMethod === 'TIERED_BHK'
              ? {
                  studio: Number(tieredRates.studio || 0),
                  bhk1: Number(tieredRates.bhk1 || 0),
                  bhk2: Number(tieredRates.bhk2 || 0),
                  bhk3: Number(tieredRates.bhk3 || 0),
                  bhk4: Number(tieredRates.bhk4 || 0),
                  penthouse: Number(tieredRates.penthouse || 0),
                  duplex: Number(tieredRates.duplex || 0),
                }
              : undefined,
        },
      };

      if (assessment?._id || assessment?.id) {
        const targetId = assessment._id || assessment.id;
        await billingService.updateAssessment(targetId, payload);
      } else {
        await billingService.createAssessment(payload);
      }
      setIsSubmitting(false);
      return true;
    } catch (err: any) {
      setIsSubmitting(false);
      const message = err?.response?.data?.message || err?.message || 'Failed to create assessment rule.';
      setFormError(message);
      return false;
    }
  }, [
    name,
    type,
    billingCycle,
    genDayOption,
    customDay,
    triggerMode,
    scheduledDate,
    scheduledTime,
    collectionMethod,
    totalInstallments,
    scopeType,
    selectedIds,
    checkedRoles,
    calcMethod,
    flatAmount,
    ratePerSqFt,
    tieredRates,
    effectiveCommunityId,
  ]);

  return {
    name,
    setName,
    type,
    setType,
    billingCycle,
    setBillingCycle,
    selectedDays,
    handleToggleDay,
    genDayOption,
    setGenDayOption,
    customDay,
    setCustomDay,
    triggerMode,
    setTriggerMode,
    scheduledDate,
    setScheduledDate,
    scheduledTime,
    setScheduledTime,
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
    handleTieredRate,
    scopeType,
    setScopeType,
    checkedRoles,
    handleToggleRole,
    roles,
    roleNamesMap,
    selectedIds,
    handleToggleId,
    handleSelectAll,
    handleDeselectAll,
    selectedUnitTypes,
    handleToggleUnitType,
    scopeRows,
    searchQuery,
    setSearchQuery,
    formError,
    setFormError,
    isSubmitting,
    resetForm,
    submitAssessmentRule,
  };
};

export default useAssessmentForm;
