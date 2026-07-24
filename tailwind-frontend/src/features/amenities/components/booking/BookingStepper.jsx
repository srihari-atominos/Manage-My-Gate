import React, { memo } from 'react';
import { Check } from 'lucide-react';

const BookingStepper = memo(({ currentStep }) => {
  const steps = [
    { id: 'date', label: 'Date' },
    { id: 'time', label: 'Time' },
    { id: 'review', label: 'Review' }
  ];

  const getStepIndex = (stepId) => {
    if (stepId === 'submitting' || stepId === 'success') return 3;
    const index = steps.findIndex(s => s.id === stepId);
    return index >= 0 ? index : 0;
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="flex justify-between items-center mb-6 relative w-full" aria-label="Booking Progress">
      {/* Background Line */}
      <div className="absolute w-full h-[2px] bg-slate-200 dark:bg-meta-4 z-0 top-1/2 -translate-y-1/2"></div>
      
      {/* Progress Line */}
      <div 
        className="absolute h-[2px] bg-primary z-0 top-1/2 -translate-y-1/2 transition-all duration-300" 
        style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
      ></div>
      
      {steps.map((step, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;
        
        return (
          <div key={step.id} className="flex flex-col items-center relative z-[1]">
            <div 
              className={`rounded-full flex items-center justify-center font-bold h-10 w-10 text-sm shadow-sm mb-2 border-2 transition-all duration-300 ${
                isActive || isCompleted 
                  ? 'bg-primary border-primary text-white' 
                  : 'bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-gray-500 dark:text-gray-400'
              }`}
              aria-current={isActive ? 'step' : undefined}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <span className={`text-[11px] font-semibold tracking-wide ${
              isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
            }`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
});

export default BookingStepper;
