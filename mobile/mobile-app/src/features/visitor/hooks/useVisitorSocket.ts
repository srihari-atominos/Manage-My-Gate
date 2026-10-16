import { useAppSocket } from '../../../hooks/useAppSocket';

/**
 * Compatibility hook for Visitor Management screens.
 *
 * Gate-event listeners are registered once by useGlobalAppSocket at the root
 * of the application. Creating another listener per visitor screen caused
 * duplicate Redux updates and duplicate console messages for every event.
 */
export const useVisitorSocket = () => {
  useAppSocket();
};

export default useVisitorSocket;