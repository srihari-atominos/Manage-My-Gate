import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WalletHeroCard } from '../components/WalletHeroCard';
import { FinancialTransactionCard, FinancialTransactionItem } from '../components/FinancialTransactionCard';
import { InvoiceCard } from '../components/InvoiceCard';
import { ResidentDueCard } from '../components/ResidentDueCard';
import { Invoice, UnitDueBreakdown } from '../types';

describe('Financial Feature Group UI Components', () => {
  describe('WalletHeroCard', () => {
    it('renders balance and verified status badge correctly', async () => {
      const mockTopUp = jest.fn();
      const { getByText } = await render(
        <WalletHeroCard balance={4500} onTopUpPress={mockTopUp} />
      ) as any;

      expect(getByText('Available Wallet Balance')).toBeTruthy();
      expect(getByText('₹4,500')).toBeTruthy();
      expect(getByText('Verified Ledger')).toBeTruthy();
      expect(getByText('Add Money to Wallet')).toBeTruthy();
    });

    it('triggers top-up action when CTA is pressed', async () => {
      const mockTopUp = jest.fn();
      const { getByText } = await render(
        <WalletHeroCard balance={1000} onTopUpPress={mockTopUp} />
      ) as any;

      fireEvent.press(getByText('Add Money to Wallet'));
      expect(mockTopUp).toHaveBeenCalledTimes(1);
    });
  });

  describe('FinancialTransactionCard', () => {
    const creditTx: FinancialTransactionItem = {
      _id: 'tx-101',
      type: 'TOP_UP',
      description: 'UPI Wallet Top-Up',
      amount: 2500,
      paymentMethod: 'UPI / GPay',
      status: 'SUCCESS',
      createdAt: '2026-08-20T10:00:00Z',
    };

    const debitTx: FinancialTransactionItem = {
      _id: 'tx-102',
      type: 'DEBIT',
      description: 'Clubhouse Slot Reservation',
      amount: 450,
      paymentMethod: 'WALLET',
      status: 'COMPLETED',
      createdAt: '2026-08-21T15:30:00Z',
    };

    it('renders credit transaction with positive amount and success styling', async () => {
      const { getByText } = await render(
        <FinancialTransactionCard transaction={creditTx} />
      ) as any;

      expect(getByText('UPI Wallet Top-Up')).toBeTruthy();
      expect(getByText('+ ₹2,500')).toBeTruthy();
      expect(getByText('SUCCESS')).toBeTruthy();
    });

    it('renders debit transaction with negative amount format', async () => {
      const { getByText } = await render(
        <FinancialTransactionCard transaction={debitTx} />
      ) as any;

      expect(getByText('Clubhouse Slot Reservation')).toBeTruthy();
      expect(getByText('- ₹450')).toBeTruthy();
      expect(getByText('COMPLETED')).toBeTruthy();
    });
  });

  describe('InvoiceCard & ResidentDueCard', () => {
    const mockInvoice: Invoice = {
      _id: 'inv-001',
      invoiceNumber: 'INV-2026-001',
      unitNumber: '42B',
      targetUser: 'Parthasarathi',
      totalDue: 3500,
      status: 'UNPAID',
      billingPeriodString: 'August 2026',
    };

    const mockDue: UnitDueBreakdown = {
      invoiceId: 'inv-002',
      invoiceNumber: 'INV-2026-002',
      unitNumber: '101A',
      totalDue: 1800,
      status: 'OVERDUE',
      billingPeriodString: 'July 2026',
    };

    it('renders invoice card with formatted liability and unit info', async () => {
      const mockPress = jest.fn();
      const { getByText } = await render(
        <InvoiceCard invoice={mockInvoice} onPress={mockPress} />
      ) as any;

      expect(getByText('INV-2026-001')).toBeTruthy();
      expect(getByText(/Villa 42B • Parthasarathi/)).toBeTruthy();
      expect(getByText('₹3,500')).toBeTruthy();
    });

    it('renders resident due card with liability and pay action', async () => {
      const mockViewDetails = jest.fn();
      const mockPayNow = jest.fn();
      const { getByText } = await render(
        <ResidentDueCard
          item={mockDue}
          onViewDetails={mockViewDetails}
          onPayNow={mockPayNow}
        />
      ) as any;

      expect(getByText('INV-2026-002')).toBeTruthy();
      expect(getByText('₹1,800')).toBeTruthy();
      expect(getByText('OVERDUE')).toBeTruthy();

      fireEvent.press(getByText('Pay Now'));
      expect(mockPayNow).toHaveBeenCalled();
    });
  });
});
