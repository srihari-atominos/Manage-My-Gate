import {
  getReceiptOcrAmount,
  getReceiptOcrTransactionReference,
} from '../utils/receiptOcrMapping';

describe('receipt OCR field mapping', () => {
  it('prefers a positive minor-unit total over an invalid display total', () => {
    expect(getReceiptOcrAmount({ totalAmount: 0, totalMinor: 125050 })).toBe('1250.50');
  });

  it('does not populate an amount from zero or invalid OCR values', () => {
    expect(getReceiptOcrAmount({ totalAmount: 0, totalMinor: 'not a number' })).toBeNull();
  });

  it('uses an explicit currency amount from recognized payment-proof text when structured fields are absent', () => {
    expect(getReceiptOcrAmount({
      totalAmount: 0,
      recognizedText: 'Paid to NAVEENKUMAR A\n₹57,658.00\n13 September 2026, 8:20 pm',
    })).toBe('57658.00');
  });

  it('uses an explicit transaction-ID alias when the primary reference is absent', () => {
    expect(getReceiptOcrTransactionReference({ transactionId: '4295 1234 5678' })).toBe('429512345678');
  });

  it('uses only a labelled transaction ID from recognized text', () => {
    expect(getReceiptOcrTransactionReference({
      recognizedText: 'Payment successful\nUPI transaction ID: 4295 1234 5678',
    })).toBe('429512345678');
  });
});
