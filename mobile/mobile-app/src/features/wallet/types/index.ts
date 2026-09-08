export interface WalletTransaction {
  _id: string;
  id?: string;
  transactionId: string;
  type: 'Credit' | 'Debit' | 'CREDIT' | 'DEBIT';
  amount: number;
  paymentMethod?: string;
  paymentStatus?: 'success' | 'refunded' | 'pending' | 'failed';
  referenceType?: 'AmenityBooking' | 'Refund' | 'Invoice' | 'Recharge' | 'Other';
  referenceId?: any;
  amenityName?: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WalletPassItem {
  _id: string;
  bookingId: string;
  amenityName: string;
  amenityImage?: string;
  location?: string;
  residentName?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  qrPayload?: string;
  qrStatus?: string;
  status: string;
  paymentStatus: string;
  pricingDetails?: any;
  amenityRules?: any;
  numberOfPersons?: number;
}

export interface WalletState {
  balance: number;
  activePasses: WalletPassItem[];
  transactionHistory: WalletTransaction[];
  transactions: WalletTransaction[];
  isPaymentGatewayConfigured?: boolean;
  isMockGateway?: boolean;
  loading?: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface WalletRechargeOrder {
  id: string;
  orderId: string;
  paymentId?: string;
  amount: number;
  currency: string;
  status: string;
  key?: string;
  keyId?: string;
  razorpayKeyId?: string;
  isMock?: boolean;
}

export interface WalletVerificationPayload {
  orderId?: string;
  razorpay_order_id?: string;
  razorpayOrderId?: string;
  razorpay_payment_id?: string;
  razorpayPaymentId?: string;
  razorpay_signature?: string;
  razorpaySignature?: string;
  paymentId?: string;
  payment_id?: string;
  amount: number;
}
