import mongoose from "mongoose";

const { Schema } = mongoose;

async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/database_name");

  const userSchema = new Schema({ name: String, email: String });
  const User = mongoose.models.User || mongoose.model("User", userSchema);

  const villaSchema = new Schema({
    unitNumber: String,
    residents: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      residencyType: String
    }]
  });
  const Villa = mongoose.models.Villa || mongoose.model("Villa", villaSchema);

  const u = new User({ name: "Kavya", email: "kavyat2201@gmail.com" });
  await u.save();

  const v = new Villa({ unitNumber: "Test", residents: [{ userId: u._id, residencyType: "Family" }] });
  await v.save();

  // Aggregate
  const [result] = await Villa.aggregate([
    { $match: { _id: v._id } },
    { $facet: { data: [{ $skip: 0 }, { $limit: 10 }] } }
  ]);

  let data = result.data;
  console.log("Before populate:", JSON.stringify(data, null, 2));
  
  data = await Villa.populate(data, { path: "residents.userId", select: "name email" });
  console.log("After populate:", JSON.stringify(data, null, 2));

  mongoose.disconnect();
}
run().catch(console.error);
