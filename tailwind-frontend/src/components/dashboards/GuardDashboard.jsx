import React, { useState, useEffect } from 'react';
import { Shield, Search, Phone, Plus, Check } from 'lucide-react';
import apiClient from '../../services/apiClient';
import toast from 'react-hot-toast';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from 'src/components/ui/dialog';
import { Label } from 'src/components/ui/label';

export const GuardDashboard = () => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visitorLogs, setVisitorLogs] = useState([
    { id: 1, name: 'David Miller', phone: '+966 50 123 4567', villa: 'Villa 04', type: 'Delivery', checkIn: '3:45 PM', status: 'Checked In' },
    { id: 2, name: 'Sarah Connor', phone: '+966 55 987 6543', villa: 'Villa 12', type: 'Guest', checkIn: '2:15 PM', status: 'Checked Out' },
    { id: 3, name: 'FedEx Courier', phone: '—', villa: 'Villa 21', type: 'Delivery', checkIn: '1:05 PM', status: 'Checked Out' },
  ]);

  // Check-In modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorType, setVisitorType] = useState('Delivery');
  const [targetVillaNumber, setTargetVillaNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load directory on search query change
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setLoading(true);
      apiClient.get(`/villas?search=${search}&limit=5`)
        .then(res => {
          setResults(res.data?.data || []);
        })
        .catch(err => {
          console.error('Failed to load guard directory:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search]);

  const handleDialIntercom = (villa) => {
    if (villa.intercom) {
      toast.success(`📞 Dialing Intercom ${villa.intercom} for ${villa.villaNumber}...`);
    } else {
      toast.error(`No intercom configured for ${villa.villaNumber}`);
    }
  };

  const handleCheckInSubmit = (e) => {
    e.preventDefault();
    if (!visitorName.trim() || !targetVillaNumber.trim()) return;

    setSubmitting(true);
    setTimeout(() => {
      const newLog = {
        id: Date.now(),
        name: visitorName.trim(),
        phone: visitorPhone.trim() || '—',
        villa: targetVillaNumber.trim(),
        type: visitorType,
        checkIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'Checked In'
      };

      setVisitorLogs(prev => [newLog, ...prev]);
      setVisitorName('');
      setVisitorPhone('');
      setTargetVillaNumber('');
      setModalVisible(false);
      setSubmitting(false);
      toast.success(`Checked in ${newLog.name} successfully!`);
    }, 500);
  };

  const handleCheckOut = (logId) => {
    setVisitorLogs(prev => prev.map(log => 
      log.id === logId ? { ...log, status: 'Checked Out' } : log
    ));
    toast.success('Visitor checked out successfully.');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-black dark:text-white">
        Gatehouse Portal — Guard Console
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Quick Lookup */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-center gap-2 mb-4 border-b border-stroke dark:border-strokedark pb-3">
              <Search className="h-5 w-5 text-primary" />
              <h5 className="text-base font-bold text-black dark:text-white">Intercom & Villa Directory</h5>
            </div>

            <div className="mb-4">
              <Input
                type="text"
                placeholder="Search by villa number (e.g. 05)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-xs"
              />
            </div>

            {loading ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto mb-2"></div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Searching community directory...</div>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 dark:bg-meta-4/10 rounded-lg text-gray-500 dark:text-gray-400 text-xs">
                Enter search terms to find villa details.
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((villa) => (
                  <div key={villa._id} className="flex items-center justify-between p-3 border border-stroke dark:border-strokedark rounded-lg bg-slate-50/50 dark:bg-meta-4/10">
                    <div>
                      <div className="font-bold text-primary text-sm">{villa.villaNumber}</div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                        Block: <span className="font-semibold text-black dark:text-white">{villa.block || '—'}</span> | Occupancy: <span className="font-semibold text-black dark:text-white">{villa.occupancyStatus}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {villa.intercom && (
                        <span className="inline-block bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-xs font-semibold px-2 py-1 rounded">
                          📟 {villa.intercom}
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDialIntercom(villa)}
                        className="text-xs flex items-center gap-1 h-8"
                      >
                        <Phone className="h-3 w-3" />
                        Call
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Visitor Logging */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-center justify-between mb-4 border-b border-stroke dark:border-strokedark pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-success" />
                <h5 className="text-base font-bold text-black dark:text-white">Recent Entry/Exit Logs</h5>
              </div>
              <Button
                size="sm"
                className="text-xs flex items-center gap-1 h-8"
                onClick={() => setModalVisible(true)}
              >
                <Plus className="h-3 w-3" />
                New Visitor
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stroke dark:border-strokedark text-gray-500 dark:text-gray-400 font-semibold">
                    <th className="py-2.5">Visitor</th>
                    <th className="py-2.5">Villa</th>
                    <th className="py-2.5">Time</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke dark:divide-strokedark">
                  {visitorLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-meta-4/5">
                      <td className="py-3">
                        <div className="font-semibold text-black dark:text-white">{log.name}</div>
                        <div className="text-gray-500 dark:text-gray-400 text-[10px] mt-0.5">{log.type} | {log.phone}</div>
                      </td>
                      <td className="py-3 font-semibold text-primary">{log.villa}</td>
                      <td className="py-3 text-gray-500 dark:text-gray-400">{log.checkIn}</td>
                      <td className="py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'Checked In' 
                            ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' 
                            : 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {log.status === 'Checked In' ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCheckOut(log.id)}
                            className="text-[10px] h-6 px-2.5"
                          >
                            Check Out
                          </Button>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-[11px]">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Visitor Check-In Modal */}
      <Dialog open={modalVisible} onOpenChange={(open) => { if (!open) setModalVisible(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Visitor Check-In Log</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCheckInSubmit} id="checkinForm" className="space-y-4">
            <div>
              <Label htmlFor="visitor-name" className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Visitor Name</Label>
              <Input
                id="visitor-name"
                type="text"
                placeholder="Enter visitor/courier name..."
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                required
                className="text-xs mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="visitor-phone" className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Visitor Phone (Optional)</Label>
              <Input
                id="visitor-phone"
                type="tel"
                placeholder="e.g. +966 50 000 0000"
                value={visitorPhone}
                onChange={(e) => setVisitorPhone(e.target.value)}
                className="text-xs mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="visitor-type" className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Visit Purpose</Label>
                <select
                  id="visitor-type"
                  value={visitorType}
                  onChange={(e) => setVisitorType(e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-xs text-black outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white mt-1.5"
                >
                  <option value="Delivery">Delivery / Courier</option>
                  <option value="Guest">Personal Guest</option>
                  <option value="Services">Maintenance Staff</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <Label htmlFor="visitor-villa" className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Destination Villa</Label>
                <Input
                  id="visitor-villa"
                  type="text"
                  placeholder="e.g. Villa 10"
                  value={targetVillaNumber}
                  onChange={(e) => setTargetVillaNumber(e.target.value)}
                  required
                  className="text-xs mt-1.5"
                />
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalVisible(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form="checkinForm" size="sm" disabled={submitting}>
              {submitting ? 'Checking In...' : 'Verify & Log Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GuardDashboard;
