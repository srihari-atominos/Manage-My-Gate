import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import config from '../../config/config.js';
import HttpError from '../../utils/httpError.utils.js';
import Token from '../token/token.model.js';
import userEvents from '../user/user.events.js';
import authEvents from './auth.events.js';

/**
 * The one place an invitation is accepted. Every entry point (OTP login, SSO,
 * password login, the pending-invitations list) verifies identity first and
 * then calls acceptInvitationForUser with the exact invitation being accepted.
 */

const hashToken = (raw) => crypto.createHash('sha256').update(String(raw)).digest('hex');

const invitationError = (code, message) => new HttpError(400, message, { code });

/**
 * Resolves the invitation by raw token or by id, and checks it belongs to `user`
 * and is still usable. Does not modify anything.
 */
export const resolveInvitationForUser = async (user, { rawToken = null, invitationId = null } = {}, session = null) => {
  let tokenDoc = null;
  if (rawToken) {
    tokenDoc = await Token.findOne({ token: hashToken(rawToken), type: 'INVITATION' }).session(session);
  } else if (invitationId) {
    if (!/^[a-f0-9]{24}$/i.test(String(invitationId))) throw invitationError('INVITATION_INVALID', 'Invitation not found.');
    tokenDoc = await Token.findOne({ _id: invitationId, type: 'INVITATION' }).session(session);
  }
  if (!tokenDoc) throw invitationError('INVITATION_INVALID', 'Invitation not found or no longer valid.');

  if (!tokenDoc.userId || String(tokenDoc.userId) !== String(user._id)) {
    throw new HttpError(403, 'This invitation was sent to a different account.', { code: 'INVITATION_MISMATCH' });
  }
  if (tokenDoc.status === 'REVOKED') throw invitationError('INVITATION_REVOKED', 'Invitation has been revoked by the administrator.');
  if (tokenDoc.status === 'REJECTED') throw invitationError('INVITATION_REJECTED', 'Invitation has already been rejected.');
  if (tokenDoc.status === 'ACCEPTED' || tokenDoc.used === true) {
    throw invitationError('INVITATION_USED', 'Invitation has already been accepted.');
  }
  if (tokenDoc.status === 'EXPIRED' || (tokenDoc.expiresAt && tokenDoc.expiresAt <= new Date())) {
    if (tokenDoc.status === 'PENDING') {
      await Token.updateOne({ _id: tokenDoc._id }, { $set: { status: 'EXPIRED' } }).catch(() => null);
    }
    throw invitationError('INVITATION_EXPIRED', 'Invitation has expired. Please ask your administrator to resend the invitation.');
  }
  if (tokenDoc.status !== 'PENDING' || !tokenDoc.orgId) {
    throw invitationError('INVITATION_INVALID', 'Invitation is not valid.');
  }
  return tokenDoc;
};

/**
 * Accepts exactly one invitation for an already-verified identity, inside the
 * caller's transaction. Activates the placeholder user (if needed), marks the
 * verified channel, activates only that invitation's membership, assigns its
 * units and technician record, and consumes the invitation.
 *
 * @param {object} user - Mongoose user document (identity already proven)
 * @param {{ rawToken?: string, invitationId?: string }} ref - which invitation
 * @param {'email'|'phone'|'sso'|'password'} verifiedVia - how identity was proven
 * @returns {Promise<{ orgId: string }>} call emitInvitationAccepted after commit
 */
export const acceptInvitationForUser = async (user, ref, verifiedVia, session) => {
  const tokenDoc = await resolveInvitationForUser(user, ref, session);
  const orgId = tokenDoc.orgId;

  // Atomic consume: concurrent requests with the same invitation can't both win
  const consumed = await Token.findOneAndUpdate(
    { _id: tokenDoc._id, status: 'PENDING', used: { $ne: true } },
    { $set: { status: 'ACCEPTED', used: true, usedAt: new Date() } },
    { session, returnDocument: 'after' }
  );
  if (!consumed) throw invitationError('INVITATION_USED', 'Invitation has already been accepted.');

  const User = (await import('../user/user.model.js')).default;
  const userUpdate = {};
  if (user.status === 'Pending Verification' || user.status === 'Pending') userUpdate.status = 'Active';
  if (verifiedVia === 'email') userUpdate.emailVerified = true;
  if (verifiedVia === 'phone') userUpdate.phoneVerified = true;
  if (Object.keys(userUpdate).length > 0) {
    await User.updateOne({ _id: user._id }, { $set: userUpdate }).session(session);
    Object.assign(user, userUpdate);
  }

  const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
  const membership = await orgMembershipService.getMembership(user._id, orgId, session);
  if (!membership) {
    throw invitationError('INVITATION_INVALID', 'The membership for this invitation no longer exists.');
  }
  await orgMembershipService.updateStatus(user._id, orgId, 'Active', session);

  const withVilla = await orgMembershipService.getMembershipWithVilla(user._id, orgId, session);
  if (withVilla) {
    const villaService = (await import('../villa/villa.services.js')).default;
    const units = withVilla.units?.length
      ? withVilla.units
      : withVilla.villaId
      ? [{ villaId: withVilla.villaId, residentType: withVilla.residentType }]
      : [];
    for (const unit of units) {
      if (!unit.villaId) continue;
      const vId = unit.villaId._id || unit.villaId;
      await villaService.assignResidentToVilla(vId, user._id, unit.residentType || 'Resident', session, orgId);
    }
  }

  const Technician = (await import('../technician/technician.model.js')).default;
  await Technician.findOneAndUpdate({ userId: user._id, orgId }, { status: 'Active' }).session(session).catch(() => null);

  return { orgId: String(orgId) };
};

