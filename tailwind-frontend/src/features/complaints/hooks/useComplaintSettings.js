import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchComplaintSettings, updateComplaintSettings } from '../store/complaintSettingsSlice';

export const useComplaintSettings = () => {
  const dispatch = useDispatch();
  const { data, status, error } = useSelector((state) => state.complaintSettings);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchComplaintSettings());
    }
  }, [status, dispatch]);

  const updateSettings = async (newData) => {
    return await dispatch(updateComplaintSettings(newData)).unwrap();
  };

  return {
    settings: data,
    isLoading: status === 'loading',
    isError: status === 'failed',
    error,
    updateSettings
  };
};

export default useComplaintSettings;
