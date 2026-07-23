import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from 'src/components/ui/dialog';
import { Label } from 'src/components/ui/label';
import { Input } from 'src/components/ui/input';
import { Button } from 'src/components/ui/button';
import apiClient from 'src/services/apiClient';

const InviteUserModal = ({ visible, onClose, onSendInvite }) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [villas, setVillas] = useState([]);
  const [selectedVillaId, setSelectedVillaId] = useState('');
  const [roles, setRoles] = useState([]);
  const [selectedRoleName, setSelectedRoleName] = useState('');
  const [loadingVillas, setLoadingVillas] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);

  useEffect(() => {
    if (visible) {
      setLoadingVillas(true);
      apiClient.get('/villas?limit=100')
        .then(res => {
          setVillas(res.data?.data || []);
        })
        .catch(err => {
          console.error('Failed to load villas for invite dropdown:', err);
        })
        .finally(() => {
          setLoadingVillas(false);
        });

      setLoadingRoles(true);
      apiClient.get('/roles?limit=100')
        .then(res => {
          setRoles(res.data?.data || []);
        })
        .catch(err => {
          console.error('Failed to load roles for invite dropdown:', err);
        })
        .finally(() => {
          setLoadingRoles(false);
        });
    }
  }, [visible]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const selectedRole = roles.find(r => r.name === selectedRoleName);
    const isTenant = selectedRole ? selectedRole.isTenantRole : false;

    // Determine residentType based on roleName
    let residentType = 'None';
    if (isTenant && selectedRoleName) {
      const lowerName = selectedRoleName.toLowerCase();
      if (lowerName.includes('owner')) residentType = 'Owner';
      else if (lowerName.includes('tenant')) residentType = 'Tenant';
      else if (lowerName.includes('family')) residentType = 'Family';
      else residentType = 'Guest'; // Fallback for other tenant roles
    }

    onSendInvite({
      email: inviteEmail.trim(),
      villaId: isTenant ? selectedVillaId || null : null,
      residentType,
      roleName: selectedRoleName || null
    });
    
    setInviteEmail('');
    setSelectedVillaId('');
    setSelectedRoleName('');
  };

  const handleClose = () => {
    setInviteEmail('');
    setSelectedVillaId('');
    setSelectedRoleName('');
    onClose();
  };

  const selectedRoleObj = roles.find(r => r.name === selectedRoleName);
  const isTenantRole = selectedRoleObj ? selectedRoleObj.isTenantRole : false;

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Invite Resident / Community Staff
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="invite-email-input" className="text-sm font-semibold">
              Email Address
            </Label>
            <Input
              id="invite-email-input"
              type="email"
              placeholder="resident@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="mt-1.5 w-full text-sm bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="invite-role-select" className="text-sm font-semibold">
              Select Role
            </Label>
            <select
              id="invite-role-select"
              value={selectedRoleName}
              onChange={(e) => setSelectedRoleName(e.target.value)}
              required
              disabled={loadingRoles}
              className="mt-1.5 w-full rounded border border-stroke bg-transparent py-2 px-3 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
            >
              <option value="" className="bg-white dark:bg-boxdark text-black dark:text-white">-- Choose a Role --</option>
              {roles.map((role) => (
                <option key={role.id} value={role.name} className="bg-white dark:bg-boxdark text-black dark:text-white">
                  {role.name} ({role.isTenantRole ? 'Tenant/Unit' : 'Global'})
                </option>
              ))}
            </select>
          </div>

          {isTenantRole && (
            <div>
              <Label htmlFor="invite-villa-select" className="text-sm font-semibold">
                Select Villa / Unit
              </Label>
              <select
                id="invite-villa-select"
                value={selectedVillaId}
                onChange={(e) => setSelectedVillaId(e.target.value)}
                required
                disabled={loadingVillas}
                className="mt-1.5 w-full rounded border border-stroke bg-transparent py-2 px-3 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
              >
                <option value="" className="bg-white dark:bg-boxdark text-black dark:text-white">-- Choose a Villa --</option>
                {villas.map((villa) => (
                  <option key={villa._id} value={villa._id} className="bg-white dark:bg-boxdark text-black dark:text-white">
                    {villa.villaNumber} {villa.block ? `(${villa.block})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            An invitation email will be sent with a link to setup credentials.
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-4 border-t border-stroke dark:border-strokedark">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
            >
              Cancel
            </Button>
            <Button
              id="send-invitation-btn"
              type="submit"
              variant="default"
              size="sm"
              disabled={!inviteEmail.trim() || !selectedRoleName || (isTenantRole && !selectedVillaId)}
              className="text-xs font-semibold px-4 py-2"
            >
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InviteUserModal;
