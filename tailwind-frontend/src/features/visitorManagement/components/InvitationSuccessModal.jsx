import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from 'src/components/ui/dialog';
import { Button } from 'src/components/ui/button';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';
import { Share2, MessageSquare, Copy, Check } from 'lucide-react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
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
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xs bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default text-center">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-center text-success w-full">
            🎉 Invitation Created!
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-gray-500 dark:text-gray-400 text-[11px] leading-relaxed">
            Share this QR Code/Pass with your visitor to grant them seamless entry at the gate.
          </p>

          {/* Dynamic QR Code Card */}
          <div className="mx-auto p-4 bg-white rounded-lg shadow-sm border border-stroke dark:border-strokedark w-fit">
            <QRCode 
              id="visitor-qr-svg"
              value={passCode} 
              size={140} 
              level="M"
            />
            <div className="mt-3 font-bold text-sm text-black border-t border-stroke pt-2">
              {passCode}
            </div>
            <div className="text-gray-500 text-xs mt-1">
              {visitorName}
            </div>
            <div className="text-success text-2xs font-semibold mt-1">
              {validityText}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 pt-0 w-full sm:flex-col sm:space-x-0">
          <Button 
            variant="default"
            size="sm"
            onClick={handleNativeShare}
            className="w-full text-xs font-semibold py-2 flex items-center justify-center gap-2 bg-success hover:bg-success/90 border-0"
          >
            <Share2 className="h-4 w-4" />
            <span>Share QR Pass Image</span>
          </Button>
          
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button 
              variant="outline"
              size="sm"
              onClick={handleWhatsAppShare}
              className="text-xs font-semibold py-2 border-stroke dark:border-strokedark text-black dark:text-white flex items-center justify-center gap-1.5"
            >
              <MessageSquare className="h-3.5 w-3.5 text-success" />
              <span>WhatsApp</span>
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="text-xs font-semibold py-2 border-stroke dark:border-strokedark text-black dark:text-white flex items-center justify-center gap-1.5"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Text</span>
            </Button>
          </div>

          <Button 
            variant="outline"
            size="sm"
            onClick={onClose}
            className="w-full text-xs font-semibold py-2 border-stroke dark:border-strokedark text-black dark:text-white mt-2"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

InvitationSuccessModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  passData: PropTypes.object
};

export default InvitationSuccessModal;
