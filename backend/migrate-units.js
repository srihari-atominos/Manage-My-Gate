import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate';

mongoose.connect(uri).then(async () => {
  const OrgMembership = mongoose.model('OrgMembership', new mongoose.Schema({}, { strict: false }));
  
  // Drop the old unique index that prevents multiple units per user
  try {
    await OrgMembership.collection.dropIndex('userId_1_orgId_1');
    console.log('Dropped old index userId_1_orgId_1');
  } catch (e) {
    console.log('Index might not exist or already dropped:', e.message);
  }

  // Find all memberships that have a units array with elements
  const memberships = await OrgMembership.find({ 'units.0': { $exists: true } });
  
  console.log(`Found ${memberships.length} memberships with units array to migrate.`);
  
  for (const m of memberships) {
    const doc = m.toObject();
    const units = doc.units || [];
    
    // We keep the root document for the first unit, and create new docs for the rest
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      
      // If the root document doesn't have a villaId, use this unit's data for the root
      if (!doc.villaId) {
        m.villaId = unit.villaId;
        m.residentType = unit.residentType;
        m.units = []; // clear it
        await m.save();
        console.log(`Updated root doc for user ${doc.userId} with villa ${unit.villaId}`);
      } 
      else if (String(doc.villaId) === String(unit.villaId)) {
         // It's a duplicate of the root, just clear it from the array
         m.units = [];
         await m.save();
         console.log(`Cleared duplicate unit in array for user ${doc.userId}`);
      }
      // Otherwise, create a NEW document for this unit
      else {
        const newMembership = new OrgMembership({
          userId: doc.userId,
          orgId: doc.orgId,
          roleId: doc.roleId,
          roleIds: doc.roleIds,
          status: doc.status,
          villaId: unit.villaId,
          residentType: unit.residentType,
          units: []
        });
        try {
          await newMembership.save();
          console.log(`Created NEW membership doc for user ${doc.userId} with villa ${unit.villaId}`);
        } catch (e) {
          if (e.code === 11000) {
            console.log(`Duplicate membership already exists for user ${doc.userId} and villa ${unit.villaId}, skipping creation.`);
          } else {
            throw e;
          }
        }
        
        // Remove it from the original doc's array
        m.units = [];
        await m.save();
      }
    }
  }
  
  console.log('Migration complete!');
  mongoose.disconnect();
}).catch(console.error);
