import CommunityNote from './communityNote.model.js';

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
    return CommunityNote.find({
      orgId,
      isActive: true,
      expiresAt: { $gt: now },
    })
      .populate('userId', 'name avatar username villaId')
      .lean();
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
