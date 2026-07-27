import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  getAmenities,
  addAmenity,
  editAmenity,
  removeAmenity,
  clearStatus,
} from '../store/amenitySlice.js'

export const useAmenities = () => {
  const dispatch = useDispatch()
  const { items, loading, error, successMsg } = useSelector((state) => state.amenities)

  useEffect(() => {
    dispatch(getAmenities())
  }, [dispatch])

  useEffect(() => {
    if (successMsg || error) {
      const timer = setTimeout(() => dispatch(clearStatus()), 5002)
      return () => clearTimeout(timer)
    }
  }, [successMsg, error, dispatch])

  const createAmenity = (data) => dispatch(addAmenity(data)).unwrap()
  const updateAmenity = (id, data) => dispatch(editAmenity({ id, data })).unwrap()
  const deleteAmenity = (id) => {
    if (window.confirm('Are you sure you want to delete this amenity?')) {
      dispatch(removeAmenity(id))
    }
  }

  return {
    amenities: items,
    loading,
    error,
    successMsg,
    createAmenity,
    updateAmenity,
    deleteAmenity,
  }
}

export default useAmenities
