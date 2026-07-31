const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const OrgMembership = mongoose.model('OrgMembership', new mongoose.Schema({}, { strict: false }));
  const users = await OrgMembership.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId('6a69d469e5731b9caddab77a') } },
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
      $group: {
        _id: '$userId',
        rolesPopulated: { $first: '$rolesPopulated' },
        rolePopulatedFallback: { $first: '$rolePopulatedFallback' }
      }
    },
    {
      $project: {
        rolesPopulated: 1,
        rolePopulatedFallback: 1,
        roleSize: { $size: '$rolesPopulated' },
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
        },
      }
    }
  ]);
  console.dir(users, { depth: null });
  process.exit(0);
});
