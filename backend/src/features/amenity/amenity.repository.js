import Amenity from './amenity.model.js';

export class AmenityRepository {
  async findAllByOrg(orgId, filter = {}) {
    return await Amenity.find({ orgId, isDeleted: false, ...filter }).sort({ createdAt: -1 });
  }

  async findById(id, orgId) {
    return await Amenity.findOne({ _id: id, orgId, isDeleted: false });
  }

  async create(amenityData) {
    const amenity = new Amenity(amenityData);
    return await amenity.save();
  }

  async update(id, orgId, updateData) {
    return await Amenity.findOneAndUpdate({ _id: id, orgId, isDeleted: false }, updateData, { new: true, runValidators: true });
  }

  async softDelete(id, orgId) {
    return await Amenity.findOneAndUpdate({ _id: id, orgId }, { isDeleted: true, status: 'inactive' }, { new: true });
  }
}

export default new AmenityRepository();
