import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from 'src/components/ui/dialog';
import { Button } from 'src/components/ui/button';
import { Label } from 'src/components/ui/label';
import { Input } from 'src/components/ui/input';
import { createTechnician, updateTechnician } from '../store/complaintSlice';
import { fetchUsersAsync } from '../../userManagement/store/userSlice';
import toast from 'react-hot-toast';
import '../styles/_complaints.scss';

const selectClassName =
  'w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white';

const TechnicianModal = ({ visible, technician, onClose }) => {
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: 'Electrical',
    type: 'In-House Staff',
    status: 'Pending',
    whatsappEnabled: true,
  });

  useEffect(() => {
    if (visible) {
      if (technician) {
        setFormData({
          name: technician.name || '',
          email: technician.email || '',
          phone: technician.phone || '',
          department: technician.department || 'Electrical',
          type: technician.type || 'In-House Staff',
          status: technician.status || 'Pending',
          whatsappEnabled:
            technician.whatsappEnabled !== undefined
              ? technician.whatsappEnabled
              : true,
        });
      } else {
        setFormData({
          name: '',
          email: '',
          phone: '',
          department: 'Electrical',
          type: 'In-House Staff',
          status: 'Pending',
          whatsappEnabled: true,
        });
      }
    }
  }, [visible, technician]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error('Name and Phone are required.');
      return;
    }

    try {
      if (technician && technician._id) {
        await dispatch(
          updateTechnician({ id: technician._id, data: formData }),
        ).unwrap();
        toast.success('Staff/Vendor updated successfully.');
      } else {
        await dispatch(createTechnician(formData)).unwrap();
        toast.success('Staff/Vendor added and invitation sent successfully.');

        // Refresh User Management list instantly
        dispatch(fetchUsersAsync({ page: 1, limit: 10 }));
      }
      onClose(true);
    } catch (err) {
      const errMsg =
        err?.message ||
        (typeof err === 'string' ? err : 'Failed to save Staff/Vendor.');
      toast.error(errMsg);
    }
  };

  return (
    <Dialog
      open={visible}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {technician ? 'Edit Staff/Vendor' : 'Invite Staff/Vendor'}
          </DialogTitle>
        </DialogHeader>

        <form id="technicianForm" onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="tech-name">Name</Label>
            <Input
              id="tech-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g. John Doe"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="tech-email">Email Address (Optional)</Label>
            <Input
              id="tech-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. john@example.com"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="tech-phone">Phone Number</Label>
            <Input
              id="tech-phone"
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="+91 9876543210"
            />
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label htmlFor="tech-department">Department / Trade</Label>
            <select
              id="tech-department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className={selectClassName}
            >
              <option value="Electrical">Electrical</option>
              <option value="Plumbing">Plumbing</option>
              <option value="Housekeeping">Housekeeping</option>
              <option value="Security">Security</option>
              <option value="Carpentry">Carpentry</option>
              <option value="Others">Others</option>
            </select>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="tech-type">Type</Label>
            <select
              id="tech-type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              className={selectClassName}
            >
              <option value="In-House Staff">In-House Staff</option>
              <option value="External Vendor">External Vendor</option>
            </select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="tech-status">Status</Label>
            <select
              id="tech-status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className={selectClassName}
            >
              <option value="Active">Active</option>
              <option value="Pending">Pending Invitation</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="technicianForm">
            {technician ? 'Save Changes' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

TechnicianModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  technician: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};

export default TechnicianModal;
