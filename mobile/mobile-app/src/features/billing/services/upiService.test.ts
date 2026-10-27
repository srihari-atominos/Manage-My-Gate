import {
  buildAndroidIntentUri,
  buildGenericUpiUri,
  buildUpiUri,
  launchUpi,
  parseUpiReturnResponse,
  validateUpiId,
  UPI_APPS,
} from './upiService';
describe('UPI request construction', () => {
  it('encodes payee, amount and description safely', () => { const uri = buildUpiUri({ vpa: 'vendor.test@upi', name: 'A & B', amount: 1250.5, reference: 'NAHOM-1', note: 'CCTV & pump' }); expect(uri).toContain('pa=vendor.test%40upi'); expect(uri).toContain('am=1250.50'); expect(uri).toContain('pn=A+%26+B'); expect(uri).toContain('tn=CCTV+%26+pump'); });
  it('supports app-specific schemes like tez, phonepe, paytmmp, and bhim', () => {
    const tez = buildUpiUri({ vpa: 'vendor@upi', name: 'Vendor', amount: 50, reference: 'REF-1', note: 'Test', scheme: 'tez' });
    expect(tez).toMatch(/^tez:\/\/upi\/pay\?/);
    const phonepe = buildUpiUri({ vpa: 'vendor@upi', name: 'Vendor', amount: 50, reference: 'REF-1', note: 'Test', scheme: 'phonepe' });
    expect(phonepe).toMatch(/^phonepe:\/\/upi\/pay\?/);
  });
  it('constructs Android intent URIs with specific package targeting', () => {
    const intent = buildAndroidIntentUri({ vpa: 'vendor@upi', name: 'Vendor', amount: 100, reference: 'REF-2', note: 'Items', packageName: 'com.google.android.apps.nbu.paisa.user' });
    expect(intent).toContain('package=com.google.android.apps.nbu.paisa.user');
    expect(intent).toContain('scheme=upi');
  });
  it('includes all major Indian UPI external payment applications in UPI_APPS', () => {
    const values = UPI_APPS.map((a) => a.value);
    expect(values).toContain('OTHER_UPI_APP');
    expect(values).toContain('GOOGLE_PAY');
    expect(values).toContain('PHONEPE');
    expect(values).toContain('PAYTM');
    expect(values).toContain('BHIM');
    expect(values).toContain('CRED');
  });
  it('rejects invalid VPAs and amounts', () => { expect(validateUpiId('not-a-vpa')).toBe(false); expect(() => buildUpiUri({ vpa: 'not-a-vpa', name: 'Vendor', amount: 10, reference: 'x', note: 'x' })).toThrow(); expect(() => buildUpiUri({ vpa: 'vendor@upi', name: 'Vendor', amount: 0, reference: 'x', note: 'x' })).toThrow(); });
  it('constructs generic UPI URIs without throwing when amount or vpa are omitted', () => {
    const genericUri = buildGenericUpiUri({ note: 'Lift Repair' });
    expect(genericUri).toContain('upi://pay?');
    expect(genericUri).toContain('cu=INR');
    expect(genericUri).toContain('tn=Lift+Repair');
  });
});


describe('UPI return response parsing', () => {
  it('parses a successful response and available references', () => {
    expect(parseUpiReturnResponse('nahom://upi-return?Status=SUCCESS&txnId=tx-1&ApprovalRefNo=utr-1&responseCode=00')).toMatchObject({ status: 'SUCCESS', transactionId: 'tx-1', approvalRefNo: 'utr-1', responseCode: '00' });
  });
  it('maps failed and cancelled responses without requiring a reference', () => {
    expect(parseUpiReturnResponse('nahom://upi-return?status=FAILURE&errCode=U01')?.status).toBe('FAILED');
    expect(parseUpiReturnResponse('nahom://upi-return?status=CANCELLED')?.status).toBe('CANCELLED');
  });
  it('defensively handles missing and malformed response data', () => {
    expect(parseUpiReturnResponse(null)).toBeNull();
    expect(parseUpiReturnResponse('nahom://upi-return?status=%E0%A4%A&txnId=')).toMatchObject({ status: 'UNKNOWN' });
    expect(parseUpiReturnResponse('nahom://upi-return?foo=bar')).toBeNull();
  });
});

describe('launchUpi external payment apps navigation', () => {
  it('launches external payment application cleanly without throwing on valid uri', async () => {
    const uri = buildUpiUri({
      vpa: 'vendor@upi',
      name: 'Vendor',
      amount: 100,
      reference: 'REF-3',
      note: 'Payment',
    });
    const result = await launchUpi(uri, 'upi', 'attempt-123');
    // Result resolves without throwing, triggering direct external intent
    expect(result === null || typeof result === 'object').toBe(true);
  });
});
