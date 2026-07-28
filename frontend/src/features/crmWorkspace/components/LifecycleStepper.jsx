import React, { memo } from 'react';

/**
 * LifecycleStepper — Dumb visual component displaying the deal/customer lifecycle.
 *
 * Steps:
 * 1. Inquiry (NEW / QUALIFIED)
 * 2. Demo (DEMO_SCHEDULED)
 * 3. Quote (PROPOSAL_SENT)
 * 4. Order (CLOSED_WON)
 * 5. Payment (FULFILLED)
 */
export const LifecycleStepper = memo(({ status = 'NEW' }) => {
  const steps = [
    { key: 'INQUIRY', label: 'Inquiry', icon: 'fa-solid fa-file-invoice', statuses: ['NEW', 'QUALIFIED'] },
    { key: 'DEMO', label: 'Demo', icon: 'fa-solid fa-calendar-check', statuses: ['DEMO_SCHEDULED'] },
    { key: 'QUOTE', label: 'Quote', icon: 'fa-solid fa-paper-plane', statuses: ['PROPOSAL_SENT'] },
    { key: 'ORDER', label: 'Order', icon: 'fa-solid fa-handshake', statuses: ['CLOSED_WON'] },
    { key: 'PAYMENT', label: 'Payment', icon: 'fa-solid fa-credit-card', statuses: ['FULFILLED'] },
  ];

  // Resolve current step index based on inquiry status
  const getActiveStepIndex = (currentStatus) => {
    switch (currentStatus?.toUpperCase()) {
      case 'NEW':
      case 'QUALIFIED':
        return 0;
      case 'DEMO_SCHEDULED':
        return 1;
      case 'PROPOSAL_SENT':
        return 2;
      case 'CLOSED_WON':
        return 3;
      case 'FULFILLED':
        return 4;
      case 'CLOSED_LOST':
        return -1; // Special indicator
      default:
        return 0;
    }
  };

  const activeIndex = getActiveStepIndex(status);

  return (
    <div className="crm-stepper-card">
      <div className="crm-stepper">
        <div className="crm-stepper-line" />
        {steps.map((step, index) => {
          const isCompleted = activeIndex > index;
          const isActive = activeIndex === index;
          const isLost = status === 'CLOSED_LOST';

          let stateClass = '';
          if (isCompleted) stateClass = 'crm-step--completed';
          if (isActive) stateClass = 'crm-step--active';
          if (isLost && index === 0) stateClass = 'crm-step--active';

          return (
            <div key={step.key} className={`crm-step ${stateClass}`}>
              <div className="crm-step__icon-wrap">
                {isCompleted ? (
                  <i className="fa-solid fa-check" />
                ) : (
                  <i className={step.icon} />
                )}
              </div>
              <span className="crm-step__label">{step.label}</span>
              <span className="crm-step__sub">
                {isCompleted ? 'Done' : isActive ? 'Active' : `Step ${index + 1}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

LifecycleStepper.displayName = 'LifecycleStepper';

export default LifecycleStepper;
