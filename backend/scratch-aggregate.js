import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate';

mongoose.connect(uri).then(async () => {
  const OrgMembership = mongoose.model('OrgMembership', new mongoose.Schema({}, { strict: false }));
  
  const pipeline = [
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $lookup: {
        from: 'roles',
        localField: 'roleIds',
        foreignField: '_id',
        as: 'rolesPopulated',
      },
    },
    {
      $lookup: {
        from: 'roles',
        localField: 'roleId',
        foreignField: '_id',
        as: 'rolePopulatedFallback',
      },
    },
    {
      $lookup: {
        from: 'villas',
        localField: 'villaId',
        foreignField: '_id',
        as: 'villa',
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $unwind: {
        path: '$villa',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: '$user._id',
        user: { $first: '$user' },
        rolesPopulated: { $first: '$rolesPopulated' },
        rolePopulatedFallback: { $first: '$rolePopulatedFallback' },
        status: { $first: '$status' },
        assignedUnits: {
          $push: {
            $cond: [
              { $eq: [{ $ifNull: ['$villa._id', null] }, null] },
              '$$REMOVE',
              {
                villaId: '$villa._id',
                residentType: '$residentType',
                villaNumber: '$villa.unitNumber',
                villaBlock: '$villa.blockOrBuilding',
                status: '$status',
                role: {
                  $cond: {
                    if: { $gt: [{ $size: '$rolesPopulated' }, 0] },
                    then: {
                      $reduce: {
                        input: '$rolesPopulated.name',
                        initialValue: '',
                        in: {
                          $cond: [
                            { $eq: ['$$value', ''] },
                            '$$this',
                            { $concat: ['$$value', ', ', '$$this'] }
                          ]
                        }
                      }
                    },
                    else: { $ifNull: [{ $arrayElemAt: ['$rolePopulatedFallback.name', 0] }, ''] }
                  }
                }
              }
            ]
          }
        }
      }
    },
    { $limit: 2 }
  ];

  const result = await OrgMembership.aggregate(pipeline);
  console.log(JSON.stringify(result, null, 2));
  mongoose.disconnect();
}).catch(console.error);
