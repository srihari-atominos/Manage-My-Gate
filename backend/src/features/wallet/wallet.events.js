import { EventEmitter } from 'events';

export const WALLET_UPDATED = 'WALLET_UPDATED';
export const WALLET_TRANSACTION_CREATED = 'WALLET_TRANSACTION_CREATED';

export const walletEventEmitter = new EventEmitter();

// Load socket listeners asynchronously
import { setupWalletSocketListeners } from './wallet.socket.js';
setupWalletSocketListeners().catch((err) => {
  console.error('Failed to initialize wallet socket listeners:', err);
});

export default walletEventEmitter;
