import Redis from 'ioredis';
import { EventEmitter } from 'events';
import logger from './logger.utils.js';

class MessageBroker {
  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.isRedisConnected = false;
    this.localEmitter = new EventEmitter();
    this.handlers = new Map();
    this.redisUrl = redisUrl;
    
    this.initRedis();
  }

  initRedis() {
    const self = this;
    let retriesCount = 0;
    
    // Custom retry strategy to prevent infinite retries and log spam when Redis is offline in dev
    const retryStrategy = (times) => {
      if (times > 3) {
        logger.warn('Redis connection unavailable. Operating on local In-Memory Event Broker.');
        self.isRedisConnected = false;
        return null; // Stop retries and enter 'end' state to silence ioredis
      }
      return Math.min(times * 100, 1000);
    };

    try {
      this.publisher = new Redis(this.redisUrl, {
        maxRetriesPerRequest: null,
        retryStrategy
      });

      this.subscriber = new Redis(this.redisUrl, {
        maxRetriesPerRequest: null,
        retryStrategy
      });

      this.publisher.on('error', (err) => {
        if (self.isRedisConnected) {
          logger.error('Redis Publisher Error:', err);
        } else if (err.code === 'ECONNREFUSED' && retriesCount === 0) {
          logger.warn(`Redis is not running at ${self.redisUrl}. Falling back to in-memory message broker.`);
          retriesCount++;
        }
      });

      this.subscriber.on('error', (err) => {
        if (self.isRedisConnected) {
          logger.error('Redis Subscriber Error:', err);
        }
      });

      this.subscriber.on('connect', () => {
        self.isRedisConnected = true;
        logger.info('Redis Subscriber connected successfully');
        
        // Re-subscribe all active handlers to Redis channels
        for (const channel of this.handlers.keys()) {
          this.subscriber.subscribe(channel, (err) => {
            if (err) logger.error(`Failed to subscribe to Redis channel ${channel}:`, err);
            else logger.info(`Subscribed to Redis channel: ${channel}`);
          });
        }
      });

      this.publisher.on('connect', () => {
        self.isRedisConnected = true;
        logger.info('Redis Publisher connected successfully');
      });

      // Listen for global Redis broadcast messages
      this.subscriber.on('message', (channel, message) => {
        try {
          const payload = JSON.parse(message);
          const channelHandlers = this.handlers.get(channel) || [];
          for (const handler of channelHandlers) {
            handler(payload);
          }
        } catch (err) {
          logger.error(`Error parsing message on channel ${channel}:`, err);
        }
      });
    } catch (err) {
      logger.error('Failed to initialize Redis client:', err);
      this.isRedisConnected = false;
    }
  }

  /**
   * Publish an event to the global Redis message broker (or local memory fallback)
   */
  async publishEvent(channel, payload) {
    if (this.isRedisConnected && this.publisher && this.publisher.status === 'ready') {
      try {
        const message = JSON.stringify(payload);
        await this.publisher.publish(channel, message);
      } catch (err) {
        logger.error(`Failed to publish to Redis channel ${channel}:`, err);
        this.localEmitter.emit(channel, payload);
      }
    } else {
      // Local fallback broadcast
      this.localEmitter.emit(channel, payload);
    }
  }

  /**
   * Subscribe to a channel globally
   */
  subscribeEvent(channel, callback) {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, []);
      
      if (this.isRedisConnected && this.subscriber && this.subscriber.status === 'ready') {
        this.subscriber.subscribe(channel, (err) => {
          if (err) logger.error(`Failed to subscribe to Redis channel ${channel}:`, err);
        });
      }
    }
    this.handlers.get(channel).push(callback);
    this.localEmitter.on(channel, callback);
  }
}

export const messageBroker = new MessageBroker();
export default messageBroker;
