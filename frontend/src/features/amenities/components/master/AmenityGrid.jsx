import React from 'react';
import { memo } from 'react';

const AmenityGrid = memo(({ amenities, canManage, canUpdate, canDelete, onEdit, onDeactivate, onViewDetails }) => {
  if (!amenities || amenities.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No amenities match your criteria.</div>;
  }

  return (
    <div className="dashboard-grid" id="amenity-master-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
      {amenities.map((item) => (
        <div key={item._id} className="card card-hover amenity-item-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div 
            style={{ 
              height: '180px', 
              background: `url('${(item.images && item.images.length > 0) ? item.images[0] : 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=800&q=80'}') center/cover` 
            }}
          ></div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <h4 style={{ fontSize: '20px', margin: 0 }}>{item.name}</h4>
              <span className={`badge ${item.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                {item.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6, fontWeight: '500' }}>
              <i className="fa-solid fa-location-dot" style={{ color: 'var(--primary)' }}></i> {item.location || 'No location specified'}<br/>
              Capacity: {item.capacity || 'N/A'} • ₹{item.ratePerHour?.toLocaleString() || 0}/hr
            </p>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn btn-outline" 
                style={{ flex: 1 }} 
                onClick={() => onEdit(item)}
                disabled={!(canUpdate ?? canManage)}
              >
                Edit
              </button>
              <button 
                className="btn btn-outline" 
                style={{ flex: 1 }} 
                onClick={() => onDeactivate(item)}
                disabled={!(canDelete ?? canManage)}
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

export default AmenityGrid;
