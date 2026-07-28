import mongoose from 'mongoose';
import masterPricingRepository from './masterPricing.repository.js';
import masterPricingEvents from './masterPricing.events.js';
import HttpError from '../../utils/httpError.utils.js';

class MasterPricingService {
  /**
   * Create a new Master Pricing Plan within a database transaction.
   * @param {Object} pricingData
   */
  async createPlan(pricingData) {
    const existing = await masterPricingRepository.findByPlanName(pricingData.planName);
    if (existing) {
      throw new HttpError(409, `Plan name '${pricingData.planName}' is already registered.`);
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const createdPlan = await masterPricingRepository.create(pricingData, session);

      await session.commitTransaction();

      // Emit event after transaction succeeds
      masterPricingEvents.emit('master_pricing_created', createdPlan);

      return createdPlan;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Retrieve all Master Pricing plans with pagination and filters.
   * @param {Object} queryParams
   */
  async getAllPlans(queryParams) {
    return await masterPricingRepository.findAllPaginated(queryParams);
  }

  /**
   * Get a single Master Pricing plan by ID.
   * @param {string} id
   */
  async getPlanById(id) {
    const plan = await masterPricingRepository.findById(id);
    if (!plan) {
      throw new HttpError(404, `Master pricing plan with ID '${id}' not found.`);
    }
    return plan;
  }

  /**
   * Alias for getPlanById.
   * @param {string} id
   */
  async getPricingById(id) {
    return await this.getPlanById(id);
  }

  /**
   * Update an existing Master Pricing Plan within a transaction.
   * @param {string} id
   * @param {Object} updateData
   */
  async updatePlan(id, updateData) {
    const existingPlan = await masterPricingRepository.findById(id);
    if (!existingPlan) {
      throw new HttpError(404, `Master pricing plan with ID '${id}' not found.`);
    }

    if (updateData.planName && updateData.planName.trim().toLowerCase() !== existingPlan.planName.toLowerCase()) {
      const nameConflict = await masterPricingRepository.findByPlanName(updateData.planName);
      if (nameConflict && nameConflict._id.toString() !== id) {
        throw new HttpError(409, `Plan name '${updateData.planName}' is already in use by another plan.`);
      }
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const updatedPlan = await masterPricingRepository.updateById(id, updateData, session);

      await session.commitTransaction();

      masterPricingEvents.emit('master_pricing_updated', updatedPlan);

      return updatedPlan;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Delete a Master Pricing plan within a transaction.
   * @param {string} id
   */
  async deletePlan(id) {
    const existingPlan = await masterPricingRepository.findById(id);
    if (!existingPlan) {
      throw new HttpError(404, `Master pricing plan with ID '${id}' not found.`);
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const deletedPlan = await masterPricingRepository.deleteById(id, session);

      await session.commitTransaction();

      masterPricingEvents.emit('master_pricing_deleted', deletedPlan);

      return deletedPlan;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export default new MasterPricingService();
