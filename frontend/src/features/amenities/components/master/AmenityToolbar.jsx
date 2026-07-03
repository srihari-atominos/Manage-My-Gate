import React from 'react';
import SearchBarApp from '../common/SearchBarApp.jsx';
import { memo } from 'react';

const AmenityToolbar = memo(({ 
  search, onSearchChange, 
  categoryFilter, onCategoryChange,
  statusFilter, onStatusChange,
  sortField, onSortChange,
  viewMode, onViewModeChange,
  canCreate, canManage, onAddClick 
}) => {
  return (
    <div className="mb-4">
      <SearchBarApp style={{ marginBottom: '24px' }}>
        <i className="fa-solid fa-magnifying-glass"></i>
        <input 
          type="text" 
          placeholder="Search by name or location..." 
          value={search}
          onChange={(e) => onSearchChange(e.target.value)} 
        />
        
        <div className="divider"></div>
        <select value={categoryFilter} onChange={(e) => onCategoryChange(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-main)', fontWeight: 600, flex: 1, minWidth: '120px' }}>
          <option value="">All Categories</option>
          <option value="Event Space">Event Space</option>
          <option value="Fitness">Fitness</option>
          <option value="Sports">Sports</option>
          <option value="Recreation">Recreation</option>
        </select>

        <div className="divider"></div>
        <select value={statusFilter} onChange={(e) => onStatusChange(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-main)', fontWeight: 600, flex: 1, minWidth: '120px' }}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
        </select>

        <div className="divider"></div>
        <select value={sortField} onChange={(e) => onSortChange(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-main)', fontWeight: 600, flex: 1, minWidth: '140px' }}>
          <option value="newest">Sort by Newest</option>
          <option value="name">Sort by Name</option>
          <option value="capacity">Sort Capacity</option>
          <option value="rate">Sort Rate</option>
        </select>
        
        <button className="search-btn"><i className="fa-solid fa-filter"></i> Filter</button>
      </SearchBarApp>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button 
          className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => onViewModeChange('grid')}
          style={{ padding: '8px 16px' }}
        >
          <i className="fa-solid fa-grid-2"></i> Grid
        </button>
        <button 
          className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => onViewModeChange('table')}
          style={{ padding: '8px 16px' }}
        >
          <i className="fa-solid fa-list"></i> List
        </button>
      </div>
    </div>
  );
});

export default AmenityToolbar;
