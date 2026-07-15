import Amenity from './amenity.model.js';

export class AmenityRepository {
  async findAllByOrg(orgId, filter = {}) {
    return await Amenity.find({ orgId, isDeleted: false, ...filter }).sort({ createdAt: -1 });
  }

  async findById(id, orgId) {
    return await Amenity.findOne({ _id: id, orgId, isDeleted: false });
  }

  async findByName(name, orgId) {
    // case-insensitive exact match
    return await Amenity.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }, orgId, isDeleted: false });
  }

  async create(amenityData) {
    const amenity = new Amenity(amenityData);
    return await amenity.save();
  }

  async update(id, orgId, updateData, options = {}) {
    return await Amenity.findOneAndUpdate(
      { _id: id, orgId, isDeleted: false }, 
      updateData, 
      { returnDocument: 'after', runValidators: true, ...options }
    );
  }

  async softDelete(id, orgId) {
    return await Amenity.findOneAndUpdate({ _id: id, orgId }, { isDeleted: true, status: 'inactive' }, { returnDocument: 'after' });
  }
  async getAmenityStats(orgId) {
    const stats = await Amenity.aggregate([
      { $match: { orgId, isDeleted: false } },
      {
        $facet: {
          total: [{ $count: "count" }],
          active: [{ $match: { status: 'active' } }, { $count: "count" }],
          inactive: [{ $match: { status: 'inactive' } }, { $count: "count" }],
          maintenance: [{ $match: { status: 'maintenance' } }, { $count: "count" }],
        }
      }
    ]);
    
    return {
      total: stats[0].total[0]?.count || 0,
      active: stats[0].active[0]?.count || 0,
      inactive: stats[0].inactive[0]?.count || 0,
      maintenance: stats[0].maintenance[0]?.count || 0,
    };
  }

  async getMaintenanceStats(orgId) {
    const stats = await Amenity.aggregate([
      { $match: { orgId, isDeleted: false } },
      { $unwind: "$maintenanceSchedules" },
      {
        $facet: {
          scheduled: [{ $match: { "maintenanceSchedules.status": "scheduled" } }, { $count: "count" }],
          in_progress: [{ $match: { "maintenanceSchedules.status": "in_progress" } }, { $count: "count" }],
          completed: [{ $match: { "maintenanceSchedules.status": "completed" } }, { $count: "count" }]
        }
      }
    ]);

    if (!stats || stats.length === 0) return { scheduled: 0, in_progress: 0, completed: 0 };
    return {
      scheduled: stats[0].scheduled[0]?.count || 0,
      in_progress: stats[0].in_progress[0]?.count || 0,
      completed: stats[0].completed[0]?.count || 0
    };
  }

  async getAllMaintenance(orgId) {
    const amenities = await Amenity.find({ orgId, isDeleted: false }, 'name location type maintenanceSchedules');
    let maintenanceList = [];
    amenities.forEach(amenity => {
      if (amenity.maintenanceSchedules && amenity.maintenanceSchedules.length > 0) {
        amenity.maintenanceSchedules.forEach(schedule => {
          maintenanceList.push({
            ...schedule.toObject(),
            amenityId: amenity._id,
            amenityName: amenity.name,
            amenityLocation: amenity.location,
            amenityType: amenity.type
          });
        });
      }
    });
    // Sort by startDate descending
    maintenanceList.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    return maintenanceList;
  }
}

export default new AmenityRepository();
