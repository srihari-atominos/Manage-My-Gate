import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import storage from '../../../utils/storage';
import apiClient, { getApiBaseUrl } from '../../../services/apiClient';
const unwrap = (response:any) => { const body = response?.success !== undefined ? response : response?.data; return body?.data || body; };

export async function receiptFormData(field: 'receipt' | 'attachment', file: any, platform = Platform.OS): Promise<FormData> {
  const form = new FormData();
  let name = file?.name || '';
  let type = file?.type || file?.mimeType || 'image/jpeg';
  if (type === 'image/jpg') type = 'image/jpeg';

  const extMatch = name.includes('.') ? name.split('.').pop()?.toLowerCase() : '';
  if (!extMatch || !['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(extMatch)) {
    const derivedExt = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('pdf') ? 'pdf' : 'jpg';
    name = `${(name || field).replace(/\.[^/.]+$/, '')}-${Date.now()}.${derivedExt}`;
  }

  if (platform === 'web') {
    // A browser FormData must receive a File or Blob, not a React Native URI object.
    let browserFile = file?.file;
    if (!browserFile && file?.uri) {
      try {
        const response = await fetch(file.uri);
        browserFile = await response.blob();
      } catch (e) {
        console.warn('Failed to fetch blob from uri:', e);
      }
    }
    if (!browserFile) throw new Error('The selected receipt file is unavailable.');
    form.append(field, browserFile, name);
  } else {
    form.append(field, { uri: file.uri, name, type } as any);
  }

  return form;
}

export interface ExpenseCategoryBreakdown {
  category: string;
  amount: number;
  recordedPaid: number;
  unpaidBalance: number;
  count: number;
  percentage: number;
}

export interface ExpenseComparison {
  previousTotal: number;
  difference: number;
  percentageChange: number | null;
  trendDirection: 'up' | 'down' | 'flat';
}

export interface ExpenseSummaryData {
  period?: string;
  startDate?: string | null;
  endDate?: string | null;
  totalExpenses?: number;
  recordedPaid?: number;
  unpaidBalance?: number;
  todayExpenses?: number;
  allTimeExpenses?: number;
  allTimeCount?: number;
  expenseCount?: number;
  categoryBreakdown?: ExpenseCategoryBreakdown[];
  typeBreakdown?: Array<{ type: string; amount: number; count: number }>;
  comparison?: ExpenseComparison;
}

export const expenseService = {
  async list(params: any = {}) { return unwrap(await apiClient.get('/expenses', { params })); },
  async summary(params: any = {}): Promise<ExpenseSummaryData> { return unwrap(await apiClient.get('/expenses/summary', { params })); },
  async exportExpensesReport(params: Record<string, any>, format: 'csv' | 'xlsx' | 'pdf'): Promise<Blob> {
    const res: any = await apiClient.get('/expenses/export', {
      params: { ...params, format },
      responseType: 'blob',
    });
    return res as Blob;
  },
  async getOnlinePayee() { return unwrap(await apiClient.get('/expenses/online-payee')); },
  async create(payload:any) { return unwrap(await apiClient.post('/expenses', payload)); },
  async previewReceiptOcr(file: any) {
    const formData = await receiptFormData('receipt', file);
    try {
      const res: any = unwrap(await apiClient.post('/expenses/receipt-ocr/preview', formData));
      if (res?.status === 'NOT_CONFIGURED' && Platform.OS === 'web' && typeof window !== 'undefined') {
        const candidateHosts = [window.location.hostname || 'localhost', '127.0.0.1', 'localhost'].filter(
          (h, i, arr) => arr.indexOf(h) === i
        );
        for (const host of candidateHosts) {
          try {
            const localFormData = await receiptFormData('receipt', file);
            const localUrl = `http://${host}:5006/api/v1/expenses/receipt-ocr/preview`;
            const localRes: any = unwrap(await apiClient.post(localUrl, localFormData));
            if (localRes?.status === 'COMPLETED' || localRes?.result) {
              return localRes;
            }
          } catch {}
        }
      }
      return res;
    } catch (err: any) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const candidateHosts = [window.location.hostname || 'localhost', '127.0.0.1', 'localhost'].filter(
          (h, i, arr) => arr.indexOf(h) === i
        );
        for (const host of candidateHosts) {
          try {
            const localFormData = await receiptFormData('receipt', file);
            const localUrl = `http://${host}:5006/api/v1/expenses/receipt-ocr/preview`;
            const localRes: any = unwrap(await apiClient.post(localUrl, localFormData));
            if (localRes?.status === 'COMPLETED' || localRes?.result) {
              return localRes;
            }
          } catch {}
        }
      }
      throw err;
    }
  },
  async get(id:string) { return unwrap(await apiClient.get(`/expenses/${id}`)); },
  async uploadAttachment(id:string, file:any) { return unwrap(await apiClient.post(`/expenses/${id}/attachments`, await receiptFormData('attachment', file))); },
  async recordPayment(id:string, payload:any) { return unwrap(await apiClient.post(`/expenses/${id}/payments`, payload)); },
  async createPaymentAttempt(id:string, payload:any) { return unwrap(await apiClient.post(`/expenses/${id}/payment-attempts`, payload)); },
  async getPaymentAttempt(id:string, paymentId:string) { return unwrap(await apiClient.get(`/expenses/${id}/payment-attempts/${paymentId}`)); },
  async updatePaymentAttemptOutcome(id:string, paymentId:string, payload:any) { return unwrap(await apiClient.post(`/expenses/${id}/payment-attempts/${paymentId}/outcome`, payload)); },
  async reconcilePayment(id:string, paymentId:string, payload:any) { return unwrap(await apiClient.post(`/expenses/${id}/payments/${paymentId}/reconcile`, payload)); },
  async downloadAttachment(id:string, attachment:any) {
    const token = await storage.getItem('token');
    if (!token) throw new Error('Session expired. Please log in again.');
    const url = `${getApiBaseUrl()}${attachment.url}`;

    if (Platform.OS === 'web') {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error(`Could not open file (server returned ${response.status})`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      if (typeof window !== 'undefined') {
        window.open(blobUrl, '_blank');
      }
      return blobUrl;
    }

    const base = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (!base) throw new Error('Local file storage is unavailable on this device.');
    const target = `${base}expense-${attachment._id}-${attachment.filename || 'attachment'}`;
    const result = await FileSystem.downloadAsync(url, target, { headers: { Authorization: `Bearer ${token}` } });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(result.uri, {
        mimeType: attachment.mimeType || 'application/octet-stream',
        dialogTitle: attachment.filename || 'Expense attachment',
      });
    }
    return result.uri;
  },
};
export default expenseService;
