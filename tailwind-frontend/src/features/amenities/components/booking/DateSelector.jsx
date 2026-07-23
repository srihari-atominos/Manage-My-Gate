import React, { memo } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';

const DateSelector = memo(({ draft, updateDraft, onNext, errorMsg }) => {
  const getTodayDateString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
      <h5 className="text-base font-bold text-black dark:text-white mb-4">Select a Date</h5>
      <div className="mb-6">
        <Input 
          type="date" 
          min={getTodayDateString()}
          value={draft.bookingDate}
          onChange={(e) => updateDraft({ bookingDate: e.target.value })}
          className={`text-xs ${errorMsg && !draft.bookingDate ? 'border-red-500' : ''}`}
        />
        {errorMsg && !draft.bookingDate && (
          <p className="text-red-500 text-xs mt-1.5">{errorMsg}</p>
        )}
      </div>
      
      <div className="flex justify-end">
        <Button 
          onClick={onNext} 
          disabled={!draft.bookingDate}
          className="text-xs flex items-center gap-1"
        >
          <span>Next Step</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

export default DateSelector;
