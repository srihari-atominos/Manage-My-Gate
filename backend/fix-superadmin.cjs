const mongoose = require('mongoose');

async function fixSuperAdmin() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
  const db = mongoose.connection.db;

  // Find the platform organization
  const platformOrg = await db.collection('organizations').findOne({ isPlatform: true });
  if (!platformOrg) {
    console.log("No platform organization found.");
    process.exit(1);
  }

  // Find the Platform Super Admin role
  const role = await db.collection('roles').findOne({ name: 'Platform Super Admin', orgId: platformOrg._id });
  if (!role) {
    console.log("No Platform Super Admin role found.");
    process.exit(1);
  }

  // Find the user
  const user = await db.collection('users').findOne({ email: 'superadmin@example.com' });
  if (!user) {
    console.log("User superadmin@example.com not found.");
    process.exit(1);
  }

  // Create or update membership
  const existingMembership = await db.collection('orgmemberships').findOne({ userId: user._id, orgId: platformOrg._id });
  
  if (!existingMembership) {
    await db.collection('orgmemberships').insertOne({
      userId: user._id,
      orgId: platformOrg._id,
      roleIds: [role._id],
      roleId: role._id,
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log("Membership created successfully!");
  } else {
    await db.collection('orgmemberships').updateOne(
      { _id: existingMembership._id },
      { $set: { roleIds: [role._id], roleId: role._id } }
    );
    console.log("Membership updated successfully!");
  }
  
  // Also fix .env so future syncPermissions don't crash
  const fs = require('fs');
  let env = fs.readFileSync('.env', 'utf8');
  env = env.replace('SUPER_ADMIN_EMAIL=admin@enterprise.com', 'SUPER_ADMIN_EMAIL=superadmin@example.com');
  fs.writeFileSync('.env', env);
  console.log("Updated .env SUPER_ADMIN_EMAIL");

  process.exit(0);
}

fixSuperAdmin().catch(console.error);
