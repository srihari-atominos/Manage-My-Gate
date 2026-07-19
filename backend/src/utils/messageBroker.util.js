import Redis from 'ioredis';
import { EventEmitter } from 'events';
import logger from './logger.utils.js';

// Retry strategy: back off exponentially up to 2s, but stop after 5 attempts.
const MAX_RETRY_ATTEMPTS = 5;

function buildRetryStrategy(clientName) {
  let warned = false;
  return function retryStrategy(times) {
    if (times >= MAX_RETRY_ATTEMPTS) {
      if (!warned) {
        warned = true;
        logger.warn(
          `[MessageBroker] Redis ${clientName} could not connect after ${MAX_RETRY_ATTEMPTS} attempts. ` +
          'Cross-pod messaging will fallback to local event bus. Start Redis to enable multi-instance scaling.'
        );
      }
      return null;
    }
    return Math.min(times * 200, 2000);
  };
}

class MessageBroker {
  constructor() {
    this.handlers = new Map();
    this.localBus = new EventEmitter();
    this.useRedis = !!process.env.REDIS_URL;
    this._available = false;

    if (this.useRedis) {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      // Publisher client
      this.publisher = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        lazyConnect: false,
        retryStrategy: buildRetryStrategy('Publisher'),
      });

      // Subscriber client
      this.subscriber = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        lazyConnect: false,
        retryStrategy: buildRetryStrategy('Subscriber'),
      });

      this.publisher.on('error', () => {}); // suppressed — retryStrategy logs the final failure
      this.subscriber.on('error', () => {});

      this.publisher.on('connect', () => {
        this._available = true;
        logger.info('[MessageBroker] Redis Publisher connected.');
      });

      this.subscriber.on('connect', () => {
        logger.info('[MessageBroker] Redis Subscriber connected.');
      });

      // Listen for incoming messages on subscribed channels
      this.subscriber.on('message', (channel, message) => {
        try {
          const payload = JSON.parse(message);
          const channelHandlers = this.handlers.get(channel) || [];
          for (const handler of channelHandlers) {
            handler(payload);
          }
        } catch (err) {
          logger.error(`[MessageBroker] Error parsing message on channel ${channel}:`, err);
        }
      });
    }
  }

  /**
   * Publish an event to the global Redis message broker or local bus
   */
  async publishEvent(channel, payload) {
    try {
      if (this.useRedis && this._available && this.publisher && this.publisher.status === 'ready') {
        const message = JSON.stringify(payload);
        await this.publisher.publish(channel, message);
      } else {
        this.localBus.emit(channel, payload);
      }
    } catch (err) {
      logger.error(`[MessageBroker] Failed to publish to channel ${channel}:`, err);
    }
  }

  /**
   * Subscribe to a channel globally or locally
   */
  subscribeEvent(channel, callback) {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, []);
      
      if (this.useRedis && this.subscriber) {
        // We subscribe on Redis
        this.subscriber.subscribe(channel, (err) => {
          if (err) logger.error(`[MessageBroker] Failed to subscribe to ${channel}:`, err);
        });

        // Also fallback listener on localBus in case Redis pub/sub goes down or is bypassed locally
        this.localBus.on(channel, (payload) => {
          const channelHandlers = this.handlers.get(channel) || [];
          for (const handler of channelHandlers) {
            handler(payload);
          }
        });
      } else {
        // Purely local event bus
        this.localBus.on(channel, (payload) => {
          const channelHandlers = this.handlers.get(channel) || [];
          for (const handler of channelHandlers) {
            handler(payload);
          }
        });
      }
    }
    this.handlers.get(channel).push(callback);
  }
}

// Export singleton instance
export const messageBroker = new MessageBroker();
