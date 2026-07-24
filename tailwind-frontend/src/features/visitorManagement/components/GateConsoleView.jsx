import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Label } from 'src/components/ui/label';
import { Input } from 'src/components/ui/input';
import { Button } from 'src/components/ui/button';
import { QrCode, Search, Smartphone, ShieldCheck, Check, AlertCircle, RefreshCw } from 'lucide-react';

export const GateConsoleView = ({ passes, setPasses, onCheckInSuccess }) => {
  // QR Scan Scanner Simulator states
  const [scanCode, setScanCode] = useState('');
  const [scanResult, setScanResult] = useState(null); // 'success' or 'fail'
  const [matchedPass, setMatchedPass] = useState(null);

  // Fallback search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Ad-hoc Walk-in states
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinPlate, setWalkinPlate] = useState('');
  const [walkinVilla, setWalkinVilla] = useState('');
  const [walkinPurpose, setWalkinPurpose] = useState('');
  const [walkinStatus, setWalkinStatus] = useState('idle'); // 'idle' | 'sending' | 'approved' | 'denied'

  // Handle mock scan verification
  const handleVerifyScan = (e) => {
    e.preventDefault();
    if (!scanCode.trim()) {
      toast.error('Please enter a Pass Code or scan QR.');
      return;
    }

    const found = passes.find(p => p.id.toLowerCase() === scanCode.trim().toLowerCase());
    
    if (found) {
      if (found.status === 'ACTIVE' || found.status === 'Active' || found.status === 'PENDING' || found.status === 'Pending') {
        setScanResult('success');
        setMatchedPass(found);
        toast.success(`Access Granted for ${found.visitorName}!`);
      } else {
        setScanResult('fail');
        setMatchedPass(found);
        toast.error(`Access Denied: Pass is ${found.status}.`);
      }
    } else {
      setScanResult('fail');
      setMatchedPass(null);
      toast.error('Access Denied: Invalid or unregistered Pass Code.');
    }
  };

  const handleCheckInScanned = () => {
    if (matchedPass) {
      onCheckInSuccess({
        id: `L-${Math.floor(100 + Math.random() * 900)}`,
        visitorName: matchedPass.visitorName,
        type: matchedPass.method,
        villa: 'Villa 102', // Default destination
        resident: 'David Lee',
        checkIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        checkOut: '—',
        status: 'INSIDE',
        guard: 'Officer Ramesh'
      });
      // Update pass usage
      setPasses(prev => prev.map(p => p.id === matchedPass.id ? { ...p, uses: '1 / 2' } : p));
      toast.success('Check-in logged successfully.');
      setScanCode('');
      setScanResult(null);
      setMatchedPass(null);
    }
  };

  // Fallback Search Handler
  const handleSearch = (val) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    const filtered = (passes || []).filter(p => {
      if (!p) return false;
      const name = p.visitorName || p.visitorDetails?.name || '';
      const passId = p.id || p._id || '';
      return name.toLowerCase().includes(val.toLowerCase()) ||
             passId.toLowerCase().includes(val.toLowerCase()) ||
             (p.details && p.details.toLowerCase().includes(val.toLowerCase()));
    });
    setSearchResults(filtered);
  };

  const handleCheckInFallback = (pass) => {
    if (pass.status !== 'ACTIVE') {
      toast.error('Cannot check-in. Pass is expired.');
      return;
    }
    onCheckInSuccess({
      id: `L-${Math.floor(100 + Math.random() * 900)}`,
      visitorName: pass.visitorName,
      type: pass.method,
      villa: 'Villa 102',
      resident: 'David Lee',
      checkIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      checkOut: '—',
      status: 'INSIDE',
      guard: 'Officer Ramesh'
    });
    toast.success(`Allowed Entry for ${pass.visitorName}.`);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Ad-hoc Walk-in Handler
  const handleWalkInSubmit = (e) => {
    e.preventDefault();
    if (!walkinName.trim() || !walkinVilla.trim() || !walkinPurpose.trim()) {
      toast.error('Please enter name, destination villa, and purpose of visit.');
      return;
    }

    setWalkinStatus('sending');
    toast.loading('Sending approval request to resident...', { id: 'walkin-req' });

    // Simulate resident approval after 4 seconds
    setTimeout(() => {
      setWalkinStatus('approved');
      toast.success('Resident Approved Entry!', { id: 'walkin-req' });
      
      onCheckInSuccess({
        id: `L-${Math.floor(100 + Math.random() * 900)}`,
        visitorName: walkinName,
        type: 'guest',
        villa: walkinVilla.includes('Villa') ? walkinVilla : `Villa ${walkinVilla}`,
        resident: 'David Lee', // default resident name
        checkIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        checkOut: '—',
        status: 'INSIDE',
        guard: 'Officer Ramesh'
      });

      // Clear Form after 2 seconds
      setTimeout(() => {
        setWalkinName('');
        setWalkinPhone('');
        setWalkinPlate('');
        setWalkinVilla('');
        setWalkinPurpose('');
        setWalkinStatus('idle');
      }, 2000);
    }, 4000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
      
      {/* Left Column: QR Code + Fallback Search */}
      <div className="space-y-6">
        
        {/* Card 1: QR scan simulator */}
        <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <h3 className="text-base font-bold flex items-center gap-2 text-black dark:text-white border-b border-stroke dark:border-strokedark pb-3 mb-4">
            <QrCode className="h-4.5 w-4.5 text-primary shrink-0" />
            <span>QR Scan Simulator</span>
          </h3>

          <form onSubmit={handleVerifyScan} className="flex gap-2 mb-4">
            <Input 
              type="text" 
              placeholder="Scan/Type Pass Code (e.g. G-10029)" 
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              className="text-xs bg-white dark:bg-meta-4 border-stroke dark:border-strokedark text-black dark:text-white"
            />
            <Button type="submit" variant="default" size="sm" className="text-xs font-semibold whitespace-nowrap">
              Verify Code
            </Button>
          </form>

          {/* Scan result display */}
          {scanResult && (
            <div className={`p-5 rounded-xl border border-dashed text-center flex flex-col items-center ${
              scanResult === 'success' 
                ? 'bg-green-50/20 border-green-500 text-green-700 dark:bg-green-950/10' 
                : 'bg-red-50/20 border-red-500 text-red-700 dark:bg-red-950/10'
            }`}>
              {scanResult === 'success' && matchedPass ? (
                <div className="space-y-3 flex flex-col items-center">
                  <Check className="h-10 w-10 text-green-500 mb-1 shrink-0" />
                  <h4 className="font-extrabold text-sm uppercase">ACCESS GRANTED</h4>
                  <p className="text-xs leading-normal">
                    Pass verified for <strong className="font-bold">{matchedPass.visitorName}</strong>. Valid until {matchedPass.validity}.
                  </p>
                  <Button 
                    onClick={handleCheckInScanned}
                    variant="default"
                    size="sm"
                    className="font-bold py-2 px-6 bg-success hover:bg-success/90 border-0"
                  >
                    Confirm Gate Check-In
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 flex flex-col items-center">
                  <AlertCircle className="h-10 w-10 text-red-500 mb-1 shrink-0" />
                  <h4 className="font-extrabold text-sm uppercase">ACCESS DENIED</h4>
                  <p className="text-xs leading-normal">
                    {matchedPass ? `Pass state is "${matchedPass.status}".` : 'Invalid credentials. Pass code not registered.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card 2: Fallback Search */}
        <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <h3 className="text-base font-bold flex items-center gap-2 text-black dark:text-white border-b border-stroke dark:border-strokedark pb-3 mb-4">
            <Search className="h-4.5 w-4.5 text-gray-400 shrink-0" />
            <span>Fallback Search</span>
          </h3>
          <Input 
            type="text" 
            placeholder="Search by Plate, Name, ID Proof, or Phone..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="text-xs bg-white dark:bg-meta-4 border-stroke dark:border-strokedark text-black dark:text-white mb-4"
          />

          {searchQuery && (
            <div className="space-y-3">
              {searchResults.length === 0 ? (
                <div className="text-gray-400 text-xs text-center py-4">
                  No pre-approved passes match "{searchQuery}".
                </div>
              ) : (
                searchResults.map(pass => (
                  <div 
                    key={pass.id} 
                    className="border border-stroke dark:border-strokedark rounded-xl p-3 flex justify-between items-center bg-white dark:bg-boxdark hover:bg-slate-50 dark:hover:bg-meta-4/20 transition-colors"
                  >
                    <div className="min-w-0 pr-2 text-xs">
                      <div className="font-bold text-black dark:text-white truncate">{pass.visitorName}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                        Pass ID: {pass.id} &bull; {pass.details}
                      </div>
                    </div>
                    <Button 
                      variant={['ACTIVE', 'Active', 'PENDING', 'Pending'].includes(pass.status) ? 'default' : 'outline'}
                      size="sm"
                      disabled={!['ACTIVE', 'Active', 'PENDING', 'Pending'].includes(pass.status)}
                      onClick={() => handleCheckInFallback(pass)}
                      className="text-[10px] font-semibold h-7 px-3 border-stroke dark:border-strokedark text-black dark:text-white"
                    >
                      {['ACTIVE', 'Active', 'PENDING', 'Pending'].includes(pass.status) ? 'Check-In' : 'Expired'}
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>

      {/* Right Column: Ad-hoc Walk-in */}
      <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <h3 className="text-base font-bold flex items-center gap-2 text-black dark:text-white border-b border-stroke dark:border-strokedark pb-3 mb-4">
          <Smartphone className="h-4.5 w-4.5 text-success shrink-0" />
          <span>Ad-Hoc Walk-In</span>
        </h3>

        <form onSubmit={handleWalkInSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="walkinName" className="text-xs font-semibold">Visitor Name</Label>
            <Input 
              id="walkinName"
              type="text" 
              placeholder="e.g. David Miller"
              value={walkinName}
              onChange={(e) => setWalkinName(e.target.value)}
              disabled={walkinStatus !== 'idle'}
              className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="walkinPhone" className="text-xs font-semibold">Phone Number</Label>
            <Input 
              id="walkinPhone"
              type="text" 
              placeholder="e.g. +971 52 990 1209"
              value={walkinPhone}
              onChange={(e) => setWalkinPhone(e.target.value)}
              disabled={walkinStatus !== 'idle'}
              className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="walkinPlate" className="text-xs font-semibold">Vehicle License Plate (Optional)</Label>
            <Input 
              id="walkinPlate"
              type="text" 
              placeholder="e.g. DL-3C-AS-8812"
              value={walkinPlate}
              onChange={(e) => setWalkinPlate(e.target.value)}
              disabled={walkinStatus !== 'idle'}
              className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="walkinVilla" className="text-xs font-semibold">Destination Villa</Label>
            <Input 
              id="walkinVilla"
              type="text" 
              placeholder="e.g. Villa 102"
              value={walkinVilla}
              onChange={(e) => setWalkinVilla(e.target.value)}
              disabled={walkinStatus !== 'idle'}
              className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="walkinPurpose" className="text-xs font-semibold">Purpose of Visit</Label>
            <Input 
              id="walkinPurpose"
              type="text" 
              placeholder="e.g. Gas cylinder replacement"
              value={walkinPurpose}
              onChange={(e) => setWalkinPurpose(e.target.value)}
              disabled={walkinStatus !== 'idle'}
              className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
            />
          </div>

          {walkinStatus === 'idle' && (
            <Button type="submit" variant="default" size="sm" className="w-full text-xs font-bold py-2.5 bg-success hover:bg-success/90 border-0 mt-4 text-white">
              Request Resident Approval
            </Button>
          )}

          {walkinStatus === 'sending' && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50/15 border border-amber-200 dark:border-amber-900/30 flex items-center justify-center gap-2 text-amber-800 dark:text-amber-300">
              <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
              <span className="text-xs font-bold">
                Waiting for Resident Approval...
              </span>
            </div>
          )}

          {walkinStatus === 'approved' && (
            <div className="mt-4 p-3 rounded-lg bg-green-50/10 border border-green-200 dark:border-green-900/30 text-center text-green-700 dark:text-green-400 font-bold text-xs flex items-center justify-center gap-2">
              <Check className="h-4.5 w-4.5" />
              <span>APPROVED BY RESIDENT</span>
            </div>
          )}
        </form>
      </div>

    </div>
  );
};

export default GateConsoleView;
