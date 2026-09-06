import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import {
  getVillas,
  getVillaBlocks,
  getVillaStats,
  getVillaById,
  createVillaThunk,
  updateVillaThunk,
  deleteVillaThunk,
  batchGenerateVillasThunk,
  bulkUploadVillasThunk,
  assignExistingUserThunk,
  updateResidencyTypeThunk,
  removeResidentThunk,
  setSearchQuery,
  setBlockFilter,
  setStatusFilter,
  setCurrentPage,
  clearCurrentVilla,
  clearVillaState,
} from '../store/villaSlice';
import { FetchVillasParams, VillaPayload, BatchGenerateParams, downloadBulkUploadTemplate } from '../services/villaService';

export const useVilla = () => {
  const dispatch = useDispatch<AppDispatch>();
  const villaState = useSelector((state: RootState) => state.villa);

  const fetchVillas = useCallback(
    (params: FetchVillasParams = {}) => {
      const mergedParams: FetchVillasParams = {
        page: villaState.pagination.currentPage,
        limit: villaState.pagination.rowsPerPage,
        search: villaState.filters.search,
        blockOrBuilding: villaState.filters.blockOrBuilding,
        status: villaState.filters.status,
        ...params,
      };
      return dispatch(getVillas(mergedParams));
    },
    [
      dispatch,
      villaState.pagination.currentPage,
      villaState.pagination.rowsPerPage,
      villaState.filters.search,
      villaState.filters.blockOrBuilding,
      villaState.filters.status,
    ]
  );

  const fetchBlocks = useCallback(() => {
    return dispatch(getVillaBlocks());
  }, [dispatch]);

  const fetchStats = useCallback(() => {
    return dispatch(getVillaStats());
  }, [dispatch]);

  const fetchById = useCallback(
    (id: string) => {
      return dispatch(getVillaById(id));
    },
    [dispatch]
  );

  const createUnit = useCallback(
    async (data: VillaPayload) => {
      const result = await dispatch(createVillaThunk(data));
      if (createVillaThunk.fulfilled.match(result)) {
        fetchVillas();
        fetchStats();
        return result.payload;
      }
      throw result.payload;
    },
    [dispatch, fetchVillas, fetchStats]
  );

  const updateUnit = useCallback(
    async (id: string, data: VillaPayload) => {
      const result = await dispatch(updateVillaThunk({ id, data }));
      if (updateVillaThunk.fulfilled.match(result)) {
        fetchVillas();
        fetchStats();
        return result.payload;
      }
      throw result.payload;
    },
    [dispatch, fetchVillas, fetchStats]
  );

  const deleteUnit = useCallback(
    async (id: string) => {
      const result = await dispatch(deleteVillaThunk(id));
      if (deleteVillaThunk.fulfilled.match(result)) {
        fetchVillas();
        fetchStats();
        return result.payload;
      }
      throw result.payload;
    },
    [dispatch, fetchVillas, fetchStats]
  );

  const batchGenerate = useCallback(
    async (batchData: BatchGenerateParams) => {
      const result = await dispatch(batchGenerateVillasThunk(batchData));
      if (batchGenerateVillasThunk.fulfilled.match(result)) {
        fetchVillas({ page: 1 });
        fetchStats();
        fetchBlocks();
        return result.payload;
      }
      throw result.payload;
    },
    [dispatch, fetchVillas, fetchStats, fetchBlocks]
  );

  const bulkUpload = useCallback(
    async (villas: VillaPayload[]) => {
      const result = await dispatch(bulkUploadVillasThunk(villas));
      if (bulkUploadVillasThunk.fulfilled.match(result)) {
        fetchVillas({ page: 1 });
        fetchStats();
        fetchBlocks();
        return result.payload;
      }
      throw result.payload;
    },
    [dispatch, fetchVillas, fetchStats, fetchBlocks]
  );

  const downloadTemplate = useCallback(async () => {
    return await downloadBulkUploadTemplate();
  }, []);

  const assignResident = useCallback(
    async (villaId: string, userId: string, residencyType: string) => {
      const result = await dispatch(assignExistingUserThunk({ villaId, userId, residencyType }));
      if (assignExistingUserThunk.fulfilled.match(result)) {
        dispatch(getVillaById(villaId));
        fetchVillas();
        fetchStats();
        return result.payload;
      }
      throw result.payload;
    },
    [dispatch, fetchVillas, fetchStats]
  );

  const setPrimary = useCallback(
    async (villaId: string, primaryResidentId: string | null) => {
      await updateUnit(villaId, { primaryResidentId } as any);
      dispatch(getVillaById(villaId));
      fetchVillas();
    },
    [dispatch, updateUnit, fetchVillas]
  );

  const updateResidency = useCallback(
    async (villaId: string, userId: string, residencyType: string) => {
      const result = await dispatch(updateResidencyTypeThunk({ villaId, userId, residencyType }));
      if (updateResidencyTypeThunk.fulfilled.match(result)) {
        dispatch(getVillaById(villaId));
        return result.payload;
      }
      throw result.payload;
    },
    [dispatch]
  );

  const unassignResident = useCallback(
    async (villaId: string, userId: string) => {
      const result = await dispatch(removeResidentThunk({ villaId, userId }));
      if (removeResidentThunk.fulfilled.match(result)) {
        dispatch(getVillaById(villaId));
        fetchVillas();
        fetchStats();
        return result.payload;
      }
      throw result.payload;
    },
    [dispatch, fetchVillas, fetchStats]
  );

  const setSearch = useCallback(
    (query: string) => {
      dispatch(setSearchQuery(query));
    },
    [dispatch]
  );

  const setBlock = useCallback(
    (block: string) => {
      dispatch(setBlockFilter(block));
    },
    [dispatch]
  );

  const setStatus = useCallback(
    (status: string) => {
      dispatch(setStatusFilter(status));
    },
    [dispatch]
  );

  const setPage = useCallback(
    (page: number) => {
      dispatch(setCurrentPage(page));
    },
    [dispatch]
  );

  const clearCurrent = useCallback(() => {
    dispatch(clearCurrentVilla());
  }, [dispatch]);

  const clearAll = useCallback(() => {
    dispatch(clearVillaState());
  }, [dispatch]);

  return {
    ...villaState,
    fetchVillas,
    fetchBlocks,
    fetchStats,
    fetchById,
    createUnit,
    updateUnit,
    deleteUnit,
    batchGenerate,
    bulkUpload,
    downloadTemplate,
    assignResident,
    setPrimary,
    updateResidency,
    unassignResident,
    setSearch,
    setBlock,
    setStatus,
    setPage,
    clearCurrent,
    clearAll,
  };
};

export default useVilla;
