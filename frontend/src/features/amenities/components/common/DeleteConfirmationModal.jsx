import React from 'react';


export const DeleteConfirmationModal = ({ visible, onClose, onConfirm, title = "Confirm Delete", message = "Are you sure you want to delete this item? This action cannot be undone.", isDeleting = false }) => {
  if (!visible) return null;

  return (
    <div className="modal-overlay amenity-os-theme">
      <div className="modal-box" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2 style={{ fontSize: '20px', margin: 0, color: 'var(--danger)' }}>{title}</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0 }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={isDeleting}>Cancel</button>
          <button className="btn btn-danger-outline" onClick={onConfirm} disabled={isDeleting} style={{ background: 'var(--danger)', color: 'white' }}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
