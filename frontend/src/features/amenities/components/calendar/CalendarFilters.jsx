import React, { memo, useState, useEffect } from 'react'
import { CCard, CCardBody, CFormInput, CFormSelect, CButton } from '@coreui/react'
import { amenityManagementApi } from '../../services/amenityManagementApi.js'
import { amenityApi } from '../../services/amenityApi.js'

const CalendarFilters = memo(({ filters, updateFilters }) => {
  const [facilities, setFacilities] = useState([])
  const [resources, setResources] = useState([])
  const [loadingFacilities, setLoadingFacilities] = useState(false)
  const [loadingResources, setLoadingResources] = useState(false)

  // Fetch facilities on mount
  useEffect(() => {
    let isMounted = true
    const fetchFacilities = async () => {
      setLoadingFacilities(true)
      try {
        const response = await amenityManagementApi.listFacilities({ limit: 100 })
        const facilityList =
          response.data?.records || response.data?.facilities || response.data || []
        if (isMounted) {
          if (Array.isArray(facilityList) && facilityList.length > 0) {
            setFacilities(facilityList)
          } else {
            // Fallback to V1 amenities if V2 list is empty
            const v1Res = await amenityApi.fetchAmenities()
            const v1List = v1Res.data?.amenities || v1Res.data || []
            if (isMounted && Array.isArray(v1List)) {
              setFacilities(v1List)
            }
          }
        }
      } catch (err) {
        try {
          const v1Res = await amenityApi.fetchAmenities()
          const v1List = v1Res.data?.amenities || v1Res.data || []
          if (isMounted && Array.isArray(v1List)) {
            setFacilities(v1List)
          }
        } catch (_) {}
      } finally {
        if (isMounted) setLoadingFacilities(false)
      }
    }
    fetchFacilities()
    return () => {
      isMounted = false
    }
  }, [])

  // Fetch resources when facility changes
  useEffect(() => {
    let isMounted = true
    const targetFacilityId = filters.facilityId || filters.amenityId
    if (!targetFacilityId || targetFacilityId === 'All') {
      setResources([])
      return
    }

    const fetchResources = async () => {
      setLoadingResources(true)
      try {
        const response = await amenityManagementApi.getResourcesByFacility(targetFacilityId)
        const resourceList = response.data?.resources || response.data || []
        if (isMounted) {
          setResources(Array.isArray(resourceList) ? resourceList : [])
        }
      } catch (err) {
        if (isMounted) setResources([])
      } finally {
        if (isMounted) setLoadingResources(false)
      }
    }
    fetchResources()
    return () => {
      isMounted = false
    }
  }, [filters.facilityId, filters.amenityId])

  const handleFacilityChange = (e) => {
    const facilityId = e.target.value
    updateFilters({
      facilityId,
      amenityId: facilityId,
      resourceId: '', // Reset resource selection when facility changes
    })
  }

  const handleResetFilters = () => {
    updateFilters({
      facilityId: '',
      amenityId: '',
      resourceId: '',
      status: '',
      residentId: '',
      search: '',
      paymentStatus: '',
    })
  }

  const hasActiveFilters = Boolean(
    filters.facilityId ||
    filters.amenityId ||
    filters.resourceId ||
    filters.status ||
    filters.paymentStatus ||
    filters.search,
  )

  return (
    <CCard className="border-0 shadow-sm mb-4">
      <CCardBody className="p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="fw-bold mb-0 text-uppercase text-muted">Filters</h6>
          {hasActiveFilters && (
            <CButton
              color="link"
              size="sm"
              className="p-0 text-decoration-none text-danger"
              onClick={handleResetFilters}
            >
              Reset All
            </CButton>
          )}
        </div>

        {/* Search */}
        <div className="mb-3">
          <label className="form-label small fw-semibold text-muted mb-1">Search</label>
          <CFormInput
            type="text"
            placeholder="Resident, Unit, or ID..."
            value={filters.search || ''}
            onChange={(e) => updateFilters({ search: e.target.value })}
          />
        </div>

        {/* Facility */}
        <div className="mb-3">
          <label className="form-label small fw-semibold text-muted mb-1">Facility</label>
          <CFormSelect
            value={filters.facilityId || filters.amenityId || ''}
            onChange={handleFacilityChange}
            disabled={loadingFacilities}
          >
            <option value="">All Facilities</option>
            {facilities.map((fac) => (
              <option key={fac._id || fac.id} value={fac._id || fac.id}>
                {fac.name}
              </option>
            ))}
          </CFormSelect>
        </div>

        {/* Resource */}
        <div className="mb-3">
          <label className="form-label small fw-semibold text-muted mb-1">Resource / Court</label>
          <CFormSelect
            value={filters.resourceId || ''}
            onChange={(e) => updateFilters({ resourceId: e.target.value })}
            disabled={loadingResources || resources.length === 0}
          >
            <option value="">
              {resources.length === 0 ? 'No specific resources' : 'All Resources'}
            </option>
            {resources.map((res) => (
              <option key={res._id || res.id} value={res._id || res.id}>
                {res.name}
              </option>
            ))}
          </CFormSelect>
        </div>

        {/* Operational Status - STRICT: NO APPROVAL STATUSES */}
        <div className="mb-3">
          <label className="form-label small fw-semibold text-muted mb-1">Operational Status</label>
          <CFormSelect
            value={filters.status || ''}
            onChange={(e) => updateFilters({ status: e.target.value })}
          >
            <option value="">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </CFormSelect>
        </div>

        {/* Payment Status */}
        <div className="mb-3">
          <label className="form-label small fw-semibold text-muted mb-1">Payment Status</label>
          <CFormSelect
            value={filters.paymentStatus || ''}
            onChange={(e) => updateFilters({ paymentStatus: e.target.value })}
          >
            <option value="">All Payment Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PENDING">Pending</option>
            <option value="NOT_REQUIRED">Free / Not Required</option>
            <option value="REFUNDED">Refunded</option>
          </CFormSelect>
        </div>
      </CCardBody>
    </CCard>
  )
})

export default CalendarFilters