/** Fire after the accepting transaction commits. */
export const emitInvitationAccepted = (userId, orgId) => {
  authEvents.emit('INVITATION_ACCEPTED', { userId, orgId });
  userEvents.emit('INVITATION_ACCEPTED', { userId, orgId });
  userEvents.emit('USER_ACTIVATED', { userId, orgId });
  userEvents.emit('USER_UPDATED', { userId, orgId, action: 'activated' });
};

/** Declines exactly one invitation for an already-verified identity. */
export const declineInvitationForUser = async (user, ref, session) => {
  const tokenDoc = await resolveInvitationForUser(user, ref, session);
  const updated = await Token.findOneAndUpdate(
    { _id: tokenDoc._id, status: 'PENDING' },
    { $set: { status: 'REJECTED', usedAt: new Date() } },
    { session, returnDocument: 'after' }
  );
  if (!updated) throw invitationError('INVITATION_USED', 'Invitation is no longer pending.');

  const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
  const membership = await orgMembershipService.getMembership(user._id, tokenDoc.orgId, session);
  if (membership && membership.status === 'Pending') {
    await orgMembershipService.updateStatus(user._id, tokenDoc.orgId, 'Rejected', session);
    const villaService = (await import('../villa/villa.services.js')).default;
    await villaService.removeUserFromAllVillasInOrg(user._id, tokenDoc.orgId, session).catch(() => null);
  }
  return { orgId: String(tokenDoc.orgId) };
};

/**
 * Pending, unexpired invitations addressed to this user, with display details.
 * @returns {Promise<Array<{ id, orgId, communityName, roleName, unitLabel, expiresAt, invitedAt }>>}
 */
export const listPendingInvitationsForUser = async (userId) => {
  const docs = await Token.find({
    userId,
    type: 'INVITATION',
    status: 'PENDING',
    used: { $ne: true },
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .populate('orgId', 'name status')
    .lean();

  const OrgMembership = (await import('../orgMembership/orgMembership.model.js')).default;
  const result = [];
  for (const doc of docs) {
    if (!doc.orgId || (doc.orgId.status && doc.orgId.status !== 'Active')) continue;
    const membership = await OrgMembership.findOne({ userId, orgId: doc.orgId._id })
      .populate('roleIds', 'name')
      .populate('roleId', 'name')
      .populate('villaId', 'unitNumber blockOrBuilding')
      .lean();
    if (!membership || membership.status !== 'Pending') continue;
    const roleNames = (membership.roleIds || []).map((r) => r?.name).filter(Boolean);
    const villa = membership.villaId;
    result.push({
      id: String(doc._id),
      orgId: String(doc.orgId._id),
      communityName: doc.orgId.name,
      roleName: roleNames[0] || membership.roleId?.name || null,
      unitLabel: villa ? `${villa.unitNumber || 'Unit'}${villa.blockOrBuilding ? ` (${villa.blockOrBuilding})` : ''}` : null,
      invitedAt: doc.createdAt,
      expiresAt: doc.expiresAt,
    });
  }
  return result;
};

/**
 * Short-lived proof that a placeholder (invited, not yet activated) account has
 * just verified its identity, so it can pick which invitation to accept without
 * holding the invite link (e.g. after a fresh iOS install). Never an access token.
 */
const TICKET_PURPOSE = 'invitation_selection';
const ticketSecret = () => `${config.jwt.secret}:${TICKET_PURPOSE}`;

export const issueIdentityTicket = (userId, verifiedVia) =>
  jwt.sign({ purpose: TICKET_PURPOSE, sub: String(userId), via: verifiedVia }, ticketSecret(), {
    expiresIn: '15m',
    algorithm: 'HS256',
  });

export const verifyIdentityTicket = (ticket) => {
  try {
    const decoded = jwt.verify(String(ticket || ''), ticketSecret(), { algorithms: ['HS256'] });
    if (decoded?.purpose !== TICKET_PURPOSE || !decoded.sub) throw new Error('bad purpose');
    return { userId: decoded.sub, verifiedVia: decoded.via || 'email' };
  } catch (_) {
    throw new HttpError(401, 'Your verification has expired. Please sign in again.', { code: 'TICKET_INVALID' });
  }
};
