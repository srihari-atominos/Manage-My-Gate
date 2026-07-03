import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useResidentWallet from '../hooks/useResidentWallet.js';
import QrPassCard from '../components/wallet/QrPassCard.jsx';
import BookingDetailsCard from '../components/wallet/BookingDetailsCard.jsx';
import WalletEmptyState from '../components/wallet/WalletEmptyState.jsx';
import { WalletLoading, WalletError } from '../components/wallet/WalletStates.jsx';
import AmenitiesTopNav from '../components/AmenitiesTopNav.jsx';
import '../styles/_amenities.scss';

const ResidentWalletView = () => {
  const navigate = useNavigate();
  const { activeBooking, loading, error, loadWallet } = useResidentWallet();

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  return (
    <div className="amenities-module-wrapper amenity-os-theme">
      <AmenitiesTopNav />
      <div className="view-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', margin: 0 }}>My Wallet</h1>
          <button className="btn btn-outline" style={{ border: 'none', background: 'transparent' }} onClick={() => navigate('/resident/amenities/calendar')}>
            View All Bookings <i className="fa-solid fa-arrow-right" style={{ marginLeft: '8px' }}></i>
          </button>
        </div>

        <div className="card">
          <h4 style={{ marginBottom: '24px', fontSize: '18px' }}>Active QR Pass</h4>
          {loading && !activeBooking ? (
            <WalletLoading />
          ) : error ? (
            <WalletError message={error} />
          ) : !activeBooking ? (
            <WalletEmptyState />
          ) : (
            <div className="wallet-pass-container">
              <QrPassCard booking={activeBooking} />
              <BookingDetailsCard booking={activeBooking} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResidentWalletView;
