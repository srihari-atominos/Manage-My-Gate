import Invoice from './invoice.model.js';
import Organization from '../organization/organization.model.js';

/**
 * Enterprise Invoice Numbering Engine
 * Generates a unique, sequential, and configurable invoice number.
 * Format: {PREFIX}-{FY}-{SEQUENCE} (e.g., ORG-2026-000001)
 * 
 * @param {String} orgId - Organization ID
 * @returns {Promise<Object>} { invoiceNumber, sequenceNumber, fy }
 */
export async function generateEnterpriseInvoiceNumber(orgId) {
  // 1. Fetch Org Financial Settings
  const org = await Organization.findById(orgId).select('financialSettings').lean();
  
  const prefix = org?.financialSettings?.invoicePrefix || 'INV';
  const fy = org?.financialSettings?.currentFy || '2026-2027';
  
  // 2. Determine highest sequence number for this Org & FY
  // (Sequence reset policy 'YEARLY' is implicitly handled by isolating the query to the current `fy`)
  const lastInvoice = await Invoice.findOne({ communityId: orgId, fy: fy })
                                   .sort({ sequenceNumber: -1 })
                                   .lean();
                                   
  let nextSequence = 1;
  if (lastInvoice && lastInvoice.sequenceNumber) {
     nextSequence = lastInvoice.sequenceNumber + 1;
  }
  
  // 3. Format: Prefix-FY-000000
  const paddedSequence = String(nextSequence).padStart(6, '0');
  const invoiceNumber = `${prefix}-${fy}-${paddedSequence}`;
  
  return {
    invoiceNumber,
    sequenceNumber: nextSequence,
    fy
  };
}
