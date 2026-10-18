import walletService from './wallet.service.js';
import HttpError from '../../utils/httpError.utils.js';

const resolveTargetUserAndOrg = async (req, requestedUserId = null) => {
  const orgId = req.tenant?.isPlatform && (req.query?.orgId || req.body?.orgId)
    ? (req.query?.orgId || req.body?.orgId)
    : (req.tenant?.orgId || req.user?.orgId);
  if (!orgId) {
    throw new HttpError(400, 'Workspace context is required.');
  }

  const roleUpper = (req.tenantRole || req.user?.role || '').toUpperCase();
  const isFullAdmin = ['SUPER ADMIN', 'PLATFORM SUPER ADMIN', 'COMMUNITY ADMIN', 'ADMIN', 'SUPERADMIN'].includes(roleUpper) ||
    roleUpper.includes('ADMIN') || roleUpper.includes('SUPER') || req.tenant?.isPlatform || req.user?.isPlatform;

  const currentUserId = req.user.id || req.user._id;
  let targetUserId = currentUserId;

  if (requestedUserId && String(requestedUserId) !== String(currentUserId)) {
    if (!isFullAdmin) {
      throw new HttpError(403, "Forbidden. You cannot view or modify another user's wallet.");
    }
    if (!req.tenant?.isPlatform) {
      const OrgMembership = (await import('../orgMembership/orgMembership.model.js')).default;
      const membership = await OrgMembership.findOne({
        userId: requestedUserId,
        orgId: orgId,
        status: 'Active',
      }).lean();
      if (!membership) {
        throw new HttpError(404, 'User not found in this community.');
      }
    }
    targetUserId = requestedUserId;
  }

  return { orgId, targetUserId, isFullAdmin };
};

export const getMyWallet = async (req, res, next) => {
  try {
    const { orgId, targetUserId } = await resolveTargetUserAndOrg(req, req.query?.userId);
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
    const { orgId, targetUserId, isFullAdmin } = await resolveTargetUserAndOrg(req, req.body?.userId || req.body?.targetUserId);

    if (!isFullAdmin) {
      throw new HttpError(
        403,
        'Wallet top-ups must be completed through secure Razorpay checkout.'
      );
    }

    const { amount, paymentMethod, description } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const transaction = await walletService.addMoney(
      targetUserId,
      orgId,
      Number(amount),
      paymentMethod || 'admin_adjustment',
      description || 'Admin Wallet Credit'
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
    const { orgId, targetUserId: userId } = await resolveTargetUserAndOrg(req);
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
    const { orgId, targetUserId } = await resolveTargetUserAndOrg(req, req.body?.userId || req.body?.targetUserId);

    const order = await walletService.createRechargeOrder(targetUserId, orgId, amount);
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { orgId, targetUserId } = await resolveTargetUserAndOrg(req, req.body?.userId || req.body?.targetUserId);

    const transaction = await walletService.verifyPaymentSignature(targetUserId, orgId, req.body);
    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

export const refundToOriginalPayment = async (req, res, next) => {
  try {
    const { orgId, targetUserId: userId } = await resolveTargetUserAndOrg(req);
    const { paymentId, amount } = req.body;

    const result = await walletService.refundToOriginalPayment({
      userId,
      orgId,
      paymentId,
      amount,
    });

    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
