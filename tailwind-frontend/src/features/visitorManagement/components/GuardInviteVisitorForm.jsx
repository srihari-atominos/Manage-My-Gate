import React, { useState, useEffect } from 'react';
import { Label } from 'src/components/ui/label';
import { Input } from 'src/components/ui/input';
import { Button } from 'src/components/ui/button';
import { UserPlus, Home, ShieldAlert, Send, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export const GuardInviteVisitorForm = ({ 
  dbVillas = [], 
  dbUsers = [], 
  loadingDirectory = false, 
  onInitiateWalkIn, 
  onCheckInSuccess 
}) => {
  // Visitor Details
  const [visitorName, setVisitorName] = useState('');
  const [walkInType, setWalkInType] = useState('id_proof'); // 'id_proof' | 'vehicle'
  const [idProofType, setIdProofType] = useState('Aadhaar Card');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');

  // Host Selection States
  const [inviteMethod, setInviteMethod] = useState('villa'); // 'villa' | 'admin'

  // Selected Host Targets
  const [selectedVillaId, setSelectedVillaId] = useState('');
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [adminSearch, setAdminSearch] = useState('');

  // Derived filtered lists
  const residentsOfSelectedVilla = dbUsers.filter(u => u.villaId === selectedVillaId);
  
  const communityAdmins = dbUsers.filter(u => 
    u.role === 'Community Admin' || 
    u.role?.toLowerCase().includes('admin')
  );

  const filteredAdmins = communityAdmins.filter(admin => 
    admin.name?.toLowerCase().includes(adminSearch.toLowerCase()) ||
    admin.email?.toLowerCase().includes(adminSearch.toLowerCase())
  );

  // Auto select default resident or admin
  useEffect(() => {
    if (residentsOfSelectedVilla.length > 0) {
      setSelectedResidentId(residentsOfSelectedVilla[0].id);
    } else {
      setSelectedResidentId('');
    }
  }, [selectedVillaId, dbUsers]);

  useEffect(() => {
    if (communityAdmins.length > 0) {
      setSelectedAdminId(communityAdmins[0].id);
    } else {
      setSelectedAdminId('');
    }
  }, [inviteMethod, dbUsers]);

  const validateIdProof = (type, number) => {
    if (!number?.trim()) {
      return 'ID Proof Reference / Number is required.';
    }
    const val = number.trim();
    switch (type) {
      case 'Aadhaar Card': {
        const aadhaarRegex = /^\d{4}\s?\d{4}\s?\d{4}$/;
        if (!aadhaarRegex.test(val)) {
          return 'Invalid Aadhaar Card format. Expected 12 digits (e.g., 1234 5678 9012).';
        }
        break;
      }
      case 'PAN Card': {
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
        if (!panRegex.test(val)) {
          return 'Invalid PAN Card format. Expected 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F).';
        }
        break;
      }
      case 'Driving License': {
        const cleaned = val.replace(/[\s-]/g, '');
        const dlRegex = /^[A-Z]{2}\d{13}$/i;
        if (!dlRegex.test(cleaned)) {
          return 'Invalid Driving License format. Expected standard Indian DL format with 15 characters (e.g., MH1220181234567).';
        }
        break;
      }
      case 'Voter ID': {
        const voterRegex = /^[A-Z]{3}\d{7}$/i;
        if (!voterRegex.test(val)) {
          return 'Invalid Voter ID format. Expected 3 letters followed by 7 digits (e.g., XYZ1234567).';
        }
        break;
      }
      case 'Indian Passport': {
        const passportRegex = /^[A-PR-WYa-pr-wy][1-9]\d\s?\d{4}[1-9]$/;
        if (!passportRegex.test(val)) {
          return 'Invalid Indian Passport format.';
        }
        break;
      }
      default:
        break;
    }
    return null;
  };

  const validateVehiclePlate = (plate) => {
    if (!plate?.trim()) {
      return 'Vehicle Plate Number is required.';
    }
    const cleanedPlateForRegex = plate.replace(/[\s-]/g, '');
    const licensePlateRegex = /^([A-Z]{2}[ -]?\d{1,2}[ -]?[A-Z]{1,3}[ -]?\d{4}|\d{2}[ -]?BH[ -]?\d{4}[ -]?[A-Z]{1,2})$/i;
    if (!licensePlateRegex.test(cleanedPlateForRegex)) {
      return 'Invalid vehicle number plate format. Must be a valid Indian state plate (e.g. MH-12-AB-1234) or BH series (e.g. 22-BH-1234-AB).';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!visitorName.trim()) {
      toast.error('Visitor Name is required.');
      return;
    }

    if (walkInType === 'id_proof') {
      const errorMsg = validateIdProof(idProofType, idProofNumber);
      if (errorMsg) {
        toast.error(errorMsg);
        return;
      }
    } else {
      const errorMsg = validateVehiclePlate(vehicleNumber);
      if (errorMsg) {
        toast.error(errorMsg);
        return;
      }
    }

    const targetHostId = inviteMethod === 'villa' ? selectedResidentId : selectedAdminId;
    if (!targetHostId) {
      toast.error('Please select a resident or administrator to approve the entry.');
      return;
    }

    const payload = {
      residentId: targetHostId,
      snapshot: {
        visitorName: visitorName.trim(),
        idProofNumber: walkInType === 'id_proof' ? `${idProofType}: ${idProofNumber.trim()}` : undefined,
        vehicleNumber: walkInType === 'vehicle' ? vehicleNumber.trim().toUpperCase() : undefined
      }
    };

    try {
      const res = await onInitiateWalkIn(payload);
      if (res && res.success) {
        setVisitorName('');
        setIdProofType('Aadhaar Card');
        setIdProofNumber('');
        setVehicleNumber('');
        setSelectedVillaId('');
        setAdminSearch('');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to initiate walk-in request.');
    }
  };

  return (
    <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
      <h3 className="text-base font-bold flex items-center gap-2 text-black dark:text-white border-b border-stroke dark:border-strokedark pb-3 mb-6">
        <UserPlus className="h-4.5 w-4.5 text-primary shrink-0" />
        <span>Invite Walk-in Visitor</span>
      </h3>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Visitor Info */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="visitor-name-input" className="text-xs font-semibold">
              Visitor Full Name *
            </Label>
            <Input
              id="visitor-name-input"
              type="text"
              placeholder="e.g. David Smith"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              required
              className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
            />
          </div>

          {/* Segmented Verification Method Switch */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Verification Method
            </Label>
            <div className="flex gap-1 bg-slate-100 dark:bg-meta-4 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setWalkInType('id_proof');
                  setVehicleNumber('');
                }}
                className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                  walkInType === 'id_proof'
                    ? 'bg-white dark:bg-boxdark text-primary shadow-sm'
                    : 'text-gray-500 hover:text-black dark:hover:text-white'
                }`}
              >
                By ID Proof
              </button>
              <button
                type="button"
                onClick={() => {
                  setWalkInType('vehicle');
                  setIdProofNumber('');
                }}
                className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                  walkInType === 'vehicle'
                    ? 'bg-white dark:bg-boxdark text-primary shadow-sm'
                    : 'text-gray-500 hover:text-black dark:hover:text-white'
                }`}
              >
                By Vehicle Plate
              </button>
            </div>
          </div>

          <div className="min-h-[170px] space-y-4 pt-1">
            {walkInType === 'id_proof' ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="id-proof-type-select" className="text-xs font-semibold">
                    Select ID Proof Type *
                  </Label>
                  <select
                    id="id-proof-type-select"
                    value={idProofType}
                    onChange={(e) => {
                      setIdProofType(e.target.value);
                      setIdProofNumber('');
                    }}
                    className="w-full rounded border border-stroke bg-transparent py-2 px-3 text-xs outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
                  >
                    <option value="Aadhaar Card" className="bg-white dark:bg-boxdark">Aadhaar Card</option>
                    <option value="PAN Card" className="bg-white dark:bg-boxdark">PAN Card</option>
                    <option value="Driving License" className="bg-white dark:bg-boxdark">Driving License</option>
                    <option value="Voter ID" className="bg-white dark:bg-boxdark">Voter ID</option>
                    <option value="Indian Passport" className="bg-white dark:bg-boxdark">Indian Passport</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="visitor-id-input" className="text-xs font-semibold">
                    {idProofType} Reference Number *
                  </Label>
                  <Input
                    id="visitor-id-input"
                    type="text"
                    placeholder={`Enter valid ${idProofType} number`}
                    value={idProofNumber}
                    onChange={(e) => setIdProofNumber(e.target.value)}
                    required
                    className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="visitor-plate-input" className="text-xs font-semibold">
                  Vehicle Plate Number *
                </Label>
                <Input
                  id="visitor-plate-input"
                  type="text"
                  placeholder="e.g. MH-12-AB-1234 or 22-BH-1234-AB"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  required
                  className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white uppercase"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Host Selection */}
        <div className="border-t md:border-t-0 md:border-l border-stroke dark:border-strokedark pt-6 md:pt-0 md:pl-6 space-y-4">
          <Label className="text-xs font-semibold">
            Choose Approval Target
          </Label>

          {/* Toggle buttons */}
          <div className="flex gap-2.5">
            <Button
              type="button"
              variant={inviteMethod === 'villa' ? 'default' : 'outline'}
              onClick={() => setInviteMethod('villa')}
              className="flex-1 text-xs font-bold py-2 border-stroke dark:border-strokedark text-black dark:text-white flex items-center justify-center gap-1.5"
            >
              <Home className="h-4 w-4" />
              Invite by Villa
            </Button>
            <Button
              type="button"
              variant={inviteMethod === 'admin' ? 'default' : 'outline'}
              onClick={() => setInviteMethod('admin')}
              className="flex-1 text-xs font-bold py-2 border-stroke dark:border-strokedark text-black dark:text-white flex items-center justify-center gap-1.5"
            >
              <ShieldAlert className="h-4 w-4" />
              Invite for Admin
            </Button>
          </div>

          {inviteMethod === 'villa' ? (
            <div className="space-y-4">
              {/* Select Villa */}
              <div className="space-y-1.5">
                <Label htmlFor="villa-select-box" className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Select Destination Villa / Unit
                </Label>
                <select
                  id="villa-select-box"
                  value={selectedVillaId}
                  onChange={(e) => setSelectedVillaId(e.target.value)}
                  disabled={loadingDirectory}
                  className="w-full rounded border border-stroke bg-transparent py-2 px-3 text-xs outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
                >
                  <option value="" className="bg-white dark:bg-boxdark">-- Choose a Villa --</option>
                  {dbVillas.map(v => (
                    <option key={v._id} value={v._id} className="bg-white dark:bg-boxdark">
                      {v.villaNumber} {v.block ? `(${v.block})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Resident */}
              {selectedVillaId && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Select Resident to Notify
                  </Label>
                  {residentsOfSelectedVilla.length === 0 ? (
                    <div className="text-xs text-red-500 p-2.5 bg-red-50/10 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-md">
                      No registered occupants found in this Villa.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-1">
                      {residentsOfSelectedVilla.map(r => (
                        <label 
                          key={r.id}
                          className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition-all ${
                            selectedResidentId === r.id 
                              ? 'bg-primary/10 border-primary text-primary' 
                              : 'border-stroke dark:border-strokedark hover:bg-slate-50 dark:hover:bg-meta-4/20 text-black dark:text-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="residentSelect"
                            value={r.id}
                            checked={selectedResidentId === r.id}
                            onChange={() => setSelectedResidentId(r.id)}
                            className="radio shrink-0 text-primary focus:ring-primary h-4 w-4"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-xs truncate">{r.name}</div>
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{r.residentType}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Admin Search */}
              <div className="space-y-1.5">
                <Label htmlFor="admin-search-input" className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Search Community Admin Role
                </Label>
                <div className="relative">
                  <Input
                    id="admin-search-input"
                    type="text"
                    placeholder="Type name/email to search..."
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white pr-8"
                  />
                  <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Admins List selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Select Admin to Approve Request
                </Label>
                {filteredAdmins.length === 0 ? (
                  <div className="text-xs text-gray-400 dark:text-gray-500 p-4 border border-dashed border-stroke dark:border-strokedark text-center rounded-md">
                    No administrators found.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-1">
                    {filteredAdmins.map(admin => (
                      <label 
                        key={admin.id}
                        className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition-all ${
                          selectedAdminId === admin.id 
                            ? 'bg-primary/10 border-primary text-primary' 
                            : 'border-stroke dark:border-strokedark hover:bg-slate-50 dark:hover:bg-meta-4/20 text-black dark:text-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="adminSelect"
                          value={admin.id}
                          checked={selectedAdminId === admin.id}
                          onChange={() => setSelectedAdminId(admin.id)}
                          className="radio shrink-0 text-primary focus:ring-primary h-4 w-4"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate">{admin.name}</div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">{admin.email}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Submit */}
        <div className="col-span-1 md:col-span-2 flex justify-end pt-4 border-t border-stroke dark:border-strokedark">
          <Button
            type="submit"
            variant="default"
            disabled={!visitorName.trim() || (inviteMethod === 'villa' ? !selectedResidentId : !selectedAdminId)}
            className="text-xs font-bold py-2.5 px-6 flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Send Approval Request
          </Button>
        </div>
      </form>
    </div>
  );
};

export default GuardInviteVisitorForm;
