import mongoose from 'mongoose';
import { extractReceipt } from './personalExpenseOcr.service.js';
import { receiptUploadDir } from './personalExpenseUpload.middleware.js';
import { resolveSecureFilePath, unlinkSafe } from '../../utils/storage.utils.js';
import HttpError from '../../utils/httpError.utils.js';
import repo from './personalExpense.repository.js';
import { DEFAULT_CATEGORIES, DEFAULT_CATEGORY_IDS } from './personalExpense.constants.js';

const clean = (value = '') => String(value).trim().replace(/\s+/g, ' ');
const normalized = (value) => clean(value).toLowerCase();
export const toMinorUnits = (amount) => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new HttpError(400, 'Amount must be greater than zero.');
  const minor = Math.round((value + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(minor)) throw new HttpError(400, 'Amount is invalid.');
  return minor;
};
export const periodBounds = (period) => ({ start: `${period}-01`, end: `${period}-${String(new Date(Date.UTC(+period.slice(0, 4), +period.slice(5, 7), 0)).getUTCDate()).padStart(2, '0')}` });
export const categoryCatalog = (custom = []) => [...DEFAULT_CATEGORIES.map((category) => ({ ...category, isDefault: true })), ...custom.map((category) => ({ id: String(category._id), name: category.name, type: category.type, isDefault: false }))];

export class PersonalExpenseService {
  constructor(repository = repo) { this.repo = repository; }

