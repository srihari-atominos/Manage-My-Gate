import React, { memo } from 'react';
import { formatCurrency } from '../../utils/amenityUtils.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from 'src/components/ui/dialog';
import { Button } from 'src/components/ui/button';

const BookingConfirmationModal = memo(({ visible, onClose, onConfirm, isSubmitting, draft, amenity }) => {
  return (
    <Dialog open={visible} onOpenChange={(open) => { if (!open && !isSubmitting) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Booking</DialogTitle>
        </DialogHeader>
        
        {isSubmitting ? (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Securing your slot...</p>
          </div>
        ) : (
          <div className="text-xs space-y-3 text-gray-700 dark:text-gray-300">
            <p className="text-sm">You are about to book <strong className="text-black dark:text-white">{amenity?.name}</strong>.</p>
            <p className="mb-1"><strong className="text-black dark:text-white">Date:</strong> {draft.bookingDate}</p>
            <p className="mb-1"><strong className="text-black dark:text-white">Time:</strong> {draft.startTime} - {draft.endTime} ({draft.duration} min)</p>
            <hr className="border-stroke dark:border-strokedark my-2" />
            <p className="flex justify-between"><span>Base Amount:</span> <span className="font-semibold text-black dark:text-white">{formatCurrency(draft.baseAmount || draft.price || 0)}</span></p>
            <p className="flex justify-between"><span>Tax:</span> <span className="font-semibold text-black dark:text-white">{formatCurrency(draft.tax || 0)}</span></p>
            <p className="flex justify-between"><span>Security Deposit:</span> <span className="font-semibold text-black dark:text-white">{formatCurrency(draft.deposit || 0)}</span></p>
            <hr className="border-stroke dark:border-strokedark my-2" />
            <p className="flex justify-between text-sm"><strong className="text-black dark:text-white">Total Amount:</strong> <strong className="text-primary">{formatCurrency(draft.totalPrice)}</strong></p>
          </div>
        )}

        {!isSubmitting && (
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={onConfirm}>Confirm & Pay</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
});

export default BookingConfirmationModal;
