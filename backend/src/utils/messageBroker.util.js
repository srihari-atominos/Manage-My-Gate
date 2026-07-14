import Redis from 'ioredis';
import logger from './logger.utils.js';

class MessageBroker {
  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    // Publisher client
    this.publisher = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      }
    });

    // Subscriber client (must be a separate connection for Redis pub/sub)
    this.subscriber = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      }
    });

    this.handlers = new Map();

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

  /**
   * Publish an event to the global Redis message broker
   */
  async publishEvent(channel, payload) {
    try {
      const message = JSON.stringify(payload);
      await this.publisher.publish(channel, message);
    } catch (err) {
      logger.error(`Failed to publish to channel ${channel}:`, err);
    }
  }

  /**
   * Subscribe to a channel globally
   */
  subscribeEvent(channel, callback) {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, []);
      this.subscriber.subscribe(channel, (err) => {
        if (err) logger.error(`Failed to subscribe to ${channel}:`, err);
      });
    }
    this.handlers.get(channel).push(callback);
  }
}

// Export singleton instance
export const messageBroker = new MessageBroker();
