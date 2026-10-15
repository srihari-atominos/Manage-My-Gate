import { useEffect } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import { useAppSocket } from '../../../hooks/useAppSocket';
import { getVillas, getVillaStats, getVillaBlocks } from '../store/villaSlice';

const REFRESH_DEBOUNCE_MS = 400;

/**
 * Real-time Socket.IO listeners for Unit & Villa Management.
 * Any unit change (created, updated, deleted, resident assigned) refetches the list with the filters,
 * search and page the user currently has, instead of resetting the screen to an unfiltered first page.
 * A burst of events (a batch generate emits one per unit) is collapsed into a single refetch, and the
 * list is also refreshed when the socket reconnects so changes missed while offline appear.
 */
export const useVillaSocket = () => {
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const { socket } = useAppSocket();

  useEffect(() => {
    if (!socket) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const { filters, pagination } = store.getState().villa;
        dispatch(
          getVillas({
            page: pagination.currentPage,
            limit: pagination.rowsPerPage,
            search: filters.search,
            blockOrBuilding: filters.blockOrBuilding,
            status: filters.status,
          })
        );
        dispatch(getVillaStats());
        dispatch(getVillaBlocks());
      }, REFRESH_DEBOUNCE_MS);
    };

    const events = ['unit_created', 'unit_updated', 'unit_deleted', 'resident_assigned'];
    events.forEach((name) => socket.on(name, refresh));
    // A fresh connect after the first one means events may have been missed.
    socket.io.on('reconnect', refresh);

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((name) => socket.off(name, refresh));
      socket.io.off('reconnect', refresh);
    };
  }, [socket, dispatch, store]);
};

export default useVillaSocket;
