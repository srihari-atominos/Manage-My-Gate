import Sample from './sampleFeature.model.js';

/**
 * Repository for Sample feature db operations.
 */
export class SampleRepository {
  /**
   * Find all samples.
   */
  async findAll() {
    return await Sample.find({}).sort({ createdAt: -1 });
  }

  /**
   * Find a sample by ID.
   * @param {string} id - The ID of the sample
   */
  async findById(id) {
    return await Sample.findById(id);
  }

  /**
   * Create a new sample.
   * @param {object} sampleData - Data to create sample
   */
  async create(sampleData) {
    const sample = new Sample(sampleData);
    return await sample.save();
  }

  /**
   * Update a sample by ID.
   * @param {string} id - The ID of the sample
   * @param {object} updateData - Data to update
   */
  async update(id, updateData) {
    return await Sample.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  }

  /**
   * Delete a sample by ID.
   * @param {string} id - The ID of the sample to delete
   */
  async delete(id) {
    return await Sample.findByIdAndDelete(id);
  }
}

export default new SampleRepository();
