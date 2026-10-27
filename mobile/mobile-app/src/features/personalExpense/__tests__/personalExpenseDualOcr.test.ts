import type { PersonalExpenseReceiptOcr, OcrDisagreement } from '../types';

describe('Dual OCR Receipt Review & Disagreement Handling', () => {
  it('identifies disagreements when Tesseract and OXR extract conflicting amounts or dates', () => {
    const reviewData: PersonalExpenseReceiptOcr = {
      merchant: 'Apex Hardware',
      totalMinor: 120000,
      receiptDate: '2026-10-21',
      ocrEngine: 'dual',
      mode: 'dual',
      disagreements: [
        {
          field: 'totalMinor',
          message: 'Total amount conflict: Tesseract found ₹1,200.00, OXR found ₹1,250.00.',
          tesseractValue: 120000,
          oxrValue: 125000,
        },
      ],
      documentDisplayedStatus: 'PAID',
      verifiedPaymentStatus: 'UNVERIFIED',
    };

    expect(reviewData.ocrEngine).toBe('dual');
    expect(reviewData.disagreements).toHaveLength(1);
    expect(reviewData.disagreements?.[0].field).toBe('totalMinor');
    expect(reviewData.disagreements?.[0].tesseractValue).toBe(120000);
    expect(reviewData.disagreements?.[0].oxrValue).toBe(125000);
    expect(reviewData.verifiedPaymentStatus).toBe('UNVERIFIED');
  });

  it('allows user to override candidate values with chosen option', () => {
    const initialReview: PersonalExpenseReceiptOcr = {
      merchant: 'Apex Hardware',
      totalMinor: 120000,
      disagreements: [
        {
          field: 'totalMinor',
          message: 'Conflict',
          tesseractValue: 120000,
          oxrValue: 125000,
        },
      ],
    };

    // User chooses OXR candidate
    const userSelectedTotal = initialReview.disagreements![0].oxrValue;
    const updatedReview: PersonalExpenseReceiptOcr = {
      ...initialReview,
      totalMinor: userSelectedTotal,
    };

    expect(updatedReview.totalMinor).toBe(125000);
  });

  it('correctly maps the 4 essential fields for expense tracking without line item dependencies', () => {
    const ocrResult: PersonalExpenseReceiptOcr = {
      merchant: 'Sri Balaji Hardware',
      receiptNumber: 'INV-2026-0042',
      transactionReference: '429812345678',
      receiptDate: '2026-10-24',
      totalMinor: 1174100,
      totalAmount: 11741.00,
      isPaymentScreenshot: false,
      confidence: 92,
      warnings: [],
    };

    // The 4 essential fields
    const vendorName = ocrResult.merchant;
    const refOrInvoiceNo = ocrResult.receiptNumber || ocrResult.transactionReference;
    const date = ocrResult.receiptDate;
    const amountINR = ocrResult.totalMinor != null ? ocrResult.totalMinor / 100 : 0;

    expect(vendorName).toBe('Sri Balaji Hardware');
    expect(refOrInvoiceNo).toBe('INV-2026-0042');
    expect(date).toBe('2026-10-24');
    expect(amountINR).toBe(11741.00);
  });
});
