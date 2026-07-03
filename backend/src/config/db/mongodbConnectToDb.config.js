import mongoose from 'mongoose';
import config from '../config.js';
import logger from '../../utils/logger.utils.js';

/**
 * Establishes a connection to the MongoDB database.
 * @returns {Promise<void>}
 */
export const connectToDb = async () => {
  try {
    const connectionInstance = await mongoose.connect(config.mongodb.uri, { retryWrites: false });
    logger.info(`MongoDB connected successfully! DB HOST: ${connectionInstance.connection.host}`);

    // Development Bypass for MongoDB Transactions
    // Standalone instances do not support transactions, which crashes the app locally.
    if (config.nodeEnv !== 'production') {
      const topologyType = mongoose.connection.getClient().topology?.description?.type;
      const isStandalone = topologyType === 'Single' || topologyType === 'Unknown';

      if (isStandalone) {
        logger.warn('Running on a Standalone MongoDB instance in development mode. Bypassing Mongoose Transactions to prevent crashes.');
        
        // Return a mock session to satisfy code that calls startTransaction()
        mongoose.startSession = async function() {
          return {
            _isMockSession: true,
            startTransaction: () => {},
            commitTransaction: async () => {},
            abortTransaction: async () => {},
            endSession: async () => {}
          };
        };

        // Strip the mock session from all Mongoose query execution to prevent Driver errors
        const originalExec = mongoose.Query.prototype.exec;
        mongoose.Query.prototype.exec = function() {
          if (this.options && this.options.session && this.options.session._isMockSession) {
            delete this.options.session;
          }
          return originalExec.apply(this, arguments);
        };

        const originalAggregateExec = mongoose.Aggregate.prototype.exec;
        mongoose.Aggregate.prototype.exec = function() {
          if (this.options && this.options.session && this.options.session._isMockSession) {
            delete this.options.session;
          }
          return originalAggregateExec.apply(this, arguments);
        };

        const originalSave = mongoose.Model.prototype.save;
        mongoose.Model.prototype.save = function(options, fn) {
          if (options && options.session && options.session._isMockSession) {
            delete options.session;
          }
          return originalSave.call(this, options, fn);
        };
        
        const originalInsertMany = mongoose.Model.insertMany;
        mongoose.Model.insertMany = function(arr, options) {
          if (options && options.session && options.session._isMockSession) {
            delete options.session;
          }
          return originalInsertMany.apply(this, arguments);
        };
      }
    }
  } catch (error) {
    logger.error('MongoDB connection FAILED: ', error);
    process.exit(1);
  }
};

export default connectToDb;
