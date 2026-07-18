import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getSamples,
  addSample,
  editSample,
  removeSample,
  clearStatus,
} from '../store/sampleFeatureSlice.js';

export const useSampleFeature = () => {
  const dispatch = useDispatch();
  const { items, loading, error, successMsg } = useSelector((state) => state.sampleFeature);

  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    dispatch(getSamples());
  }, [dispatch]);

  useEffect(() => {
    if (successMsg || error) {
      const timer = setTimeout(() => {
        dispatch(clearStatus());
      }, 5002);
      return () => clearTimeout(timer);
    }
  }, [successMsg, error, dispatch]);

  const handleFormSubmit = (data) => {
    if (editingItem) {
      dispatch(editSample({ id: editingItem._id, sampleData: data }))
        .unwrap()
        .then(() => setEditingItem(null));
    } else {
      dispatch(addSample(data));
    }
  };

  const handleEditSelect = (item) => {
    setEditingItem(item);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this sample record?')) {
      dispatch(removeSample(id));
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  return {
    items,
    loading,
    error,
    successMsg,
    editingItem,
    handleFormSubmit,
    handleEditSelect,
    handleDelete,
    handleCancelEdit,
  };
};

export default useSampleFeature;
