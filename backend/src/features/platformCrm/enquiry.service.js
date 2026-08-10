import mongoose from 'mongoose';
import enquiryRepository from './enquiry.repository.js';
import enquiryEvents from './enquiry.events.js';
import HttpError from '../../utils/httpError.utils.js';
import EnquiryActivity from './enquiryActivity.model.js';
import EnquiryStageHistory from './enquiryStageHistory.model.js';
import EnquiryInsight from './enquiryInsight.model.js';

class EnquiryService {
  async createEnquiry(data, xRequestId) {
    if (xRequestId) console.log(`[${xRequestId}] EnquiryService.createEnquiry: Starting creation for ${data.email}`);
    
    // Validate uniqueness of email for active inquiries if necessary, or just rely on DB unique index
    const existing = await enquiryRepository.findByEmail(data.email);
    if (existing && existing.status !== 'Lost') {
      // In a real system, you might allow multiple enquiries if they are for different orgs, but per spec email is unique.
      throw new HttpError(409, `An active enquiry with email ${data.email} already exists.`);
    }

    const createdEnquiry = await enquiryRepository.create(data);
    
    enquiryEvents.emit('enquiry_created', createdEnquiry);
    if (xRequestId) console.log(`[${xRequestId}] EnquiryService.createEnquiry: Successfully created ${createdEnquiry.enquiryId}`);
    
    console.log(`\n======================================================`);
    console.log(`📧 SIMULATED EMAIL to [${data.email}]:`);
    console.log(`Subject: Your form has been submitted`);
    console.log(`Hello ${data.username},`);
    console.log(`Thank you for registering your organization "${data.organizationName}".`);
    console.log(`Your form has been successfully submitted and is currently pending review by our team.`);
    console.log(`We will notify you once your account is fully activated.`);
    console.log(`======================================================\n`);

    return createdEnquiry;
  }

  async getAllEnquiries(queryParams, xRequestId) {
    if (xRequestId) console.log(`[${xRequestId}] EnquiryService.getAllEnquiries`);
    return await enquiryRepository.findAllPaginated(queryParams);
  }

  async getEnquiryById(id, xRequestId) {
    if (xRequestId) console.log(`[${xRequestId}] EnquiryService.getEnquiryById: ${id}`);
    const enquiry = await enquiryRepository.findById(id);
    if (!enquiry) {
      throw new HttpError(404, `Enquiry with ID ${id} not found.`);
    }
    return enquiry;
  }

  async updateEnquiryStatus(id, { status, notes }, xRequestId) {
    return await this.updateStage(id, { stage: status, notes }, xRequestId);
  }

  async updateStage(id, { stage, notes }, xRequestId) {
    if (xRequestId) console.log(`[${xRequestId}] EnquiryService.updateStage: ${id} to ${stage}`);
    
    const session = await mongoose.startSession();
    session.startTransaction();
    let updatedEnquiry;
    let oldStatus;

    try {
      const enquiry = await enquiryRepository.findById(id);
      if (!enquiry) {
        throw new HttpError(404, `Enquiry with ID ${id} not found.`);
      }
      
      oldStatus = enquiry.status;
      if (oldStatus !== stage) {
        // Close previous stage history
        const openStage = await EnquiryStageHistory.findOne({ enquiryId: id, exitedAt: null }).session(session);
        if (openStage) {
          openStage.exitedAt = new Date();
          openStage.duration = openStage.exitedAt.getTime() - openStage.enteredAt.getTime();
          await openStage.save({ session });
        }

        // Open new stage history
        await EnquiryStageHistory.create([{
          enquiryId: id,
          stage: stage,
          enteredAt: new Date()
        }], { session });
      }

      const updateData = { status: stage };
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      updatedEnquiry = await enquiryRepository.updateById(id, updateData, session);

      // Optionally add a note activity if notes provided
      if (notes) {
        await EnquiryActivity.create([{
          enquiryId: id,
          type: 'StatusChange',
          description: `Stage changed to ${stage}. Note: ${notes}`,
        }], { session });
      }

      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw new HttpError(500, `Failed to update stage: ${error.message}`);
    }

    if (oldStatus !== stage) {
      enquiryEvents.emit('enquiry_status_changed', { enquiry: updatedEnquiry, oldStatus });
    }
    
    return updatedEnquiry;
  }

  async assignEnquiry(id, { assignedTo }, xRequestId) {
    if (xRequestId) console.log(`[${xRequestId}] EnquiryService.assignEnquiry: ${id} to ${assignedTo}`);
    const enquiry = await enquiryRepository.findById(id);
    if (!enquiry) {
      throw new HttpError(404, `Enquiry with ID ${id} not found.`);
    }

    const updatedEnquiry = await enquiryRepository.updateById(id, { assignedTo });
    enquiryEvents.emit('enquiry_assigned', updatedEnquiry);
    
    return updatedEnquiry;
  }

