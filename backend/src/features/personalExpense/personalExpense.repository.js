import mongoose from 'mongoose';
import Transaction from './personalExpenseTransaction.model.js';
import Category from './personalExpenseCategory.model.js';
import Budget from './personalExpenseBudget.model.js';

const toObjectId = (val) => (val && mongoose.isValidObjectId(val) ? new mongoose.Types.ObjectId(val) : val);

export class PersonalExpenseRepository {
  createTransaction(data) { return Transaction.create(data); }
  findTransaction(scope, id) { return Transaction.findOne({ ...scope, _id: id }); }
  findTransactionByReference(scope, reference) { return Transaction.findOne({ ...scope, reference }); }
  updateTransaction(scope, id, update) { return Transaction.findOneAndUpdate({ ...scope, _id: id }, update, { new: true, runValidators: true }); }
  async listTransactions(filter, options) {
    const [items, total] = await Promise.all([
      Transaction.find(filter).sort({ transactionDate: -1, createdAt: -1 }).skip(options.skip).limit(options.limit).lean(),
      Transaction.countDocuments(filter),
    ]);
    return { items, total };
  }
  findDuplicates(filter, id) { return Transaction.find(id ? { ...filter, _id: { $ne: id } } : filter).limit(5).lean(); }
  createCategory(data) { return Category.create(data); }
  findCategory(scope, id) { return Category.findOne({ ...scope, _id: id, isArchived: false }); }
  listCategories(scope) { return Category.find({ ...scope, isArchived: false }).lean(); }
  archiveCategory(scope, id) { return Category.findOneAndUpdate({ ...scope, _id: id }, { isArchived: true }, { new: true }); }
  upsertBudget(scope, categoryId, amountMinor) { return Budget.findOneAndUpdate({ ...scope, categoryId: categoryId || null }, { amountMinor }, { new: true, upsert: true, runValidators: true }); }
  listBudgets(scope) { return Budget.find(scope).lean(); }
  deleteBudget(scope, categoryId) { return Budget.findOneAndDelete({ ...scope, categoryId: categoryId || null }); }
  totals(scope, start, end) {
    const match = {
      ...scope,
      ...(scope.userId ? { userId: toObjectId(scope.userId) } : {}),
      ...(scope.orgId ? { orgId: toObjectId(scope.orgId) } : {}),
      transactionDate: { $gte: start, $lte: end },
    };
    return Transaction.aggregate([
      { $match: match },
      { $group: { _id: '$type', amountMinor: { $sum: '$amountMinor' } } },
    ]);
  }
  categoryTotals(scope, start, end) {
    const match = {
      ...scope,
      ...(scope.userId ? { userId: toObjectId(scope.userId) } : {}),
      ...(scope.orgId ? { orgId: toObjectId(scope.orgId) } : {}),
      type: 'EXPENSE',
      transactionDate: { $gte: start, $lte: end },
    };
    return Transaction.aggregate([
      { $match: match },
      { $group: { _id: { categoryId: '$categoryId', categoryName: '$categoryName' }, amountMinor: { $sum: '$amountMinor' } } },
      { $sort: { amountMinor: -1 } },
    ]);
  }
}
export default new PersonalExpenseRepository();
