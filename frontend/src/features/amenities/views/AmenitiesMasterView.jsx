import React, { useEffect, useState } from 'react'
import { CSpinner } from '@coreui/react'
import useAmenityMaster from '../hooks/useAmenityMaster.js'
import AmenityGrid from '../components/master/AmenityGrid.jsx'
import AmenityFormModal from '../components/master/AmenityFormModal.jsx'
import AmenityDetailsDrawer from '../components/master/AmenityDetailsDrawer.jsx'
import DeleteConfirmationModal from '../components/common/DeleteConfirmationModal.jsx'
import AmenitiesTopNav from '../components/AmenitiesTopNav.jsx'
import toast from 'react-hot-toast'
import '../styles/_amenities.scss'

const AmenitiesMasterView = () => {
  const {
    items,
    loading,
    error,
    canManage,
    canCreate,
    canUpdate,
    canDelete,
    search,
    setSearch,
    loadAmenities,
    createAmenity,
    updateAmenity,
    updateAmenityStatus,
    deleteAmenity,
  } = useAmenityMaster()

  const [formModalVisible, setFormModalVisible] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [selectedAmenity, setSelectedAmenity] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [statusModalVisible, setStatusModalVisible] = useState(false)

  useEffect(() => {
    loadAmenities()
  }, [loadAmenities])

  const handleAddClick = () => {
    setSelectedAmenity(null)
    setFormModalVisible(true)
  }

  const handleEditClick = (amenity) => {
    setSelectedAmenity(amenity)
    setFormModalVisible(true)
  }

  const handleViewDetails = (amenity) => {
    setSelectedAmenity(amenity)
    setDrawerVisible(true)
  }

  const handleSave = async (data) => {
    try {
      if (selectedAmenity) {
        await updateAmenity(selectedAmenity._id, data)
        toast.success('Amenity updated successfully!')
      } else {
        await createAmenity(data)
        toast.success('Amenity created successfully!')
      }
      setFormModalVisible(false)
    } catch (err) {
      toast.error(typeof err === 'string' ? err : err.message || 'Failed to save amenity')
    }
  }

  const handleToggleStatusClick = (amenity) => {
    setSelectedAmenity(amenity)
    setStatusModalVisible(true)
  }

  const handleDeleteClick = (amenity) => {
    setSelectedAmenity(amenity)
    setDeleteModalVisible(true)
  }

  const confirmDelete = async () => {
    if (selectedAmenity) {
      setIsDeleting(true)
      try {
        await deleteAmenity(selectedAmenity._id)
        setDeleteModalVisible(false)
        toast.success(`${selectedAmenity.name} deleted successfully`)
      } catch (err) {
        toast.error(typeof err === 'string' ? err : err.message || 'Failed to delete amenity')
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const confirmStatusChange = async () => {
    if (selectedAmenity) {
      setIsDeleting(true)
      try {
        const newStatus = selectedAmenity.status === 'active' ? 'inactive' : 'active'
        await updateAmenityStatus(selectedAmenity._id, newStatus)
        setStatusModalVisible(false)
        toast.success(
          `${selectedAmenity.name} ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
        )
      } catch (err) {
        toast.error(typeof err === 'string' ? err : err.message || 'Failed to update amenity status')
      } finally {
        setIsDeleting(false)
      }
    }
  }

  return (
    <div className="amenities-module-wrapper amenity-os-theme">
      <AmenitiesTopNav />
      <div className="view-container">
        <div className="view active" id="view-admin-amenities">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '28px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <h2 style={{ margin: 0, lineHeight: 1.3 }} className="fs-3">
                Amenity Master
              </h2>
              <p
                style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}
                className="fw-medium small"
              >
                Manage every bookable facility in your community.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <i
                  className="small fa-solid fa-magnifying-glass"
                  style={{
                    position: 'absolute',
                    left: '14px',
                    color: '#6c757d',
                    pointerEvents: 'none',
                  }}
                ></i>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search amenities..."
                  style={{
                    paddingLeft: '38px',
                    width: '260px',
                    borderRadius: '6px',
                    height: '42px',
                    border: '1px solid #ced4da',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {canCreate && (
                <button
                  className="btn btn-primary"
                  onClick={handleAddClick}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <i className="fa-solid fa-plus"></i> Add New
                </button>
              )}
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          {loading && items.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <CSpinner />
            </div>
          ) : (
            <AmenityGrid
              amenities={items}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              onToggleStatus={handleToggleStatusClick}
              onViewDetails={handleViewDetails}
            />
          )}
        </div>

        {/* Overlays */}
        <AmenityFormModal
          visible={formModalVisible}
          onClose={() => setFormModalVisible(false)}
          onSave={handleSave}
          initialData={selectedAmenity}
        />

        <AmenityDetailsDrawer
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          amenity={selectedAmenity}
        />

        <DeleteConfirmationModal
          visible={statusModalVisible}
          onClose={() => setStatusModalVisible(false)}
          onConfirm={confirmStatusChange}
          isDeleting={isDeleting}
          title={selectedAmenity?.status === 'active' ? 'Confirm Deactivate' : 'Confirm Activate'}
          confirmText={selectedAmenity?.status === 'active' ? 'Deactivate' : 'Activate'}
          loadingText={selectedAmenity?.status === 'active' ? 'Deactivating...' : 'Activating...'}
          confirmColor={selectedAmenity?.status === 'active' ? 'var(--warning)' : 'var(--success)'}
          message={
            selectedAmenity
              ? `Are you sure you want to ${selectedAmenity.status === 'active' ? 'deactivate' : 'activate'} ${selectedAmenity.name}? ${selectedAmenity.status === 'active' ? 'It will no longer be available for booking.' : 'It will become available for booking.'}`
              : ''
          }
        />

        <DeleteConfirmationModal
          visible={deleteModalVisible}
          onClose={() => setDeleteModalVisible(false)}
          onConfirm={confirmDelete}
          isDeleting={isDeleting}
          title="Confirm Delete"
          confirmText="Delete"
          loadingText="Deleting..."
          confirmColor="var(--danger)"
          message={
            selectedAmenity
              ? `Are you sure you want to completely delete ${selectedAmenity.name}? This action cannot be undone.`
              : ''
          }
        />
      </div>
    </div>
  )
}

export default AmenitiesMasterView
