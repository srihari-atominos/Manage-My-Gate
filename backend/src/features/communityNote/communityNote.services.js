import communityNoteRepository from './communityNote.repository.js';
import communityNoteEvents from './communityNote.events.js';

export const communityNoteService = {
  async createNote({ userId, orgId, text, category = 'GENERAL', emoji = '💬' }) {
    if (!text || typeof text !== 'string') {
      throw new Error('Note text is required');
    }
    const cleanText = text.trim();
    if (cleanText.length === 0) {
      throw new Error('Note text cannot be empty');
    }
    if (cleanText.length > 80) {
      throw new Error('Note text cannot exceed 80 characters');
    }

    // Deactivate previous active notes for user in org
    await communityNoteRepository.deactivateUserActiveNotes(userId, orgId);

    // 24-hour expiration calculation
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const note = await communityNoteRepository.create({
      userId,
      orgId,
      text: cleanText,
      category,
      emoji,
      expiresAt,
      isActive: true,
    });

    communityNoteEvents.emit('note:created', note);
    return note;
  },

  async getMyActiveNote(userId, orgId) {
    return communityNoteRepository.findActiveByUserId(userId, orgId);
  },

  async deleteNote(noteId, userId) {
    const updated = await communityNoteRepository.deactivateById(noteId, userId);
    if (!updated) {
      throw new Error('Note not found or already expired');
    }
    communityNoteEvents.emit('note:expired', { noteId, userId, orgId: updated.orgId });
    return updated;
  },
};

export default communityNoteService;
