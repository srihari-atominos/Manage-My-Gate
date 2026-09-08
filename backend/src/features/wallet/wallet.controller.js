import walletService from './wallet.service.js';

export const getMyWallet = async (req, res, next) => {
  try {
    const roleUpper = (req.user?.role || '').toUpperCase();
    const isFullAdmin = ['Super Admin', 'Platform Super Admin', 'Community Admin', 'Admin', 'SuperAdmin'].includes(req.user?.role) ||
      roleUpper.includes('ADMIN') || roleUpper.includes('SUPER') || req.user?.isPlatform;

    const targetUserId = (isFullAdmin && req.query?.userId)
      ? req.query.userId
      : (req.user.id || req.user._id);

    const orgId = req.headers['x-organization-id'] || req.query?.orgId || req.user?.orgId || req.user?.communityId || req.tenant?.orgId;
    
    const walletData = await walletService.getWalletData(targetUserId, orgId);
    
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
    const roleUpper = (req.user?.role || '').toUpperCase();
    const isFullAdmin = ['Super Admin', 'Platform Super Admin', 'Community Admin', 'Admin', 'SuperAdmin'].includes(req.user?.role) ||
      roleUpper.includes('ADMIN') || roleUpper.includes('SUPER') || req.user?.isPlatform;

    const targetUserId = (isFullAdmin && (req.body?.userId || req.body?.targetUserId))
      ? (req.body.userId || req.body.targetUserId)
      : (req.user.id || req.user._id);

    const orgId = req.headers['x-organization-id'] || req.body?.orgId || req.user?.orgId || req.user?.communityId || req.tenant?.orgId;
    const { amount, paymentMethod, description } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const transaction = await walletService.addMoney(
      targetUserId,
      orgId,
      Number(amount),
      paymentMethod || (isFullAdmin ? 'admin_adjustment' : 'wallet'),
      description || (isFullAdmin ? 'Admin Wallet Credit' : 'Wallet Recharge')
    );
    
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
    const orgId = req.headers['x-organization-id'] || req.body?.orgId || req.user?.orgId || req.user?.communityId || req.tenant?.orgId;
    const { invoiceId, amount } = req.body;

    if (!invoiceId) {
      return res.status(400).json({ success: false, message: 'invoiceId is required' });
    }

    const result = await walletService.payInvoiceWithWallet({ userId, orgId, invoiceId, amount });

    res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const roleUpper = (req.user?.role || '').toUpperCase();
    const isFullAdmin = ['Super Admin', 'Platform Super Admin', 'Community Admin', 'Admin', 'SuperAdmin'].includes(req.user?.role) ||
      roleUpper.includes('ADMIN') || roleUpper.includes('SUPER') || req.user?.isPlatform;

    const targetUserId = (isFullAdmin && (req.body?.userId || req.body?.targetUserId))
      ? (req.body.userId || req.body.targetUserId)
      : (req.user.id || req.user._id);

    const orgId = req.headers['x-organization-id'] || req.body?.orgId || req.user?.orgId || req.user?.communityId || req.tenant?.orgId;
    const order = await walletService.createRechargeOrder(targetUserId, orgId, amount);
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const roleUpper = (req.user?.role || '').toUpperCase();
    const isFullAdmin = ['Super Admin', 'Platform Super Admin', 'Community Admin', 'Admin', 'SuperAdmin'].includes(req.user?.role) ||
      roleUpper.includes('ADMIN') || roleUpper.includes('SUPER') || req.user?.isPlatform;

    const targetUserId = (isFullAdmin && (req.body?.userId || req.body?.targetUserId))
      ? (req.body.userId || req.body.targetUserId)
      : (req.user.id || req.user._id);

    const orgId = req.headers['x-organization-id'] || req.body?.orgId || req.user?.orgId || req.user?.communityId || req.tenant?.orgId;
    const transaction = await walletService.verifyPaymentSignature(targetUserId, orgId, req.body);
    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};
