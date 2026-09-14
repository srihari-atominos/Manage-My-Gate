import mongoose from 'mongoose';
import config from '../config.js';
import logger from '../../utils/logger.utils.js';

/**
 * Establishes a connection to the MongoDB database.
 * @returns {Promise<void>}
 */
export const connectToDb = async (retries = 5, delayMs = 3000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const connectionInstance = await mongoose.connect(config.mongodb.uri, {
        retryWrites: false,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });
      logger.info(`MongoDB connected successfully! DB HOST: ${connectionInstance.connection.host}`);

      // Check MongoDB Topology to handle standalone database instances without crashing on transactions
      const topologyType = mongoose.connection.getClient().topology?.description?.type;
      const isStandalone = topologyType === 'Single' || topologyType === 'Unknown';

      if (isStandalone) {
        logger.warn('Connected to a Standalone MongoDB instance. Enabling safe Mongoose transaction fallback to prevent transaction errors.');
        
        // Return a mock session to satisfy code that calls startTransaction()
        mongoose.startSession = async function() {
          return {
            _isMockSession: true,
            hasEnded: false,
            inTransaction: () => false,
            startTransaction: () => {},
            commitTransaction: async () => {},
            abortTransaction: async () => {},
            endSession: async () => {},
            withTransaction: async (fn) => fn(),
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

        const originalDollarSave = mongoose.Model.prototype.$save;
        if (originalDollarSave) {
          mongoose.Model.prototype.$save = function(options, fn) {
            if (options && options.session && options.session._isMockSession) {
              delete options.session;
            }
            if (this.$__ && this.$__.session && this.$__.session._isMockSession) {
              this.$__.session = null;
            }
            return originalDollarSave.call(this, options, fn);
          };
        }

        const originalCreate = mongoose.Model.create;
        mongoose.Model.create = function() {
          const lastArg = arguments[arguments.length - 1];
          if (lastArg && typeof lastArg === 'object' && lastArg.session && lastArg.session._isMockSession) {
            delete lastArg.session;
          }
          return originalCreate.apply(this, arguments);
        };
        
        const originalInsertMany = mongoose.Model.insertMany;
        mongoose.Model.insertMany = function(arr, options) {
          if (options && options.session && options.session._isMockSession) {
            delete options.session;
          }
          return originalInsertMany.apply(this, arguments);
        };
      }
      return;
    } catch (error) {
      logger.error(`MongoDB connection attempt ${attempt}/${retries} FAILED: ${error.message}`);
      if (attempt === retries) {
        logger.error('All MongoDB connection retries exhausted. Server startup FAILED.');
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

export default connectToDb;
