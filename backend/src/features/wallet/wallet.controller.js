import walletService from './wallet.service.js';

export const getMyWallet = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const orgId = req.user.orgId;
    
    const walletData = await walletService.getWalletData(userId, orgId);
    
    res.status(200).json({
      success: true,
      message: 'Wallet data retrieved successfully',
      data: walletData
    });
  } catch (error) {
    next(error);
  }
};

export const addMoney = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const orgId = req.user.orgId;
    const { amount, paymentMethod } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const transaction = await walletService.addMoney(userId, orgId, amount, paymentMethod || 'wallet');
    
    res.status(200).json({
      success: true,
      message: 'Wallet recharge successful',
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

export const payInvoice = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const orgId = req.user.orgId;
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return res.status(400).json({ success: false, message: 'invoiceId is required' });
    }

    const result = await walletService.payInvoiceWithWallet({ userId, orgId, invoiceId });

    res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