  scope(user) {
    const userId = user?.id || user?._id;
    const orgId = user?.orgId;
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(orgId)) throw new HttpError(400, 'A valid workspace context is required.');
    return { userId, orgId };
  }

  async category(scope, id, type) {
    const preset = DEFAULT_CATEGORIES.find((category) => category.id === id && category.type === type);
    if (preset) return preset;
    if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid category.');
    const custom = await this.repo.findCategory(scope, id);
    if (!custom || custom.type !== type) throw new HttpError(400, 'Invalid category.');
    return { id: String(custom._id), name: custom.name, type };
  }

  async duplicateWarning(scope, transaction, excludedId) {
    const matches = await this.repo.findDuplicates({ ...scope, isDeleted: false, type: transaction.type, amountMinor: transaction.amountMinor, transactionDate: transaction.transactionDate, paymentMethod: transaction.paymentMethod, merchantNormalized: transaction.merchantNormalized }, excludedId);
    return { duplicateWarning: matches.length > 0, possibleDuplicates: matches };
  }

  async createTransaction(user, body) {
    const scope = this.scope(user);
    const category = await this.category(scope, body.categoryId, body.type);
    const merchantOrSource = clean(body.merchantOrSource);
    const transaction = { ...scope, type: body.type, amountMinor: toMinorUnits(body.amount), categoryId: category.id, categoryName: category.name, transactionDate: body.transactionDate, paymentMethod: body.paymentMethod, paymentSettlement: body.paymentSettlement, merchantOrSource, merchantNormalized: normalized(merchantOrSource), notes: clean(body.notes), reference: body.reference ? clean(body.reference) : null };
    const warning = await this.duplicateWarning(scope, transaction);
    return { transaction: await this.repo.createTransaction(transaction), ...warning };
  }

  async updateTransaction(user, id, body) {
    const scope = this.scope(user);
    const existing = await this.repo.findTransaction({ ...scope, isDeleted: false }, id);
    if (!existing) throw new HttpError(404, 'Transaction not found.');
    const type = body.type || existing.type;
    const categoryId = body.categoryId || existing.categoryId;
    const category = await this.category(scope, categoryId, type);
    const merchantOrSource = Object.hasOwn(body, 'merchantOrSource') ? clean(body.merchantOrSource) : existing.merchantOrSource;
    const update = {
      type,
      categoryId: category.id,
      categoryName: category.name,
      amountMinor: Object.hasOwn(body, 'amount') ? toMinorUnits(body.amount) : existing.amountMinor,
      transactionDate: body.transactionDate || existing.transactionDate,
      paymentMethod: body.paymentMethod || existing.paymentMethod,
      paymentSettlement: body.paymentSettlement || existing.paymentSettlement || 'UNPAID',
      merchantOrSource,
      merchantNormalized: normalized(merchantOrSource),
      notes: Object.hasOwn(body, 'notes') ? clean(body.notes) : existing.notes,
      reference: Object.hasOwn(body, 'reference') ? (body.reference ? clean(body.reference) : null) : existing.reference,
    };
    const warning = await this.duplicateWarning(scope, update, id);
    return { transaction: await this.repo.updateTransaction({ ...scope, isDeleted: false }, id, update), ...warning };
  }

  async uploadReceipt(user, id, file) {
    const scope = this.scope(user);
    const transaction = await this.repo.findTransaction({ ...scope, isDeleted: false }, id);
    if (!transaction) throw new HttpError(404, 'Transaction not found.');
    if (transaction.paymentSettlement !== 'PAID') { unlinkSafe(file?.path); throw new HttpError(400, 'A receipt can only be attached to a paid transaction.'); }
    const previous = transaction.receipt?.storageName;
    const receipt = { storageName: file.filename, originalName: String(file.originalname || 'receipt').slice(0, 180), mimeType: file.mimetype, size: file.size, uploadedAt: new Date(), ocrStatus: 'PROCESSING', ocrEngineStatus: 'PROCESSING', ocrError: null, ocr: null };
    await this.repo.updateTransaction({ ...scope, isDeleted: false }, id, { receipt });
    if (previous) { try { unlinkSafe(resolveSecureFilePath(receiptUploadDir, previous)); } catch {} }
    const outcome = await extractReceipt(file);
    const updated = await this.repo.updateTransaction({ ...scope, isDeleted: false }, id, { receipt: { ...receipt, ocrStatus: outcome.status, ocrEngineStatus: outcome.engineStatus || outcome.status, ocrError: outcome.error, ocr: outcome.result } });
    return updated;
  }

  async retryReceiptOcr(user, id) {
    const scope = this.scope(user);
    const transaction = await this.repo.findTransaction({ ...scope, isDeleted: false }, id);
    if (!transaction?.receipt?.storageName) throw new HttpError(404, 'Receipt not found.');
    const receipt = transaction.receipt.toObject?.() || transaction.receipt;
    const path = resolveSecureFilePath(receiptUploadDir, receipt.storageName);
    const processing = { ...receipt, ocrStatus: 'PROCESSING', ocrEngineStatus: 'PROCESSING', ocrError: null, ocr: null };
    await this.repo.updateTransaction({ ...scope, isDeleted: false }, id, { receipt: processing });
    const outcome = await extractReceipt({ path, mimetype: receipt.mimeType, originalname: receipt.originalName, size: receipt.size });
    return this.repo.updateTransaction({ ...scope, isDeleted: false }, id, {
      receipt: { ...processing, ocrStatus: outcome.status, ocrEngineStatus: outcome.engineStatus || outcome.status, ocrError: outcome.error, ocr: outcome.result },
    });
  }

  async updateReceiptReview(user, id, body) {
    const scope = this.scope(user);
    const transaction = await this.repo.findTransaction({ ...scope, isDeleted: false }, id);
    if (!transaction?.receipt) throw new HttpError(404, 'Receipt not found.');
    const ocr = { ...(transaction.receipt.ocr?.toObject?.() || transaction.receipt.ocr || {}), ...Object.fromEntries(Object.entries({ merchant: body.merchant, merchantAddress: body.merchantAddress, receiptNumber: body.receiptNumber, invoiceNumber: body.invoiceNumber, billNumber: body.billNumber, transactionId: body.transactionId, orderId: body.orderId, documentType: body.documentType, receiptDate: body.receiptDate, currency: body.currency, subtotalMinor: body.subtotalMinor, taxMinor: body.taxMinor, discountMinor: body.discountMinor, additionalChargesMinor: body.additionalChargesMinor, totalMinor: body.totalMinor, items: body.items }).filter(([, value]) => value !== undefined)), ...(body.confirmed ? { confirmedAt: new Date() } : {}) };
    return this.repo.updateTransaction({ ...scope, isDeleted: false }, id, { 'receipt.ocr': ocr, 'receipt.ocrStatus': 'COMPLETED', 'receipt.ocrEngineStatus': 'REVIEWED', 'receipt.ocrError': null });
  }

  async removeReceipt(user, id) {
    const scope = this.scope(user);
    const transaction = await this.repo.findTransaction({ ...scope, isDeleted: false }, id);
    if (!transaction?.receipt) throw new HttpError(404, 'Receipt not found.');
    const name = transaction.receipt.storageName;
    const updated = await this.repo.updateTransaction({ ...scope, isDeleted: false }, id, { receipt: null });
    try { unlinkSafe(resolveSecureFilePath(receiptUploadDir, name)); } catch {}
    return updated;
  }

  async receiptFile(user, id) {
    const transaction = await this.repo.findTransaction({ ...this.scope(user), isDeleted: false }, id);
    if (!transaction?.receipt?.storageName) throw new HttpError(404, 'Receipt not found.');
    return { transaction, path: resolveSecureFilePath(receiptUploadDir, transaction.receipt.storageName) };
  }

  async previewReceipt(user, file) {
    try {
      const outcome = await extractReceipt(file);
      return outcome;
    } finally {
      try { unlinkSafe(file?.path); } catch {}
    }
  }
  async listTransactions(user, query) {
    const scope = this.scope(user);
    const filter = { ...scope, isDeleted: false };
    if (query.type) filter.type = query.type;
    if (query.categoryId) filter.categoryId = query.categoryId;
    if (query.startDate || query.endDate) filter.transactionDate = { ...(query.startDate ? { $gte: query.startDate } : {}), ...(query.endDate ? { $lte: query.endDate } : {}) };
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const result = await this.repo.listTransactions(filter, { skip: (page - 1) * limit, limit });
    return { ...result, page, limit, totalPages: Math.ceil(result.total / limit) };
  }

  async getTransaction(user, id) { const result = await this.repo.findTransaction({ ...this.scope(user), isDeleted: false }, id); if (!result) throw new HttpError(404, 'Transaction not found.'); return result; }
  async deleteTransaction(user, id) { const result = await this.repo.updateTransaction({ ...this.scope(user), isDeleted: false }, id, { isDeleted: true, deletedAt: new Date() }); if (!result) throw new HttpError(404, 'Transaction not found.'); return result; }
  listCategories(user) { return this.repo.listCategories(this.scope(user)).then(categoryCatalog); }
  async createCategory(user, body) { const scope = this.scope(user); const name = clean(body.name); if (!name) throw new HttpError(400, 'Category name is required.'); return this.repo.createCategory({ ...scope, name, normalizedName: name.toLowerCase(), type: body.type }); }
  async deleteCategory(user, id) { if (DEFAULT_CATEGORY_IDS.has(id)) throw new HttpError(400, 'Default categories cannot be deleted.'); const result = await this.repo.archiveCategory(this.scope(user), id); if (!result) throw new HttpError(404, 'Category not found.'); return result; }
  listBudgets(user, period) { return this.repo.listBudgets({ ...this.scope(user), period }); }
  async upsertBudget(user, body) { const scope = this.scope(user); if (body.categoryId) await this.category(scope, body.categoryId, 'EXPENSE'); return this.repo.upsertBudget({ ...scope, period: body.period }, body.categoryId, toMinorUnits(body.amount)); }
  async deleteBudget(user, period, categoryId) { const result = await this.repo.deleteBudget({ ...this.scope(user), period }, categoryId); if (!result) throw new HttpError(404, 'Budget not found.'); return result; }

  async dashboard(user, period) {
    const scoped = { ...this.scope(user), isDeleted: false };
    const dates = periodBounds(period);
    const [totals, categories, budgets, recent] = await Promise.all([this.repo.totals(scoped, dates.start, dates.end), this.repo.categoryTotals(scoped, dates.start, dates.end), this.repo.listBudgets({ userId: scoped.userId, orgId: scoped.orgId, period }), this.repo.listTransactions(scoped, { skip: 0, limit: 5 })]);
    const sums = Object.fromEntries(totals.map((entry) => [entry._id, entry.amountMinor]));
    return { period, incomeMinor: sums.INCOME || 0, expenseMinor: sums.EXPENSE || 0, balanceMinor: (sums.INCOME || 0) - (sums.EXPENSE || 0), categoryBreakdown: categories, budgets, recentTransactions: recent.items };
  }
}
export default new PersonalExpenseService();