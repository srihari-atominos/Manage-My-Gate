import React, { useEffect } from 'react';
import { CSpinner } from '@coreui/react';
import useResidentDiscover from '../hooks/useResidentDiscover.js';
import SearchBarApp from '../components/common/SearchBarApp.jsx';
import AmenityCardHorizontal from '../components/common/AmenityCardHorizontal.jsx';
import '../styles/_amenities.scss';

const ResidentDiscoverView = () => {
  const {
    items,
    categories,
    loading,
    error,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    loadAmenities,
    navigateToBooking
  } = useResidentDiscover();

  useEffect(() => {
    loadAmenities();
  }, [loadAmenities]);

  return (
    <div className="amenities-module-wrapper amenity-os-theme">
      <div className="view-container">
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Find your perfect space</h1>
          <p style={{ color: 'var(--text-muted)' }}>Browse and book community amenities</p>
        </div>

        <SearchBarApp style={{ marginBottom: '24px' }}>
          <i className="fa-solid fa-magnifying-glass"></i>
          <input 
            type="text" 
            placeholder="Search by name or location..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)} 
          />
          <button className="search-btn"><i className="fa-solid fa-search"></i> Search</button>
        </SearchBarApp>

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '32px' }}>
          {categories.map(cat => (
            <button 
              key={cat}
              className={`btn ${selectedCategory === cat ? 'btn-primary' : 'btn-outline'}`}
              style={{ borderRadius: '24px', whiteSpace: 'nowrap', padding: '8px 16px' }}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: '24px' }}>{error}</div>}

        {loading && items.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><CSpinner /></div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <i className="fa-solid fa-box-open" style={{ fontSize: '48px', color: 'var(--text-muted)', marginBottom: '16px' }}></i>
            <h4 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>No amenities found</h4>
            <p style={{ color: 'var(--text-muted)' }}>Try adjusting your search or category filters.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {items.map(amenity => (
              <AmenityCardHorizontal 
                key={amenity._id}
                image={amenity.imageUrl || 'https://via.placeholder.com/400x200'}
                title={amenity.name}
                description={amenity.description || 'Enjoy our premium facilities.'}
                location={amenity.location || 'N/A'}
                rate={amenity.ratePerHour}
                status={amenity.status === 'active' ? 'Available' : 'Unavailable'}
                onClick={() => navigateToBooking(amenity._id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResidentDiscoverView;
