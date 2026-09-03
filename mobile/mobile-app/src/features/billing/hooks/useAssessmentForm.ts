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
  const [rawVillas, setRawVillas] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Submission UI States
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to map template scopeIds (which might be block names, BHK types, or unit IDs) to valid unit ObjectIds
  const resolveUnitIdsFromScope = useCallback((rawScopeType: string, rawScopeIds: any[], villaList: any[]) => {
    if (!Array.isArray(rawScopeIds) || rawScopeIds.length === 0 || !Array.isArray(villaList) || villaList.length === 0) {
      return Array.isArray(rawScopeIds) ? rawScopeIds.map((id) => String(id)) : [];
    }

    if (rawScopeType === 'VILLA_BLOCK') {
      const blockNames = rawScopeIds.map((s) => String(s).trim().toLowerCase());
      return villaList
        .filter((v) => blockNames.includes(String(v.block || v.blockOrBuilding || '').trim().toLowerCase()))
        .map((v) => String(v._id || v.id));
    }

    if (rawScopeType === 'UNIT_TYPE') {
      const types = rawScopeIds.map((s) => String(s).trim().toLowerCase());
      return villaList
        .filter((v) => types.includes(String(v.type || '').trim().toLowerCase()))
        .map((v) => String(v._id || v.id));
    }

    if (rawScopeType === 'SPECIFIC_UNITS') {
      const hasStringNames = rawScopeIds.some((id) => !/^[0-9a-fA-F]{24}$/.test(String(id)));
      if (hasStringNames) {
        const resolvedIds = new Set<string>();
        rawScopeIds.forEach((item) => {
          const str = String(item).trim();
          if (/^[0-9a-fA-F]{24}$/.test(str)) {
            resolvedIds.add(str);
          } else {
            villaList.forEach((v) => {
              if (
                String(v.block || v.blockOrBuilding || '').trim().toLowerCase() === str.toLowerCase() ||
                String(v.type || '').trim().toLowerCase() === str.toLowerCase()
              ) {
                resolvedIds.add(String(v._id || v.id));
              }
            });
          }
        });
        return Array.from(resolvedIds);
      }
      return rawScopeIds.map((id) => String(id));
    }

    return rawScopeIds.map((id) => String(id));
  }, []);

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
      const rawScopeType = scope.type || 'ALL_COMMUNITY';
      const rawScopeIds = scope.scopeIds || [];

      if (rawScopeType === 'VILLA_BLOCK' || rawScopeType === 'UNIT_TYPE') {
        setScopeType('SPECIFIC_UNITS');
        if (rawVillas.length > 0) {
          setSelectedIds(resolveUnitIdsFromScope(rawScopeType, rawScopeIds, rawVillas));
        } else {
          setSelectedIds(rawScopeIds.map((id: any) => String(id)));
        }
      } else {
        setScopeType(rawScopeType);
        setSelectedIds(rawScopeIds.map((id: any) => String(id)));
      }
      setCheckedRoles(scope.targetRoleIds || []);
    }
  }, [assessment, rawVillas.length, resolveUnitIdsFromScope]);

  // Load static or initial roles and villas on mount
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
          let billableRoles = rolesList.filter((r: any) =>
            ['Resident Owner', 'Resident Tenant', 'Non-Resident Owner', 'Owner', 'Tenant'].some((name) =>
              (r.name || '').toLowerCase().trim() === name.toLowerCase()
            )
          );
          if (billableRoles.length === 0) {
            billableRoles = rolesList.filter(
              (r: any) =>
                !(r.name || '').toLowerCase().includes('family') &&
                !(r.name || '').toLowerCase().includes('guard') &&
                !(r.name || '').toLowerCase().includes('admin')
            );
          }
          if (billableRoles.length === 0) {
            billableRoles = rolesList;
          }

          const normalizedRoles = billableRoles.map((r: any) => ({
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
        const villasRes: any = await fetchVillas({ page: 1, limit: 300 });
        const rawVillaData = villasRes?.data || villasRes;
        const villaList = Array.isArray(rawVillaData)
          ? rawVillaData
          : Array.isArray(rawVillaData?.data)
          ? rawVillaData.data
          : Array.isArray(villasRes?.villas)
          ? villasRes.villas
          : [];

        if (active && Array.isArray(villaList) && villaList.length > 0) {
          setRawVillas(villaList);

          const formattedUnits = villaList.map((v: any) => {
            const uId = String(v._id || v.id);
            const uNum = v.villaNumber || v.unitNumber || '—';
            const bName = v.block || v.blockOrBuilding || '';
            const uType = v.type || 'Unit';
            const area = v.floorAreaSqFt ? `${v.floorAreaSqFt} sq.ft` : '';
            return {
              _id: uId,
              unitNumber: uNum,
              block: bName,
              type: uType,
              floorAreaSqFt: v.floorAreaSqFt,
              label: bName ? `Unit ${uNum} (${bName})` : `Unit ${uNum}`,
              sub: [uType, area].filter(Boolean).join(' • '),
            };
          });
          setUnits(formattedUnits);

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

          // Re-resolve selectedIds if editing assessment
          if (assessment?.targetScope) {
            const sType = assessment.targetScope.type;
            const sIds = assessment.targetScope.scopeIds || [];
            if (sType === 'VILLA_BLOCK' || sType === 'UNIT_TYPE' || sType === 'SPECIFIC_UNITS') {
              const mapped = resolveUnitIdsFromScope(sType, sIds, villaList);
              if (mapped.length > 0) {
                setSelectedIds(mapped);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch dynamic villas in mobile form:', err);
      }
    };

    loadStaticData();
    return () => {
      active = false;
    };
  }, [assessment, resolveUnitIdsFromScope]);

  // Available unique blocks and unit types for quick filter chips
  const availableBlocks = useMemo(() => {
    return Array.from(
      new Set(rawVillas.map((v) => v.block || v.blockOrBuilding).filter(Boolean))
    ) as string[];
  }, [rawVillas]);

  const availableUnitTypes = useMemo(() => {
    return Array.from(
      new Set(rawVillas.map((v) => v.type).filter(Boolean))
    ) as string[];
  }, [rawVillas]);

  // Helper to check preset selection state
  const getBlockSelectionState = useCallback(
    (blockName: string) => {
      const matchingIds = rawVillas
        .filter((v) => (v.block || v.blockOrBuilding) === blockName)
        .map((v) => String(v._id || v.id));
      const total = matchingIds.length;
      const selected = matchingIds.filter((id) => selectedIds.includes(id)).length;
      return {
        total,
        selected,
        isFull: total > 0 && selected === total,
        isPartial: selected > 0 && selected < total,
        hasSelection: selected > 0,
      };
    },
    [rawVillas, selectedIds]
  );

  const getTypeSelectionState = useCallback(
    (unitType: string) => {
      const matchingIds = rawVillas
        .filter((v) => (v.type || '').toLowerCase() === unitType.toLowerCase())
        .map((v) => String(v._id || v.id));
      const total = matchingIds.length;
      const selected = matchingIds.filter((id) => selectedIds.includes(id)).length;
      return {
        total,
        selected,
        isFull: total > 0 && selected === total,
        isPartial: selected > 0 && selected < total,
        hasSelection: selected > 0,
      };
    },
    [rawVillas, selectedIds]
  );

  const isBlockFullySelected = useCallback(
    (blockName: string) => getBlockSelectionState(blockName).isFull,
    [getBlockSelectionState]
  );

  const isBlockPartiallySelected = useCallback(
    (blockName: string) => getBlockSelectionState(blockName).isPartial,
    [getBlockSelectionState]
  );

  const isTypeFullySelected = useCallback(
    (unitType: string) => getTypeSelectionState(unitType).isFull,
    [getTypeSelectionState]
  );

  const isTypePartiallySelected = useCallback(
    (unitType: string) => getTypeSelectionState(unitType).isPartial,
    [getTypeSelectionState]
  );

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

  // Filtered unit list based on search query in Step 4
  const filteredUnits = useMemo(() => {
    if (!searchQuery.trim()) return units;
    const q = searchQuery.toLowerCase().trim();
    return units.filter(
      (u) =>
        (u.unitNumber || '').toLowerCase().includes(q) ||
        (u.block || '').toLowerCase().includes(q) ||
        (u.type || '').toLowerCase().includes(q) ||
        (u.label || '').toLowerCase().includes(q)
    );
  }, [units, searchQuery]);

  // Smart preset handlers: Auto-check all units matching block or BHK type with search boundary respect
  const handleToggleBlockPreset = useCallback(
    (blockName: string) => {
      const hasSearch = searchQuery.trim().length > 0;
      const targetVillas = hasSearch
        ? filteredUnits.filter((v) => (v.block || v.blockOrBuilding) === blockName)
        : rawVillas.filter((v) => (v.block || v.blockOrBuilding) === blockName);

      const matchingIds = targetVillas.map((v) => String(v._id || v.id));
      if (matchingIds.length === 0) return;

      setSelectedIds((prev) => {
        const someAlreadySelected = matchingIds.some((id) => prev.includes(id));
        if (someAlreadySelected) {
          // If any matching units are selected, deselect them
          return prev.filter((id) => !matchingIds.includes(id));
        } else {
          // If none are selected, select all matching units
          return Array.from(new Set([...prev, ...matchingIds]));
        }
      });
    },
    [rawVillas, filteredUnits, searchQuery]
  );

  const handleToggleTypePreset = useCallback(
    (unitType: string) => {
      const hasSearch = searchQuery.trim().length > 0;
      const targetVillas = hasSearch
        ? filteredUnits.filter((v) => (v.type || '').toLowerCase() === unitType.toLowerCase())
        : rawVillas.filter((v) => (v.type || '').toLowerCase() === unitType.toLowerCase());

      const matchingIds = targetVillas.map((v) => String(v._id || v.id));
      if (matchingIds.length === 0) return;

      setSelectedIds((prev) => {
        const someAlreadySelected = matchingIds.some((id) => prev.includes(id));
        if (someAlreadySelected) {
          // If any matching units are selected, deselect them
          return prev.filter((id) => !matchingIds.includes(id));
        } else {
          // If none are selected, select all matching units
          return Array.from(new Set([...prev, ...matchingIds]));
        }
      });
    },
    [rawVillas, filteredUnits, searchQuery]
  );

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
          : billingCycle === 'WEEKLY'
          ? (selectedDays.length > 0 ? selectedDays[0] : 1)
          : genDayOption === 'LAST'
          ? 'LAST_DAY_OF_MONTH'
          : genDayOption === 'FIRST'
          ? 1
          : Number(customDay || 1),
        selectedDays: billingCycle === 'WEEKLY' ? (selectedDays.length > 0 ? selectedDays : [1]) : [],
        triggerMode,
        scheduledDateTime: combinedScheduledDateTime,
        collectionMethod,
        totalInstallments:
          collectionMethod === 'INSTALLMENT' ? Number(totalInstallments || 0) : undefined,
        targetScope: {
          type: scopeType,
          scopeIds:
            scopeType === 'ALL_COMMUNITY'
              ? []
              : selectedIds.filter((id) => /^[0-9a-fA-F]{24}$/.test(id)),
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
    rawVillas,
    units,
    filteredUnits,
    availableBlocks,
    availableUnitTypes,
    handleToggleBlockPreset,
    handleToggleTypePreset,
    getBlockSelectionState,
    getTypeSelectionState,
    isBlockFullySelected,
    isBlockPartiallySelected,
    isTypeFullySelected,
    isTypePartiallySelected,
    formError,
    setFormError,
    isSubmitting,
    resetForm,
    submitAssessmentRule,
  };
};

export default useAssessmentForm;
