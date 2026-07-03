import React, { useEffect, useState } from 'react';
import { CSpinner } from '@coreui/react';
import useAmenityMaster from '../hooks/useAmenityMaster.js';
import AmenityGrid from '../components/master/AmenityGrid.jsx';
import AmenityFormModal from '../components/master/AmenityFormModal.jsx';
import AmenityDetailsDrawer from '../components/master/AmenityDetailsDrawer.jsx';
import DeleteConfirmationModal from '../components/common/DeleteConfirmationModal.jsx';
import AmenitiesTopNav from '../components/AmenitiesTopNav.jsx';
import toast from 'react-hot-toast';
import '../styles/_amenities.scss';

const AmenitiesMasterView = () => {
  const {
    items, loading, error, canManage, canCreate, canUpdate, canDelete,
    search, setSearch,
    loadAmenities, createAmenity, updateAmenity, updateAmenityStatus, deleteAmenity
  } = useAmenityMaster();

  const [formModalVisible, setFormModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedAmenity, setSelectedAmenity] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deactivateModalVisible, setDeactivateModalVisible] = useState(false);

  useEffect(() => {
    loadAmenities();
  }, [loadAmenities]);

  const handleAddClick = () => {
    setSelectedAmenity(null);
    setFormModalVisible(true);
  };

  const handleEditClick = (amenity) => {
    setSelectedAmenity(amenity);
    setFormModalVisible(true);
  };

  const handleViewDetails = (amenity) => {
    setSelectedAmenity(amenity);
    setDrawerVisible(true);
  };

  const handleSave = async (data) => {
    try {
      if (selectedAmenity) {
        await updateAmenity(selectedAmenity._id, data);
        toast.success('Amenity updated successfully!');
      } else {
        await createAmenity(data);
        toast.success('Amenity created successfully!');
      }
      setFormModalVisible(false);
    } catch (err) {
      toast.error(err.message || 'Failed to save amenity');
    }
  };

  const handleDeactivateClick = (amenity) => {
    setSelectedAmenity(amenity);
    setDeactivateModalVisible(true);
  };

  const confirmDeactivate = async () => {
    if (selectedAmenity) {
      setIsDeleting(true);
      try {
        await updateAmenityStatus(selectedAmenity._id, 'inactive');
        setDeactivateModalVisible(false);
        toast.success(`${selectedAmenity.name} deactivated successfully`);
      } catch (err) {
        toast.error(err.message || 'Failed to deactivate amenity');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="amenities-module-wrapper amenity-os-theme">
      <AmenitiesTopNav />
      <div className="view-container">
        <div className="view active" id="view-admin-amenities">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '28px', margin: 0 }}>Amenity Master</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: '500', margin: 0 }}>Manage every bookable facility in your community.</p>
            </div>
            
            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="search-bar-app" style={{ margin: 0, padding: '4px 16px', boxShadow: 'none' }}>
                <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '14px' }}></i>
                <input 
                  type="text" 
                  id="amenity-search-input" 
                  placeholder="Search amenities..." 
                  style={{ width: '200px' }} 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={handleAddClick}>
                <i className="fa-solid fa-plus" style={{ marginRight: '8px' }}></i> Add New
              </button>
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}
          
          {loading && items.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><CSpinner /></div>
          ) : (
            <AmenityGrid 
              amenities={items} 
              canUpdate={canUpdate}
              canDelete={canDelete}
              onEdit={handleEditClick} 
              onDeactivate={handleDeactivateClick}
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
          visible={deactivateModalVisible} 
          onClose={() => setDeactivateModalVisible(false)} 
          onConfirm={confirmDeactivate}
          isDeleting={isDeleting}
          message={selectedAmenity ? `Are you sure you want to deactivate ${selectedAmenity.name}? It will no longer be available for booking.` : ''}
        />
      </div>
    </div>
  );
};

export default AmenitiesMasterView;
