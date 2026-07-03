import React from 'react';

const ScannerFrame = ({ isScanning, onSimulateScan }) => {
  return (
    <div className="scanner-ui" id="scanner-ui" onClick={onSimulateScan} style={{ cursor: onSimulateScan ? 'pointer' : 'default' }}>
      <div className="scanner-frame" id="scanner-frame" style={!isScanning ? { borderColor: 'var(--success)' } : {}}>
        {isScanning && <div className="scanner-line"></div>}
      </div>
      <p style={{ position: 'absolute', bottom: '32px', color: 'rgba(255,255,255,0.8)', fontSize: '15px', fontWeight: 600 }}>
        {isScanning ? '(Click anywhere inside to simulate scan)' : ''}
      </p>
    </div>
  );
};

export default ScannerFrame;
