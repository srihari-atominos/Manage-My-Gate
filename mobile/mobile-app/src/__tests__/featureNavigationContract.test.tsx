import React from 'react';
import { ALL_AVAILABLE_FEATURES } from '../features/dashboard/dashboardCatalog';
import { isFeatureAllowedForUser } from '../utils/rbac';

describe('Feature Navigation & Routing Contract Test Suite', () => {
  describe('1. Canonical Route Registrations in Catalog', () => {
    it('ensures personal_expense_manager is omitted from active community catalog', () => {
      const item = ALL_AVAILABLE_FEATURES.find((f) => f.id === 'personal_expense_manager');
      expect(item).toBeUndefined();
    });

    it('registers community_finance with canonical route /(resident)/admin/billing/community-finance', () => {
      const item = ALL_AVAILABLE_FEATURES.find((f) => f.id === 'community_finance');
      expect(item).toBeDefined();
      expect(item?.route).toBe('/(resident)/admin/billing/community-finance');
      expect(item?.categoryKey).toBe('financial_billing');
      expect(item?.permission).toBe('billing:dashboard');
    });
  });

  describe('2. RBAC Access Control for Features', () => {
    const residentUser = {
      role: 'Resident',
      permissions: ['billing:my_dues', 'visitor:resident'],
    };

    const adminUser = {
      role: 'Community Admin',
      permissions: ['billing:dashboard', 'billing:ledger', 'visitor:admin'],
    };

    it('disallows resident owner/tenant from accessing personal_expense_manager', () => {
      const item = { id: 'personal_expense_manager' };
      expect(isFeatureAllowedForUser(item, residentUser)).toBe(false);
    });

    it('disallows resident from accessing administrative community_finance', () => {
      const item = ALL_AVAILABLE_FEATURES.find((f) => f.id === 'community_finance')!;
      expect(isFeatureAllowedForUser(item, residentUser)).toBe(false);
    });

    it('allows community admin to access community_finance', () => {
      const item = ALL_AVAILABLE_FEATURES.find((f) => f.id === 'community_finance')!;
      expect(isFeatureAllowedForUser(item, adminUser)).toBe(true);
    });
  });

  describe('3. Hierarchy-Aware Back Navigation Logic', () => {
    it('prioritizes onBackPress if explicitly provided', () => {
      const customBack = jest.fn();
      const mockRouter = { canGoBack: jest.fn(() => true), back: jest.fn(), replace: jest.fn() };
      const mockNavigation = { canGoBack: jest.fn(() => true), goBack: jest.fn(), getParent: jest.fn() };

      const executeBack = (onBackPress?: () => void) => {
        if (onBackPress) {
          onBackPress();
          return true;
        }
        if (mockRouter.canGoBack()) {
          mockRouter.back();
          return true;
        }
        return false;
      };

      executeBack(customBack);
      expect(customBack).toHaveBeenCalledTimes(1);
      expect(mockRouter.back).not.toHaveBeenCalled();
    });

    it('calls router.back() when local router can go back', () => {
      const mockRouter = { canGoBack: jest.fn(() => true), back: jest.fn(), replace: jest.fn() };

      const executeBack = (onBackPress?: () => void) => {
        if (onBackPress) {
          onBackPress();
          return true;
        }
        if (mockRouter.canGoBack()) {
          mockRouter.back();
          return true;
        }
        return false;
      };

      executeBack();
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });

    it('traverses to ancestor parent navigator when local nested stack root cannot go back', () => {
      const mockRouter = { canGoBack: jest.fn(() => false), back: jest.fn(), replace: jest.fn() };
      const parentGoBack = jest.fn();
      const mockParent = {
        canGoBack: jest.fn(() => true),
        goBack: parentGoBack,
        getParent: jest.fn(() => null),
      };
      const mockNavigation = {
        canGoBack: jest.fn(() => false),
        goBack: jest.fn(),
        getParent: jest.fn(() => mockParent),
      };

      const executeBack = () => {
        if (mockRouter.canGoBack()) {
          mockRouter.back();
          return true;
        }
        let parentNav = mockNavigation?.getParent ? mockNavigation.getParent() : null;
        while (parentNav) {
          if (parentNav.canGoBack && parentNav.canGoBack()) {
            parentNav.goBack();
            return true;
          }
          parentNav = parentNav.getParent ? parentNav.getParent() : null;
        }
        mockRouter.replace('/(resident)/dashboard');
        return true;
      };

      executeBack();
      expect(parentGoBack).toHaveBeenCalledTimes(1);
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });

    it('falls back to safe dashboard replacement only when entire hierarchy has no history', () => {
      const mockRouter = { canGoBack: jest.fn(() => false), back: jest.fn(), replace: jest.fn() };
      const mockNavigation = {
        canGoBack: jest.fn(() => false),
        goBack: jest.fn(),
        getParent: jest.fn(() => null),
      };

      const executeBack = () => {
        if (mockRouter.canGoBack()) {
          mockRouter.back();
          return true;
        }
        let parentNav = mockNavigation?.getParent ? mockNavigation.getParent() : null;
        while (parentNav) {
          if (parentNav.canGoBack && parentNav.canGoBack()) {
            parentNav.goBack();
            return true;
          }
          parentNav = parentNav.getParent ? parentNav.getParent() : null;
        }
        mockRouter.replace('/(resident)/dashboard');
        return true;
      };

      executeBack();
      expect(mockRouter.replace).toHaveBeenCalledWith('/(resident)/dashboard');
    });
  });
});
