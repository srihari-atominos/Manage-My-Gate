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

  return (
    <div className="amenities-module-wrapper amenity-os-theme">
      <AmenitiesTopNav />
      <div className="view-container">
        <div className="view active" id="view-admin-maintenance">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h2 style={{ fontSize: '28px', margin: 0 }}>Maintenance</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: '500', margin: 0 }}>Track upkeep tasks and block amenities while work is in progress.</p>
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
                    maintenanceList.map(task => (
                      <tr key={task._id}>
                        <td style={{ fontWeight: '700' }}>{task.amenityName}</td>
                        <td>{task.title}</td>
                        <td>{task.assignedStaff || 'Unassigned'}</td>
                        <td>{task.startDate} {task.startTime ? `• ${task.startTime}` : ''} {task.endTime ? `- ${task.endTime}` : ''}</td>
                        <td><span className={`badge badge-${task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'warning' : 'primary'}`} style={{ textTransform: 'capitalize' }}>{task.status || 'scheduled'}</span></td>
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
