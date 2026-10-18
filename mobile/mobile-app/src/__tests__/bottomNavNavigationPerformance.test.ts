import {
  setGlobalBottomNavCompact,
  subscribeGlobalBottomNavCompact,
} from '@/components/navigation/BottomNavScrollContext';

describe('BottomNavigationBar & Scroll Performance Hardening', () => {
  const normalizeRoute = (path: string): string => {
    if (!path) return '';
    return path
      .replace(/\/\([^)]+\)/g, '')
      .replace(/\/index$/, '')
      .replace(/\/$/, '') || '/';
  };

  describe('Route normalization for Tab Bar', () => {
    it('normalizes group routes with and without /index to match usePathname()', () => {
      expect(normalizeRoute('/(resident)/profile')).toBe('/profile');
      expect(normalizeRoute('/(resident)/profile/index')).toBe('/profile');
      expect(normalizeRoute('/profile')).toBe('/profile');
      expect(normalizeRoute('/profile/')).toBe('/profile');
    });

    it('correctly matches dashboard and view-all routes', () => {
      expect(normalizeRoute('/(resident)/dashboard')).toBe('/dashboard');
      expect(normalizeRoute('/dashboard')).toBe('/dashboard');
      expect(normalizeRoute('/(resident)/all-features')).toBe('/all-features');
      expect(normalizeRoute('/all-features')).toBe('/all-features');
    });

    it('identifies identical tab routes to prevent duplicate page re-openings', () => {
      const currentPath = '/profile'; // what usePathname() returns
      const tabTarget = '/(resident)/profile'; // what TAB_ITEMS.route is

      const isSameScreen = normalizeRoute(currentPath) === normalizeRoute(tabTarget);
      expect(isSameScreen).toBe(true);
    });

    it('distinguishes sub-routes from parent tab route', () => {
      const currentPath = '/account';
      const tabTarget = '/(resident)/profile';

      const isSameScreen = normalizeRoute(currentPath) === normalizeRoute(tabTarget);
      expect(isSameScreen).toBe(false);
    });
  });

  describe('BottomNavScrollContext subscriber isolation', () => {
    it('notifies subscribers only when compact state changes', () => {
      const listener = jest.fn();
      const unsub = subscribeGlobalBottomNavCompact(listener);

      setGlobalBottomNavCompact(true);
      expect(listener).toHaveBeenCalledWith(true);

      listener.mockClear();
      // Calling with same state should NOT notify
      setGlobalBottomNavCompact(true);
      expect(listener).not.toHaveBeenCalled();

      // Calling with new state should notify
      setGlobalBottomNavCompact(false);
      expect(listener).toHaveBeenCalledWith(false);

      unsub();
      listener.mockClear();
      setGlobalBottomNavCompact(true);
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
