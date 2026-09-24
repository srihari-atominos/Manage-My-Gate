import mongoose from 'mongoose';
import OutboxEvent from './outboxEvent.model.js';

export class OutboxRepository {
  async createEvent(eventData, session = null) {
    if (session) {
      const [created] = await OutboxEvent.create([eventData], { session });
      return created;
    }
    return await OutboxEvent.create(eventData);
  }

  async findAndLockNextPending() {
    return await OutboxEvent.findOneAndUpdate(
      { status: 'PENDING' },
      { $set: { status: 'PROCESSING' } },
      { sort: { createdAt: 1 }, new: true }
    );
  }

  async markCompleted(eventId, session = null) {
    return await OutboxEvent.findByIdAndUpdate(
      eventId,
      { $set: { status: 'COMPLETED', error: null } },
      { new: true, session }
    );
  }

  async markFailed(eventId, errorMessage, retries, nextStatus = 'PENDING', session = null) {
    return await OutboxEvent.findByIdAndUpdate(
      eventId,
      {
        $set: {
          status: nextStatus,
          error: errorMessage,
          retries,
        },
      },
      { new: true, session }
    );
  }

  async findById(eventId, session = null) {
    return await OutboxEvent.findById(eventId).session(session);
  }

  async getPendingCount(session = null) {
    return await OutboxEvent.countDocuments({ status: 'PENDING' }).session(session);
  }
}

export default new OutboxRepository();
