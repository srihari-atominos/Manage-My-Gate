import React, { useState, useEffect } from 'react';
import { TriangleAlert, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from 'src/components/ui/dialog';
import { Button } from 'src/components/ui/button';
import { Alert, AlertDescription } from 'src/components/ui/alert';

const CancelBookingModal = ({ visible, onClose, onConfirm, booking, isSubmitting }) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [refundCalculation, setRefundCalculation] = useState({ percentage: 100, amount: 0, showCalculation: false });

  const QUICK_REASONS = [
    'Change of plans',
    'Booked by mistake',
    'Schedule conflict',
    'Emergency',
    'Personal reasons',
    'Other'
  ];

  useEffect(() => {
    if (visible && booking) {
      setReason('');
      setCustomReason('');
      calculateRefund(booking);
    }
  }, [visible, booking]);

  const calculateRefund = (bookingDetails) => {
    let percentage = 100;
    let amount = bookingDetails.totalPrice || bookingDetails.pricingDetails?.totalAmount || 0;
    let showCalculation = false;

    if (bookingDetails.amenityRules?.isCancellationEnabled && bookingDetails.amenityRules?.cancellationRefundRules) {
      showCalculation = true;
      const rules = [...bookingDetails.amenityRules.cancellationRefundRules].sort((a, b) => b.cancelBeforeHours - a.cancelBeforeHours);
      
      const startDateTime = new Date(`${bookingDetails.date || bookingDetails.bookingDate}T${bookingDetails.startTime}`);
      const now = new Date();
      const remainingHours = (startDateTime - now) / (1000 * 60 * 60);

      const applicableRule = rules.find(rule => remainingHours >= rule.cancelBeforeHours);
      if (applicableRule) {
        percentage = applicableRule.refundPercentage;
      } else {
        percentage = 0;
      }
      amount = ((bookingDetails.totalPrice || bookingDetails.pricingDetails?.totalAmount || 0) * percentage) / 100;
    }

    setRefundCalculation({ percentage, amount, showCalculation });
  };

  const handleConfirm = () => {
    const finalReason = reason === 'Other' ? customReason : reason;
    onConfirm(booking._id, finalReason);
  };

  if (!booking) return null;

  const bookingAmount = booking.totalPrice || booking.pricingDetails?.totalAmount || 0;

  return (
    <Dialog open={visible} onOpenChange={(open) => { if (!open && !isSubmitting) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Booking</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          {/* Booking Details Card */}
          <div className="bg-slate-50 dark:bg-meta-4/20 p-4 rounded-xl border border-stroke dark:border-strokedark space-y-2">
            <h6 className="font-bold text-black dark:text-white text-xs mb-1">Booking Details</h6>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Amenity:</span>
              <span className="font-semibold text-black dark:text-white">{booking.amenityName || booking.amenityId?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Date:</span>
              <span className="font-semibold text-black dark:text-white">{booking.date || booking.bookingDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Time:</span>
              <span className="font-semibold text-black dark:text-white">{booking.startTime} - {booking.endTime}</span>
            </div>
            <div className="flex justify-between mt-2 pt-2 border-t border-stroke dark:border-strokedark">
              <span className="text-gray-500 dark:text-gray-400">Booking Amount:</span>
              <span className="font-bold text-black dark:text-white">₹{bookingAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Refund Calculation Info */}
          {refundCalculation.showCalculation ? (
            <div className="space-y-2">
              <h6 className="font-bold text-black dark:text-white text-xs">Estimated Refund</h6>
              <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
                refundCalculation.percentage === 0 
                  ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400' 
                  : 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-900/30 dark:text-green-400'
              }`}>
                <div className="flex justify-between">
                  <span>Refund Percentage:</span>
                  <span className="font-bold">{refundCalculation.percentage}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Estimated Refund:</span>
                  <span className="font-bold">₹{refundCalculation.amount.toFixed(2)}</span>
                </div>
                {refundCalculation.percentage === 0 && (
                  <div className="flex items-start gap-1.5 mt-1 text-red-600 dark:text-red-400 font-semibold leading-relaxed">
                    <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Cancellation is outside the configured refund window. No refund will be issued.</span>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span>Final refund amount will be calculated by the system.</span>
              </div>
            </div>
          ) : (
            <Alert className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-400">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-xs ml-2">
                Refunds are subject to the amenity's cancellation policy. The final refund amount will be calculated upon confirmation.
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <div className="space-y-2">
            <label className="block font-bold text-black dark:text-white">Reason for Cancellation <span className="text-red-500">*</span></label>
            <select 
              value={reason} 
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-xs text-black outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white"
            >
              <option value="" disabled>Select a reason...</option>
              {QUICK_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            {reason === 'Other' && (
              <textarea 
                placeholder="Please specify your custom reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
                maxLength={200}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-xs text-black outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white mt-2"
              />
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Close
          </Button>
          <Button 
            variant="destructive"
            size="sm"
            onClick={handleConfirm} 
            disabled={isSubmitting || !reason || (reason === 'Other' && !customReason.trim())}
          >
            {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelBookingModal;
