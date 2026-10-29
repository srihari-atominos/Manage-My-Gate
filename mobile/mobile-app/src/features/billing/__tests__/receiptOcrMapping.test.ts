import {
  getReceiptOcrAmount,
  getReceiptOcrTransactionReference,
  inferReceiptDetailsFromFilename,
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

  describe('inferReceiptDetailsFromFilename', () => {
    it('extracts vendor and amount from receipt filename', () => {
      const inferred = inferReceiptDetailsFromFilename('payment-receipt-textile-450.jpg');
      expect(inferred.vendor).toBe('Textile');
      expect(inferred.amount).toBe('450.00');
    });

    it('extracts ISO date from receipt filename', () => {
      const inferred = inferReceiptDetailsFromFilename('Electric_Bill_2026-10-25_Rs1200.pdf');
      expect(inferred.vendor).toBe('Electric');
      expect(inferred.date).toBe('2026-10-25');
      expect(inferred.amount).toBe('1200.00');
    });

    it('extracts invoice reference from filename', () => {
      const inferred = inferReceiptDetailsFromFilename('receipt-inv-998811-swiggy.png');
      expect(inferred.invoiceNumber).toBe('998811');
      expect(inferred.vendor).toBe('Swiggy');
    });

    it('returns empty object safely when filename has no meaningful tokens', () => {
      expect(inferReceiptDetailsFromFilename('')).toEqual({});
      expect(inferReceiptDetailsFromFilename('receipt.png')).toEqual({});
      expect(inferReceiptDetailsFromFilename('payment_receipt_test.jpg')).toEqual({});
    });
  });
});
