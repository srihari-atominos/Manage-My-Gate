import service from './personalExpense.service.js';
import HttpError from '../../utils/httpError.utils.js';
import { cleanUploadedFiles } from '../../utils/storage.utils.js';

const run = (method, status = 200) => async (req, res, next) => {
  try { res.success(await method(req), 'Success', status); } catch (error) { next(error); }
};

export default {
  dashboard: run((req) => service.dashboard(req.user, req.query.period)),
  list: run((req) => service.listTransactions(req.user, req.query)),
  create: run((req) => service.createTransaction(req.user, req.body), 201),
  get: run((req) => service.getTransaction(req.user, req.params.id)),
  update: run((req) => service.updateTransaction(req.user, req.params.id, req.body)),
  remove: run((req) => service.deleteTransaction(req.user, req.params.id)),
  uploadReceipt: async (req, res, next) => { try { if (!req.file) throw new HttpError(400, 'Receipt file is required.'); res.success(await service.uploadReceipt(req.user, req.params.id, req.file), 'Receipt uploaded', 201); } catch (error) { cleanUploadedFiles(req); next(error); } },
  retryReceipt: run((req) => service.retryReceiptOcr(req.user, req.params.id)),
  updateReceipt: run((req) => service.updateReceiptReview(req.user, req.params.id, req.body)),
  removeReceipt: run((req) => service.removeReceipt(req.user, req.params.id)),
  receiptFile: async (req, res, next) => { try { const result = await service.receiptFile(req.user, req.params.id); res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline' }); res.type(result.transaction.receipt.mimeType); res.sendFile(result.path); } catch (error) { next(error); } },
  categories: run((req) => service.listCategories(req.user)),
  createCategory: run((req) => service.createCategory(req.user, req.body), 201),
  removeCategory: run((req) => service.deleteCategory(req.user, req.params.id)),
  budgets: run((req) => service.listBudgets(req.user, req.query.period)),
  saveBudget: run((req) => service.upsertBudget(req.user, req.body)),
  removeBudget: run((req) => service.deleteBudget(req.user, req.query.period, req.query.categoryId)),
};