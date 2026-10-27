import mongoose from 'mongoose';
import Invoice from './invoice.model.js';
import Organization from '../organization/organization.model.js';

/**
 * Extract clean community prefix.
 * e.g. "Iva Aalayam" -> "IVA", "Palm Meadows" -> "PALM", or explicit org.financialSettings.invoicePrefix
 *
 * @param {Object} [org] - Organization document or lean object
 * @returns {string} Sanitized uppercase community prefix (e.g., 'IVA')
 */
export function getCommunityPrefix(org) {
  if (org?.financialSettings?.invoicePrefix && org.financialSettings.invoicePrefix !== 'ORG') {
    return String(org.financialSettings.invoicePrefix).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
  if (org?.name) {
    const words = org.name.trim().split(/\s+/).filter(Boolean);
    if (words.length > 0) {
      const firstWord = words[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (firstWord.length >= 3 && firstWord.length <= 6) {
        return firstWord;
      }
      if (words.length >= 2) {
        const initials = words.map((w) => w[0]).join('').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (initials.length >= 2) return initials;
      }
      return firstWord.slice(0, 4) || 'INV';
    }
  }
  return 'INV';
}

/**
 * Unit & Period Identified Invoice Number Generator (Option C)
 * Format: {COMMUNITY_PREFIX}-{UNIT}-{YYYYMM} (e.g. IVA-A102-202610)
 *
 * @param {Object} params
 * @param {Object|String} [params.org] - Organization document or lean object
 * @param {String} [params.orgId] - Organization ID if org object not provided
 * @param {string|number} params.unitNumber - Unit / Flat / Villa number (e.g. "A-102", "Villa 4", "101")
 * @param {string} params.billingPeriodString - Period string (e.g. "2026-10", "2026-Q1", "2026-W36")
 * @param {Set<string>} [params.existingInBatch] - In-memory Set of numbers generated in the current batch
 * @returns {Promise<string>} Clean, unique invoice number (e.g. "IVA-A102-202610")
 */
export async function generateUnitPeriodInvoiceNumber({
  org,
  orgId,
  unitNumber,
  billingPeriodString,
  existingInBatch = new Set(),
}) {
  let orgDoc = org;
  if (!orgDoc && orgId) {
    orgDoc = await Organization.findById(orgId).select('name financialSettings').lean();
  }

  // 1. Prefix (e.g. 'IVA')
  const prefix = getCommunityPrefix(orgDoc);

  // 2. Unit (e.g. 'A-102' -> 'A102')
  const rawUnit = String(unitNumber || 'UNIT').trim().toUpperCase();
  const cleanUnit = rawUnit.replace(/[^A-Z0-9]/g, '') || 'UNIT';

  // 3. Period (e.g. '2026-10' -> '202610')
  const now = new Date();
  const fallbackPeriod = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const cleanPeriod = billingPeriodString
    ? String(billingPeriodString).replace(/[^A-Z0-9]/gi, '').toUpperCase()
    : fallbackPeriod;

  // 4. Base Invoice Number
  const baseInvoiceNumber = `${prefix}-${cleanUnit}-${cleanPeriod}`;

  // 5. Uniqueness guarantee (check both in-memory batch Set and database)
  let candidateNumber = baseInvoiceNumber;
  let counter = 1;

  const isDbConnected = mongoose.connection?.readyState === 1;
  while (
    existingInBatch.has(candidateNumber) ||
    (isDbConnected && (await Invoice.exists({ invoiceNumber: candidateNumber })))
  ) {
    candidateNumber = `${baseInvoiceNumber}-${counter}`;
    counter++;
  }

  existingInBatch.add(candidateNumber);
  return candidateNumber;
}

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
