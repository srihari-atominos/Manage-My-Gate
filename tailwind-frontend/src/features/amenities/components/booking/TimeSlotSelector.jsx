import React, { memo } from 'react';
import { ArrowLeft, CalendarX, Check } from 'lucide-react';
import { Button } from 'src/components/ui/button';
import { Alert, AlertDescription } from 'src/components/ui/alert';

const TimeSlotSelector = memo(({ draft, availableSlots = [], slotsLoading, updateDraft, onBack, errorMsg }) => {
  return (
    <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
      <h5 className="text-base font-bold text-black dark:text-white mb-4">Select Time Slot</h5>
      
      {errorMsg && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}
      
      {slotsLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Loading available time slots...</div>
        </div>
      ) : (
        <div className="mb-6">
          {availableSlots.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-meta-4/20 border border-stroke dark:border-strokedark rounded-xl text-gray-500 dark:text-gray-400">
              <CalendarX className="h-10 w-10 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
              <h6 className="font-bold text-sm text-black dark:text-white">No available slots for this date.</h6>
              <p className="text-xs mt-1">Please select another date or amenity.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {availableSlots.map((slot, idx) => {
                const isSelected = draft.startTime === slot.startTime;
                const isAvailable = slot.status === 'Available' && !slot.bookedByMe;
                const isBookedByMe = slot.bookedByMe;
                const isBooked = slot.status === 'Booked' && !slot.bookedByMe;
                const isClosed = slot.status === 'Closed';
                const isMaintenance = slot.status === 'Maintenance';

                let borderColor = 'border border-stroke dark:border-strokedark';
                let pillBg = '';
                let pillText = '';
                let dotColor = '';
                let statusLabel = '';
                let opacity = 1;
                let cursor = 'pointer';
                let isDisabled = false;

                if (isSelected) {
                  borderColor = 'border-2 border-primary shadow-sm';
                } else if (isBookedByMe) {
                  pillBg = 'bg-green-100 dark:bg-green-500/20';
                  pillText = 'text-green-700 dark:text-green-400';
                  dotColor = 'bg-green-500';
                  statusLabel = 'Booked by You';
                  cursor = 'not-allowed';
                  isDisabled = true;
                } else if (isBooked) {
                  pillBg = 'bg-red-100 dark:bg-red-500/20';
                  pillText = 'text-red-700 dark:text-red-400';
                  dotColor = 'bg-red-500';
                  statusLabel = 'Booked';
                  cursor = 'not-allowed';
                  opacity = 0.7;
                  isDisabled = true;
                } else if (isMaintenance) {
                  pillBg = 'bg-amber-100 dark:bg-amber-500/20';
                  pillText = 'text-amber-700 dark:text-amber-400';
                  dotColor = 'bg-amber-500';
                  statusLabel = 'Maintenance';
                  cursor = 'not-allowed';
                  opacity = 0.7;
                  isDisabled = true;
                } else if (isClosed) {
                  pillBg = 'bg-gray-100 dark:bg-gray-500/20';
                  pillText = 'text-gray-700 dark:text-gray-400';
                  dotColor = 'bg-gray-400';
                  statusLabel = 'Closed';
                  cursor = 'not-allowed';
                  opacity = 0.6;
                  isDisabled = true;
                } else {
                  // Available
                  pillBg = 'bg-green-50 dark:bg-green-950/20';
                  pillText = 'text-green-600 dark:text-green-400';
                  dotColor = 'bg-green-500';
                  statusLabel = 'Available';
                }

                return (
                  <div 
                    key={idx}
                    className={`relative p-4 rounded-xl bg-white dark:bg-boxdark hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 ${borderColor}`}
                    style={{ cursor, opacity }}
                    onClick={() => !isDisabled && updateDraft({ startTime: slot.startTime, endTime: slot.endTime, price: slot.price })}
                  >
                    {isSelected && (
                      <div className="absolute bg-primary rounded-full h-5 w-5 -top-2.5 -right-2.5 border-2 border-white dark:border-boxdark flex items-center justify-center text-white">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    
                    <div className="font-bold text-sm text-black dark:text-white mb-1">{slot.startTime}</div>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-3 gap-2">
                      <span>{slot.endTime}</span>
                      <span className="text-[10px] bg-slate-100 dark:bg-meta-4 px-1.5 py-0.5 rounded text-gray-400 dark:text-gray-500">
                        {slot.duration || '60'}m
                      </span>
                    </div>
                    
                    <div>
                      {isSelected ? (
                        <div className="bg-primary text-white text-center rounded-full py-1 text-[10px] font-bold w-full">
                          Selected
                        </div>
                      ) : (
                        <div className={`inline-flex items-center justify-center rounded-full py-1 px-3 w-full text-[10px] font-bold ${pillBg} ${pillText}`}>
                          <span className={`rounded-full mr-1.5 h-1.5 w-1.5 shrink-0 ${dotColor}`}></span>
                          <span className="truncate">{statusLabel}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      <div className="flex justify-start pt-4 border-t border-stroke dark:border-strokedark mt-6">
        <Button 
          variant="ghost" 
          onClick={onBack} 
          className="text-xs flex items-center gap-1 bg-transparent hover:bg-transparent text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white p-0"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
      </div>
    </div>
  );
});

export default TimeSlotSelector;
