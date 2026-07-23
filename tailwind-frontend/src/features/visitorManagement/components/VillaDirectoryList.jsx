import React, { useState } from 'react';
import { Phone, PhoneCall, PhoneOff, Search, Building } from 'lucide-react';
import { Input } from 'src/components/ui/input';
import { Button } from 'src/components/ui/button';
import toast from 'react-hot-toast';

export const VillaDirectoryList = ({ villas }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCall, setActiveCall] = useState(null); // stores villa object when calling

  const filteredVillas = villas.filter(v => 
    v.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.resident.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleIntercomCall = (villa) => {
    setActiveCall(villa);
    toast.success(`Dialing intercom to ${villa.number} (${villa.resident})...`);
    
    // Auto hangup after 6 seconds to simulate call ending
    setTimeout(() => {
      setActiveCall(null);
    }, 6000);
  };

  return (
    <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h3 className="text-base font-bold flex items-center gap-2 text-black dark:text-white">
          <Building className="h-4.5 w-4.5 text-primary shrink-0" />
          <span>Villa & Host Intercom Directory</span>
        </h3>
        
        <div className="relative w-full sm:max-w-xs">
          <Input 
            type="text" 
            placeholder="Search by Villa or Resident..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs bg-white dark:bg-meta-4 border-stroke dark:border-strokedark text-black dark:text-white pr-8 py-1.5"
          />
          <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVillas.map(villa => (
          <div key={villa.id} className="flex justify-between items-center p-4 border border-stroke dark:border-strokedark rounded-xl bg-slate-50 dark:bg-meta-4/15 hover:shadow-md transition-all duration-200">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-black dark:text-white">{villa.number}</span>
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                  villa.status === 'Occupied'
                    ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-meta-4 dark:text-gray-400'
                }`}>
                  {villa.status}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 truncate">
                Resident: {villa.resident}
              </div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                <Phone className="h-3 w-3" /> {villa.phone}
              </div>
            </div>

            <button 
              disabled={villa.status !== 'Occupied'}
              onClick={() => handleIntercomCall(villa)}
              className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 border-0 transition-transform ${
                villa.status === 'Occupied'
                  ? 'bg-green-500 hover:scale-105 text-white'
                  : 'bg-gray-100 text-gray-300 dark:bg-meta-4 dark:text-gray-700 cursor-not-allowed'
              }`}
              title="Call resident via intercom"
            >
              <PhoneCall className="h-4.5 w-4.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Simulated Intercom Call Modal/Overlay */}
      {activeCall && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 flex items-center justify-center z-[9999] backdrop-blur-sm">
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-8 w-80 text-center text-white shadow-2xl flex flex-col items-center">
            <div className="text-gray-400 text-xs font-semibold tracking-wider uppercase mb-2">
              Gate Intercom Outgoing Call
            </div>
            <h4 className="text-xl font-bold text-white mb-1">{activeCall.number}</h4>
            <p className="text-gray-300 text-xs mb-8">{activeCall.resident}</p>
            
            {/* Pulsing Intercom Phone Icon */}
            <div className="intercom-avatar-pulse w-20 h-20 rounded-full bg-green-500 flex items-center justify-center text-white mb-8">
              <PhoneCall className="h-8 w-8 animate-bounce" />
            </div>

            <Button 
              variant="default"
              onClick={() => setActiveCall(null)}
              className="w-full text-xs font-bold py-2.5 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 border-0"
            >
              <PhoneOff className="h-4 w-4" />
              <span>Hang Up</span>
            </Button>
          </div>
        </div>
      )}

    </div>
  );
};

export default VillaDirectoryList;
