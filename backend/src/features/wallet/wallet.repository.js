import { Wallet, WalletTransaction } from './wallet.model.js';
import { v4 as uuidv4 } from 'uuid';

class WalletRepository {
  async getWallet(userId, orgId) {
    let wallet = await Wallet.findOne({ userId, orgId });
    if (!wallet) {
      wallet = await Wallet.create({ userId, orgId, balance: 0 });
    }
    return wallet;
  }

  async getTransactions(userId, orgId) {

    return await WalletTransaction.find({ userId, orgId })
      .populate({ path: 'referenceId', select: 'qrCode qrStatus status bookingDate startTime endTime' })
      .sort({ createdAt: -1 });
  }

  async createTransaction(data) {
    const transactionId = `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const transaction = new WalletTransaction({
      ...data,
      transactionId
    });
    return await transaction.save();
  }

  async updateBalance(userId, orgId, amountDelta) {
    const wallet = await this.getWallet(userId, orgId);
    wallet.balance += amountDelta;
    return await wallet.save();
  }

  async updateTransactionDescription(referenceId, type, appendText) {
    const transaction = await WalletTransaction.findOne({ referenceId, type });
    if (transaction) {
      transaction.description = transaction.description + ' ' + appendText;
      await transaction.save();
      return transaction;
    }
    return null;
  }
}

export default new WalletRepository();
