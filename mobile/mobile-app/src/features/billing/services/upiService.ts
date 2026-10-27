import { Linking, NativeModules, Platform } from 'react-native';

export type UpiReturnStatus = 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'UNKNOWN';
export type UpiReturnResponse = {
  raw: string;
  status: UpiReturnStatus;
  transactionId?: string;
  referenceId?: string;
  responseCode?: string;
  approvalRefNo?: string;
  errorCode?: string;
};

const firstValue = (values: Record<string, string>, keys: string[]) =>
  keys
    .map((key) => values[key.toLowerCase()])
    .find((value) => value !== undefined && value !== '');

export function parseUpiReturnResponse(raw: unknown): UpiReturnResponse | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const source = raw.trim();
  const values: Record<string, string> = {};
  const query = source.includes('?') ? source.split('?')[1].split('#')[0] : source;
  query.split('&').forEach((part) => {
    if (!part) return;
    const [key, ...rest] = part.split('=');
    if (!key) return;
    try {
      values[decodeURIComponent(key).toLowerCase()] = decodeURIComponent(
        rest.join('=').replace(/\+/g, ' ')
      );
    } catch {
      /* malformed fields are ignored */
    }
  });
  const hasResponseField = [
    'status',
    'upistatus',
    'result',
    'txnid',
    'transactionid',
    'transaction_id',
    'txn',
    'txnref',
    'txn_ref',
    'referenceid',
    'reference_id',
    'responsecode',
    'response_code',
    'code',
    'approvalrefno',
    'approval_ref_no',
    'approvalref',
    'errorcode',
    'error_code',
    'errcode',
  ].some((key) => values[key] !== undefined);
  if (!hasResponseField) return null;
  const rawStatus = (
    firstValue(values, ['status', 'upistatus', 'result']) || ''
  ).toLowerCase();
  const responseCode = firstValue(values, ['responsecode', 'response_code', 'code']);
  const errorCode = firstValue(values, ['errorcode', 'error_code', 'errcode']);
  const status: UpiReturnStatus =
    ['success', 'successful', 'completed', 'succeeded'].includes(rawStatus) ||
    responseCode === '00'
      ? 'SUCCESS'
      : ['failure', 'failed', 'fail', 'error'].includes(rawStatus) || Boolean(errorCode)
      ? 'FAILED'
      : ['cancel', 'cancelled', 'canceled'].includes(rawStatus)
      ? 'CANCELLED'
      : 'UNKNOWN';
  return {
    raw: source,
    status,
    transactionId: firstValue(values, ['txnid', 'transactionid', 'transaction_id', 'txn']),
    referenceId: firstValue(values, ['txnref', 'txn_ref', 'referenceid', 'reference_id']),
    responseCode,
    approvalRefNo: firstValue(values, ['approvalrefno', 'approval_ref_no', 'approvalref']),
    errorCode,
  };
}

export const UPI_APPS = [
  {
    label: 'All Payment Apps (Chooser)',
    value: 'OTHER_UPI_APP',
    scheme: 'upi',
    packageName: '',
    description: 'Universal chooser for Google Pay, PhonePe, Paytm, BHIM, etc.',
  },
  {
    label: 'Google Pay',
    value: 'GOOGLE_PAY',
    scheme: 'tez',
    packageName: 'com.google.android.apps.nbu.paisa.user',
    description: 'Pay directly via Google Pay (GPay)',
  },
  {
    label: 'PhonePe',
    value: 'PHONEPE',
    scheme: 'phonepe',
    packageName: 'com.phonepe.app',
    description: 'Pay directly via PhonePe',
  },
  {
    label: 'Paytm',
    value: 'PAYTM',
    scheme: 'paytmmp',
    packageName: 'net.one97.paytm',
    description: 'Pay directly via Paytm UPI',
  },
  {
    label: 'BHIM UPI',
    value: 'BHIM',
    scheme: 'bhim',
    packageName: 'in.org.npci.upiapp',
    description: 'Pay directly via official NPCI BHIM app',
  },
  {
    label: 'CRED',
    value: 'CRED',
    scheme: 'cred',
    packageName: 'com.dreamplug.androidapp',
    description: 'Pay directly via CRED UPI',
  },
] as const;

export type UpiAppOption = (typeof UPI_APPS)[number];

export function validateUpiId(value: string) {
  return /^[A-Za-z0-9._-]{2,256}@[A-Za-z0-9.-]{2,64}$/.test(
    String(value || '').trim()
  );
}

