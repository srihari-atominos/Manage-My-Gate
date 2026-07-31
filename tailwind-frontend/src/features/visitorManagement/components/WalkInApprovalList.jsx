import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  History,
  ChevronLeft,
  ChevronRight,
  Car,
  UserCheck,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';
import { Button } from 'src/components/ui/button';
import { Badge } from 'src/components/ui/badge';
import toast from 'react-hot-toast';

export const WalkInApprovalList = ({ walkins, setWalkins, onApprove, onDeny, logs = [] }) => {
  const handleApprove = (id) => {
    if (onApprove) {
      onApprove(id);
    } else {
      setWalkins(prev =>
        prev.map(item => (item.id === id || item._id === id) ? { ...item, status: 'APPROVED' } : item)
      );
      toast.success('Visitor entry approved successfully!');
    }
  };

  const handleDeny = (id) => {
    if (onDeny) {
      onDeny(id);
    } else {
      setWalkins(prev =>
        prev.map(item => (item.id === id || item._id === id) ? { ...item, status: 'DENIED' } : item)
      );
      toast.error('Visitor entry denied.');
    }
  };

  const pendingItems = walkins.filter(item => (item.status || item.logStatus) === 'PENDING');
  
  // Filter history logs (all entries not pending)
  const historyItems = (logs || []).filter(item => (item.status || item.logStatus) !== 'PENDING');

  // Pagination for Recent Gate Log
  const [logPage, setLogPage] = useState(1);
  const logsPerPage = 5;
  const totalLogPages = Math.ceil(historyItems.length / logsPerPage) || 1;
  const indexOfLastLog = logPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentHistoryLogs = historyItems.slice(indexOfFirstLog, indexOfLastLog);

  const formatLogTime = (time) => {
    if (!time) return '—';
    if (typeof time === 'string' && (time.includes('now') || time.includes('ago') || time.includes('AM') || time.includes('PM'))) {
      return time;
    }
    const dateObj = new Date(time);
    if (isNaN(dateObj.getTime())) return '—';
    return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
      
      {/* Left Column: Pending Approvals */}
      <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <h3 className="text-base font-bold flex items-center gap-2 text-black dark:text-white border-b border-stroke dark:border-strokedark pb-3 mb-4">
          <Clock className="h-4.5 w-4.5 text-primary shrink-0" />
          <span>Pending Gate Requests ({pendingItems.length})</span>
        </h3>

        {pendingItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[220px] text-gray-400 dark:text-gray-500 gap-1.5 text-center">
            <CheckCircle2 className="h-10 w-10 text-success mb-1" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">All caught up!</span>
            <span className="text-2xs text-gray-400">No visitor is currently waiting at the gate.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingItems.map(item => {
              const itemId = item.id || item._id;
              const visitorName = item.visitorName || item.snapshot?.visitorName || '—';
              const photoUrl = item.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60';
              const company = item.company || item.snapshot?.company || 'Walk-in Visitor';
              const purpose = item.purpose || item.snapshot?.purpose || 'Visit';
              const vehicle = item.vehicle || item.snapshot?.vehicleNumber || '—';
              const guardName = item.guardName || item.guardId?.name || 'Gate Operator';

              return (
                <div key={itemId} className="p-4 rounded-xl border border-stroke dark:border-strokedark bg-slate-50 dark:bg-meta-4/20 space-y-4 hover:shadow-md transition-all duration-200">
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      <img 
                        src={photoUrl} 
                        alt={visitorName}
                        className="h-12 w-12 rounded-full object-cover border-2 border-primary"
                      />
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-amber-500 border-2 border-white dark:border-boxdark" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-black dark:text-white truncate">{visitorName}</h4>
                        <span className="text-[10px] font-semibold bg-stroke dark:bg-meta-4 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">
                          {itemId}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-normal">
                        <strong className="text-black dark:text-white">Company:</strong> {company} &bull; <strong className="text-black dark:text-white">Purpose:</strong> {purpose}
                      </div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 flex items-center gap-3">
                        <span className="inline-flex items-center gap-1"><Car className="h-3.5 w-3.5" /> Vehicle: {vehicle}</span>
                        <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Guard: {guardName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2 border-t border-stroke/50 dark:border-strokedark/50">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeny(itemId)}
                      className="flex-1 text-xs font-semibold py-2 border-red-200 text-red-500 bg-red-50/10 hover:bg-red-50 hover:text-red-600 dark:border-red-900/30 dark:hover:bg-red-950/20 flex items-center justify-center gap-1.5"
                    >
                      <X className="h-4 w-4" />
                      Deny Entry
                    </Button>
                    <Button 
                      variant="default"
                      size="sm"
                      onClick={() => handleApprove(itemId)}
                      className="flex-1 text-xs font-semibold py-2 bg-success hover:bg-success/90 border-0 text-white flex items-center justify-center gap-1.5"
                    >
                      <Check className="h-4 w-4" />
                      Approve Entry
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column: History Log */}
      <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <h3 className="text-base font-bold flex items-center gap-2 text-black dark:text-white border-b border-stroke dark:border-strokedark pb-3 mb-4">
          <History className="h-4.5 w-4.5 text-gray-400 shrink-0" />
          <span>Recent Gate Log</span>
        </h3>

        {historyItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[220px] text-gray-400 dark:text-gray-500 gap-1.5 text-center">
            <History className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-1" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">No past walk-ins logged today.</span>
          </div>
        ) : (
          <div className="space-y-4 flex flex-col h-full">
            <div className="space-y-3 flex-grow max-h-[360px] overflow-y-auto pr-1">
               {currentHistoryLogs.map(item => {
                const itemId = item.id || item._id;
                const visitorName = item.visitorName || item.snapshot?.visitorName || '—';
                const company = item.company || item.snapshot?.company || 'Walk-in Visitor';
                
                const logTime = item.checkInTime || item.createdAt || item.timestamp;
                const timestampText = formatLogTime(logTime);

                const type = (item.type || item.passId?.passType || (item.entryType === 'WALK_IN' ? 'WALK_IN' : 'GUEST')).toUpperCase();
                let categoryLabel = 'Guest';
                if (type.includes('CAB')) {
                  categoryLabel = 'Cab';
                } else if (type.includes('DELIVERY')) {
                  categoryLabel = 'Delivery';
                } else if (type.includes('SERVICE')) {
                  categoryLabel = 'Service';
                } else if (type.includes('WALK')) {
                  categoryLabel = 'Walk-in';
                }

                const rawStatus = (item.status || item.logStatus || 'COMPLETED').toUpperCase();
                let statusText = 'Exited';
                let statusVariant = 'outlineSecondary';

                if (rawStatus === 'INSIDE') {
                  statusText = 'Checked-In';
                  statusVariant = 'lightSuccess';
                } else if (rawStatus === 'APPROVED') {
                  statusText = 'Approved';
                  statusVariant = 'lightSuccess';
                } else if (rawStatus === 'REJECTED' || rawStatus === 'DENIED') {
                  statusText = 'Denied';
                  statusVariant = 'lightError';
                }

                return (
                  <div key={itemId} className="flex justify-between items-center p-3 border border-stroke dark:border-strokedark rounded-lg bg-white dark:bg-boxdark hover:bg-slate-50 dark:hover:bg-meta-4/10 transition-colors">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-bold text-xs text-black dark:text-white truncate">{visitorName}</div>
                        <Badge variant="lightSecondary" className="text-[10px] px-1 py-0 rounded font-bold uppercase tracking-wider">
                          {categoryLabel}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                        {company} &bull; {timestampText}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <Badge variant={statusVariant} className="text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {statusText}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalLogPages > 1 && (
              <div className="flex justify-between items-center gap-4 mt-auto pt-4 border-t border-stroke dark:border-strokedark">
                <span className="text-2xs text-gray-400 dark:text-gray-500 font-semibold">
                  Page {logPage} of {totalLogPages}
                </span>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={logPage === 1}
                    onClick={() => setLogPage(prev => Math.max(prev - 1, 1))}
                    className="text-[10px] font-semibold h-7 px-2 border-stroke dark:border-strokedark text-black dark:text-white"
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={logPage === totalLogPages}
                    onClick={() => setLogPage(prev => Math.min(prev + 1, totalLogPages))}
                    className="text-[10px] font-semibold h-7 px-2 border-stroke dark:border-strokedark text-black dark:text-white"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default WalkInApprovalList;
