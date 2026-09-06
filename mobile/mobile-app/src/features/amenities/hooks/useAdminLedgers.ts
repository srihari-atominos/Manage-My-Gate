import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import {
  fetchBookingQueueThunk,
  AmenityBooking,
} from '../store/amenityBookingSlice';
import { fetchWalletThunk } from '../store/walletSlice';
import { fetchAmenitiesThunk } from '../store/amenitySlice';

export type LedgerViewMode = 'master' | 'wallet';

export function useAdminLedgers() {
  const dispatch = useDispatch<AppDispatch>();

  const [viewMode, setViewMode] = useState<LedgerViewMode>('master');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedAmenityId, setSelectedAmenityId] = useState<string>('All');
  const [selectedLedgerDetail, setSelectedLedgerDetail] = useState<AmenityBooking | null>(null);

  const { adminBookings, pagination, loading, error } = useSelector(
    (state: RootState) => state.amenityBookings
  );
  const { balance, transactions, loading: walletLoading } = useSelector(
    (state: RootState) => (state as any).amenityWallet || state.wallet
  );
  const { amenities } = useSelector((state: RootState) => state.amenities);

  const loadMasterLedger = useCallback(
    (page: number = 1) => {
      dispatch(
        fetchBookingQueueThunk({
          page,
          limit: 10,
          search: searchQuery,
          status: statusFilter,
          amenityId: selectedAmenityId,
        })
      );
      dispatch(fetchAmenitiesThunk({}));
    },
    [dispatch, searchQuery, statusFilter, selectedAmenityId]
  );

  const loadWalletLedger = useCallback(() => {
    dispatch(fetchWalletThunk());
  }, [dispatch]);

  useEffect(() => {
    if (viewMode === 'master') {
      loadMasterLedger(currentPage);
    } else {
      loadWalletLedger();
    }
  }, [viewMode, currentPage, loadMasterLedger, loadWalletLedger]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleRefresh = () => {
    if (viewMode === 'master') {
      loadMasterLedger(1);
    } else {
      loadWalletLedger();
    }
  };

  // Compute Master Financial KPIs
  const kpis = useMemo(() => {
    let totalMasterRevenue = 0;
    let todayEarnings = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    const dNow = new Date();
    const todayStr = `${dNow.getFullYear()}-${String(dNow.getMonth() + 1).padStart(2, '0')}-${String(dNow.getDate()).padStart(2, '0')}`;

    adminBookings.forEach((b) => {
      const statusUpper = (b.status || '').toUpperCase();
      if (statusUpper !== 'CANCELLED' && statusUpper !== 'REJECTED') {
        const fee = Number(
          b.totalFee ??
          (b as any).totalPrice ??
          (b as any).pricingDetails?.totalAmount ??
          (b as any).totalAmount ??
          (b as any).amount ??
          0
        );
        totalMasterRevenue += fee;
        completedCount++;

        const bDate = b.date || b.bookingDate || ((b as any).createdAt ? (b as any).createdAt.split('T')[0] : '');
        if (bDate === todayStr) {
          todayEarnings += fee;
        }
      } else {
        cancelledCount++;
      }
    });

    return {
      totalMasterRevenue,
      todayEarnings,
      totalEntries: pagination.totalRecords || adminBookings.length,
      completedCount,
      cancelledCount,
    };
  }, [adminBookings, pagination.totalRecords]);

  // Client-Side Filter fallback for instantaneous feedback
  const filteredBookings = useMemo(() => {
    if (!adminBookings) return [];

    return adminBookings.filter((b) => {
      if (statusFilter && statusFilter !== 'All') {
        if (b.status?.toUpperCase() !== statusFilter.toUpperCase()) return false;
      }
      if (selectedAmenityId && selectedAmenityId !== 'All') {
        const itemAmenityId =
          typeof b.amenityId === 'object' && b.amenityId ? b.amenityId._id : b.amenityId;
        if (itemAmenityId !== selectedAmenityId) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const bookingId = b.bookingId || b._id || '';
        const residentName = b.residentName || (b as any).userName || '';
        const villaNum = (b as any).villaNumber || (b as any).flatNumber || (b as any).unit || '';
        const amenityName =
          typeof b.amenityId === 'object' && b.amenityId ? b.amenityId.name : b.amenityName || '';

        const matchId = bookingId.toLowerCase().includes(q);
        const matchResident = residentName.toLowerCase().includes(q);
        const matchVilla = villaNum.toLowerCase().includes(q);
        const matchAmenity = amenityName.toLowerCase().includes(q);

        if (!matchId && !matchResident && !matchVilla && !matchAmenity) return false;
      }
      return true;
    });
  }, [adminBookings, statusFilter, selectedAmenityId, searchQuery]);

  return {
    viewMode,
    setViewMode,
    adminBookings,
    filteredBookings,
    amenities,
    pagination,
    currentPage,
    handlePageChange,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    selectedAmenityId,
    setSelectedAmenityId,
    selectedLedgerDetail,
    setSelectedLedgerDetail,
    balance,
    transactions,
    kpis,
    loading: viewMode === 'master' ? loading : walletLoading,
    error,
    handleRefresh,
  };
}

export default useAdminLedgers;
