import { configureStore } from '@reduxjs/toolkit';
import amenityBookingReducer, { fetchDashboardStatsThunk } from '../store/amenityBookingSlice';
import amenityService from '../services/amenityService';

jest.mock('../services/amenityService', () => ({
  __esModule: true,
  default: { getDashboardStats: jest.fn() },
}));

describe('Amenity dashboard request coalescing', () => {
  it('starts one metrics request when multiple consumers refresh together', async () => {
    let resolveRequest: (value: unknown) => void = () => {};
    (amenityService.getDashboardStats as jest.Mock).mockImplementation(
      () => new Promise((resolve) => { resolveRequest = resolve; })
    );

    const store = configureStore({ reducer: { amenityBookings: amenityBookingReducer } });
    const first = store.dispatch(fetchDashboardStatsThunk());
    const second = store.dispatch(fetchDashboardStatsThunk());

    expect(amenityService.getDashboardStats).toHaveBeenCalledTimes(1);
    expect(store.getState().amenityBookings.dashboardStatsLoading).toBe(true);

    resolveRequest({ data: { bookingKpis: { pendingApprovals: 2 } } });
    await first;
    await second;

    expect(store.getState().amenityBookings.dashboardStatsLoading).toBe(false);
    expect(store.getState().amenityBookings.dashboardStats).toEqual({ bookingKpis: { pendingApprovals: 2 } });
  });
});
