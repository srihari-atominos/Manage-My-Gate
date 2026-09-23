import amenityBookingReducer, {
  fetchBookingQueueThunk,
  AmenityBookingState,
} from '../store/amenityBookingSlice';

describe('Amenity Booking Slice - Ledger Queue Reduction', () => {
  it('correctly maps nested backend payload { data: [...], summary: {...}, pagination: {...} }', () => {
    const initialState: AmenityBookingState = {
      adminBookings: [],
      ledgerSummary: null,
      amenitySummary: [],
      pagination: { currentPage: 1, totalPages: 1, totalRecords: 0, limit: 10 },
      loading: false,
      error: null,
    } as any;

    const mockBackendResponse = {
      success: true,
      message: 'Booking queue retrieved successfully',
      data: {
        data: [
          {
            _id: '6ab3a69d9de304ec5148c650',
            bookingId: 'RES-202609-000005',
            status: 'confirmed',
            paymentStatus: 'paid',
            bookingDate: '2026-09-23',
            startTime: '17:00',
            endTime: '18:00',
            totalFee: 6500,
            pricingDetails: { totalAmount: 6500, baseAmount: 1500, depositAmount: 5000 },
            amenityId: { name: 'Guest room', location: '2nd villa' },
            userId: { name: 'Naveen' },
          },
        ],
        pagination: {
          totalRecords: 1,
          currentPage: 1,
          totalPages: 1,
          limit: 10,
        },
        summary: {
          totalRevenue: 6500,
          todayRevenue: 6500,
          totalBookings: 1,
          paidBookings: 1,
          pendingPayments: 0,
          refundedAmount: 0,
          cancelledBookings: 0,
        },
        amenitySummary: [
          { amenityName: 'Guest room', netRevenue: 6500, bookingsCount: 1 },
        ],
      },
    };

    const action = {
      type: fetchBookingQueueThunk.fulfilled.type,
      payload: mockBackendResponse,
    };

    const nextState = amenityBookingReducer(initialState, action);

    expect(nextState.adminBookings).toHaveLength(1);
    expect(nextState.adminBookings[0].bookingId).toBe('RES-202609-000005');
    expect(nextState.adminBookings[0].totalFee).toBe(6500);
    expect(nextState.pagination.totalRecords).toBe(1);
    expect(nextState.ledgerSummary?.totalRevenue).toBe(6500);
    expect(nextState.ledgerSummary?.todayRevenue).toBe(6500);
    expect(nextState.amenitySummary).toHaveLength(1);
  });
});
