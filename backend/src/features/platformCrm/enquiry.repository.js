import Enquiry from './enquiry.model.js';

class EnquiryRepository {
  async create(data, session = null) {
    const options = session ? { session } : {};
    const [created] = await Enquiry.create([data], options);
    return created;
  }

  async findById(id, session = null) {
    const query = Enquiry.findById(id).populate('assignedTo', 'name email');
    if (session) query.session(session);
    return await query.exec();
  }

  async findByEmail(email, session = null) {
    const query = Enquiry.findOne({ email });
    if (session) query.session(session);
    return await query.exec();
  }

  async findAllPaginated({ page = 1, limit = 10, search = '', status, assignedTo }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const matchStage = {};

    if (status) {
      matchStage.status = status;
    }

    if (assignedTo) {
      // Assuming assignedTo is an ObjectId or 'unassigned' string
      if (assignedTo === 'unassigned') {
        matchStage.assignedTo = null;
      } else {
        matchStage.assignedTo = assignedTo; // Requires proper ObjectId casting in advanced implementations
      }
    }

    if (search && search.trim() !== '') {
      matchStage.$or = [
        { organizationName: { $regex: search.trim(), $options: 'i' } },
        { username: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { enquiryId: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const pipeline = [
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limitNum },
            {
              $lookup: {
                from: 'users',
                localField: 'assignedTo',
                foreignField: '_id',
                as: 'assignedTo'
              }
            },
            {
              $unwind: {
                path: '$assignedTo',
                preserveNullAndEmptyArrays: true
              }
            }
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    const [result] = await Enquiry.aggregate(pipeline).exec();

    const data = result?.data || [];
    const totalRecords = result?.totalCount?.[0]?.count || 0;
    const totalPages = Math.ceil(totalRecords / limitNum) || 0;

    return {
      data,
      pagination: {
        currentPage: pageNum,
        limit: limitNum,
        totalRecords,
        totalPages,
      },
    };
  }

  async updateById(id, updateData, session = null) {
    const options = { new: true, runValidators: true };
    if (session) options.session = session;
    return await Enquiry.findByIdAndUpdate(id, updateData, options).populate('assignedTo', 'name email').exec();
  }
}

export default new EnquiryRepository();
