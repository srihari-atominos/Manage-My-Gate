import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Home, Users, Phone, CheckCircle, Bell, Copy } from 'lucide-react';
import apiClient from '../../services/apiClient';
import toast from 'react-hot-toast';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';

export const ResidentDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [villaDetails, setVillaDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Guest pass generator state
  const [guestName, setGuestName] = useState('');
  const [generatedPass, setGeneratedPass] = useState(null);

  useEffect(() => {
    if (user?.villaId) {
      setLoading(true);
      apiClient.get(`/villas/${user.villaId}`)
        .then(res => {
          setVillaDetails(res.data || null);
        })
        .catch(err => {
          console.error('Failed to load resident villa details:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [user]);

  const handleCreatePass = (e) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    // Generate a mock pass code and timestamp
    const passCode = `G-${Math.floor(100000 + Math.random() * 900000)}`;
    setGeneratedPass({
      guestName: guestName.trim(),
      code: passCode,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString()
    });
    setGuestName('');
    toast.success(`Guest pass generated for ${guestName.trim()}`);
  };

  const handleCopyPass = () => {
    if (!generatedPass) return;
    const text = `Manage-My-Gate Guest Pass\nGuest: ${generatedPass.guestName}\nCode: ${generatedPass.code}\nValid Until: ${generatedPass.validUntil}`;
    navigator.clipboard.writeText(text);
    toast.success('Copied pass details to clipboard!');
  };

  if (!user?.villaId) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-xl shadow-default">
        <Home className="h-12 w-12 text-yellow-500 mb-3" />
        <h4 className="text-lg font-bold text-yellow-800 dark:text-yellow-400 mb-2">Pending Unit Allocation</h4>
        <p className="text-sm text-yellow-700 dark:text-yellow-300 max-w-md">
          Your account is active, but you are not linked to a villa. Please contact your Community Administrator to allocate your unit.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-black dark:text-white">
        My Villa Portal — {villaDetails?.villa?.villaNumber || user.villaNumber}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left column: Villa Stats and Co-residents */}
        <div className="md:col-span-7 space-y-6">
          {loading || !villaDetails ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-boxdark rounded-xl border border-stroke dark:border-strokedark shadow-default">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading villa occupancy data...</div>
            </div>
          ) : (
            <>
              {/* Unit Card */}
              <div className="rounded-xl p-6 shadow-default bg-gradient-to-r from-indigo-600 to-blue-500 text-white">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-2xl font-bold">{villaDetails.villa.villaNumber}</h4>
                    <span className="inline-block bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-md mt-1.5">
                      {villaDetails.villa.block || 'Main Block'}
                    </span>
                  </div>
                  <span className="inline-block bg-white/10 border border-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
                    {user.residentType} Status
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                  <div>
                    <div className="text-white/70 text-xs font-semibold uppercase">Intercom Extension</div>
                    <div className="font-bold text-lg flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4" />
                      {villaDetails.villa.intercom || 'None'}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/70 text-xs font-semibold uppercase">Unit Config</div>
                    <div className="font-bold text-lg flex items-center gap-2 mt-1">
                      <Home className="h-4 w-4" />
                      {villaDetails.villa.configuration || 'Not set'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Co-residents Directory */}
              <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="flex items-center gap-2 mb-4 border-b border-stroke dark:border-strokedark pb-3">
                  <Users className="h-5 w-5 text-primary" />
                  <h5 className="text-base font-bold text-black dark:text-white">Co-residents Directory</h5>
                </div>
                
                {villaDetails.residents.length <= 1 ? (
                  <div className="text-center py-6 bg-slate-50 dark:bg-meta-4/20 rounded-lg text-gray-500 dark:text-gray-400 text-xs">
                    No other family members or co-residents registered yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {villaDetails.residents.filter(r => r.id !== user.id).map((res) => (
                      <div key={res.id} className="flex items-center justify-between p-3 border border-stroke dark:border-strokedark rounded-lg bg-slate-50/50 dark:bg-meta-4/10">
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-primary text-white font-bold flex items-center justify-center h-10 w-10 text-sm">
                            {res.name ? res.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-black dark:text-white text-sm">{res.name || res.email.split('@')[0]}</div>
                            <div className="text-gray-500 dark:text-gray-400 text-xs">{res.email}</div>
                          </div>
                        </div>
                        <span className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {res.residentType}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right column: Visitor Passes and Notice Board */}
        <div className="md:col-span-5 space-y-6">
          {/* Visitor Pass Generator */}
          <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-center gap-2 mb-4 border-b border-stroke dark:border-strokedark pb-3">
              <CheckCircle className="h-5 w-5 text-success" />
              <h5 className="text-base font-bold text-black dark:text-white">Visitor Gate Pass</h5>
            </div>

            {generatedPass ? (
              <div className="text-center p-4 border border-success/30 rounded-xl bg-success/5 dark:bg-success/10 relative">
                <div className="text-success text-xs font-bold mb-1">Gate Entry Approved</div>
                <h5 className="font-bold text-black dark:text-white mb-3 text-sm">{generatedPass.guestName}</h5>
                <div className="text-2xl font-bold text-success mb-2 tracking-wider">{generatedPass.code}</div>
                <div className="text-gray-500 dark:text-gray-400 text-xs mb-4">Valid Until: {generatedPass.validUntil}</div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="w-1/2 text-xs" onClick={() => setGeneratedPass(null)}>
                    New Pass
                  </Button>
                  <Button size="sm" className="w-1/2 text-xs flex items-center justify-center gap-1.5" onClick={handleCopyPass}>
                    <Copy className="h-3 w-3" />
                    Share Pass
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreatePass} className="space-y-4">
                <div>
                  <label htmlFor="guest-name-input" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">Guest Name</label>
                  <Input
                    id="guest-name-input"
                    type="text"
                    placeholder="Enter guest name..."
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>
                <Button type="submit" className="w-full text-xs">
                  Generate Entry Code
                </Button>
              </form>
            )}
          </div>

          {/* Notice Board */}
          <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-center gap-2 mb-4 border-b border-stroke dark:border-strokedark pb-3">
              <Bell className="h-5 w-5 text-warning" />
              <h5 className="text-base font-bold text-black dark:text-white">Community Notices</h5>
            </div>

            <div className="space-y-3">
              <div className="p-3 border-l-4 border-warning bg-slate-50 dark:bg-meta-4/10 rounded-r-lg">
                <div className="font-semibold text-xs text-black dark:text-white">Maintenance Schedule</div>
                <p className="text-gray-500 dark:text-gray-400 text-[11px] mt-1">Water supply maintenance planned for Block A on Saturday 10 AM to 1 PM.</p>
              </div>
              <div className="p-3 border-l-4 border-blue-500 bg-slate-50 dark:bg-meta-4/10 rounded-r-lg">
                <div className="font-semibold text-xs text-black dark:text-white">Annual General Meeting</div>
                <p className="text-gray-500 dark:text-gray-400 text-[11px] mt-1">Gated community general assembly on Sunday, July 12th at 4:30 PM in the Clubhouse.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResidentDashboard;
