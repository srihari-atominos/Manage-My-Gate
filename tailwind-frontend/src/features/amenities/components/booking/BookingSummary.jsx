import React, { memo } from 'react';
import { MapPin, Check, ArrowLeft } from 'lucide-react';
import BookingPricing from './BookingPricing.jsx';
import { Button } from 'src/components/ui/button';

const BookingSummary = memo(({ amenity, draft, onConfirm, onBack }) => {
  if (!amenity) return null;

  return (
    <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
      <h5 className="text-base font-bold text-black dark:text-white mb-4">Review Your Booking</h5>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div className="lg:col-span-7 space-y-4">
          <div>
            <h4 className="text-lg font-bold text-black dark:text-white">{amenity.name}</h4>
            <p className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1 mt-1">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              {amenity.location}
            </p>
          </div>
          
          <div className="flex gap-12 border-y border-stroke dark:border-strokedark py-4 my-2">
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Date</p>
              <p className="text-sm font-semibold text-black dark:text-white">{draft.bookingDate}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Time</p>
              <p className="text-sm font-semibold text-black dark:text-white">{draft.startTime} - {draft.endTime}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                Duration: {(() => {
                  if (!draft.startTime || !draft.endTime) return '';
                  const parseTime = (timeStr) => {
                    const [time, modifier] = timeStr.split(' ');
                    let [hours, minutes] = time.split(':').map(Number);
                    if (modifier === 'PM' && hours < 12) hours += 12;
                    if (modifier === 'AM' && hours === 12) hours = 0;
                    return hours * 60 + minutes;
                  };
                  try {
                    const startMins = parseTime(draft.startTime);
                    const endMins = parseTime(draft.endTime);
                    let diff = endMins - startMins;
                    if (diff < 0) diff += 24 * 60;
                    return `${diff} Minutes`;
                  } catch(e) { return ''; }
                })()}
              </p>
            </div>
          </div>

          <div>
            <h6 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Booking Rules</h6>
            <ul className="list-disc text-xs text-gray-500 dark:text-gray-400 pl-4 space-y-1.5">
              <li>Cancellation must be made 24 hours in advance for a full refund.</li>
              <li>Please adhere to the maximum capacity of {amenity.capacity || 'N/A'} persons.</li>
            </ul>
          </div>
        </div>
        
        <div className="lg:col-span-5">
          <BookingPricing draft={draft} />
        </div>
      </div>
      
      <div className="flex justify-between items-center pt-4 border-t border-stroke dark:border-strokedark mt-6">
        <Button 
          variant="ghost" 
          onClick={onBack} 
          className="text-xs flex items-center gap-1 bg-transparent hover:bg-transparent text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white p-0"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
        <Button 
          onClick={onConfirm} 
          className="text-xs flex items-center gap-1"
        >
          <span>Book Now</span>
          <Check className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

export default BookingSummary;
