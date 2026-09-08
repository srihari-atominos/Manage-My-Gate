import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import { useAppSocket } from '../../../hooks/useAppSocket';
import { fetchWalletBalance, syncWalletBalance } from '../store/walletSlice';

/**
 * Custom Hook: useWalletSocket
 *
 * Silent background listener managing real-time Socket.io connections
 * for digital wallet balance and transaction notifications.
 */
export const useWalletSocket = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { socket } = useAppSocket();

  const user = useSelector((state: RootState) => state.auth?.user);
  const activeOrgId = useSelector((state: any) =>
    state.workspace?.activeOrganizationId ||
    state.auth?.activeOrganizationId ||
    state.auth?.user?.activeOrganizationId ||
    state.auth?.user?.orgId ||
    state.auth?.user?.communityId
  );
  const userId = user?.id || user?._id;
  const orgId = activeOrgId || user?.orgId;

  const rooms = useMemo(() => {
    const list: string[] = [];
    if (userId) list.push(`user:${userId}`);
    if (orgId) list.push(`org:${orgId}`);
    return list;
  }, [userId, orgId]);

  useEffect(() => {
    if (!socket) return;

    // Join rooms dynamically for targeted real-time broadcasts
    rooms.forEach((room) => {
      socket.emit('join_room', room);
    });

    const handleWalletUpdated = (payload: any) => {
      if (!payload) {
        dispatch(fetchWalletBalance());
        return;
      }

      const eventUserId = payload.userId?._id || payload.userId;
      if (eventUserId && String(eventUserId) !== String(userId)) return;

      if (typeof payload.balance === 'number') {
        dispatch(syncWalletBalance(payload.balance));
      } else {
        dispatch(fetchWalletBalance());
      }
    };

    const handleTransactionCreated = (payload: any) => {
      const eventUserId = payload?.userId?._id || payload?.userId;
      if (eventUserId && String(eventUserId) !== String(userId)) return;
      dispatch(fetchWalletBalance());
    };

    socket.on('wallet_updated', handleWalletUpdated);
    socket.on('walletUpdated', handleWalletUpdated);
    socket.on('wallet_transaction_created', handleTransactionCreated);

    return () => {
      socket.off('wallet_updated', handleWalletUpdated);
      socket.off('walletUpdated', handleWalletUpdated);
      socket.off('wallet_transaction_created', handleTransactionCreated);
      rooms.forEach((room) => {
        socket.emit('leave_room', room);
      });
    };
  }, [socket, rooms, userId, dispatch]);
};

export default useWalletSocket;
