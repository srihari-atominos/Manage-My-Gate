import CommunityNote from './communityNote.model.js';
import OrgMembership from '../orgMembership/orgMembership.model.js';

export const communityNoteRepository = {
  async create(data, session = null) {
    const options = session ? { session } : {};
    const notes = await CommunityNote.create([data], options);
    return notes[0];
  },

  async deactivateUserActiveNotes(userId, orgId, session = null) {
    const options = session ? { session } : {};
    return CommunityNote.updateMany(
      { userId, orgId, isActive: true },
      { $set: { isActive: false } },
      options
    );
  },

  async findActiveByUserId(userId, orgId) {
    const now = new Date();
    return CommunityNote.findOne({
      userId,
      orgId,
      isActive: true,
      expiresAt: { $gt: now },
    }).lean();
  },

  async findActiveByOrgId(orgId) {
    const now = new Date();
    const notes = await CommunityNote.find({
      orgId,
      isActive: true,
      expiresAt: { $gt: now },
    })
      .populate('userId', 'name avatar username phone intercomNumber')
      .sort({ createdAt: -1 })
      .lean();

    const userIds = notes.map((n) => n.userId?._id).filter(Boolean);
    const memberships = await OrgMembership.find({
      orgId,
      userId: { $in: userIds },
    })
      .populate('villaId', 'unitNumber name block')
      .populate('roleId', 'name')
      .lean();

    const membershipMap = new Map();
    memberships.forEach((m) => {
      if (m.userId) {
        membershipMap.set(m.userId.toString(), m);
      }
    });

    return notes.map((note) => {
      const u = note.userId || {};
      const uIdStr = u._id ? u._id.toString() : '';
      const mem = uIdStr ? membershipMap.get(uIdStr) : null;
      const villa = mem?.villaId;
      const unitNumber = villa ? (villa.unitNumber || villa.name || '') : '';
      const userUnit = unitNumber ? (villa?.block ? `${villa.block} - ${unitNumber}` : unitNumber) : '';

      return {
        ...note,
        userName: u.name || u.username || 'Resident',
        userUnit: userUnit || 'Community Member',
        avatarUrl: u.avatar || null,
        memberData: {
          id: uIdStr,
          userId: uIdStr,
          name: u.name || u.username || 'Resident',
          unitNumber: userUnit,
          role: mem?.roleId?.name?.toLowerCase().includes('guard') ? 'guard' : 'resident',
          phone: u.phone || '',
          intercomNumber: u.intercomNumber || '',
        },
      };
    });
  },

  async deactivateById(noteId, userId, session = null) {
    const options = session ? { session } : {};
    return CommunityNote.findOneAndUpdate(
      { _id: noteId, userId },
      { $set: { isActive: false } },
      { new: true, ...options }
    );
  },
};

export default communityNoteRepository;
