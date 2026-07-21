import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createRazorpayOrder, verifyRazorpayPayment } from '../store/walletSlice';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';

const WalletRechargeModal = ({ show, onHide }) => {
  const dispatch = useDispatch();
  const [amount, setAmount] = useState('');
  const { isLoading, error } = useSelector(state => state.wallet);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRecharge = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;

    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) return alert('Razorpay SDK failed to load. Are you online?');

    const orderAction = await dispatch(createRazorpayOrder({ amount: Number(amount) }));
    
    if (orderAction.meta.requestStatus === 'fulfilled') {
      const order = orderAction.payload.data || orderAction.payload;

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY', 
        amount: order.amount,
        currency: order.currency,
        name: 'Gated Community Wallet',
        description: 'Wallet Recharge',
        order_id: order.id,
        handler: async function (response) {
          const verificationData = {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            amount: Number(amount)
          };
          const verifyAction = await dispatch(verifyRazorpayPayment(verificationData));
          if (verifyAction.meta.requestStatus === 'fulfilled') {
            onHide();
            setAmount('');
          }
        },
        theme: { color: '#0d6efd' }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response){
        alert(response.error.description);
      });
      rzp.open();
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Recharge Wallet</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleRecharge}>
          <Form.Group className="mb-3">
            <Form.Label>Amount (₹)</Form.Label>
            <Form.Control 
              type="number" 
              placeholder="Enter amount" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              required
            />
          </Form.Group>
          <Button variant="primary" type="submit" disabled={isLoading} className="w-100">
            {isLoading ? <Spinner size="sm" animation="border" /> : 'Proceed to Pay'}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default WalletRechargeModal;
