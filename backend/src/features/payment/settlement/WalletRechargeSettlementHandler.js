import DomainSettlementInterface from './DomainSettlementInterface.js';
import logger from '../../../utils/logger.utils.js';

export class WalletRechargeSettlementHandler extends DomainSettlementInterface {
  async settle(payment, session) {
    logger.info('Executing Wallet Recharge settlement', {
      userId: payment.userId,
      paymentId: payment._id,
      amount: payment.amount,
    });

    const walletService = (await import('../../wallet/wallet.service.js')).default;

    const settledTransaction = await walletService.handleWebhookRecharge(
      payment,
      payment.gatewayTransactionId,
      session
    );

    return settledTransaction;
  }

  async refund(payment, refundRecord, session) {
    logger.info('Executing Wallet Recharge refund settlement', {
      userId: payment.userId,
      refundId: refundRecord._id,
      amount: refundRecord.amount,
    });

    const walletRepository = (await import('../../wallet/wallet.repository.js')).default;
    const refundAmount = Math.abs(Number(refundRecord.amount));

    // Deduct refunded amount from wallet balance
    const updatedWallet = await walletRepository.updateBalance(
      payment.userId,
      payment.orgId,
      -refundAmount,
      session
    );

    // Record adjustment transaction
    const transaction = await walletRepository.createTransaction({
      orgId: payment.orgId,
      userId: payment.userId,
      type: 'Debit',
      amount: refundAmount,
      paymentMethod: payment.paymentMethod || 'ONLINE',
      paymentStatus: 'success',
      referenceType: 'Refund',
      referenceId: refundRecord._id,
      description: `Wallet recharge refund reversal (Payment: ${payment.gatewayTransactionId || payment._id})`,
    }, session);

    return { wallet: updatedWallet, transaction };
  }
}

export default new WalletRechargeSettlementHandler();
