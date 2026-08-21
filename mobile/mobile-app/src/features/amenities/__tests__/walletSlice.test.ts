import walletReducer, { fetchWalletThunk, topUpWalletThunk } from '../store/walletSlice';

describe('walletSlice (Amenities) Redux Reducers', () => {
  const initialState = {
    balance: 0,
    currency: 'INR',
    transactions: [],
    loading: false,
    toppingUp: false,
    error: null,
    successMsg: null,
  };

  it('should return the initial state', () => {
    expect(walletReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('fetchWalletThunk extraReducers', () => {
    it('should handle fetchWalletThunk.pending', () => {
      const action = { type: fetchWalletThunk.pending.type };
      const state = walletReducer(initialState, action);
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle fetchWalletThunk.fulfilled with transactionHistory array (backend schema)', () => {
      const mockPayload = {
        data: {
          balance: 150,
          currency: 'INR',
          transactionHistory: [
            { _id: 'tx1', amount: 50, type: 'CREDIT', description: 'Top Up' }
          ]
        }
      };
      const action = { type: fetchWalletThunk.fulfilled.type, payload: mockPayload };
      const state = walletReducer(initialState, action);
      
      expect(state.loading).toBe(false);
      expect(state.balance).toBe(150);
      expect(state.transactions).toHaveLength(1);
      expect(state.transactions[0]._id).toBe('tx1');
    });

    it('should handle fetchWalletThunk.fulfilled with transactions array (fallback schema)', () => {
      const mockPayload = {
        data: {
          balance: 200,
          transactions: [
            { _id: 'tx2', amount: 100, type: 'DEBIT', description: 'Booking' }
          ]
        }
      };
      const action = { type: fetchWalletThunk.fulfilled.type, payload: mockPayload };
      const state = walletReducer(initialState, action);
      
      expect(state.loading).toBe(false);
      expect(state.balance).toBe(200);
      expect(state.transactions).toHaveLength(1);
      expect(state.transactions[0]._id).toBe('tx2');
    });

    it('should handle fetchWalletThunk.rejected', () => {
      const action = { type: fetchWalletThunk.rejected.type, payload: 'Network Error' };
      const state = walletReducer(initialState, action);
      
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network Error');
    });
  });

  describe('topUpWalletThunk extraReducers', () => {
    it('should handle topUpWalletThunk.pending', () => {
      const action = { type: topUpWalletThunk.pending.type };
      const state = walletReducer(initialState, action);
      expect(state.toppingUp).toBe(true);
      expect(state.error).toBeNull();
      expect(state.successMsg).toBeNull();
    });

    it('should handle topUpWalletThunk.fulfilled when backend returns updated balance', () => {
      const mockPayload = {
        data: {
          balance: 500,
          transaction: { _id: 'tx3', amount: 500, type: 'CREDIT', description: 'Added Funds' }
        }
      };
      const action = { type: topUpWalletThunk.fulfilled.type, payload: mockPayload };
      const state = walletReducer({ ...initialState, balance: 0 }, action);
      
      expect(state.toppingUp).toBe(false);
      expect(state.balance).toBe(500);
      expect(state.transactions).toHaveLength(1);
      expect(state.transactions[0]._id).toBe('tx3');
      expect(state.successMsg).toBe('Wallet successfully topped up!');
    });

    it('should handle topUpWalletThunk.rejected', () => {
      const action = { type: topUpWalletThunk.rejected.type, payload: 'Payment Failed' };
      const state = walletReducer(initialState, action);
      
      expect(state.toppingUp).toBe(false);
      expect(state.error).toBe('Payment Failed');
    });
  });
});
