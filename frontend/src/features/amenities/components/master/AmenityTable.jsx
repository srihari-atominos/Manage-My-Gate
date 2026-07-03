import React, { memo } from 'react';
import AmenityStatusBadge from '../AmenityStatusBadge.jsx';
import { formatCurrency } from '../../utils/amenityUtils.js';

const AmenityTable = memo(({ amenities, canManage, canUpdate, canDelete, onEdit, onDelete, onViewDetails }) => {
  return (
    <div className="table-wrapper">
      <table className="ent-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Location</th>
            <th>Capacity</th>
            <th>Rate</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {amenities.map(row => (
            <tr key={row._id}>
              <td><span style={{ fontWeight: 600 }}>{row.name}</span></td>
              <td>{row.type}</td>
              <td>{row.location}</td>
              <td>{row.capacity || 'N/A'}</td>
              <td>{formatCurrency(row.ratePerHour)}/hr</td>
              <td><AmenityStatusBadge status={row.status} /></td>
              <td>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-outline" style={{ padding: '6px 12px' }} onClick={() => onViewDetails(row)}>View</button>
                  {(canUpdate ?? canManage) && (
                    <button className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={() => onEdit(row)}>Edit</button>
                  )}
                  {(canDelete ?? canManage) && (
                    <button className="btn btn-danger-outline" style={{ padding: '6px 12px' }} onClick={() => onDelete(row)}>Delete</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

export default AmenityTable;
