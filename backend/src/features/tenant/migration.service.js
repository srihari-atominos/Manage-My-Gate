import csvParser from 'csv-parser';
import { Readable } from 'stream';
import mongoose from 'mongoose';
import PlatformSubscription from '../platformSubscription/platformSubscription.model.js';
// Stub imports for the target models
import Unit from '../villa/villa.model.js';
import User from '../userManagement/user.model.js';

class MigrationService {
  async processMigrationFile(fileBuffer, organizationId) {
    // 1. Parse CSV without blocking the event loop (Stream based), with whitespace sanitization
    const results = await this.parseCSV(fileBuffer);
    
    // 2. Critical Validation: Verify against licensed units
    const subscription = await PlatformSubscription.findOne({ organisationId: organizationId }).lean();
    if (!subscription) {
      throw new Error('No active subscription found for this organization');
    }

    const licensedUnits = subscription.licensedUnits || 250; // Fallback if undefined
    
    // Validate physical assets (unique units) rather than residents
    const uniqueUnits = new Set(results.map(row => row.unitNumber || row.UnitNumber));
    if (uniqueUnits.size > licensedUnits) {
      throw new Error(`Upload contains ${uniqueUnits.size} unique units, which exceeds your license limit of ${licensedUnits}.`);
    }

    // 3. Process inside a Mongoose transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Map data into generic sanitized objects based on standard templates
      // Build bulkOps for Units (Upsert)
      const unitBulkOps = Array.from(uniqueUnits).map(unitNumber => {
        // Find the first row matching this unit to pull block info, etc.
        const rowData = results.find(row => (row.unitNumber || row.UnitNumber) === unitNumber) || {};
        const block = rowData.block || rowData.Block || 'A';
        
        return {
          updateOne: {
            filter: { organisationId: organizationId, unitNumber },
            update: { $set: { organisationId: organizationId, unitNumber, block } },
            upsert: true
          }
        };
      });

      // Build bulkOps for Residents (Upsert)
      const residentBulkOps = results.map(row => {
        const email = row.email || row.Email || `resident${Math.random().toString(36).substr(2, 5)}@example.com`;
        const name = row.name || row.ResidentName || 'Unknown Resident';
        
        return {
          updateOne: {
            filter: { organisationId: organizationId, email },
            update: { $set: { organisationId: organizationId, email, name, role: 'Resident' } },
            upsert: true
          }
        };
      });

      // Execute bulkWrite using the atomic session to safely handle partial updates
      let createdUnits = [];
      let createdResidents = [];
      
      if (unitBulkOps.length > 0) {
        const unitRes = await Unit.bulkWrite(unitBulkOps, { session });
        createdUnits.length = unitRes.upsertedCount + unitRes.modifiedCount;
      }
      
      if (residentBulkOps.length > 0) {
        const residentRes = await User.bulkWrite(residentBulkOps, { session });
        createdResidents.length = residentRes.upsertedCount + residentRes.modifiedCount;
      }

      await session.commitTransaction();
      session.endSession();
      
      return { 
        unitsProcessed: unitBulkOps.length,
        residentsProcessed: residentBulkOps.length
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  parseCSV(fileBuffer) {
    return new Promise((resolve, reject) => {
      const results = [];
      const stream = Readable.from(fileBuffer);
      
      stream
        .pipe(csvParser({
          mapHeaders: ({ header }) => header ? header.trim() : header,
          mapValues: ({ value }) => typeof value === 'string' ? value.trim() : value
        }))
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }
}

export default new MigrationService();
