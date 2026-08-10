import React, { useState, useEffect } from 'react';
import { useSocket } from '../../../../hooks/useSocket.js';

const steps = [
  { label: 'INIT (Trial Started)', icon: '1' },
  { label: 'CREATE_ORG (Tenant Setup)', icon: '2' },
  { label: 'CREATE_WORKSPACE', icon: '3' },
  { label: 'CREATE_ADMIN (User Setup)', icon: '4' },
  { label: 'ACTIVATE_ENTITLEMENTS', icon: '5' },
  { label: 'GENERATE_TEMPLATES', icon: '6' },
  { label: 'FINISHED (Trial Welcomes Sent)', icon: '7' }
];

const ProvisioningTab = ({ currentStepIndex = 0 }) => {
  const [simulatedStepIndex, setSimulatedStepIndex] = useState(currentStepIndex);
  const { socket } = useSocket('/platform'); // Assuming backend uses '/platform' namespace

  useEffect(() => {
    if (!socket) return;

    const handleJobUpdate = (payload) => {
      console.log('Received PROVISIONING_JOB_UPDATE', payload);
      // Expected payload shape: { stepIndex: number, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' }
      if (typeof payload.stepIndex === 'number') {
        setSimulatedStepIndex(payload.stepIndex);
      }
    };

    socket.on('PROVISIONING_JOB_UPDATE', handleJobUpdate);
    
    return () => {
      socket.off('PROVISIONING_JOB_UPDATE', handleJobUpdate);
    };
  }, [socket]);

  return (
    <div className="panel-body grid2">
      <div className="panel shadow-none">
        <div className="panel-head">
          <h2>Provisioning Pipeline</h2>
          <span className="badge green">TRIAL ACTIVE (AUTO STARTED)</span>
        </div>
        <div className="panel-body">
          <div className="step-list">
            {steps.map((step, idx) => {
              let statusClass = '';
              if (idx < simulatedStepIndex) statusClass = 'done';
              else if (idx === simulatedStepIndex) statusClass = 'current';

              return (
                <div key={idx} className={`step ${statusClass}`}>
                  <div className="step-icon">{idx < simulatedStepIndex ? '✓' : step.icon}</div>
                  {step.label}
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <div className="progress">
              <span style={{ width: `${(Math.min(simulatedStepIndex, steps.length - 1) / (steps.length - 1)) * 100}%` }}></span>
            </div>
            <div className="d-flex justify-between align-center mt-3">
              <div className="mini-note">Free Trial provisioned automatically within Mongoose transaction. Updates arrive in real-time.</div>
              <div className="badge blue">
                {simulatedStepIndex >= steps.length ? 'Completed ✓' : 'Awaiting Socket Events...'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProvisioningTab;
