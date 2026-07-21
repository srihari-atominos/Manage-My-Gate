import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AmenitiesTopNav from '../components/AmenitiesTopNav.jsx';
import MaintenanceFormModal from '../components/master/MaintenanceFormModal.jsx';
import { fetchMaintenanceList, scheduleAmenityMaintenance, editMaintenance, removeMaintenance, getAmenities, clearStatus } from '../store/amenitySlice.js';
import '../styles/_amenities.scss';

const AdminMaintenanceView = () => {
  const dispatch = useDispatch();
  const { maintenanceList, items: amenities, loading, error, successMsg } = useSelector(state => state.amenities);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    dispatch(fetchMaintenanceList());
    dispatch(getAmenities());
  }, [dispatch]);

  const handleSave = async (amenityId, maintenanceData) => {
    try {
      if (selectedTask) {
        await dispatch(editMaintenance({ amenityId, maintenanceId: selectedTask._id, data: maintenanceData })).unwrap();
      } else {
        await dispatch(scheduleAmenityMaintenance({ amenityId, data: maintenanceData })).unwrap();
      }
      setModalVisible(false);
      setSelectedTask(null);
      dispatch(fetchMaintenanceList());
    } catch (err) {
      // Error handled by redux state
    }
  };

  const handleEdit = (task) => {
    setSelectedTask(task);
    setModalVisible(true);
  };

  const handleDelete = async (task) => {
    if (window.confirm('Are you sure you want to delete this maintenance task?')) {
      try {
        await dispatch(removeMaintenance({ amenityId: task.amenityId, maintenanceId: task._id })).unwrap();
        dispatch(fetchMaintenanceList());
      } catch (err) {
        // Error handled by redux
      }
    }
  };

  const totalItems = maintenanceList?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const actualEndIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedTasks = maintenanceList?.slice(startIndex, actualEndIndex) || [];

  return (
    <div className="amenities-module-wrapper amenity-os-theme">
      <AmenitiesTopNav />
      <div className="view-container">
        <div className="view active" id="view-admin-maintenance">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h2 style={{ margin: 0 }} className="fs-2">Maintenance</h2>
              <p style={{ color: 'var(--text-muted)', margin: 0 }} className="fw-medium">Track upkeep tasks and block amenities while work is in progress.</p>
            </div>
            <button className="btn btn-primary" onClick={() => { setSelectedTask(null); setModalVisible(true); }}>
              <i className="fa-solid fa-plus"></i> Schedule Task
            </button>
          </div>
          
          {error && <div className="alert alert-danger" style={{ marginBottom: '20px', padding: '12px', background: '#ffebee', color: '#c62828', borderRadius: '8px' }}>{error}</div>}
          {successMsg && <div className="alert alert-success" style={{ marginBottom: '20px', padding: '12px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '8px' }}>{successMsg}</div>}

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="ent-table">
                <thead>
                  <tr><th>Amenity</th><th>Issue</th><th>Assigned To</th><th>Scheduled</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {loading && maintenanceList.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
                  ) : maintenanceList.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No maintenance scheduled.</td></tr>
                  ) : (
                    paginatedTasks.map(task => (
                      <tr key={task._id}>
                        <td  className="fw-bold">{task.amenityName}</td>
                        <td>{task.title}</td>
                        <td>{task.assignedStaff || 'Unassigned'}</td>
                        <td>{task.startDate} {task.startTime ? `• ${task.startTime}` : ''} {task.endTime ? `- ${task.endTime}` : ''}</td>
                        <td><span className={`badge badge-${task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'warning' : 'primary'}`} style={{ textTransform: 'capitalize', ...(task.status === 'scheduled' || !task.status ? { background: '#e0e7ff', color: '#4338ca' } : {}) }}>{task.status || 'scheduled'}</span></td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary" style={{ marginRight: '8px' }} onClick={() => handleEdit(task)}>
                            <i className="fa-solid fa-pen"></i> Edit
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(task)}>
                            <i className="fa-solid fa-trash"></i> Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalItems > 0 && (
              <div className="card-footer bg-body border-top d-flex justify-content-between align-items-center p-3">
                <div className="text-muted small">
                  {startIndex + 1}-{actualEndIndex} of {totalItems}
                </div>
                <div className="d-flex gap-2">
                  <button 
                    className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    <i className="fa-solid fa-chevron-left"></i> Prev
                  </button>
                  <button 
                    className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    Next <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <MaintenanceFormModal 
        visible={modalVisible} 
        onClose={() => {
          setModalVisible(false);
          setSelectedTask(null);
          dispatch(clearStatus());
        }}
        onSave={handleSave}
        amenities={amenities}
        initialData={selectedTask}
      />
    </div>
  );
};

export default AdminMaintenanceView;
