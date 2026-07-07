import React from 'react';


export const DeleteConfirmationModal = ({ visible, onClose, onConfirm, title = "Confirm Delete", confirmText = "Delete", loadingText = "Deleting...", confirmColor = "var(--danger)", message = "Are you sure you want to delete this item? This action cannot be undone.", isDeleting = false }) => {
  if (!visible) return null;

  return (
    <div className="modal-overlay active amenity-os-theme">
      <div className="modal-box" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2 style={{ fontSize: '20px', margin: 0, color: confirmColor }}>{title}</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0 }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={isDeleting}>Cancel</button>
          <button className="btn" onClick={onConfirm} disabled={isDeleting} style={{ background: confirmColor, color: 'white', borderColor: confirmColor }}>
            {isDeleting ? loadingText : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
