import Assessment from './assessment.model.js';

export class AssessmentRepository {
  /**
   * Create a new assessment template.
   * @param {Object} data - Assessment data.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose transaction session.
   */
  async create(data, session) {
    const assessment = new Assessment(data);
    return await assessment.save(session ? { session } : undefined);
  }

  /**
   * Find assessment by ID.
   * @param {string} id - Assessment ID.
   * @returns {Promise<import('mongoose').Document | null>}
   */
  async findById(id) {
    return await Assessment.findById(id);
  }

  /**
   * Query active recurring assessments matching the specific day integer or 'LAST_DAY_OF_MONTH'.
   * @param {number|string} dayIndicator - 1-28 or 'LAST_DAY_OF_MONTH'
   * @returns {Promise<Array<import('mongoose').Document>>}
   */
  async findActiveByGenerationDay(dayIndicator) {
    return await Assessment.find({
      isActive: true,
      type: 'RECURRING',
      generationDay: dayIndicator,
    });
  }

  /**
   * Update template fields.
   * @param {string} id - Assessment ID.
   * @param {Object} updateData - Data to update.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose transaction session.
   * @returns {Promise<import('mongoose').Document | null>}
   */
  async updateTemplate(id, updateData, session) {
    return await Assessment.findByIdAndUpdate(id, updateData, {
      returnDocument: 'after',
      runValidators: true,
      ...(session ? { session } : {}),
    });
  }
}

export default new AssessmentRepository();
