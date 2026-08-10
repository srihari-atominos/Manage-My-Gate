import mongoose from 'mongoose';
import MasterPricing from './src/features/masterPricing/masterPricing.model.js';

const MONGODB_URI = 'mongodb://127.0.0.1:27017/manage_my_gate';

const seedFeatures = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const features = [
      {
        planCode: 'FEAT_AMENITIES',
        name: 'Amenities & Booking',
        type: 'FEATURE_ADDON',
        pricingModel: 'FLAT',
        basePrice: 500,
        unitPrice: 0,
        billingInterval: 'MONTHLY',
        features: ['Facility Reservation', 'Payment Gateway Integration', 'Usage Analytics'],
        status: 'ACTIVE',
        maxAgentDiscountPercent: 10,
        setupFee: 0,
        freeTrialDuration: 0,
      },
      {
        planCode: 'FEAT_NOTICE_BOARD',
        name: 'Digital Notice Board',
        type: 'FEATURE_ADDON',
        pricingModel: 'FLAT',
        basePrice: 200,
        unitPrice: 0,
        billingInterval: 'MONTHLY',
        features: ['Announcements', 'Push Notifications', 'Read Receipts'],
        status: 'ACTIVE',
        maxAgentDiscountPercent: 5,
        setupFee: 0,
        freeTrialDuration: 0,
      },
      {
        planCode: 'FEAT_VISITOR_MGMT',
        name: 'Visitor Management',
        type: 'UNIT_ADDON',
        pricingModel: 'PER_UNIT',
        basePrice: 1000,
        unitPrice: 5,
        billingInterval: 'MONTHLY',
        features: ['QR Code Entry', 'Pre-approval', 'Gate Pass Generation', 'Delivery Tracking'],
        status: 'ACTIVE',
        maxAgentDiscountPercent: 15,
        setupFee: 500,
        freeTrialDuration: 0,
      },
      {
        planCode: 'FEAT_HELPDESK',
        name: 'Helpdesk & Complaints',
        type: 'FEATURE_ADDON',
        pricingModel: 'FLAT',
        basePrice: 800,
        unitPrice: 0,
        billingInterval: 'MONTHLY',
        features: ['Ticket Management', 'SLA Tracking', 'Vendor Escalation'],
        status: 'ACTIVE',
        maxAgentDiscountPercent: 10,
        setupFee: 0,
        freeTrialDuration: 0,
      },
      {
        planCode: 'FEAT_BILLING',
        name: 'Billing & Collection',
        type: 'UNIT_ADDON',
        pricingModel: 'PER_UNIT',
        basePrice: 0,
        unitPrice: 10,
        billingInterval: 'MONTHLY',
        features: ['Automated Invoicing', 'Penalty Calculation', 'Online Payments', 'Ledger Reports'],
        status: 'ACTIVE',
        maxAgentDiscountPercent: 0,
        setupFee: 1000,
        freeTrialDuration: 0,
      }
    ];

    for (const feature of features) {
      const exists = await MasterPricing.findOne({ planCode: feature.planCode });
      if (!exists) {
        await MasterPricing.create(feature);
        console.log(`Created feature: ${feature.name}`);
      } else {
        console.log(`Feature already exists: ${feature.name}`);
      }
    }

    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

seedFeatures();