export function buildUpiUri(input: {
  vpa?: string;
  name?: string;
  amount?: number;
  reference?: string;
  note?: string;
  scheme?: string;
  allowEmpty?: boolean;
}) {
  if (input.vpa !== undefined && input.vpa !== '') {
    if (!validateUpiId(input.vpa)) throw new Error('Enter a valid vendor UPI ID.');
  } else if (!input.allowEmpty) {
    if (!validateUpiId(input.vpa || '')) throw new Error('Enter a valid vendor UPI ID.');
  }

  if (input.amount !== undefined) {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      if (!input.allowEmpty) {
        throw new Error('Payment amount must be greater than zero.');
      }
    }
  } else if (!input.allowEmpty) {
    throw new Error('Payment amount must be greater than zero.');
  }

  const params: Record<string, string> = {
    cu: 'INR',
  };
  if (input.vpa && validateUpiId(input.vpa)) {
    params.pa = input.vpa.trim();
  }
  if (input.name?.trim()) {
    params.pn = input.name.trim();
  }
  if (input.amount && input.amount > 0) {
    params.am = input.amount.toFixed(2);
  }
  if (input.reference?.trim()) {
    params.tr = input.reference.trim();
  }
  if (input.note?.trim()) {
    params.tn = input.note.trim();
  }

  const q = new URLSearchParams(params);
  const prefix = input.scheme && input.scheme !== 'upi'
    ? `${input.scheme}://upi/pay?`
    : 'upi://pay?';
  return prefix + q.toString();
}

export function buildGenericUpiUri(input: {
  scheme?: string;
  note?: string;
  vpa?: string;
  name?: string;
  amount?: number;
  reference?: string;
}) {
  return buildUpiUri({
    vpa: input.vpa,
    name: input.name,
    amount: input.amount,
    reference: input.reference,
    note: input.note,
    scheme: input.scheme,
    allowEmpty: true,
  });
}

export function buildAndroidIntentUri(input: {
  vpa: string;
  name: string;
  amount: number;
  reference: string;
  note: string;
  packageName?: string;
}) {
  const q = new URLSearchParams({
    pa: input.vpa.trim(),
    pn: input.name.trim(),
    am: input.amount.toFixed(2),
    cu: 'INR',
    tr: input.reference,
    tn: input.note.trim(),
  });
  const pkgClause = input.packageName ? `package=${input.packageName};` : '';
  return `intent://pay?${q.toString()}#Intent;scheme=upi;${pkgClause}end`;
}

export const isWeb = Platform.OS === 'web';
export const isDesktopWeb =
  isWeb &&
  typeof navigator !== 'undefined' &&
  (
    /Win32|Win64|MacIntel/i.test(navigator.platform || '') ||
    /Windows NT|Macintosh/i.test(navigator.userAgent || '')
  );

export const isMobileWeb =
  isWeb &&
  !isDesktopWeb &&
  typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');

export async function launchUpi(
  uri: string,
  scheme: string = 'upi',
  attemptId?: string,
  packageName?: string
): Promise<{ raw?: string; attemptId?: string; isWebTriggered?: boolean; isDesktop?: boolean } | null> {
  // 1. If native Android intent handler exists, use it (with package and chooser support)
  if (Platform.OS === 'android' && attemptId && NativeModules.NahomUpi?.launchPayment) {
    try {
      return await NativeModules.NahomUpi.launchPayment(uri, attemptId, packageName || '');
    } catch (nativeErr: any) {
      if (packageName) {
        // Fallback to universal chooser if specific package was not installed
        return await NativeModules.NahomUpi.launchPayment(uri, attemptId, '');
      }
      throw nativeErr;
    }
  }

  // 2. Web Browser:
  // Open external Google Payments platform in a new browser tab/window
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      try {
        const externalPaymentUrl = 'https://payments.google.com/gp/w/u/0/home/signup';
        window.open(externalPaymentUrl, '_blank', 'noopener,noreferrer');
      } catch {}
    }
    return { isWebTriggered: true, attemptId, isDesktop: true };
  }

  // 3. iOS or other native platforms
  try {
    const canOpen = await Linking.canOpenURL(uri);
    if (canOpen) {
      await Linking.openURL(uri);
      return null;
    }
  } catch {}

  try {
    await Linking.openURL(uri);
    return null;
  } catch {
    throw new Error('No compatible UPI application found on this device.');
  }
}

export const isAndroid = Platform.OS === 'android';