  async convertToCustomer(id, xRequestId) {
    if (xRequestId) console.log(`[${xRequestId}] EnquiryService.convertToCustomer: ${id}`);
    
    const enquiry = await enquiryRepository.findById(id);
    if (!enquiry) {
      throw new HttpError(404, `Enquiry with ID ${id} not found.`);
    }

    if (enquiry.status === 'Won') {
      throw new HttpError(400, `Enquiry ${id} is already converted.`);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Create Organization
      const Organization = mongoose.model('Organization');
      const [organization] = await Organization.create([{
        name: enquiry.organizationName,
        totalUnits: enquiry.totalUnits,
        contactEmail: enquiry.email,
        contactPhone: enquiry.phone,
        status: 'ACTIVE',
      }], { session });

      // 2. Find and Update User (Community Admin)
      const User = mongoose.model('User');
      let user = await User.findOne({ email: enquiry.email }).session(session);
      
      const crypto = await import('crypto');
      const cryptoUtils = await import('../../utils/crypto.utils.js');
      
      const generatedPassword = crypto.randomBytes(8).toString('hex'); // 16 char secure password
      const hashedPassword = await cryptoUtils.hashPassword(generatedPassword);

      if (user) {
        user.status = 'Active';
        user.password = hashedPassword;
        await user.save({ session });
      } else {
        [user] = await User.create([{
          username: enquiry.username,
          email: enquiry.email,
          phone: enquiry.phone,
          status: 'Active',
          password: hashedPassword
        }], { session });
      }
      
      // Simulate Email (In real system, send email via service)
      if (xRequestId) console.log(`[${xRequestId}] ✉️ SIMULATED EMAIL to ${enquiry.email}: Your account is activated. Password: ${generatedPassword}`);

      // 3. Create Default Role (if not statically defined, or assign to membership)
      const Role = mongoose.model('Role');
      let adminRole = await Role.findOne({ name: 'COMMUNITY_ADMIN' }).session(session);
      if (!adminRole) {
        [adminRole] = await Role.create([{ name: 'COMMUNITY_ADMIN', description: 'Admin' }], { session });
      }

      // 4. Create Organization Membership
      const OrgMembership = mongoose.model('OrgMembership');
      await OrgMembership.create([{
        user: user._id,
        organization: organization._id,
        role: adminRole._id,
        status: 'ACTIVE',
      }], { session });

      // 5. Create Default Subscription (PlatformSubscription)
      const PlatformSubscription = mongoose.model('PlatformSubscription');
      await PlatformSubscription.create([{
        organization: organization._id,
        planCode: 'DEFAULT_TRIAL',
        features: enquiry.selectedFeatures,
        status: 'TRIAL',
      }], { session });

      // 6. Update Enquiry Status
      const updatedEnquiry = await enquiryRepository.updateById(id, { 
        status: 'Won', 
        notes: `${enquiry.notes ? enquiry.notes + '\n' : ''}Converted to Organization: ${organization._id}` 
      }, session);

      await session.commitTransaction();
      session.endSession();

      // Emit CRM Conversion Event
      enquiryEvents.emit('enquiry_converted', { 
        enquiry: updatedEnquiry, 
        organizationId: organization._id,
        userId: user._id 
      });

      if (xRequestId) console.log(`[${xRequestId}] EnquiryService.convertToCustomer: Successfully converted ${id}`);
      return updatedEnquiry;

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      if (xRequestId) console.error(`[${xRequestId}] EnquiryService.convertToCustomer: Transaction aborted`, error);
      throw new HttpError(500, `Conversion failed: ${error.message}`);
    }
  }

  async getActivities(id, xRequestId) {
    if (xRequestId) console.log(`[${xRequestId}] EnquiryService.getActivities: ${id}`);
    return await EnquiryActivity.find({ enquiryId: id }).sort({ createdAt: -1 });
  }

  async addActivity(id, data, xRequestId) {
    if (xRequestId) console.log(`[${xRequestId}] EnquiryService.addActivity: ${id}`);
    const activity = new EnquiryActivity({
      enquiryId: id,
      ...data
    });
    await activity.save();
    return activity;
  }

  async getStageHistory(id, xRequestId) {
    if (xRequestId) console.log(`[${xRequestId}] EnquiryService.getStageHistory: ${id}`);
    return await EnquiryStageHistory.find({ enquiryId: id }).sort({ enteredAt: 1 });
  }

  async getInsights(id, xRequestId) {
    if (xRequestId) console.log(`[${xRequestId}] EnquiryService.getInsights: ${id}`);
    let insight = await EnquiryInsight.findOne({ enquiryId: id });
    if (!insight) {
      // Create mock insight for this architectural scaffold
      const enquiry = await enquiryRepository.findById(id);
      if (!enquiry) throw new HttpError(404, `Enquiry not found.`);
      
      const isEnterprise = enquiry.totalUnits > 500;
      
      insight = new EnquiryInsight({
        enquiryId: id,
        leadScore: isEnterprise ? 85 : 60,
        conversionProbability: isEnterprise ? 'High' : 'Medium',
        revenueEstimate: {
          monthly: enquiry.totalUnits * 2,
          annual: enquiry.totalUnits * 24
        },
        aiInsights: [
          isEnterprise ? 'Large community opportunity' : 'Standard community size',
          enquiry.selectedFeatures.includes('Billing') ? 'Strong billing module interest' : 'Standard feature interest',
          isEnterprise ? 'Enterprise plan suitability' : 'Growth plan suitability'
        ],
        recommendations: [
          'Schedule product demo',
          isEnterprise ? 'Send enterprise proposal' : 'Offer onboarding consultation'
        ]
      });
      await insight.save();
    }
    return insight;
  }
}

export default new EnquiryService();
