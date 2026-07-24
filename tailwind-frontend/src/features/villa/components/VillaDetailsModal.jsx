import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
import { Checkbox } from 'src/components/ui/checkbox';
import { Badge } from 'src/components/ui/badge';
import { Alert, AlertDescription } from 'src/components/ui/alert';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { fetchVillaByIdAsync } from '../store/villaSlice';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { inviteUserAsync } from '../../userManagement/store/userSlice';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { fetchRolesAsync } from '../../roleBuilder/store/roleSlice';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import useVilla from '../hooks/useVilla';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export const VillaDetailsModal = ({ visible, onClose, villaId }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { selectedVilla, selectedVillaLoading } = useSelector((state) => state.villa);
  const { roles } = useSelector((state) => state.roleBuilder || { roles: [] });
  const tenantRoles = roles ? roles.filter((r) => r.isTenantRole).map((r) => r.name) : [];
  
  const {
    workspaceUsers,
    fetchWorkspaceUsers,
    assignExistingUser,
    updateResidencyType,
    removeResident,
    assignResident
  } = useVilla();
  
  // Tab states: 1 = Assign Existing, 2 = Invite via Email
  const [activeTab, setActiveTab] = useState(1);

  // Form states for Tab 1 (Assign Existing)
  const [assignUserId, setAssignUserId] = useState('');
  const [residencyType, setResidencyType] = useState('');
  const [isPrimaryResident, setIsPrimaryResident] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState(null);

  // Form states for Tab 2 (Invite via Email)
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteResidencyType, setInviteResidencyType] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);

  // Inline residency type editor states
  const [editingUserId, setEditingUserId] = useState(null);
  const [editResidencyType, setEditResidencyType] = useState('');

  useEffect(() => {
    if (visible) {
      if (villaId) {
        dispatch(fetchVillaByIdAsync(villaId));
      }
      fetchWorkspaceUsers();
      dispatch(fetchRolesAsync({ page: 1, limit: 100 }));
    }
  }, [dispatch, visible, villaId, fetchWorkspaceUsers]);

  const handleAssignExistingSubmit = async (e) => {
    e.preventDefault();
    if (!assignUserId) return;

    setAssigning(true);
    setAssignError(null);

    try {
      await assignExistingUser(villaId, assignUserId, residencyType);
      if (isPrimaryResident) {
        await assignResident(villaId, assignUserId);
      }
      toast.success(t('villas.details.assignSuccess', 'Resident assigned successfully'));
      setAssignUserId('');
      setIsPrimaryResident(false);
      dispatch(fetchVillaByIdAsync(villaId));
    } catch (err) {
      setAssignError(err || t('villas.details.assignFailed', 'Failed to assign resident'));
    } finally {
      setAssigning(false);
    }
  };

  const handleSetPrimaryResident = async (userId) => {
    try {
      await assignResident(villaId, userId);
      toast.success(userId ? t('villas.details.setPrimarySuccess', 'Primary resident set successfully') : t('villas.details.unsetPrimarySuccess', 'Primary resident cleared successfully'));
      dispatch(fetchVillaByIdAsync(villaId));
    } catch (err) {
      toast.error(err || t('villas.details.setPrimaryFailed', 'Failed to update primary resident'));
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setInviteError(null);

    try {
      const getResidentType = (type) => {
        if (type.includes('Owner')) return 'Owner';
        if (type === 'Family Member') return 'Family';
        if (type === 'Staff') return 'Guest';
        return 'Tenant';
      };

      const actionResult = await dispatch(inviteUserAsync({
        email: inviteEmail.trim(),
        villaId,
        residentType: getResidentType(inviteResidencyType),
        roleName: inviteResidencyType
      }));

      if (inviteUserAsync.fulfilled.match(actionResult)) {
        toast.success(t('villas.details.inviteSuccess', `Invitation sent successfully to ${inviteEmail}`));
        setInviteEmail('');
        dispatch(fetchVillaByIdAsync(villaId));
      } else {
        setInviteError(actionResult.payload || t('villas.details.inviteFailed', 'Failed to send invitation'));
      }
    } catch (err) {
      setInviteError(err.message || t('villas.details.inviteFailed', 'Invitation failed'));
    } finally {
      setInviting(false);
    }
  };

  const startEditResidencyType = (resident) => {
    setEditingUserId(resident.id);
    setEditResidencyType(resident.residentType || 'Tenant');
  };

  const handleSaveResidencyType = async (userId) => {
    try {
      await updateResidencyType(villaId, userId, editResidencyType);
      toast.success(t('villas.details.updateTypeSuccess', 'Residency type updated successfully'));
      setEditingUserId(null);
      dispatch(fetchVillaByIdAsync(villaId));
    } catch (err) {
      toast.error(err || t('villas.details.updateTypeFailed', 'Failed to update residency type'));
    }
  };

  const handleRemoveResident = async (userId) => {
    if (!window.confirm(t('villas.details.confirmRemove', 'Are you sure you want to remove this resident from the unit?'))) {
      return;
    }
    try {
      await removeResident(villaId, userId);
      toast.success(t('villas.details.removeSuccess', 'Resident removed successfully'));
      dispatch(fetchVillaByIdAsync(villaId));
    } catch (err) {
      toast.error(err || t('villas.details.removeFailed', 'Failed to remove resident'));
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Active':
        return 'lightSuccess';
      case 'Pending':
        return 'lightWarning';
      default:
        return 'lightError';
    }
  };

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default max-h-[90vh] overflow-y-auto">
        {selectedVillaLoading || !selectedVilla ? (
          <div className="text-center py-12 flex flex-col items-center justify-center gap-2">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent" />
            <div className="text-gray-500 dark:text-gray-400 text-sm">{t('villas.details.loading', 'Loading unit details...')}</div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {t('villas.details.titlePattern', { number: selectedVilla.villa.unitNumber, defaultValue: `${selectedVilla.villa.unitNumber} Details` })}
              </DialogTitle>
            </DialogHeader>

            <div className="py-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 pb-4 border-b border-stroke dark:border-strokedark">
                <div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase">{t('villas.details.blockOrBuilding', 'BLOCK/BUILDING')}</div>
                  <div className="font-bold text-sm text-black dark:text-white mt-1">{selectedVilla.villa.blockOrBuilding || '—'}</div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase">{t('villas.details.type', 'TYPE')}</div>
                  <div className="font-bold text-sm text-black dark:text-white mt-1">{t(`villas.types.${selectedVilla.villa.type}`, selectedVilla.villa.type)}</div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase mb-1">{t('villas.details.status', 'OCCUPANCY STATUS')}</div>
                  <Badge variant={selectedVilla.villa.status === 'Vacant' ? 'outlineSecondary' : selectedVilla.villa.status === 'Occupied' ? 'lightSuccess' : 'lightInfo'}>
                    {t(`villas.statusTypes.${selectedVilla.villa.status}`, selectedVilla.villa.status)}
                  </Badge>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase">{t('villas.details.floorArea', 'FLOOR AREA')}</div>
                  <div className="font-bold text-sm text-black dark:text-white mt-1">
                    {selectedVilla.villa.floorAreaSqFt ? `${selectedVilla.villa.floorAreaSqFt} Sq Ft` : '—'}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Residents Directory */}
                <div className="border-r-0 md:border-r border-stroke dark:border-strokedark pr-0 md:pr-6">
                  <h5 className="font-bold text-sm text-primary mb-3">
                    {t('villas.details.directory', 'Residents Directory')}
                  </h5>
                  
                  {selectedVilla.residents.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-xs bg-gray-50 dark:bg-meta-4/20 rounded">
                      {t('villas.details.noResidents', 'No residents registered to this unit yet.')}
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {selectedVilla.residents.map((res) => {
                        const isEditing = editingUserId === res.id;
                        const isPrimary = selectedVilla.villa.primaryResidentId && 
                          (String(selectedVilla.villa.primaryResidentId) === String(res.id) || 
                           String(selectedVilla.villa.primaryResidentId._id) === String(res.id));

                        return (
                          <div key={res.id} className="flex flex-col p-3 border border-stroke dark:border-strokedark rounded-lg bg-white dark:bg-boxdark space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
                                  {res.name ? res.name.charAt(0).toUpperCase() : (res.email ? res.email.charAt(0).toUpperCase() : 'U')}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-xs text-black dark:text-white truncate flex items-center gap-1.5">
                                    {res.name || res.email?.split('@')[0]}
                                    {isPrimary && (
                                      <Badge variant="lightPrimary" className="text-[10px] px-1 py-0 rounded">
                                        {t('villas.details.primaryBadge', 'Primary')}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-gray-400 dark:text-gray-500 text-[10px] truncate mt-0.5">
                                    {res.email}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <Badge variant={getStatusBadgeVariant(res.status)} className="text-[10px] px-1 py-0 rounded">
                                  {res.status}
                                </Badge>
                                <Badge variant="lightInfo" className="text-[10px] px-1 py-0 rounded">
                                  {t(`villas.details.roles.${res.residentType}`, res.residentType)}
                                </Badge>
                              </div>
                            </div>

                            {/* Residency Type Editor / Actions Panel */}
                            <div className="mt-2 border-t border-stroke dark:border-strokedark pt-2">
                              {isEditing ? (
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={editResidencyType}
                                    onChange={(e) => setEditResidencyType(e.target.value)}
                                    className="rounded border border-stroke bg-transparent py-1 px-2 text-xs outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white w-full"
                                  >
                                    <option value="" disabled className="bg-white dark:bg-boxdark">Choose...</option>
                                    {tenantRoles.map((type) => (
                                      <option key={type} value={type} className="bg-white dark:bg-boxdark">
                                        {type}
                                      </option>
                                    ))}
                                  </select>
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveResidencyType(res.id)}
                                    className="h-7 text-[10px] font-semibold px-2"
                                  >
                                    {t('villas.details.save', 'Save')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingUserId(null)}
                                    className="h-7 text-[10px] font-semibold px-2 border-stroke dark:border-strokedark"
                                  >
                                    {t('villas.details.cancel', 'Cancel')}
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500">
                                  <button
                                    type="button"
                                    className="hover:text-primary transition-colors text-primary/80"
                                    onClick={() => startEditResidencyType(res)}
                                  >
                                    {t('villas.details.editType', 'Edit Type')}
                                  </button>
                                  <span className="text-gray-300">|</span>
                                  {!isPrimary ? (
                                    <>
                                      <button
                                        type="button"
                                        className="hover:text-primary transition-colors text-primary"
                                        onClick={() => handleSetPrimaryResident(res.id)}
                                      >
                                        {t('villas.details.setPrimary', 'Set Primary')}
                                      </button>
                                      <span className="text-gray-300">|</span>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        className="hover:text-warning transition-colors text-warning"
                                        onClick={() => handleSetPrimaryResident(null)}
                                      >
                                        {t('villas.details.unsetPrimary', 'Unset Primary')}
                                      </button>
                                      <span className="text-gray-300">|</span>
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    className="hover:text-red-500 transition-colors text-red-500/80"
                                    onClick={() => handleRemoveResident(res.id)}
                                  >
                                    {t('villas.details.remove', 'Remove')}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Column: Tabbed Assignment Controls */}
                <div className="pl-0 md:pl-6 space-y-4">
                  {/* Custom Tab selectors */}
                  <div className="flex border-b border-stroke dark:border-strokedark">
                    <button
                      type="button"
                      onClick={() => setActiveTab(1)}
                      className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
                        activeTab === 1
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {t('villas.details.tabs.assignExisting', 'Assign Existing')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab(2)}
                      className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
                        activeTab === 2
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {t('villas.details.tabs.inviteEmail', 'Invite Resident')}
                    </button>
                  </div>

                  {/* Tab Content 1: Assign Existing Workspace User */}
                  {activeTab === 1 && (
                    <div className="space-y-4">
                      {assignError && (
                        <Alert variant="destructive" className="py-2">
                          <AlertDescription>{assignError}</AlertDescription>
                        </Alert>
                      )}
                      <form onSubmit={handleAssignExistingSubmit} className="space-y-3">
                        <div>
                          <Label htmlFor="assign-user-select" className="text-xs font-semibold">
                            {t('villas.details.selectUser', 'Select User')}
                          </Label>
                          <select
                            id="assign-user-select"
                            value={assignUserId}
                            onChange={(e) => setAssignUserId(e.target.value)}
                            required
                            className="mt-1.5 w-full rounded border border-stroke bg-transparent py-2 px-3 text-xs outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
                          >
                            <option value="" className="bg-white dark:bg-boxdark">{t('villas.details.chooseUser', 'Choose a user...')}</option>
                            {workspaceUsers
                              .filter((u) => !selectedVilla.residents.some((r) => r.id === u.id))
                              .map((u) => (
                                <option key={u.id} value={u.id} className="bg-white dark:bg-boxdark">
                                  {u.name || u.email} ({u.email})
                                </option>
                              ))}
                          </select>
                        </div>
                        
                        <div>
                          <Label htmlFor="assign-residency-type" className="text-xs font-semibold">
                            {t('villas.details.residencyType', 'Residency Type')}
                          </Label>
                          <select
                            id="assign-residency-type"
                            value={residencyType}
                            onChange={(e) => setResidencyType(e.target.value)}
                            required
                            className="mt-1.5 w-full rounded border border-stroke bg-transparent py-2 px-3 text-xs outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
                          >
                            <option value="" disabled className="bg-white dark:bg-boxdark">{t('villas.details.chooseType', 'Choose...')}</option>
                            {tenantRoles.map((type) => (
                              <option key={type} value={type} className="bg-white dark:bg-boxdark">
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="flex items-center gap-2 pt-1">
                          <Checkbox
                            id="assign-primary-check"
                            checked={isPrimaryResident}
                            onCheckedChange={(checked) => setIsPrimaryResident(!!checked)}
                            className="checkbox"
                          />
                          <Label htmlFor="assign-primary-check" className="text-xs font-semibold text-black dark:text-white cursor-pointer">
                            {t('villas.details.markPrimary', 'Designate as Primary Resident')}
                          </Label>
                        </div>
                        
                        <Button
                          type="submit"
                          variant="default"
                          size="sm"
                          disabled={assigning || !assignUserId}
                          className="w-full text-xs font-semibold px-4 py-2.5 mt-2"
                        >
                          {assigning ? t('villas.details.assigning', 'Assigning...') : t('villas.details.assignUserBtn', 'Assign User')}
                        </Button>
                      </form>
                    </div>
                  )}

                  {/* Tab Content 2: Invite Resident via Email */}
                  {activeTab === 2 && (
                    <div className="space-y-4">
                      {inviteError && (
                        <Alert variant="destructive" className="py-2">
                          <AlertDescription>{inviteError}</AlertDescription>
                        </Alert>
                      )}
                      <form onSubmit={handleInviteSubmit} className="space-y-3">
                        <div>
                          <Label htmlFor="invite-email" className="text-xs font-semibold">
                            {t('villas.details.emailLabel', 'Email Address')}
                          </Label>
                          <Input
                            id="invite-email"
                            type="email"
                            placeholder="resident@example.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            required
                            className="mt-1.5 w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="invite-resident-type" className="text-xs font-semibold">
                            {t('villas.details.typeLabel', 'Residency Type')}
                          </Label>
                          <select
                            id="invite-resident-type"
                            value={inviteResidencyType}
                            onChange={(e) => setInviteResidencyType(e.target.value)}
                            required
                            className="mt-1.5 w-full rounded border border-stroke bg-transparent py-2 px-3 text-xs outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
                          >
                            <option value="" disabled className="bg-white dark:bg-boxdark">{t('villas.details.chooseType', 'Choose...')}</option>
                            {tenantRoles.map((type) => (
                              <option key={type} value={type} className="bg-white dark:bg-boxdark">
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <Button
                          type="submit"
                          variant="default"
                          size="sm"
                          disabled={inviting || !inviteEmail.trim()}
                          className="w-full text-xs font-semibold px-4 py-2.5 mt-2"
                        >
                          {inviting ? t('villas.details.sending', 'Sending Invite...') : t('villas.details.sendInvite', 'Send Onboarding Invite')}
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-stroke dark:border-strokedark pt-4 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white hover:bg-gray-50"
              >
                {t('villas.details.close', 'Close')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VillaDetailsModal;
