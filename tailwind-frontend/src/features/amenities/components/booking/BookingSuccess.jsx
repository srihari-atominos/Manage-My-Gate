import React, { memo } from 'react';
import { Check } from 'lucide-react';
import { Button } from 'src/components/ui/button';

const BookingSuccess = memo(({ amenity, draft, onComplete }) => {
  return (
    <div className="rounded-xl border border-stroke bg-white p-8 shadow-default dark:border-strokedark dark:bg-boxdark text-center space-y-6">
      <div className="flex justify-center">
        <div className="rounded-full bg-green-50 dark:bg-green-950/20 text-green-500 h-16 w-16 flex items-center justify-center border border-green-200 dark:border-green-900/30">
          <Check className="h-8 w-8" />
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-black dark:text-white">Booking Confirmed!</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
          Your booking for <strong>{amenity?.name}</strong> on <strong>{draft.bookingDate}</strong> from <strong>{draft.startTime}</strong> to <strong>{draft.endTime}</strong> has been successfully placed.
        </p>
      </div>

      <div className="flex justify-center pt-2">
        <Button onClick={onComplete} className="text-xs font-semibold px-6">
          Discover More
        </Button>
      </div>
    </div>
  );
});

export default BookingSuccess;
