import crmInquiryRepository from './crmInquiry.repository.js';
import crmInquiryEvents from './crmInquiry.events.js';
import HttpError from '../../utils/httpError.utils.js';

export class CrmInquiryService {
  /**
   * Helper method to generate unique inquiry ID: INQ-YYYYMMDD-XXXX
   */
  generateInquiryId() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `INQ-${yyyy}${mm}${dd}-${randomSuffix}`;
  }

  /**
   * Create a new CRM Inquiry.
   * @param {Object} payload
   */
  async createInquiry(payload) {
    let inquiryId = payload.inquiryId;

    if (!inquiryId) {
      inquiryId = this.generateInquiryId();
      // Ensure unique inquiryId if random collides
      let existing = await crmInquiryRepository.findByInquiryId(inquiryId);
      let attempts = 0;
      while (existing && attempts < 5) {
        inquiryId = this.generateInquiryId();
        existing = await crmInquiryRepository.findByInquiryId(inquiryId);
        attempts++;
      }
    } else {
      const existing = await crmInquiryRepository.findByInquiryId(inquiryId);
      if (existing) {
        throw new HttpError(400, `Inquiry ID '${inquiryId}' already exists`);
      }
    }

    const inquiryData = {
      ...payload,
      inquiryId,
    };

    const newInquiry = await crmInquiryRepository.create(inquiryData);

    // Emit domain event
    crmInquiryEvents.emit('inquiryCreated', newInquiry);

    return newInquiry;
  }

  /**
   * Get paginated list of CRM inquiries.
   * @param {Object} queryParams
   */
  async getInquiries(queryParams) {
    return await crmInquiryRepository.getInquiriesPaginated(queryParams);
  }

  /**
   * Get a single CRM inquiry by ID.
   * @param {string} id
   */
  async getInquiryById(id) {
    const inquiry = await crmInquiryRepository.findById(id);
    if (!inquiry) {
      throw new HttpError(404, 'CRM Inquiry not found');
    }
    return inquiry;
  }

  /**
   * Update an existing CRM inquiry.
   * @param {string} id
   * @param {Object} updatePayload
   */
  async updateInquiry(id, updatePayload) {
    const existing = await crmInquiryRepository.findById(id);
    if (!existing) {
      throw new HttpError(404, 'CRM Inquiry not found');
    }

    if (updatePayload.inquiryId && updatePayload.inquiryId !== existing.inquiryId) {
      const idConflict = await crmInquiryRepository.findByInquiryId(updatePayload.inquiryId);
      if (idConflict) {
        throw new HttpError(400, `Inquiry ID '${updatePayload.inquiryId}' already exists`);
      }
    }

    const updatedInquiry = await crmInquiryRepository.updateById(id, updatePayload);

    // Emit domain event
    crmInquiryEvents.emit('inquiryUpdated', updatedInquiry);

    return updatedInquiry;
  }

  /**
   * Delete a CRM inquiry.
   * @param {string} id
   */
  async deleteInquiry(id) {
    const existing = await crmInquiryRepository.findById(id);
    if (!existing) {
      throw new HttpError(404, 'CRM Inquiry not found');
    }

    const deletedInquiry = await crmInquiryRepository.deleteById(id);

    // Emit domain event
    crmInquiryEvents.emit('inquiryDeleted', id);

    return deletedInquiry;
  }
}

export default new CrmInquiryService();
