import React from 'react';
import PropTypes from 'prop-types';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton
} from '@coreui/react';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';
import { shareQrCode } from '../utils/shareUtils.js';

export const InvitationSuccessModal = ({ visible, onClose, passData }) => {
  console.log('[InvitationSuccessModal] visible:', visible, 'passData:', passData);
  if (!passData) return null;

  const passCode = passData.shortKey || passData.id || passData._id || '—';
  const visitorName = passData.visitorName || passData.visitorDetails?.name || 'Visitor';
  
  // Format dates for display
  let validityText = 'Active Pass';
  if (passData.validity?.startDate && passData.validity?.endDate) {
    const start = new Date(passData.validity.startDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    const end = new Date(passData.validity.endDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    validityText = `${start} - ${end}`;
  } else if (passData.validity) {
    validityText = passData.validity;
  }

  const handleCopyLink = () => {
    const text = passCode;
    navigator.clipboard.writeText(text);
    toast.success('Invitation code copied to clipboard!');
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Here is your Visitor Pass for entry:\n\nPass Code: ${passCode}\nGuest: ${visitorName}\nValidity: ${validityText}`);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${text}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleNativeShare = () => {
    shareQrCode('visitor-qr-svg', passData);
  };

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" size="sm" backdrop="static">
      <CModalHeader closeButton>
        <CModalTitle className="w-100 text-center text-success font-weight-bold">
          🎉 Invitation Created!
        </CModalTitle>
      </CModalHeader>
      <CModalBody className="text-center py-4 bg-body-secondary">
        <p className="text-muted mb-3 small">
          Share this QR Code/Pass with your visitor to grant them seamless entry at the gate.
        </p>

        {/* Dynamic QR Code Card */}
        <div 
          className="mx-auto p-3 bg-body rounded shadow-sm border mb-4" 
          style={{ width: 'fit-content' }}
        >
          <QRCode 
            id="visitor-qr-svg"
            value={passCode} 
            size={160} 
            level="M"
          />
          <div className="mt-3 font-weight-bold text-body border-top pt-2">
            {passCode}
          </div>
          <div className="text-muted small mt-1">
            {visitorName}
          </div>
          <div className="text-success small font-weight-semibold mt-1">
            {validityText}
          </div>
        </div>
      </CModalBody>
      <CModalFooter className="flex-column gap-2 border-top-0 pt-0 bg-body-secondary">
        <CButton 
          color="success" 
          className="w-100 text-white font-weight-semibold py-2 d-flex align-items-center justify-content-center gap-2"
          onClick={handleNativeShare}
        >
          📤 Share QR Pass Image
        </CButton>
        
        <div className="d-flex gap-2 w-100">
          <CButton 
            color="success" 
            variant="outline" 
            className="w-50 small d-flex align-items-center justify-content-center gap-1 py-2"
            onClick={handleWhatsAppShare}
          >
            💬 WhatsApp
          </CButton>
          <CButton 
            color="secondary" 
            variant="outline" 
            className="w-50 small d-flex align-items-center justify-content-center gap-1 py-2"
            onClick={handleCopyLink}
          >
            📋 Copy Text
          </CButton>
        </div>

        <CButton 
          color="secondary" 
          className="w-100 mt-2 py-2"
          onClick={onClose}
        >
          Done
        </CButton>
      </CModalFooter>
    </CModal>
  );
};

InvitationSuccessModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  passData: PropTypes.object
};

export default InvitationSuccessModal;
