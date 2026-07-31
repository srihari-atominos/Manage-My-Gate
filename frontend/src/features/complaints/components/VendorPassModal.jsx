import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import config from '../../../config/config.js'
import QRCode from 'react-qr-code'
import { closeVendorPassModal } from '../store/complaintSlice'

const VendorPassModal = () => {
  const dispatch = useDispatch()
  const { generatedVendorPass, isVendorPassModalOpen } = useSelector((state) => state.complaints)

  if (!isVendorPassModalOpen || !generatedVendorPass) return null

  const handleClose = () => {
    dispatch(closeVendorPassModal())
  }

  // Construct absolute deep link for the pass
  const baseUrl = config.publicUrl
  const passUrl = `${baseUrl}/verify-pass/${generatedVendorPass.shortKey || generatedVendorPass._id}`

  // Prepare share text
  const shareText = `Hello ${generatedVendorPass.visitorDetails?.name}, your Service Pass has been generated. Use this link or QR at the gate: ${passUrl}`
  const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(shareText)}`
  const smsUrl = `sms:?body=${encodeURIComponent(shareText)}`

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '400px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h5 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Invitation Created!</h5>
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            &times;
          </button>
        </div>

        <div style={{ padding: '24px', textAlign: 'center' }}>
          <p style={{ color: '#4b5563', fontSize: '14px', marginBottom: '24px' }}>
            Share this QR Code/Pass with your visitor to grant them seamless entry at the gate.
          </p>

          <div
            style={{
              background: '#fff',
              padding: '16px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              display: 'inline-block',
              marginBottom: '16px',
            }}
          >
            <QRCode value={passUrl} size={180} />
            <div style={{ marginTop: '12px', color: '#1f2937' }}>
              <strong style={{ fontSize: '18px' }}>{generatedVendorPass.shortKey || 'PASS'}</strong>
              <div style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
                {generatedVendorPass.visitorDetails?.name}
              </div>
              <div style={{ color: '#10b981', fontSize: '12px', marginTop: '4px' }}>
                Valid until: {new Date(generatedVendorPass.validity?.endDate).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#f9fafb',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ text: shareText, url: passUrl }).catch(console.error)
              } else {
                navigator.clipboard.writeText(shareText)
                alert('Link copied to clipboard!')
              }
            }}
            style={{
              width: '100%',
              padding: '10px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '500',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <i className="fa-solid fa-share-nodes me-2"></i> Share QR Pass Image
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '10px',
                background: '#25D366',
                color: 'white',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: '500',
                fontSize: '14px',
              }}
            >
              <i className="fa-brands fa-whatsapp me-2"></i> WhatsApp
            </a>
            <a
              href={smsUrl}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '10px',
                background: '#e5e7eb',
                color: '#374151',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: '500',
                fontSize: '14px',
                border: '1px solid #d1d5db',
              }}
            >
              <i className="fa-regular fa-copy me-2"></i> Copy Text
            </a>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: '100%',
              padding: '10px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '500',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default VendorPassModal
