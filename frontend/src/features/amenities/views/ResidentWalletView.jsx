import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useResidentWallet from '../hooks/useResidentWallet.js';
import QrPassCard from '../components/wallet/QrPassCard.jsx';
import WalletEmptyState from '../components/wallet/WalletEmptyState.jsx';
import { WalletLoading, WalletError } from '../components/wallet/WalletStates.jsx';
import TransactionHistory from '../components/wallet/TransactionHistory.jsx';
import CancelBookingModal from '../components/booking/CancelBookingModal.jsx';
import AmenitiesTopNav from '../components/AmenitiesTopNav.jsx';
import { CRow, CCol, CCard, CCardBody, CButton } from '@coreui/react';
import '../styles/_amenities.scss';

const ResidentWalletView = () => {
  const navigate = useNavigate();
  const { activePasses, transactionHistory, balance, loading, error, loadWallet, addMoney, cancelPass } = useResidentWallet();
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Paytm');
  
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const presetAmounts = [500, 1000, 2000, 5000];

  const handleAddMoney = async () => {
    if (!addAmount || isNaN(addAmount) || Number(addAmount) <= 0) return;
    const success = await addMoney(Number(addAmount), paymentMethod);
    if (success) {
      setShowAddMoney(false);
      setAddAmount('');
    }
  };

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const handleCancelClick = (booking) => {
    setBookingToCancel(booking);
  };

  const handleConfirmCancel = async (bookingId, reason) => {
    setIsCancelling(true);
    const success = await cancelPass(bookingId, reason);
    setIsCancelling(false);
    if (success) {
      setBookingToCancel(null);
    }
  };

  return (
    <div className="amenities-module-wrapper amenity-os-theme">
      <AmenitiesTopNav />
      <div className="view-container" style={{ maxWidth: '95%', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ margin: 0 }} className="fs-2">My Wallet</h1>
            <p className="text-muted mt-1 mb-0">Balance: <span className="fw-bold">₹{balance?.toFixed(2) || '0.00'}</span></p>
          </div>
          <div>
            <button className="btn btn-primary" style={{ marginRight: '16px' }} onClick={() => setShowAddMoney(!showAddMoney)}>
              {showAddMoney ? 'Cancel' : 'Add Money'}
            </button>
            <button className="btn btn-outline" style={{ border: 'none', background: 'transparent' }} onClick={() => navigate('/resident/amenities/history')}>
              View All Bookings <i className="fa-solid fa-arrow-right" style={{ marginLeft: '8px' }}></i>
            </button>
          </div>
        </div>

        {showAddMoney && (
          <CCard className="mb-4 border-0 shadow-sm bg-light">
            <CCardBody className="p-4">
              <h5 className="mb-3">Recharge Wallet</h5>
              
              <div className="mb-3 d-flex gap-2 flex-wrap">
                {presetAmounts.map(amount => (
                  <CButton 
                    key={amount} 
                    color="secondary" 
                    variant={Number(addAmount) === amount ? '' : 'outline'}
                    onClick={() => setAddAmount(amount.toString())}
                  >
                    + ₹{amount}
                  </CButton>
                ))}
              </div>

              <div className="row g-3 align-items-end">
                <div className="col-md-4">
                  <label className="form-label text-muted small">Custom Amount (₹)</label>
                  <input type="number" className="form-control" placeholder="0.00" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label text-muted small">Payment Method</label>
                  <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="Paytm">Paytm</option>
                    <option value="Google Pay">Google Pay</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <button className="btn btn-success text-white w-100" onClick={handleAddMoney} disabled={loading || !addAmount || Number(addAmount) <= 0}>
                    {loading ? 'Processing...' : 'Proceed'}
                  </button>
                </div>
              </div>
            </CCardBody>
          </CCard>
        )}

        <h4 style={{ marginBottom: '16px' }} className="fs-5">Active Access Passes</h4>
        
        {loading && activePasses.length === 0 ? (
          <CCard className="mb-4 border-0 shadow-sm"><CCardBody><WalletLoading /></CCardBody></CCard>
        ) : error ? (
          <CCard className="mb-4 border-0 shadow-sm"><CCardBody><WalletError message={error} /></CCardBody></CCard>
        ) : activePasses.length === 0 ? (
          <CCard className="mb-4 border-0 shadow-sm"><CCardBody><WalletEmptyState /></CCardBody></CCard>
        ) : (
          <CRow className="g-4 mb-4">
            {activePasses.map((pass) => (
              <CCol xs={12} md={6} lg={4} key={pass._id}>
                <div className="wallet-pass-container h-100">
                  <QrPassCard booking={pass} onCancel={handleCancelClick} />
                </div>
              </CCol>
            ))}
          </CRow>
        )}

        <h4 style={{ marginBottom: '16px', marginTop: '24px' }} className="fs-5">Transaction History</h4>
        <TransactionHistory transactions={transactionHistory} loading={loading} />

      </div>

      <CancelBookingModal 
        visible={!!bookingToCancel} 
        onClose={() => setBookingToCancel(null)} 
        onConfirm={handleConfirmCancel} 
        booking={bookingToCancel} 
        isSubmitting={isCancelling} 
      />
    </div>
  );
};

export default ResidentWalletView;
