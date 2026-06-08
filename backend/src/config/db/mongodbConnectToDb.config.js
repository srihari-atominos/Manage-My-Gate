import mongoose from 'mongoose';
import config from '../config.js';
import logger from '../../utils/logger.utils.js';

/**
 * Establishes a connection to the MongoDB database.
 * @returns {Promise<void>}
 */
export const connectToDb = async () => {
  try {
    const connectionInstance = await mongoose.connect(config.mongodb.uri);
    logger.info(`MongoDB connected successfully! DB HOST: ${connectionInstance.connection.host}`);
  } catch (error) {
    logger.error('MongoDB connection FAILED: ', error);
    process.exit(1);
  }
};

export default connectToDb;
