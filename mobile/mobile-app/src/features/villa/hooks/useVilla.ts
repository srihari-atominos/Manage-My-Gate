import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import { getVillas, getVillaById, clearVillaState } from '../store/villaSlice';
import { useCallback } from 'react';
import { FetchVillasParams } from '../services/villaService';

export const useVilla = () => {
  const dispatch = useDispatch<AppDispatch>();
  const villaState = useSelector((state: RootState) => state.villa);

  const fetchVillas = useCallback(
    (params: FetchVillasParams = {}) => {
      return dispatch(getVillas(params));
    },
    [dispatch]
  );

  const fetchVillaById = useCallback(
    (id: string) => {
      return dispatch(getVillaById(id));
    },
    [dispatch]
  );

  const clearState = useCallback(() => {
    dispatch(clearVillaState());
  }, [dispatch]);

  return {
    ...villaState,
    fetchVillas,
    fetchVillaById,
    clearState,
  };
};

export default useVilla;
