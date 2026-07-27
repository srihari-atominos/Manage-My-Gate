import React, { useState } from 'react'
import toast from 'react-hot-toast'

export const BlacklistSettings = ({ blacklist, setBlacklist }) => {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [plate, setPlate] = useState('')
  const [reason, setReason] = useState('')

  const handleAddBlacklist = (e) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Target name is required to create a blacklist entry.')
      return
    }
    if (!reason.trim()) {
      toast.error('Detailed reason is required to ban a profile.')
      return
    }

    const newRecord = {
      id: `B-${Math.floor(100 + Math.random() * 900)}`,
      name,
      phone: phone.trim() || '—',
      plate: plate.trim() || '—',
      reason,
      dateAdded: new Date().toLocaleDateString(),
    }

    setBlacklist((prev) => [newRecord, ...prev])
    toast.success('Banned profile registered successfully!')

    // Reset Form
    setName('')
    setPhone('')
    setPlate('')
    setReason('')
  }

  const handleRemoveBlacklist = (id) => {
    setBlacklist(blacklist.filter((item) => (item.id || item._id) !== id))
  }

  return (
    <div className="dashboard-grid">
      {/* Left panel: Block Profile Form */}
      <div>
        <div className="card blacklist-card">
          <h3 className="d-flex align-items-center mb-3" style={{ fontSize: '18px' }}>
            <i className="fa-solid fa-user-slash card-title-icon-muted text-danger"></i> Add Banned
            Profile
          </h3>

          <form onSubmit={handleAddBlacklist}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Robert Vance"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number (Optional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. +971 50 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Vehicle Plate (Optional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. DXB-88190"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Detailed Reason for Ban</label>
              <textarea
                className="form-control blacklist-reason-input"
                rows="3"
                placeholder="Describe why this visitor or vehicle is blacklisted..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-danger w-100 mt-3 fw-bold">
              Confirm & Block Profile
            </button>
          </form>
        </div>
      </div>

      {/* Right panel: Active database log */}
      <div>
        <div className="card">
          <h3 className="d-flex align-items-center mb-3" style={{ fontSize: '18px' }}>
            <i className="fa-solid fa-database card-title-icon-muted"></i> Active Blacklist Database
            ({blacklist.length})
          </h3>

          {blacklist.length === 0 ? (
            <div className="empty-state-container">
              <i className="fa-solid fa-circle-check empty-state-icon"></i>
              <span className="empty-state-text-main">Blacklist is empty</span>
              <span className="empty-state-text-sub">
                No profiles or vehicles are currently banned.
              </span>
            </div>
          ) : (
            <div className="pending-items-list">
              {blacklist.map((record) => {
                const recordId = record.id || record._id
                const recordDate =
                  record.dateAdded ||
                  (record.createdAt ? new Date(record.createdAt).toLocaleDateString() : '—')

                return (
                  <div key={recordId} className="blacklist-item-card">
                    <div>
                      <div className="item-header-row">
                        <h4 className="blacklist-item-name">{record.name}</h4>
                        <span className="blacklist-item-badge">{recordId}</span>
                      </div>
                      <div className="blacklist-item-reason">
                        <strong>Reason:</strong> {record.reason}
                      </div>
                      <div className="blacklist-item-meta">
                        <i className="fa-solid fa-car-side me-1"></i> Plate: {record.plate || '—'}{' '}
                        &bull; <i className="fa-solid fa-phone ms-2 me-1"></i> Phone:{' '}
                        {record.phone || '—'} &bull;{' '}
                        <i className="fa-solid fa-calendar-days ms-2 me-1"></i> Banned on:{' '}
                        {recordDate}
                      </div>
                    </div>

                    <button
                      className="btn btn-secondary btn-unban"
                      onClick={() => handleRemoveBlacklist(recordId)}
                      title="Remove rule / Unban"
                    >
                      <i className="fa-solid fa-trash-can me-1"></i> Unban
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BlacklistSettings
