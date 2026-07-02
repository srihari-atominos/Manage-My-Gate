import amenityRepository from './amenity.repository.js';
import { amenityEventEmitter, AMENITY_CREATED, AMENITY_UPDATED, AMENITY_DELETED } from './amenity.events.js';
import HttpError from '../../utils/httpError.utils.js';

export class AmenityService {
  async getAllAmenities(orgId, filters = {}) {
    if (!orgId) throw new HttpError(400, 'Organization ID is required to fetch amenities.');
    return await amenityRepository.findAll(orgId, filters);
  }

  async getAmenityById(id, orgId) {
    const amenity = await amenityRepository.findById(id, orgId);
    if (!amenity) {
      throw new HttpError(404, `Amenity with ID ${id} not found.`);
    }
    return amenity;
  }

  async createAmenity(amenityData) {
    if (amenityData.name) amenityData.name = amenityData.name.trim();
    if (amenityData.location) amenityData.location = amenityData.location.trim();
    const created = await amenityRepository.create(amenityData);
    amenityEventEmitter.emit(AMENITY_CREATED, created);
    return created;
  }

  async updateAmenity(id, orgId, updateData) {
    await this.getAmenityById(id, orgId); // Verify existence

    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.location) updateData.location = updateData.location.trim();

    const updated = await amenityRepository.update(id, orgId, updateData);
    amenityEventEmitter.emit(AMENITY_UPDATED, updated);
    return updated;
  }

  async deleteAmenity(id, orgId) {
    await this.getAmenityById(id, orgId); // Verify existence
    const deleted = await amenityRepository.softDelete(id, orgId);
    amenityEventEmitter.emit(AMENITY_DELETED, deleted);
    return deleted;
  }
}

export default new AmenityService();
