import path from 'path';
import HttpError from '../utils/httpError.utils.js';
import Invoice from '../features/invoice/invoice.model.js';
import Notice from '../features/noticeBoard/noticeBoard.model.js';
import Complaint from '../features/complaint/complaint.model.js';
import User from '../features/user/user.model.js';
import OrgMembership from '../features/orgMembership/orgMembership.model.js';
import { isPlatformAdministrator } from './rbac.middleware.js';

const notFound = () => new HttpError(404, 'Upload not found.');

const urlsFor = (kind, filename) => [
  `/uploads/${kind}/${filename}`,
  `/public/uploads/${kind}/${filename}`,
  `uploads/${kind}/${filename}`,
];

/**
 * Authorizes legacy upload URLs before express.static is allowed to read from
 * disk. File names are treated as untrusted, and the owning tenant record is
 * checked server-side. Platform users are allowed to inspect support data;
 * ordinary users can only read files owned by their active tenant.
 */
export const authorizeUploadAccess = async (req, res, next) => {
  try {
    const requestPath = decodeURIComponent(req.path || '');
    const parts = requestPath.replace(/^\/+/, '').split('/');
    if (parts.length !== 2) throw notFound();

    const [kind, filename] = parts;
    if (!kind || !filename || filename !== path.basename(filename)) throw notFound();

    const orgId = req.tenant?.orgId;
    const isPlatformAdmin = isPlatformAdministrator(req.user, req.tenantRole || req.user?.role);
    if (!orgId && !isPlatformAdmin) throw notFound();

    const urlCandidates = urlsFor(kind, filename);
    const tenantFilter = isPlatformAdmin ? {} : { orgId };
    let owner = null;

    if (kind === 'invoices') {
      owner = await Invoice.exists({
        ...tenantFilter,
        $or: [
          { paymentScreenshot: { $in: urlCandidates } },
          { 'invoiceDocuments.url': { $in: urlCandidates } },
        ],
      });
    } else if (kind === 'notices') {
      owner = await Notice.exists({
        ...tenantFilter,
        $or: [
          { image: { $in: urlCandidates } },
          { 'images.filename': filename },
          { 'images.url': { $in: urlCandidates } },
          { attachments: { $in: urlCandidates } },
        ],
      });
    } else if (kind === 'complaints') {
      owner = await Complaint.exists({
        ...tenantFilter,
        $or: [
          { attachments: { $in: urlCandidates } },
          { 'timeline.attachments': { $in: urlCandidates } },
        ],
      });
    } else if (kind === 'avatars') {
      const user = await User.findOne({ avatar: { $in: urlCandidates } }).select('_id').lean();
      if (user && !isPlatformAdmin) {
        owner = await OrgMembership.exists({ userId: user._id, orgId, status: 'Active' });
      } else {
        owner = user;
      }
    } else {
      throw notFound();
    }

    if (!owner) throw notFound();
    return next();
  } catch (error) {
    return next(error instanceof HttpError ? error : notFound());
  }
};

export default authorizeUploadAccess;
