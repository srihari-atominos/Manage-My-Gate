import path from 'path';
import HttpError from '../utils/httpError.utils.js';
import Invoice from '../features/invoice/invoice.model.js';
import Notice from '../features/noticeBoard/noticeBoard.model.js';
import Complaint from '../features/complaint/complaint.model.js';
import User from '../features/user/user.model.js';
import OrgMembership from '../features/orgMembership/orgMembership.model.js';
import { checkIsAdmin } from './rbac.middleware.js';
import { verifyToken } from '../utils/jwt.utils.js';

const notFound = () => new HttpError(404, 'Upload not found.');

const urlsFor = (kind, filename) => [
  `/uploads/${kind}/${filename}`,
  `/public/uploads/${kind}/${filename}`,
  `uploads/${kind}/${filename}`,
  filename,
];

/**
 * Authorizes upload URLs before express.static is allowed to read from disk.
 * File names are treated as untrusted, and the owning tenant record is checked server-side.
 * Platform users are allowed to inspect support data; ordinary users can only read files
 * owned by their active tenant. Unauthenticated callers are rejected with 404 (preventing file probing).
 */
export const authorizeUploadAccess = async (req, res, next) => {
  try {
    const requestPath = decodeURIComponent(req.path || '');
    const parts = requestPath.replace(/^\/+/, '').split('/');
    if (parts.length !== 2) throw notFound();

    const [kind, filename] = parts;
    if (!kind || !filename || filename !== path.basename(filename)) throw notFound();

    // Block directory traversal or suspicious hidden files
    if (filename.startsWith('.') || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw notFound();
    }

    const urlCandidates = urlsFor(kind, filename);

    // Avatars: verify user exists in system
    if (kind === 'avatars') {
      const user = await User.findOne({ avatar: { $in: urlCandidates } }).select('_id').lean();
      if (user) return next();
      throw notFound();
    }

    // Resolve authentication from Authorization header, Cookie, or Query parameter (for <img> tags)
    if (!req.user) {
      let token = null;
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
      } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
      } else if (req.query && (req.query.token || req.query.media_token)) {
        token = String(req.query.token || req.query.media_token);
      }

      if (token) {
        try {
          req.user = verifyToken(token);
        } catch {
          // Token expired or invalid
        }
      }
    }

    if (!req.user) {
      throw notFound();
    }

    const isPlatformAdmin = Boolean(req.user.isPlatform === true || req.tenant?.isPlatform === true || req.user?.role === 'Platform Super Admin');
    const userId = req.user.id || req.user._id;

    if (kind === 'invoices') {
      const invoice = await Invoice.findOne({
        $or: [
          { paymentScreenshot: { $in: urlCandidates } },
          { 'invoiceDocuments.url': { $in: urlCandidates } },
        ],
      }).select('orgId userId').lean();

      if (!invoice) throw notFound();
      if (isPlatformAdmin) return next();

      // Verify active membership in the organization owning the invoice
      const isMember = await OrgMembership.exists({
        userId,
        orgId: invoice.orgId,
        status: 'Active',
      });
      if (!isMember) throw notFound();

      // Non-admin residents may only view invoices for their own unit/user
      const isAdmin = await checkIsAdmin(req);
      if (!isAdmin && invoice.userId && String(invoice.userId) !== String(userId)) {
        throw notFound();
      }

      return next();
    }

    if (kind === 'notices') {
      const notice = await Notice.findOne({
        $or: [
          { image: { $in: urlCandidates } },
          { 'images.filename': filename },
          { 'images.url': { $in: urlCandidates } },
          { attachments: { $in: urlCandidates } },
        ],
      }).select('orgId').lean();

      if (!notice) throw notFound();
      if (isPlatformAdmin) return next();

      const isMember = await OrgMembership.exists({
        userId,
        orgId: notice.orgId,
        status: 'Active',
      });
      if (!isMember) throw notFound();

      return next();
    }

    if (kind === 'complaints') {
      const complaint = await Complaint.findOne({
        $or: [
          { attachments: { $in: urlCandidates } },
          { 'timeline.attachments': { $in: urlCandidates } },
        ],
      }).select('orgId residentId assignedTechnicianId').lean();

      if (!complaint) throw notFound();
      if (isPlatformAdmin) return next();

      const isMember = await OrgMembership.exists({
        userId,
        orgId: complaint.orgId,
        status: 'Active',
      });
      if (!isMember) throw notFound();

      return next();
    }

    // Any other kind is not allowed
    throw notFound();
  } catch (error) {
    return next(error instanceof HttpError ? error : notFound());
  }
};

export default authorizeUploadAccess;
