import mongoose from 'mongoose';
import masterPricingRepository from './masterPricing.repository.js';
import masterPricingEvents from './masterPricing.events.js';
import HttpError from '../../utils/httpError.utils.js';
import PlatformQuote from '../platformQuote/platformQuote.model.js';
import PlatformOrder from '../platformOrder/platformOrder.model.js';

class MasterPricingService {
  async createPlan(pricingData, xRequestId) {
    if (xRequestId) console.log(`[${xRequestId}] MasterPricingService.createPlan: Creating plan ${pricingData.planCode}`);
    
    const existing = await masterPricingRepository.findByPlanCode(pricingData.planCode);
    if (existing) {
      throw new HttpError(409, `Plan code '${pricingData.planCode}' is already registered.`);
    }

    try {
      const createdPlan = await masterPricingRepository.create(pricingData);
      masterPricingEvents.emit('master_pricing_created', createdPlan);
      return createdPlan;
    } catch (error) {
      throw error;
    }
  }

  async getAllPlans(queryParams, xRequestId) {
    if (xRequestId) console.log(`[${xRequestId}] MasterPricingService.getAllPlans`);
    return await masterPricingRepository.findAllPaginated(queryParams);
  }

  async getPlanById(id, xRequestId) {
    if (xRequestId) console.log(`[${xRequestId}] MasterPricingService.getPlanById: ${id}`);
    const plan = await masterPricingRepository.findById(id);
    if (!plan) {
      throw new HttpError(404, `Master pricing plan with ID '${id}' not found.`);
    }
    return plan;
  }

  async getPricingById(id, xRequestId) {
    return await this.getPlanById(id, xRequestId);
  }

  async _checkDependencies(id) {
    const quoteExists = await PlatformQuote.exists({ masterPricingId: id, status: { $nin: ['CANCELLED', 'EXPIRED'] } }).catch(() => false);
    if (quoteExists) {
      throw new HttpError(409, `Cannot deactivate or delete. Active quotes reference this pricing plan.`);
    }
    
    // Check PlatformOrder just in case it also has a direct reference
    // Not all architectures link it directly to order, but we check if the model exists and has reference
    const orderExists = await PlatformOrder.exists({ masterPricingId: id, status: { $nin: ['CANCELLED', 'EXPIRED'] } }).catch(() => false);
    if (orderExists) {
      throw new HttpError(409, `Cannot deactivate or delete. Active orders reference this pricing plan.`);
    }
  }

  async updatePlan(id, updateData, xRequestId) {
    if (xRequestId) console.log(`[${xRequestId}] MasterPricingService.updatePlan: ${id}`);
    const existingPlan = await masterPricingRepository.findById(id);
    if (!existingPlan) {
      throw new HttpError(404, `Master pricing plan with ID '${id}' not found.`);
    }

    if (updateData.planCode && updateData.planCode.trim().toLowerCase() !== existingPlan.planCode.toLowerCase()) {
      const nameConflict = await masterPricingRepository.findByPlanCode(updateData.planCode);
      if (nameConflict && nameConflict._id.toString() !== id) {
        throw new HttpError(409, `Plan code '${updateData.planCode}' is already in use by another plan.`);
      }
    }

    // Check dependency locks before archiving
    if (updateData.status === 'ARCHIVED' && existingPlan.status !== 'ARCHIVED') {
      await this._checkDependencies(id);
    }

    // Version increment on breaking changes (e.g., price change)
    if (
      (updateData.basePrice !== undefined && updateData.basePrice !== existingPlan.basePrice) ||
      (updateData.unitPrice !== undefined && updateData.unitPrice !== existingPlan.unitPrice) ||
      (updateData.pricingModel !== undefined && updateData.pricingModel !== existingPlan.pricingModel)
    ) {
      updateData.version = (existingPlan.version || 1) + 1;
    }

    try {
      const updatedPlan = await masterPricingRepository.updateById(id, updateData);
      masterPricingEvents.emit('master_pricing_updated', updatedPlan);
      return updatedPlan;
    } catch (error) {
      throw error;
    }
  }

  async deletePlan(id, xRequestId) {
    if (xRequestId) console.log(`[${xRequestId}] MasterPricingService.deletePlan: ${id}`);
    const existingPlan = await masterPricingRepository.findById(id);
    if (!existingPlan) {
      throw new HttpError(404, `Master pricing plan with ID '${id}' not found.`);
    }

    await this._checkDependencies(id);

    try {
      const deletedPlan = await masterPricingRepository.deleteById(id);
      masterPricingEvents.emit('master_pricing_deleted', deletedPlan);
      return deletedPlan;
    } catch (error) {
      throw error;
    }
  }
}

export default new MasterPricingService();
