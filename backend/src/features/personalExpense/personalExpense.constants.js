export const TYPES = ['EXPENSE', 'INCOME'];
export const METHODS = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'WALLET', 'OTHER'];
export const SETTLEMENT_STATUSES = ['PAID', 'UNPAID'];
export const OCR_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];
export const DEFAULT_CATEGORIES = [
  { id: 'food_dining', name: 'Food and Dining', type: 'EXPENSE' }, { id: 'groceries', name: 'Groceries', type: 'EXPENSE' }, { id: 'transport', name: 'Transport', type: 'EXPENSE' }, { id: 'shopping', name: 'Shopping', type: 'EXPENSE' }, { id: 'rent', name: 'Rent', type: 'EXPENSE' }, { id: 'utilities', name: 'Utilities', type: 'EXPENSE' }, { id: 'medical', name: 'Medical', type: 'EXPENSE' }, { id: 'entertainment', name: 'Entertainment', type: 'EXPENSE' }, { id: 'other_expense', name: 'Other Expense', type: 'EXPENSE' },
  { id: 'salary', name: 'Salary', type: 'INCOME' }, { id: 'other_income', name: 'Other Income', type: 'INCOME' },
];
export const DEFAULT_CATEGORY_IDS = new Set(DEFAULT_CATEGORIES.map((item) => item.id));