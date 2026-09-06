const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/manage_my_gate_dev');
  
  const unit = await mongoose.connection.collection('villas').findOne({
    $or: [
      { unitNumber: 'B-202' },
      { unitNumber: '202', blockOrBuilding: 'B' },
      { unitNumber: 'B 202' }
    ]
  });

  if (!unit) {
    console.log('Unit B-202 not found in the actual dev database.');
  } else {
    console.log('Unit Found in dev DB:', unit.unitNumber, unit.blockOrBuilding);
    console.log('Owner ID:', unit.ownerId);
    
    if (unit.ownerId) {
      const owner = await mongoose.connection.collection('users').findOne({ _id: unit.ownerId });
      if (owner) {
        console.log('Owner Details:');
        console.log('- Name:', owner.name || owner.username);
        console.log('- Email:', owner.email);
        console.log('- Phone:', owner.phone);
      } else {
        console.log('Owner user document not found.');
      }
    }
    
    console.log('\nResidents Array:');
    if (unit.residents && unit.residents.length > 0) {
      for (const res of unit.residents) {
        const user = await mongoose.connection.collection('users').findOne({ _id: res.userId });
        console.log(`- Type: ${res.residencyType}, User: ${user ? (user.name || user.username) : 'Unknown'} (${res.userId})`);
      }
    } else {
      console.log('No residents found.');
    }
  }

  process.exit(0);
}

main().catch(console.error);
