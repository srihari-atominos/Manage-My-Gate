import { Wallet, WalletTransaction } from './wallet.model.js';
import '../amenityBooking/amenityBooking.model.js';
import { v4 as uuidv4 } from 'uuid';

class WalletRepository {
  async getWallet(userId, orgId, session = null) {
    const options = { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true };
    if (session) options.session = session;

    let targetOrgId = orgId;
    if (!targetOrgId) {
      try {
        const OrgMembership = (await import('../orgMembership/orgMembership.model.js')).default;
        const membership = await OrgMembership.findOne({ userId, status: 'Active' })
          .sort({ updatedAt: -1 })
          .session(session || null);
        if (membership && membership.orgId) {
          targetOrgId = membership.orgId;
        }
      } catch (e) {
        // Fallback if model not found
      }
    }

    if (targetOrgId) {
      return await Wallet.findOneAndUpdate(
        { userId, orgId: targetOrgId },
        { $setOnInsert: { balance: 0, orgId: targetOrgId } },
        options
      );
    }

    // If still no orgId, search existing with most recent activity or insert without orgId
    const existingWallet = await Wallet.findOne({ userId })
      .sort({ updatedAt: -1 })
      .session(session || null);
    if (existingWallet) return existingWallet;

    return await Wallet.findOneAndUpdate(
      { userId },
      { $setOnInsert: { balance: 0 } },
      options
    );
  }

  async getTransactions(userId, orgId) {
    const query = { userId };
    if (orgId) query.orgId = orgId;
    return await WalletTransaction.find(query)
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

  async createRazorpayTransaction(data, session = null) {
    const transaction = new WalletTransaction({
      ...data,
      paymentMethod: 'razorpay',
      referenceType: 'Recharge',
      type: 'Credit'
    });
    return await transaction.save(session ? { session } : undefined);
  }
}

export default new WalletRepository();
