import Redis from 'ioredis';
import logger from './logger.utils.js';

import { EventEmitter } from 'events';

class MessageBroker {
  constructor() {
    this.handlers = new Map();
    this.localBus = new EventEmitter();
    this.useRedis = false; // Disable Redis by default for local dev to prevent crashes

    if (process.env.REDIS_URL) {
      this.useRedis = true;
      const redisUrl = process.env.REDIS_URL;
      
      // Publisher client
      this.publisher = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          return Math.min(times * 50, 2000);
        }
      });

      // Subscriber client
      this.subscriber = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          return Math.min(times * 50, 2000);
        }
      });

      this.publisher.on('error', (err) => logger.error('Redis Publisher Error:', err));
      this.subscriber.on('error', (err) => logger.error('Redis Subscriber Error:', err));
      this.subscriber.on('connect', () => logger.info('Redis Subscriber connected'));
      this.publisher.on('connect', () => logger.info('Redis Publisher connected'));

      // Listen for incoming messages on subscribed channels
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
    }
  }

  /**
   * Publish an event to the global Redis message broker or local bus
   */
  async publishEvent(channel, payload) {
    try {
      if (this.useRedis) {
        const message = JSON.stringify(payload);
        await this.publisher.publish(channel, message);
      } else {
        this.localBus.emit(channel, payload);
      }
    } catch (err) {
      logger.error(`Failed to publish to channel ${channel}:`, err);
    }
  }

  /**
   * Subscribe to a channel globally or locally
   */
  subscribeEvent(channel, callback) {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, []);
      if (this.useRedis) {
        this.subscriber.subscribe(channel).catch((err) => {
          logger.error(`Failed to subscribe to ${channel}:`, err);
        });
      } else {
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
