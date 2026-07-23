import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from 'src/components/ui/dialog';
import { Button } from 'src/components/ui/button';
import { Badge } from 'src/components/ui/badge';
import toast from 'react-hot-toast';
import { Bell, X, Check } from 'lucide-react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { resolveWalkIn, clearActiveGateRequest } from '../store/visitorLogSlice.js';

export const GlobalGateApprovalModal = () => {
  const dispatch = useDispatch();
  const activeGateRequest = useSelector((state) => state.visitorLog.activeGateRequest);

  if (!activeGateRequest) return null;

  const handleClose = () => {
    dispatch(clearActiveGateRequest());
  };

  const handleAction = async (status) => {
    try {
      const id = activeGateRequest._id || activeGateRequest.id;
      const statusText = status === 'APPROVE' ? 'APPROVED' : 'DENIED';
      
      await dispatch(resolveWalkIn({ id, status })).unwrap();
      
      toast.success(`Gate request resolved as ${statusText.toLowerCase()} successfully!`);
      handleClose();
    } catch (err) {
      toast.error(err.message || `Failed to resolve gate request.`);
    }
  };

  const visitorName = activeGateRequest.visitorName || activeGateRequest.snapshot?.visitorName || 'Walk-in Visitor';
  const company = activeGateRequest.company || activeGateRequest.snapshot?.company || 'Walk-in';
  const purpose = activeGateRequest.purpose || activeGateRequest.snapshot?.purpose || 'Visit';
  const vehicle = activeGateRequest.vehicle || activeGateRequest.snapshot?.vehicleNumber || '—';
  const gateNumber = activeGateRequest.gateNumber || activeGateRequest.snapshot?.gateNumber || 'Gate 1';
  const photoUrl = activeGateRequest.photoUrl || activeGateRequest.snapshot?.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60';
  const idProofType = activeGateRequest.idProofType || activeGateRequest.snapshot?.idProofType || 'None';
  const idProofNumber = activeGateRequest.idProofNumber || activeGateRequest.snapshot?.idProofNumber || '';

  return (
    <Dialog open={!!activeGateRequest} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-primary">
            <Bell className="h-4.5 w-4.5 text-primary shrink-0" />
            <span>Incoming Gate Request</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex items-center gap-4">
            <img 
              src={photoUrl} 
              alt={visitorName}
              className="h-16 w-16 rounded-full object-cover border-2 border-primary shrink-0"
            />
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-black dark:text-white truncate">{visitorName}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="lightPrimary" className="text-[10px] px-1.5 py-0 rounded font-bold uppercase">
                  {company}
                </Badge>
                <span className="text-gray-400 dark:text-gray-500 text-xs font-medium">{gateNumber}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-meta-4/20 p-4 rounded-xl border border-stroke dark:border-strokedark space-y-2 text-xs">
            <div>
              <strong className="font-bold text-black dark:text-white">Purpose:</strong> <span className="text-gray-500 dark:text-gray-400">{purpose}</span>
            </div>
            <div>
              <strong className="font-bold text-black dark:text-white">Vehicle Number:</strong> <span className="text-gray-500 dark:text-gray-400">{vehicle}</span>
            </div>
            {idProofType && idProofType !== 'None' && (
              <div>
                <strong className="font-bold text-black dark:text-white">ID Proof:</strong> <span className="text-gray-500 dark:text-gray-400">{idProofType}: {idProofNumber}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between gap-4 border-t border-stroke dark:border-strokedark pt-4 w-full sm:space-x-0">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleAction('REJECT')}
            className="flex-1 text-xs font-bold py-2.5 border-red-200 text-red-500 bg-red-50/10 hover:bg-red-50 hover:text-red-600 dark:border-red-900/30 dark:hover:bg-red-950/20 flex items-center justify-center gap-1.5"
          >
            <X className="h-4 w-4" />
            Deny Entry
          </Button>
          <Button 
            variant="default" 
            size="sm"
            onClick={() => handleAction('APPROVE')}
            className="flex-1 text-xs font-bold py-2.5 bg-success hover:bg-success/90 border-0 text-white flex items-center justify-center gap-1.5"
          >
            <Check className="h-4 w-4" />
            Approve Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalGateApprovalModal;
