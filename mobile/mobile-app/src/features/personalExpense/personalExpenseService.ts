import apiClient from '@/src/services/apiClient';
import type { Dashboard, PersonalExpenseBudget, PersonalExpenseCategory, PersonalExpenseReceipt, PersonalExpenseTransaction, ReceiptItem, TransactionFilters, TransactionInput, TransactionPage, TransactionWriteResult, TransactionType } from './types';
const unwrap = <T>(response: any): T => { const body = response?.success !== undefined ? response : response?.data; return (body?.data ?? body) as T; };
const params = (value: object) => Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined && item !== null && item !== ''));
export type ReceiptUpload = { uri: string; name: string; type: string; size?: number; file?: File };
export const personalExpenseService = {
  dashboard: async (period: string) => unwrap<Dashboard>(await apiClient.get('/personal-expenses/dashboard', { params: { period } })),
  categories: async () => unwrap<PersonalExpenseCategory[]>(await apiClient.get('/personal-expenses/categories')),
  createCategory: async (name: string, type: TransactionType) => unwrap<PersonalExpenseCategory>(await apiClient.post('/personal-expenses/categories', { name, type })),
  deleteCategory: async (id: string) => unwrap<PersonalExpenseCategory>(await apiClient.delete(`/personal-expenses/categories/${id}`)),
  budgets: async (period: string) => unwrap<PersonalExpenseBudget[]>(await apiClient.get('/personal-expenses/budgets', { params: { period } })),
  saveBudget: async (input: { period: string; categoryId?: string | null; amount: number }) => unwrap<PersonalExpenseBudget>(await apiClient.put('/personal-expenses/budgets', input)),
  deleteBudget: async (period: string, categoryId?: string | null) => unwrap<PersonalExpenseBudget>(await apiClient.delete('/personal-expenses/budgets', { params: params({ period, categoryId }) })),
  transactions: async (filters: TransactionFilters = {}) => unwrap<TransactionPage>(await apiClient.get('/personal-expenses/transactions', { params: params(filters) })),
  transaction: async (id: string) => unwrap<PersonalExpenseTransaction>(await apiClient.get(`/personal-expenses/transactions/${id}`)),
  createTransaction: async (input: TransactionInput) => unwrap<TransactionWriteResult>(await apiClient.post('/personal-expenses/transactions', input)),
  updateTransaction: async (id: string, input: Partial<TransactionInput>) => unwrap<TransactionWriteResult>(await apiClient.patch(`/personal-expenses/transactions/${id}`, input)),
  deleteTransaction: async (id: string) => unwrap<PersonalExpenseTransaction>(await apiClient.delete(`/personal-expenses/transactions/${id}`)),
  uploadReceipt: async (id: string, receipt: ReceiptUpload) => { const data = new FormData(); data.append('receipt', (receipt.file || { uri: receipt.uri, name: receipt.name, type: receipt.type }) as any); return unwrap<PersonalExpenseTransaction>(await apiClient.post(`/personal-expenses/transactions/${id}/receipt`, data)); },
  retryReceiptOcr: async (id: string) => unwrap<PersonalExpenseTransaction>(await apiClient.post(`/personal-expenses/transactions/${id}/receipt/ocr`)),
  updateReceipt: async (id: string, review: { merchant?: string | null; merchantAddress?: string | null; receiptNumber?: string | null; receiptDate?: string | null; currency?: 'INR' | null; subtotalMinor?: number | null; taxMinor?: number | null; discountMinor?: number | null; additionalChargesMinor?: number | null; totalMinor?: number | null; items?: ReceiptItem[]; confirmed?: boolean }) => unwrap<PersonalExpenseTransaction>(await apiClient.patch(`/personal-expenses/transactions/${id}/receipt`, review)),
  deleteReceipt: async (id: string) => unwrap<PersonalExpenseTransaction>(await apiClient.delete(`/personal-expenses/transactions/${id}/receipt`)),
};
export default personalExpenseService;