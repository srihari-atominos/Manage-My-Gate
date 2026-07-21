import { Wallet, WalletTransaction } from './wallet.model.js';
import '../amenityBooking/amenityBooking.model.js';
import { v4 as uuidv4 } from 'uuid';

class WalletRepository {
  async getWallet(userId, orgId, session = null) {
    const query = Wallet.findOne({ userId, orgId });
    if (session) query.session(session);
    let wallet = await query;
    if (!wallet) {
      const options = session ? { session } : {};
      const created = await Wallet.create([{ userId, orgId, balance: 0 }], options);
      wallet = created[0];
    }
    return wallet;
  }

  async getTransactions(userId, orgId) {
    return await WalletTransaction.find({ userId, orgId })
      .populate({ path: 'referenceId', select: 'qrCode qrStatus status bookingDate startTime endTime' })
      .sort({ createdAt: -1 });
  }

  async createTransaction(data, session = null) {
    const transactionId = `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const transaction = new WalletTransaction({
      ...data,
      transactionId
    });
    return await transaction.save(session ? { session } : undefined);
  }

  async updateBalance(userId, orgId, amountDelta, session = null) {
    const wallet = await this.getWallet(userId, orgId, session);
    wallet.balance += amountDelta;
    return await wallet.save(session ? { session } : undefined);
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
