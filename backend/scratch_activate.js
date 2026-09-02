import mongoose from "mongoose";
import bcrypt from "bcrypt";
async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/database_name");
  const db = mongoose.connection.db;
  const orgId = new mongoose.Types.ObjectId("6a6efd60f62f21f2b26eb9a0");
  
  const hashedPassword = await bcrypt.hash("Admin@123", 10);
  
  const adminUser = {
    _id: new mongoose.Types.ObjectId(),
    username: "admin@comm.com",
    name: "Comm Admin",
    email: "admin@comm.com",
    password: hashedPassword,
    role: "Community Admin",
    orgId: orgId,
    status: "Active",
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const familyUser = {
    _id: new mongoose.Types.ObjectId(),
    username: "kavyat2201@gmail.com",
    name: "Kavya",
    email: "kavyat2201@gmail.com",
    password: hashedPassword,
    role: "Family Member",
    orgId: orgId,
    status: "Active",
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await db.collection("users").insertMany([adminUser, familyUser]);
  console.log("Restored admin@comm.com and kavyat2201@gmail.com");
  mongoose.disconnect();
}
run();
