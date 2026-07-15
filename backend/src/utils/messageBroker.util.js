import Redis from 'ioredis';
import logger from './logger.utils.js';

// Retry strategy: back off exponentially up to 2s, but stop after 5 attempts.
// Returning null tells ioredis to stop retrying (avoids endless ECONNREFUSED spam).
const MAX_RETRY_ATTEMPTS = 5;

function buildRetryStrategy(clientName) {
  let warned = false;
  return function retryStrategy(times) {
    if (times >= MAX_RETRY_ATTEMPTS) {
      if (!warned) {
        warned = true;
        logger.warn(
          `[MessageBroker] Redis ${clientName} could not connect after ${MAX_RETRY_ATTEMPTS} attempts. ` +
          'Running without Redis — pub/sub events will be no-ops. Start Redis to enable cross-pod messaging.'
        );
      }
      // Returning null stops ioredis from retrying
      return null;
    }
    return Math.min(times * 200, 2000);
  };
}

class MessageBroker {
  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    this._available = false;
    this.handlers = new Map();

    // Publisher client
    this.publisher = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // let retryStrategy control lifetime
      enableOfflineQueue: false,
      lazyConnect: false,
      retryStrategy: buildRetryStrategy('Publisher'),
    });

    // Subscriber client (must be a separate connection for Redis pub/sub)
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

  /**
   * Publish an event to the global Redis message broker.
   * No-ops silently when Redis is unavailable.
   */
  async publishEvent(channel, payload) {
    if (this.publisher.status !== 'ready') return;
    try {
      await this.publisher.publish(channel, JSON.stringify(payload));
    } catch (err) {
      logger.error(`[MessageBroker] Failed to publish to channel ${channel}:`, err);
    }
  }

  /**
   * Subscribe to a channel globally.
   * No-ops silently when Redis is unavailable.
   */
  subscribeEvent(channel, callback) {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, []);
      if (this.subscriber.status === 'ready') {
        this.subscriber.subscribe(channel, (err) => {
          if (err) logger.error(`[MessageBroker] Failed to subscribe to ${channel}:`, err);
        });
      }
    }
    this.handlers.get(channel).push(callback);
  }
}

// Export singleton instance
export const messageBroker = new MessageBroker();
