import sampleRepository from './sampleFeature.repository.js';
import HttpError from '../../utils/httpError.utils.js';

/**
 * Service class orchestrating business logic for the Sample feature.
 */
export class SampleService {
  /**
   * Retrieve all samples.
   */
  async getAllSamples() {
    return await sampleRepository.findAll();
  }

  /**
   * Retrieve a specific sample by ID.
   * @param {string} id - The sample ID
   */
  async getSampleById(id) {
    const sample = await sampleRepository.findById(id);
    if (!sample) {
      throw new HttpError(404, `Sample record with ID ${id} not found.`);
    }
    return sample;
  }

  /**
   * Create a new sample.
   * @param {object} sampleData - The data payload
   */
  async createSample(sampleData) {
    // Business rule execution (e.g., normalization)
    if (sampleData.title) {
      sampleData.title = sampleData.title.trim();
    }
    return await sampleRepository.create(sampleData);
  }

  /**
   * Update an existing sample.
   * @param {string} id - The sample ID
   * @param {object} updateData - The update payload
   */
  async updateSample(id, updateData) {
    // Verify existence of sample
    await this.getSampleById(id);

    if (updateData.title) {
      updateData.title = updateData.title.trim();
    }

    return await sampleRepository.update(id, updateData);
  }

  /**
   * Delete a sample.
   * @param {string} id - The sample ID
   */
  async deleteSample(id) {
    // Verify existence of sample
    await this.getSampleById(id);

    return await sampleRepository.delete(id);
  }
}

export default new SampleService();
