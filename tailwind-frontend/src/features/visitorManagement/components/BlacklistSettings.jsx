import React, { useState } from 'react';
import { Label } from 'src/components/ui/label';
import { Input } from 'src/components/ui/input';
import { Button } from 'src/components/ui/button';
import { Textarea } from 'src/components/ui/textarea';
import { Badge } from 'src/components/ui/badge';
import {
  UserMinus,
  Database,
  Trash2,
  Phone,
  Car,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

export const BlacklistSettings = ({ blacklist, setBlacklist }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [plate, setPlate] = useState('');
  const [reason, setReason] = useState('');

  const handleAddBlacklist = (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Target name is required to create a blacklist entry.');
      return;
    }
    if (!reason.trim()) {
      toast.error('Detailed reason is required to ban a profile.');
      return;
    }

    const newRecord = {
      id: `B-${Math.floor(100 + Math.random() * 900)}`,
      name,
      phone: phone.trim() || '—',
      plate: plate.trim() || '—',
      reason,
      dateAdded: new Date().toLocaleDateString()
    };

    setBlacklist([newRecord, ...blacklist]);
    toast.success('Banned profile registered successfully!');

    // Reset Form
    setName('');
    setPhone('');
    setPlate('');
    setReason('');
  };

  const handleRemoveBlacklist = (id) => {
    setBlacklist(blacklist.filter(item => (item.id || item._id) !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
      
      {/* Left panel: Block Profile Form */}
      <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <h3 className="text-base font-bold flex items-center gap-2 text-black dark:text-white border-b border-stroke dark:border-strokedark pb-3 mb-4">
          <UserMinus className="h-4.5 w-4.5 text-red-500 shrink-0" />
          <span>Add Banned Profile</span>
        </h3>

        <form onSubmit={handleAddBlacklist} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="blacklist-name" className="text-xs font-semibold">Full Name *</Label>
            <Input 
              id="blacklist-name"
              type="text" 
              placeholder="e.g. Robert Vance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="blacklist-phone" className="text-xs font-semibold">Phone Number (Optional)</Label>
            <Input 
              id="blacklist-phone"
              type="text" 
              placeholder="e.g. +971 50 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="blacklist-plate" className="text-xs font-semibold">Vehicle Plate (Optional)</Label>
            <Input 
              id="blacklist-plate"
              type="text" 
              placeholder="e.g. DXB-88190"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="blacklist-reason" className="text-xs font-semibold">Detailed Reason for Ban *</Label>
            <Textarea 
              id="blacklist-reason"
              rows={3}
              placeholder="Describe why this visitor or vehicle is blacklisted..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white resize-none"
              required
            />
          </div>

          <Button 
            type="submit" 
            variant="default" 
            size="sm" 
            className="w-full text-xs font-bold py-2.5 bg-red-600 hover:bg-red-700 text-white mt-3"
          >
            Confirm & Block Profile
          </Button>
        </form>
      </div>

      {/* Right panel: Active database log */}
      <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <h3 className="text-base font-bold flex items-center gap-2 text-black dark:text-white border-b border-stroke dark:border-strokedark pb-3 mb-4">
          <Database className="h-4.5 w-4.5 text-gray-400 shrink-0" />
          <span>Active Blacklist Database ({blacklist.length})</span>
        </h3>

        {blacklist.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[220px] text-gray-400 dark:text-gray-500 gap-1.5 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mb-1" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Blacklist is empty</span>
            <span className="text-2xs text-gray-400">No profiles or vehicles are currently banned.</span>
          </div>
        ) : (
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {blacklist.map(record => {
              const recordId = record.id || record._id;
              const recordDate = record.dateAdded || (record.createdAt ? new Date(record.createdAt).toLocaleDateString() : '—');

              return (
                <div key={recordId} className="flex justify-between items-start gap-4 p-4 border border-stroke dark:border-strokedark rounded-lg bg-red-50/5 hover:bg-red-50/10 dark:hover:bg-red-950/5 transition-colors">
                  <div className="min-w-0 flex-grow">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-black dark:text-white truncate">{record.name}</h4>
                      <span className="text-[10px] font-semibold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 px-1.5 py-0.5 rounded">
                        {recordId}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                      <strong className="text-black dark:text-white">Reason:</strong> {record.reason}
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-3 flex items-center gap-x-3 gap-y-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1"><Car className="h-3.5 w-3.5" /> Plate: {record.plate || '—'}</span>
                      <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Phone: {record.phone || '—'}</span>
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Banned on: {recordDate}</span>
                    </div>
                  </div>

                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveBlacklist(recordId)}
                    className="h-8 text-[10px] font-bold border-stroke dark:border-strokedark text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-meta-4 flex items-center gap-1"
                    title="Remove rule / Unban"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Unban
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default BlacklistSettings;
