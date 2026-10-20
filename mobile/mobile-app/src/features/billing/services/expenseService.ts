import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import storage from '../../../utils/storage';
import apiClient, { getApiBaseUrl } from '../../../services/apiClient';
const unwrap = (response:any) => { const body = response?.success !== undefined ? response : response?.data; return body?.data || body; };
export const expenseService = {
  async list(params:any = {}) { return unwrap(await apiClient.get('/expenses', { params })); },
  async summary(params:any = {}) { return unwrap(await apiClient.get('/expenses/summary', { params })); },
  async create(payload:any) { return unwrap(await apiClient.post('/expenses', payload)); },
  async get(id:string) { return unwrap(await apiClient.get(`/expenses/${id}`)); },
  async uploadAttachment(id:string, file:any) { const form:any = new FormData(); form.append('attachment', { uri: file.uri, name: file.name || 'attachment', type: file.type || 'application/octet-stream' } as any); return unwrap(await apiClient.post(`/expenses/${id}/attachments`, form, { headers: { 'Content-Type': 'multipart/form-data' } })); },
  async recordPayment(id:string, payload:any) { return unwrap(await apiClient.post(`/expenses/${id}/payments`, payload)); },
  async reconcilePayment(id:string, paymentId:string, payload:any) { return unwrap(await apiClient.post(`/expenses/${id}/payments/${paymentId}/reconcile`, payload)); },
  async downloadAttachment(id:string, attachment:any) { const token = await storage.getItem('token'); if (!token) throw new Error('Session expired.'); const base = FileSystem.cacheDirectory || FileSystem.documentDirectory; if (!base) throw new Error('Local file storage is unavailable.'); const target = `${base}expense-${attachment._id}-${attachment.filename || 'attachment'}`; const result = await FileSystem.downloadAsync(`${getApiBaseUrl()}${attachment.url}`, target, { headers: { Authorization: `Bearer ${token}` } }); if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(result.uri, { mimeType: attachment.mimeType || 'application/octet-stream', dialogTitle: attachment.filename || 'Expense attachment' }); return result.uri; },
};
export default expenseService;
