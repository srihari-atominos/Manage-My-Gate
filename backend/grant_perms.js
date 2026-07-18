import mongoose from 'mongoose';

async function grantAllPerms() {
  await mongoose.connect('mongodb://localhost:27017/manage_my_gate');
  
  // 1. Get all permission IDs
  const permissions = await mongoose.connection.collection('permissions').find({}).toArray();
  const permissionIds = permissions.map(p => p._id);
  console.log(`Found ${permissionIds.length} permissions in the system.`);

  // 2. Find all Super Admin or Admin roles
  const roles = await mongoose.connection.collection('roles').find({ 
    name: { $in: ['Super Admin', 'Platform Super Admin', 'Admin'] } 
  }).toArray();
  
  console.log(`Found ${roles.length} admin roles.`);

  for (const role of roles) {
    // Delete existing permissions for this role to avoid duplicates
    await mongoose.connection.collection('rolepermissions').deleteMany({ roleId: role._id });
    
    // Insert all permissions
    const newDocs = permissionIds.map(pid => ({
      roleId: role._id,
      permissionId: pid,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    if (newDocs.length > 0) {
      await mongoose.connection.collection('rolepermissions').insertMany(newDocs);
      console.log(`Granted all permissions to role: ${role.name} in org ${role.orgId}`);
    }
  }

  mongoose.disconnect();
}

grantAllPerms();
