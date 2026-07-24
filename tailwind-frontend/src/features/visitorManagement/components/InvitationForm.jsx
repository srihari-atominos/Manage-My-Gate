import React, { useState } from 'react';
import { Label } from 'src/components/ui/label';
import { Input } from 'src/components/ui/input';
import { Button } from 'src/components/ui/button';
import { Checkbox } from 'src/components/ui/checkbox';
import { Send, Search, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const InvitationForm = ({ 
  inviteMethod, 
  guestPassType, 
  setGuestPassType, 
  cabPassType,
  setCabPassType,
  cabUsageType,
  setCabUsageType,
  servicePassType,
  setServicePassType,
  serviceUsageType,
  setServiceUsageType,
  formData, 
  handleInputChange, 
  handleCreatePass 
}) => {
  const { t } = useTranslation();
  const providers = ['Amazon Prime', 'FedEx Express', 'DHL Worldwide', 'Uber Cab', 'Noon eCommerce', 'Zomato Delivery', 'Talabat Delivery', 'Deliveroo', 'Careem Taxi'];
  const serviceTypes = ['Plumber', 'Electrician', 'Carpenter', 'AC Technician', 'Cleaning Staff', 'Maid', 'Gardener', 'Painter', 'Pest Control'];
  const [searchOpen, setSearchOpen] = useState(false);
  const [serviceSearchOpen, setServiceSearchOpen] = useState(false);

  const selectedDays = formData.selectedDays || [1, 2, 3, 4, 5];
  const serviceSelectedDays = formData.serviceSelectedDays || [1, 2, 3, 4, 5];

  return (
    <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
      <h3 className="text-base font-bold mb-6 flex items-center gap-2 text-black dark:text-white border-b border-stroke dark:border-strokedark pb-3">
        <Send className="h-4.5 w-4.5 text-primary shrink-0" />
        <span>
          {inviteMethod === 'guest' && 'Personal Guest Pass'}
          {inviteMethod === 'group' && 'Group / Event Pass'}
          {inviteMethod === 'cab_delivery' && 'Cab & Delivery pre-entry'}
          {inviteMethod === 'service' && 'Maintenance Service Entry'}
        </span>
      </h3>

      {(searchOpen || serviceSearchOpen) && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => { setSearchOpen(false); setServiceSearchOpen(false); }} 
        />
      )}

      <form onSubmit={handleCreatePass} className="space-y-4">
        {inviteMethod === 'guest' && (
          <>
            {/* Toggle box / Segmented Switch for Pass Type */}
            <div className="flex gap-1 bg-slate-100 dark:bg-meta-4 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setGuestPassType('default')}
                className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                  guestPassType === 'default'
                    ? 'bg-white dark:bg-boxdark text-primary shadow-sm'
                    : 'text-gray-500 hover:text-black dark:hover:text-white'
                }`}
              >
                Default Pass
              </button>
              <button
                type="button"
                onClick={() => setGuestPassType('id_proof')}
                className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                  guestPassType === 'id_proof'
                    ? 'bg-white dark:bg-boxdark text-primary shadow-sm'
                    : 'text-gray-500 hover:text-black dark:hover:text-white'
                }`}
              >
                By ID Proof
              </button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="guestName" className="text-xs font-semibold">Guest Name</Label>
              <Input 
                id="guestName"
                type="text" 
                placeholder="e.g. John Doe"
                value={formData.guestName || ''}
                onChange={(e) => handleInputChange('guestName', e.target.value)}
                className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
              />
            </div>
            
            {guestPassType === 'id_proof' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="idProofType" className="text-xs font-semibold">Select ID Proof Type</Label>
                  <select 
                    id="idProofType"
                    value={formData.idProofType}
                    onChange={(e) => handleInputChange('idProofType', e.target.value)}
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
                  <Label htmlFor="idProof" className="text-xs font-semibold">ID Proof Reference / Number</Label>
                  <Input 
                    id="idProof"
                    type="text" 
                    placeholder="e.g. ID Code / Serial"
                    value={formData.idProof || ''}
                    onChange={(e) => handleInputChange('idProof', e.target.value)}
                    className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="text-xs font-semibold">Start Date</Label>
                <Input 
                  id="startDate"
                  type="date" 
                  value={formData.startDate || ''}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-xs font-semibold">End Date</Label>
                <Input 
                  id="endDate"
                  type="date" 
                  value={formData.endDate || ''}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="usageLimit" className="text-xs font-semibold">Usage Limit (Max entries)</Label>
              <Input 
                id="usageLimit"
                type="number" 
                min="1"
                value={formData.usageLimit || ''}
                onChange={(e) => handleInputChange('usageLimit', Number(e.target.value))}
                className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
              />
            </div>
          </>
        )}

        {inviteMethod === 'group' && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="eventName" className="text-xs font-semibold">Event Name / Occasion</Label>
              <Input 
                id="eventName"
                type="text" 
                placeholder="e.g. Housewarming Party"
                value={formData.eventName || ''}
                onChange={(e) => handleInputChange('eventName', e.target.value)}
                className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="totalTokens" className="text-xs font-semibold">Total Expected Tokens</Label>
              <Input 
                id="totalTokens"
                type="number" 
                min="1"
                value={formData.totalTokens || ''}
                onChange={(e) => handleInputChange('totalTokens', Number(e.target.value))}
                className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="eventDate" className="text-xs font-semibold">Event Date</Label>
              <Input 
                id="eventDate"
                type="date" 
                value={formData.eventDate || ''}
                onChange={(e) => handleInputChange('eventDate', e.target.value)}
                className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="eventStartTime" className="text-xs font-semibold">Start Time</Label>
                <Input 
                  id="eventStartTime"
                  type="time" 
                  value={formData.eventStartTime || ''}
                  onChange={(e) => handleInputChange('eventStartTime', e.target.value)}
                  className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eventEndTime" className="text-xs font-semibold">End Time</Label>
                <Input 
                  id="eventEndTime"
                  type="time" 
                  value={formData.eventEndTime || ''}
                  onChange={(e) => handleInputChange('eventEndTime', e.target.value)}
                  className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
                />
              </div>
            </div>
          </>
        )}

        {inviteMethod === 'cab_delivery' && (
          <>
            {/* Toggle box for Usage Type */}
            <div className="flex gap-1 bg-slate-100 dark:bg-meta-4 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setCabUsageType('one_time')}
                className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                  cabUsageType === 'one_time'
                    ? 'bg-white dark:bg-boxdark text-primary shadow-sm'
                    : 'text-gray-500 hover:text-black dark:hover:text-white'
                }`}
              >
                One-time Pass
              </button>
              <button
                type="button"
                onClick={() => setCabUsageType('multi_use')}
                className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                  cabUsageType === 'multi_use'
                    ? 'bg-white dark:bg-boxdark text-primary shadow-sm'
                    : 'text-gray-500 hover:text-black dark:hover:text-white'
                }`}
              >
                Multi-use Pass
              </button>
            </div>

            {/* Cab / Taxi vs Delivery / Order Toggle */}
            <div className="flex gap-1 bg-slate-100 dark:bg-meta-4 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  handleInputChange('cabCategory', 'delivery');
                  handleInputChange('vehicleNumber', '');
                }}
                className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                  (formData.cabCategory || 'delivery') === 'delivery'
                    ? 'bg-white dark:bg-boxdark text-primary shadow-sm'
                    : 'text-gray-500 hover:text-black dark:hover:text-white'
                }`}
              >
                Delivery / Order
              </button>
              <button
                type="button"
                onClick={() => {
                  handleInputChange('cabCategory', 'cab');
                  handleInputChange('orderId', '');
                }}
                className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                  formData.cabCategory === 'cab'
                    ? 'bg-white dark:bg-boxdark text-primary shadow-sm'
                    : 'text-gray-500 hover:text-black dark:hover:text-white'
                }`}
              >
                Cab / Taxi
              </button>
            </div>

            {/* Search & Select Provider */}
            <div className="space-y-1.5 relative z-20">
              <Label htmlFor="companyName" className="text-xs font-semibold">Delivery Provider / Cab Brand</Label>
              <div className="relative">
                <Input 
                  id="companyName"
                  type="text" 
                  placeholder="Search & select provider..."
                  value={formData.companyName || ''}
                  onChange={(e) => {
                    handleInputChange('companyName', e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white pr-8"
                />
                <Search className="absolute right-2.5 top-2.5 h-4.5 w-4.5 text-gray-400" />
              </div>
              {searchOpen && (
                <div className="absolute top-[100%] left-0 right-0 bg-white dark:bg-boxdark border border-stroke dark:border-strokedark rounded-md shadow-default max-h-40 overflow-y-auto z-30 mt-1 divide-y divide-stroke dark:divide-strokedark">
                  {providers
                    .filter(p => !formData.companyName || p.toLowerCase().includes(formData.companyName.toLowerCase()))
                    .map(provider => (
                      <div 
                        key={provider}
                        onClick={() => {
                          handleInputChange('companyName', provider);
                          setSearchOpen(false);
                        }}
                        className="py-2.5 px-4 cursor-pointer text-xs text-black dark:text-white hover:bg-slate-50 dark:hover:bg-meta-4/20 transition-colors"
                      >
                        {provider}
                      </div>
                    ))
                  }
                </div>
              )}
            </div>

            {/* Conditional input fields */}
            {(formData.cabCategory || 'delivery') === 'delivery' ? (
              <div className="space-y-1.5">
                <Label htmlFor="orderId" className="text-xs font-semibold">Order Reference ID</Label>
                <Input 
                  id="orderId"
                  type="text" 
                  placeholder="e.g. AMZ-199-082"
                  value={formData.orderId || ''}
                  onChange={(e) => handleInputChange('orderId', e.target.value)}
                  className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="vehicleNumber" className="text-xs font-semibold">Taxi License Number</Label>
                <Input 
                  id="vehicleNumber"
                  type="text" 
                  placeholder="e.g. MH 12 AB 1234 or 22 BH 1234 AB"
                  value={formData.vehicleNumber || ''}
                  onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
                  className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white uppercase"
                />
              </div>
            )}

            {cabUsageType === 'one_time' ? (
              <div className="space-y-1.5">
                <Label htmlFor="timeWindow" className="text-xs font-semibold">Expected Time Window</Label>
                <select 
                  id="timeWindow"
                  value={formData.timeWindow}
                  onChange={(e) => handleInputChange('timeWindow', e.target.value)}
                  className="w-full rounded border border-stroke bg-transparent py-2 px-3 text-xs outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
                >
                  <option value="08:00 - 12:00" className="bg-white dark:bg-boxdark">Morning (08:00 - 12:00)</option>
                  <option value="12:00 - 16:00" className="bg-white dark:bg-boxdark">Afternoon (12:00 - 16:00)</option>
                  <option value="16:00 - 20:00" className="bg-white dark:bg-boxdark">Evening (16:00 - 20:00)</option>
                  <option value="20:00 - 23:59" className="bg-white dark:bg-boxdark">Night (20:00 - 23:59)</option>
                </select>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate" className="text-xs font-semibold">Start Date</Label>
                    <Input 
                      id="startDate"
                      type="date" 
                      value={formData.startDate || ''}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="endDate" className="text-xs font-semibold">End Date</Label>
                    <Input 
                      id="endDate"
                      type="date" 
                      value={formData.endDate || ''}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Active Days in Week</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { id: 1, name: 'Mon' },
                      { id: 2, name: 'Tue' },
                      { id: 3, name: 'Wed' },
                      { id: 4, name: 'Thu' },
                      { id: 5, name: 'Fri' },
                      { id: 6, name: 'Sat' },
                      { id: 0, name: 'Sun' }
                    ].map(day => {
                      const isDaySelected = selectedDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => {
                            const nextDays = isDaySelected
                              ? selectedDays.filter(d => d !== day.id)
                              : [...selectedDays, day.id];
                            handleInputChange('selectedDays', nextDays);
                          }}
                          className={`px-3 py-1.5 rounded-full text-2xs font-bold transition-all border ${
                            isDaySelected
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-white dark:bg-meta-4 border-stroke dark:border-strokedark text-gray-500 hover:text-black dark:hover:text-white'
                          }`}
                        >
                          {day.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="eventStartTime" className="text-xs font-semibold">Start Time</Label>
                    <Input 
                      id="eventStartTime"
                      type="time" 
                      value={formData.eventStartTime || ''}
                      onChange={(e) => handleInputChange('eventStartTime', e.target.value)}
                      className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="eventEndTime" className="text-xs font-semibold">End Time</Label>
                    <Input 
                      id="eventEndTime"
                      type="time" 
                      value={formData.eventEndTime || ''}
                      onChange={(e) => handleInputChange('eventEndTime', e.target.value)}
                      className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
                    />
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {inviteMethod === 'service' && (
          <>
            {/* Toggle box for Pass Type */}
            <div className="flex gap-1 bg-slate-100 dark:bg-meta-4 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setServicePassType('default')}
                className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                  servicePassType === 'default'
                    ? 'bg-white dark:bg-boxdark text-primary shadow-sm'
                    : 'text-gray-500 hover:text-black dark:hover:text-white'
                }`}
              >
                Default Pass
              </button>
              <button
                type="button"
                onClick={() => setServicePassType('id_proof')}
                className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                  servicePassType === 'id_proof'
                    ? 'bg-white dark:bg-boxdark text-primary shadow-sm'
                    : 'text-gray-500 hover:text-black dark:hover:text-white'
                }`}
              >
                By ID Proof
              </button>
            </div>

            {/* Toggle box for Usage Type */}
            <div className="flex gap-1 bg-slate-100 dark:bg-meta-4 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setServiceUsageType('one_time')}
                className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                  serviceUsageType === 'one_time'
                    ? 'bg-white dark:bg-boxdark text-primary shadow-sm'
                    : 'text-gray-500 hover:text-black dark:hover:text-white'
                }`}
              >
                One-time Pass
              </button>
              <button
                type="button"
                onClick={() => setServiceUsageType('multi_use')}
                className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                  serviceUsageType === 'multi_use'
                    ? 'bg-white dark:bg-boxdark text-primary shadow-sm'
                    : 'text-gray-500 hover:text-black dark:hover:text-white'
                }`}
              >
                Multi-use Pass
              </button>
            </div>

            {/* Search & Select Service Type */}
            <div className="space-y-1.5 relative z-20">
              <Label htmlFor="serviceType" className="text-xs font-semibold">Service Type</Label>
              <div className="relative">
                <Input 
                  id="serviceType"
                  type="text" 
                  placeholder="Search & select service type..."
                  value={formData.serviceType || ''}
                  onChange={(e) => {
                    handleInputChange('serviceType', e.target.value);
                    setServiceSearchOpen(true);
                  }}
                  onFocus={() => setServiceSearchOpen(true)}
                  className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white pr-8"
                />
                <Search className="absolute right-2.5 top-2.5 h-4.5 w-4.5 text-gray-400" />
              </div>
              {serviceSearchOpen && (
                <div className="absolute top-[100%] left-0 right-0 bg-white dark:bg-boxdark border border-stroke dark:border-strokedark rounded-md shadow-default max-h-40 overflow-y-auto z-30 mt-1 divide-y divide-stroke dark:divide-strokedark">
                  {serviceTypes
                    .filter(s => !formData.serviceType || s.toLowerCase().includes(formData.serviceType.toLowerCase()))
                    .map(service => (
                      <div 
                        key={service}
                        onClick={() => {
                          handleInputChange('serviceType', service);
                          setServiceSearchOpen(false);
                        }}
                        className="py-2.5 px-4 cursor-pointer text-xs text-black dark:text-white hover:bg-slate-50 dark:hover:bg-meta-4/20 transition-colors"
                      >
                        {service}
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="providerName" className="text-xs font-semibold">Staff Name / Agency Name</Label>
              <Input 
                id="providerName"
                type="text" 
                placeholder="e.g. Mike from Urban Company"
                value={formData.providerName || ''}
                onChange={(e) => handleInputChange('providerName', e.target.value)}
                className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
              />
            </div>

            {servicePassType === 'id_proof' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="idProofType" className="text-xs font-semibold">Select ID Proof Type</Label>
                  <select 
                    id="idProofType"
                    value={formData.idProofType}
                    onChange={(e) => handleInputChange('idProofType', e.target.value)}
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
                  <Label htmlFor="idProof" className="text-xs font-semibold">ID Proof Reference / Number</Label>
                  <Input 
                    id="idProof"
                    type="text" 
                    placeholder="e.g. ID Code / Serial"
                    value={formData.idProof || ''}
                    onChange={(e) => handleInputChange('idProof', e.target.value)}
                    className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
                  />
                </div>
              </>
            )}

            {serviceUsageType === 'multi_use' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate" className="text-xs font-semibold">Start Date</Label>
                    <Input 
                      id="startDate"
                      type="date" 
                      value={formData.startDate || ''}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="endDate" className="text-xs font-semibold">End Date</Label>
                    <Input 
                      id="endDate"
                      type="date" 
                      value={formData.endDate || ''}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Active Days in Week</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { id: 1, name: 'Mon' },
                      { id: 2, name: 'Tue' },
                      { id: 3, name: 'Wed' },
                      { id: 4, name: 'Thu' },
                      { id: 5, name: 'Fri' },
                      { id: 6, name: 'Sat' },
                      { id: 0, name: 'Sun' }
                    ].map(day => {
                      const isDaySelected = serviceSelectedDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => {
                            const nextDays = isDaySelected
                              ? serviceSelectedDays.filter(d => d !== day.id)
                              : [...serviceSelectedDays, day.id];
                            handleInputChange('serviceSelectedDays', nextDays);
                          }}
                          className={`px-3 py-1.5 rounded-full text-2xs font-bold transition-all border ${
                            isDaySelected
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-white dark:bg-meta-4 border-stroke dark:border-strokedark text-gray-500 hover:text-black dark:hover:text-white'
                          }`}
                        >
                          {day.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="eventStartTime" className="text-xs font-semibold">Start Time</Label>
                    <Input 
                      id="eventStartTime"
                      type="time" 
                      value={formData.eventStartTime || ''}
                      onChange={(e) => handleInputChange('eventStartTime', e.target.value)}
                      className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="eventEndTime" className="text-xs font-semibold">End Time</Label>
                    <Input 
                      id="eventEndTime"
                      type="time" 
                      value={formData.eventEndTime || ''}
                      onChange={(e) => handleInputChange('eventEndTime', e.target.value)}
                      className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center gap-2 pt-1.5">
              <Checkbox 
                id="intercomAlert"
                checked={formData.intercomAlert || false}
                onCheckedChange={(checked) => handleInputChange('intercomAlert', !!checked)}
                className="checkbox"
              />
              <Label htmlFor="intercomAlert" className="text-xs font-semibold text-black dark:text-white cursor-pointer select-none">
                Enable intercom call verification alert
              </Label>
            </div>
          </>
        )}

        <Button type="submit" variant="default" size="sm" className="w-full text-xs font-bold py-2.5 mt-6">
          Generate Invitation Code
        </Button>
      </form>
    </div>
  );
};

export default InvitationForm;
