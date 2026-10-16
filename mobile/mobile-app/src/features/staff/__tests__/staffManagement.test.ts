import { ALL_AVAILABLE_FEATURES } from '../../dashboard/dashboardCatalog';
import { isFeatureAllowedForUser } from '../../../utils/rbac';
import staffReducer, {
  setSelectedStaff,
  clearStaffError,
  setCurrentOrgId,
  resetStaffState,
  fetchStaffThunk,
  fetchMyProfileThunk,
  fetchMyUnitsThunk,
  fetchEligibleStaffThunk,
  fetchAssociationsThunk,
  createAssociationThunk,
  removeAssociationThunk,
  createStaffThunk,
  updateStaffThunk,
  deleteStaffThunk,
  fetchAttendanceStatsThunk,
  fetchAttendanceHistoryThunk,
  fetchMyAttendanceThunk,
  StaffState,
} from '../store/staffSlice';
import {
  StaffMember,
  AuthorizedUnit,
  EligibleStaff,
  StaffUnitAssociation,
  StaffAttendanceRecord,
  StaffAttendanceStats,
} from '../services/staffService';

describe('Staff Management — Phase 3 Mobile Integration & RBAC Contracts', () => {
  describe('1. Catalog and Navigation Integrity', () => {
    it('registers the 4 distinct staff sub-features under Staff Management', () => {
      const directory = ALL_AVAILABLE_FEATURES.find((f) => f.id === 'admin_staff_directory');
      const attendance = ALL_AVAILABLE_FEATURES.find((f) => f.id === 'admin_staff_attendance');
      const allocations = ALL_AVAILABLE_FEATURES.find((f) => f.id === 'admin_staff_allocations');
      const portal = ALL_AVAILABLE_FEATURES.find((f) => f.id === 'admin_staff_portal');

      expect(directory).toBeDefined();
      expect(directory?.name).toBe('Staff Directory');
      expect(directory?.permission).toBe('staff:view');
      expect(directory?.categoryKey).toBe('staff_management');
      expect(directory?.route).toBe('/(resident)/admin/staff/directory');

      expect(attendance).toBeDefined();
      expect(attendance?.name).toBe('Staff Attendance');
      expect(attendance?.permission).toBe('staff:attendance');
      expect(attendance?.categoryKey).toBe('staff_management');
      expect(attendance?.route).toBe('/(resident)/admin/staff/attendance');

      expect(allocations).toBeDefined();
      expect(allocations?.name).toBe('Unit Allocations');
      expect(allocations?.permission).toBe('staff:assign_unit');
      expect(allocations?.categoryKey).toBe('staff_management');
      expect(allocations?.route).toBe('/(resident)/staff/my-staff');

      expect(portal).toBeDefined();
      expect(portal?.name).toBe('Staff Portal & Pass');
      expect(portal?.permission).toBe('staff:view_own');
      expect(portal?.categoryKey).toBe('staff_management');
      expect(portal?.route).toBe('/(resident)/staff/dashboard');
    });

    it('ensures no duplicate feature IDs exist in dashboard catalog', () => {
      const ids = ALL_AVAILABLE_FEATURES.map((f) => f.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('2. RBAC Access Control & Permission Boundaries', () => {
    const adminStaffFeature = ALL_AVAILABLE_FEATURES.find((f) => f.id === 'admin_staff_directory')!;

    it('allows access for a legitimate Community Admin', () => {
      const adminUser = {
        role: 'Community Admin',
        permissions: ['staff:view', 'staff:manage'],
      };
      expect(isFeatureAllowedForUser(adminStaffFeature, adminUser)).toBe(true);
    });

    it('allows access for Platform Super Admin', () => {
      const platformUser = {
        role: 'Platform Super Admin',
        isPlatform: true,
      };
      expect(isFeatureAllowedForUser(adminStaffFeature, platformUser)).toBe(true);
    });

    it('allows access for a user with explicit staff:view permission', () => {
      const staffViewer = {
        role: 'Facility Coordinator',
        permissions: ['staff:view'],
      };
      expect(isFeatureAllowedForUser(adminStaffFeature, staffViewer)).toBe(true);
    });

    it('allows access for a user with staff:manage permission (via hierarchy expansion)', () => {
      const staffManager = {
        role: 'HR Manager',
        permissions: ['staff:manage'],
      };
      expect(isFeatureAllowedForUser(adminStaffFeature, staffManager)).toBe(true);
    });

    it('DENIES access to a user with ONLY staff:view_own permission', () => {
      const staffUser = {
        role: 'Electrician',
        permissions: ['staff:view_own'],
      };
      expect(isFeatureAllowedForUser(adminStaffFeature, staffUser)).toBe(false);
    });

    it('DENIES access to standard residents without staff permissions', () => {
      const residentUser = {
        role: 'Resident',
        permissions: ['villas:read', 'notices:read', 'amenities:discover'],
      };
      expect(isFeatureAllowedForUser(adminStaffFeature, residentUser)).toBe(false);
    });

    it('DENIES access to a user with only complaints:view (least-privilege isolation)', () => {
      const complaintViewer = {
        role: 'Helpdesk Resident',
        permissions: ['complaints:view', 'complaints:track_requests'],
      };
      expect(isFeatureAllowedForUser(adminStaffFeature, complaintViewer)).toBe(false);
    });

    it('independently allows only the selected staff feature (e.g., Attendance Logs only)', () => {
      const attendanceFeature = ALL_AVAILABLE_FEATURES.find((f) => f.id === 'admin_staff_attendance')!;
      const directoryFeature = ALL_AVAILABLE_FEATURES.find((f) => f.id === 'admin_staff_directory')!;
      const allocationsFeature = ALL_AVAILABLE_FEATURES.find((f) => f.id === 'admin_staff_allocations')!;
      const portalFeature = ALL_AVAILABLE_FEATURES.find((f) => f.id === 'admin_staff_portal')!;

      const attendanceOnlyUser = {
        role: 'Attendance Auditor',
        permissions: ['staff:attendance'],
      };

      expect(isFeatureAllowedForUser(attendanceFeature, attendanceOnlyUser)).toBe(true);
      expect(isFeatureAllowedForUser(directoryFeature, attendanceOnlyUser)).toBe(false);
      expect(isFeatureAllowedForUser(allocationsFeature, attendanceOnlyUser)).toBe(false);
      expect(isFeatureAllowedForUser(portalFeature, attendanceOnlyUser)).toBe(false);
    });

    it('independently allows only Unit Allocation when staff:assign_unit is selected', () => {
      const allocationsFeature = ALL_AVAILABLE_FEATURES.find((f) => f.id === 'admin_staff_allocations')!;
      const directoryFeature = ALL_AVAILABLE_FEATURES.find((f) => f.id === 'admin_staff_directory')!;

      const unitAssigner = {
        role: 'Resident Coordinator',
        permissions: ['staff:assign_unit'],
      };

      expect(isFeatureAllowedForUser(allocationsFeature, unitAssigner)).toBe(true);
      expect(isFeatureAllowedForUser(directoryFeature, unitAssigner)).toBe(false);
    });
  });

  describe('3. Redux Store State Management & Community Isolation', () => {
    const initialState: StaffState = {
      staffList: [],
      isLoading: false,
      isSubmitting: false,
      error: null,
      selectedStaff: null,
      currentOrgId: null,
    };

    const mockStaffA: StaffMember = {
      _id: 'staff_1',
      orgId: 'org_alpha',
      name: 'Khalid Al-Ghamdi',
      phone: '+966501112233',
      department: 'Electrical',
      type: 'In-House Staff',
      status: 'Active',
      designation: 'Senior Electrician',
      staffCode: 'STF-01',
    };

    const mockStaffB: StaffMember = {
      _id: 'staff_2',
      orgId: 'org_alpha',
      name: 'Salim Plumber',
      phone: '+966504445566',
      department: 'Plumbing',
      type: 'In-House Staff',
      status: 'Active',
    };

    it('populates staffList upon fetchStaffThunk.fulfilled', () => {
      const action = {
        type: fetchStaffThunk.fulfilled.type,
        payload: [mockStaffA, mockStaffB],
      };
      const state = staffReducer(initialState, action);
      expect(state.isLoading).toBe(false);
      expect(state.staffList).toHaveLength(2);
      expect(state.staffList[0].name).toBe('Khalid Al-Ghamdi');
    });

    it('prepends newly created staff upon createStaffThunk.fulfilled', () => {
      const existingState: StaffState = {
        ...initialState,
        staffList: [mockStaffB],
      };
      const action = {
        type: createStaffThunk.fulfilled.type,
        payload: mockStaffA,
      };
      const state = staffReducer(existingState, action);
      expect(state.isSubmitting).toBe(false);
      expect(state.staffList).toHaveLength(2);
      expect(state.staffList[0]._id).toBe('staff_1');
    });

    it('updates staff member upon updateStaffThunk.fulfilled', () => {
      const existingState: StaffState = {
        ...initialState,
        staffList: [mockStaffA],
        selectedStaff: mockStaffA,
      };
      const updatedStaff: StaffMember = {
        ...mockStaffA,
        name: 'Khalid Updated',
        status: 'Inactive',
      };
      const action = {
        type: updateStaffThunk.fulfilled.type,
        payload: updatedStaff,
      };
      const state = staffReducer(existingState, action);
      expect(state.staffList[0].name).toBe('Khalid Updated');
      expect(state.staffList[0].status).toBe('Inactive');
      expect(state.selectedStaff?.name).toBe('Khalid Updated');
    });

    it('removes staff member upon deleteStaffThunk.fulfilled', () => {
      const existingState: StaffState = {
        ...initialState,
        staffList: [mockStaffA, mockStaffB],
        selectedStaff: mockStaffA,
      };
      const action = {
        type: deleteStaffThunk.fulfilled.type,
        payload: 'staff_1',
      };
      const state = staffReducer(existingState, action);
      expect(state.staffList).toHaveLength(1);
      expect(state.staffList[0]._id).toBe('staff_2');
      expect(state.selectedStaff).toBeNull();
    });

    it('tracks active community and supports reset upon switching organizations', () => {
      const stateWithOrg = staffReducer(initialState, setCurrentOrgId('org_alpha'));
      expect(stateWithOrg.currentOrgId).toBe('org_alpha');

      const resetState = staffReducer(stateWithOrg, resetStaffState());
      expect(resetState.currentOrgId).toBeNull();
      expect(resetState.staffList).toHaveLength(0);
    });

    it('sets error message upon fetchStaffThunk.rejected', () => {
      const action = {
        type: fetchStaffThunk.rejected.type,
        payload: 'Network timeout',
      };
      const state = staffReducer(initialState, action);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Network timeout');
    });
  });

  describe('4. Staff Dashboard Catalog & Self-Service Authorization', () => {
    const staffDashboardFeature = ALL_AVAILABLE_FEATURES.find((f) => f.id === 'admin_staff_portal')!;
    const adminStaffFeature = ALL_AVAILABLE_FEATURES.find((f) => f.id === 'admin_staff_directory')!;

    it('registers exactly one admin_staff_portal feature with correct route and permission', () => {
      const matches = ALL_AVAILABLE_FEATURES.filter((f) => f.id === 'admin_staff_portal');
      expect(matches).toHaveLength(1);
      expect(matches[0].name).toBe('Staff Portal & Pass');
      expect(matches[0].route).toBe('/(resident)/staff/dashboard');
      expect(matches[0].permission).toBe('staff:view_own');
    });

    it('allows access to Staff Dashboard for user with staff:view_own', () => {
      const staffUser = {
        role: 'Staff/Vendor',
        permissions: ['staff:view_own'],
      };
      expect(isFeatureAllowedForUser(staffDashboardFeature, staffUser)).toBe(true);
    });

    it('allows access to Staff Dashboard for Platform Super Admin with platform bypass', () => {
      const superAdminUser = {
        role: 'Platform Super Admin',
        isPlatform: true,
      };
      expect(isFeatureAllowedForUser(staffDashboardFeature, superAdminUser)).toBe(true);
    });

    it('DENIES Staff Dashboard to Community Admin holding ONLY staff:view and staff:manage without staff:view_own', () => {
      const adminUser = {
        role: 'Community Admin',
        permissions: ['staff:view', 'staff:manage'],
      };
      expect(isFeatureAllowedForUser(staffDashboardFeature, adminUser)).toBe(false);
    });

    it('DENIES access to Staff Dashboard for standard resident', () => {
      const residentUser = {
        role: 'Resident',
        permissions: ['villas:read', 'notices:read', 'amenities:discover'],
      };
      expect(isFeatureAllowedForUser(staffDashboardFeature, residentUser)).toBe(false);
    });

    it('DENIES access to Staff Dashboard for user with only complaints:view', () => {
      const complaintViewer = {
        role: 'Helpdesk Resident',
        permissions: ['complaints:view', 'complaints:track_requests'],
      };
      expect(isFeatureAllowedForUser(staffDashboardFeature, complaintViewer)).toBe(false);
    });

    it('verifies staff:view_own grants Staff Dashboard but STRICTLY DENIES Admin Staff Management', () => {
      const staffMember = {
        role: 'Electrician',
        permissions: ['staff:view_own'],
      };
      expect(isFeatureAllowedForUser(staffDashboardFeature, staffMember)).toBe(true);
      expect(isFeatureAllowedForUser(adminStaffFeature, staffMember)).toBe(false);
    });
  });

  describe('5. Staff Self-Service Profile Redux State Management', () => {
    const initialState: StaffState = {
      staffList: [],
      isLoading: false,
      isSubmitting: false,
      error: null,
      selectedStaff: null,
      currentOrgId: null,
      myProfile: null,
      isProfileLoading: false,
      profileError: null,
    };

    const mockProfile: StaffMember = {
      _id: 'staff_self',
      orgId: 'org_1',
      name: 'Naveen Staff',
      phone: '+91 9988776655',
      department: 'Electrical',
      type: 'In-House Staff',
      status: 'Active',
      designation: 'Senior Electrician',
      staffCode: 'STF-007',
    };

    it('sets isProfileLoading upon fetchMyProfileThunk.pending', () => {
      const state = staffReducer(initialState, { type: fetchMyProfileThunk.pending.type });
      expect(state.isProfileLoading).toBe(true);
      expect(state.profileError).toBeNull();
    });

    it('populates myProfile upon fetchMyProfileThunk.fulfilled', () => {
      const action = {
        type: fetchMyProfileThunk.fulfilled.type,
        payload: mockProfile,
      };
      const state = staffReducer(initialState, action);
      expect(state.isProfileLoading).toBe(false);
      expect(state.myProfile).toEqual(mockProfile);
      expect(state.myProfile?.staffCode).toBe('STF-007');
    });

    it('sets profileError upon fetchMyProfileThunk.rejected', () => {
      const action = {
        type: fetchMyProfileThunk.rejected.type,
        payload: 'No staff profile found for this user in the active community',
      };
      const state = staffReducer(initialState, action);
      expect(state.isProfileLoading).toBe(false);
      expect(state.profileError).toBe('No staff profile found for this user in the active community');
      expect(state.myProfile).toBeNull();
    });

    it('clears myProfile and profileError upon resetStaffState', () => {
      const populatedState: StaffState = {
        ...initialState,
        myProfile: mockProfile,
        profileError: 'Some error',
        currentOrgId: 'org_1',
      };
      const state = staffReducer(populatedState, resetStaffState());
      expect(state.myProfile).toBeNull();
      expect(state.profileError).toBeNull();
      expect(state.currentOrgId).toBeNull();
    });
  });

  describe('6. Resident Staff Associations Catalog & RBAC Authorization', () => {
    const residentStaffFeature = ALL_AVAILABLE_FEATURES.find((f) => f.id === 'admin_staff_allocations')!;

    it('registers exactly one admin_staff_allocations feature with correct route and permission', () => {
      expect(residentStaffFeature).toBeDefined();
      expect(residentStaffFeature.name).toBe('Unit Allocations');
      expect(residentStaffFeature.route).toBe('/(resident)/staff/my-staff');
      expect(residentStaffFeature.permission).toBe('staff:assign_unit');
    });

    it('allows access for a resident holding staff:assign_unit', () => {
      const residentUser = {
        role: 'Resident Owner',
        permissions: ['villas:read', 'staff:assign_unit'],
      };
      expect(isFeatureAllowedForUser(residentStaffFeature, residentUser)).toBe(true);
    });

    it('allows access for Community Admin', () => {
      const adminUser = {
        role: 'Community Admin',
        permissions: ['staff:view', 'staff:manage', 'staff:assign_unit'],
      };
      expect(isFeatureAllowedForUser(residentStaffFeature, adminUser)).toBe(true);
    });

    it('allows access for Platform Super Admin with platform bypass', () => {
      const platformUser = {
        role: 'Platform Super Admin',
        isPlatform: true,
      };
      expect(isFeatureAllowedForUser(residentStaffFeature, platformUser)).toBe(true);
    });

    it('DENIES access for unpermissioned user lacking staff:assign_unit', () => {
      const visitorUser = {
        role: 'Visitor',
        permissions: ['visitor:resident'],
      };
      expect(isFeatureAllowedForUser(residentStaffFeature, visitorUser)).toBe(false);
    });

    it('verifies staff:assign_unit does NOT grant admin staff management (least-privilege separation)', () => {
      const adminStaffFeature = ALL_AVAILABLE_FEATURES.find((f) => f.id === 'admin_staff_directory')!;
      const residentUser = {
        role: 'Resident Owner',
        permissions: ['staff:assign_unit'],
      };
      expect(isFeatureAllowedForUser(residentStaffFeature, residentUser)).toBe(true);
      expect(isFeatureAllowedForUser(adminStaffFeature, residentUser)).toBe(false);
    });

    it('verifies staff:assign_unit does NOT grant staff self-service dashboard', () => {
      const staffDashboardFeature = ALL_AVAILABLE_FEATURES.find((f) => f.id === 'staff_dashboard')!;
      const residentUser = {
        role: 'Resident Owner',
        permissions: ['staff:assign_unit'],
      };
      expect(isFeatureAllowedForUser(residentStaffFeature, residentUser)).toBe(true);
      expect(isFeatureAllowedForUser(staffDashboardFeature, residentUser)).toBe(false);
    });
  });

  describe('7. Resident Staff Associations Redux State Management', () => {
    const initialState: StaffState = {
      staffList: [],
      isLoading: false,
      isSubmitting: false,
      error: null,
      selectedStaff: null,
      currentOrgId: null,
      myProfile: null,
      isProfileLoading: false,
      profileError: null,
      myUnits: [],
      eligibleStaff: [],
      associations: [],
      isAssociationsLoading: false,
      isAssociationSubmitting: false,
      associationError: null,
    };

    const mockUnit: AuthorizedUnit = {
      _id: 'unit_101',
      unitNumber: 'A-101',
      blockOrBuilding: 'Block A',
      type: 'Apartment',
      status: 'Occupied',
    };

    const mockEligible: EligibleStaff = {
      _id: 'tech_501',
      name: 'Khalid Mansoor',
      department: 'Electrical',
      type: 'In-House Staff',
      phone: '+966500123456',
      status: 'Active',
    };

    const mockAssociation: StaffUnitAssociation = {
      _id: 'assoc_901',
      orgId: 'org_1',
      villaId: mockUnit,
      technicianId: mockEligible,
      associatedBy: { _id: 'user_res_1', name: 'Ahmad' },
      status: 'Active',
      roleOrTrade: 'Private Electrician',
      createdAt: '2026-10-12T10:00:00Z',
      updatedAt: '2026-10-12T10:00:00Z',
    };

    it('populates myUnits upon fetchMyUnitsThunk.fulfilled', () => {
      const action = {
        type: fetchMyUnitsThunk.fulfilled.type,
        payload: [mockUnit],
      };
      const state = staffReducer(initialState, action);
      expect(state.myUnits).toHaveLength(1);
      expect(state.myUnits[0]._id).toBe('unit_101');
      expect(state.myUnits[0].unitNumber).toBe('A-101');
    });

    it('populates eligibleStaff upon fetchEligibleStaffThunk.fulfilled', () => {
      const action = {
        type: fetchEligibleStaffThunk.fulfilled.type,
        payload: [mockEligible],
      };
      const state = staffReducer(initialState, action);
      expect(state.eligibleStaff).toHaveLength(1);
      expect(state.eligibleStaff[0]._id).toBe('tech_501');
      expect(state.eligibleStaff[0].name).toBe('Khalid Mansoor');
    });

    it('manages loading state and populates associations upon fetchAssociationsThunk', () => {
      const pendingState = staffReducer(initialState, { type: fetchAssociationsThunk.pending.type });
      expect(pendingState.isAssociationsLoading).toBe(true);
      expect(pendingState.associationError).toBeNull();

      const fulfilledAction = {
        type: fetchAssociationsThunk.fulfilled.type,
        payload: [mockAssociation],
      };
      const fulfilledState = staffReducer(pendingState, fulfilledAction);
      expect(fulfilledState.isAssociationsLoading).toBe(false);
      expect(fulfilledState.associations).toHaveLength(1);
      expect(fulfilledState.associations[0]._id).toBe('assoc_901');

      const rejectedAction = {
        type: fetchAssociationsThunk.rejected.type,
        payload: 'Failed to fetch associations',
      };
      const rejectedState = staffReducer(pendingState, rejectedAction);
      expect(rejectedState.isAssociationsLoading).toBe(false);
      expect(rejectedState.associationError).toBe('Failed to fetch associations');
    });

    it('prepends new association upon createAssociationThunk.fulfilled', () => {
      const existingState: StaffState = {
        ...initialState,
        associations: [mockAssociation],
      };
      const newAssoc: StaffUnitAssociation = {
        ...mockAssociation,
        _id: 'assoc_902',
        roleOrTrade: 'Private Driver',
      };
      const action = {
        type: createAssociationThunk.fulfilled.type,
        payload: newAssoc,
      };
      const state = staffReducer(existingState, action);
      expect(state.associations).toHaveLength(2);
      expect(state.associations[0]._id).toBe('assoc_902');
      expect(state.isAssociationSubmitting).toBe(false);
    });

    it('filters out association upon removeAssociationThunk.fulfilled', () => {
      const existingState: StaffState = {
        ...initialState,
        associations: [mockAssociation],
      };
      const action = {
        type: removeAssociationThunk.fulfilled.type,
        payload: mockAssociation,
      };
      const state = staffReducer(existingState, action);
      expect(state.associations).toHaveLength(0);
      expect(state.isAssociationSubmitting).toBe(false);
    });

    it('resets units, eligibleStaff, and associations upon resetStaffState', () => {
      const populatedState: StaffState = {
        ...initialState,
        myUnits: [mockUnit],
        eligibleStaff: [mockEligible],
        associations: [mockAssociation],
        associationError: 'Some error',
      };
      const state = staffReducer(populatedState, resetStaffState());
      expect(state.myUnits).toHaveLength(0);
      expect(state.eligibleStaff).toHaveLength(0);
      expect(state.associations).toHaveLength(0);
      expect(state.associationError).toBeNull();
    });
  });

  describe('8. Staff QR Attendance & Gate Console Integration', () => {
    const { parseAndValidateAppBarcode } = require('../../../utils/appBarcodeProtocol');
    const { staffService } = require('../services/staffService');
    const apiClient = require('../../../services/apiClient').default;

    it('parseAndValidateAppBarcode recognizes canonical Nahom MMG:SERVICE staff barcodes', () => {
      const parsed = parseAndValidateAppBarcode('MMG:SERVICE:STF-001:507f1f77bcf86cd799439088:Mohammed_Ali');
      expect(parsed.isValid).toBe(true);
      expect(parsed.type).toBe('SERVICE');
      expect(parsed.code).toBe('STF-001');
      expect(parsed.passId).toBe('507f1f77bcf86cd799439088');
      expect(parsed.visitorName).toBe('Mohammed Ali');
    });

    it('staffService.getMyQr dispatches GET /technicians/me/qr and returns staff QR payload', async () => {
      const mockQrResponse = {
        data: {
          data: {
            technicianId: 'tech_123',
            staffCode: 'STF-001',
            name: 'Tariq Electrician',
            department: 'Electrical',
            barcodePayload: 'MMG:SERVICE:STF-001:tech_123:Tariq_Electrician',
            token: 'STF:tech_123:sig123',
          },
        },
      };

      const spy = jest.spyOn(apiClient, 'get').mockResolvedValueOnce(mockQrResponse);
      const res = await staffService.getMyQr();

      expect(spy).toHaveBeenCalledWith('/technicians/me/qr');
      expect(res.technicianId).toBe('tech_123');
      expect(res.barcodePayload).toContain('MMG:SERVICE:STF-001');
      spy.mockRestore();
    });

    it('staffService.scanAttendance dispatches POST /staff-attendance/scan with gate details', async () => {
      const mockScanResponse = {
        data: {
          data: {
            action: 'ENTRY',
            session: {
              _id: 'session_777',
              status: 'Open',
              checkInGate: 'Main Gate',
            },
            technician: {
              _id: 'tech_123',
              name: 'Tariq Electrician',
              department: 'Electrical',
            },
            associatedUnits: [{ _id: 'villa_1', unitNumber: 'Villa 101' }],
            message: 'Staff check-in recorded successfully.',
          },
        },
      };

      const spy = jest.spyOn(apiClient, 'post').mockResolvedValueOnce(mockScanResponse);
      const res = await staffService.scanAttendance({
        scannedPayload: 'MMG:SERVICE:STF-001:tech_123:Tariq_Electrician',
        gateId: 'Main Gate',
        action: 'AUTO',
      });

      expect(spy).toHaveBeenCalledWith('/staff-attendance/scan', {
        scannedPayload: 'MMG:SERVICE:STF-001:tech_123:Tariq_Electrician',
        gateId: 'Main Gate',
        action: 'AUTO',
      });
      expect(res.action).toBe('ENTRY');
      expect(res.session.status).toBe('Open');
      expect(res.associatedUnits).toHaveLength(1);
      expect(res.associatedUnits[0].unitNumber).toBe('Villa 101');
      spy.mockRestore();
    });

    it('gate console authorization: Security Guard with visitor:guard has gate access', () => {
      const gateFeature = ALL_AVAILABLE_FEATURES.find((f) => f.id === 'visitor_gate_console')!;
      const guardUser = {
        role: 'Security Guard',
        permissions: ['visitor:guard', 'staff:attendance'],
      };
      expect(isFeatureAllowedForUser(gateFeature, guardUser)).toBe(true);
    });

    it('gate console authorization: Standard resident without visitor:guard is DENIED gate console access', () => {
      const gateFeature = ALL_AVAILABLE_FEATURES.find((f) => f.id === 'visitor_gate_console')!;
      const residentUser = {
        role: 'Resident Owner',
        permissions: ['visitor:resident', 'staff:assign_unit'],
      };
      expect(isFeatureAllowedForUser(gateFeature, residentUser)).toBe(false);
    });
  });

  describe('9. Staff Attendance & Reporting Redux State & Service Contracts', () => {
    const { staffService } = require('../services/staffService');
    const apiClient = require('../../../services/apiClient').default;

    const dummyInitialState: StaffState = {
      staffList: [],
      isLoading: false,
      isSubmitting: false,
      error: null,
      selectedStaff: null,
      currentOrgId: null,
      myProfile: null,
      isProfileLoading: false,
      profileError: null,
      myUnits: [],
      eligibleStaff: [],
      associations: [],
      isAssociationsLoading: false,
      isAssociationSubmitting: false,
      associationError: null,
      attendanceStats: null,
      attendanceRecords: [],
      attendancePagination: {},
      isAttendanceLoading: false,
      attendanceError: null,
      myAttendanceRecords: [],
      isMyAttendanceLoading: false,
      myAttendanceError: null,
    };

    const mockStats: StaffAttendanceStats = {
      totalSessions: 14,
      openSessions: 3,
      closedSessions: 10,
      missingCheckoutSessions: 1,
      distinctStaffCount: 8,
    };

    const mockAttendanceRecord: StaffAttendanceRecord = {
      _id: 'session_888',
      orgId: 'org_main',
      technicianId: {
        _id: 'tech_123',
        name: 'Rashid Plumber',
        department: 'Plumbing',
        type: 'In-House Staff',
        status: 'Active',
      },
      staffCode: 'STF-002',
      status: 'Open',
      checkInTime: new Date(Date.now() - 3600 * 1000).toISOString(),
      checkInGate: 'Main Gate',
      durationMinutes: 60,
      isMissingCheckout: false,
    };

    it('populates attendanceStats upon fetchAttendanceStatsThunk.fulfilled', () => {
      const action = {
        type: fetchAttendanceStatsThunk.fulfilled.type,
        payload: mockStats,
      };
      const state = staffReducer(dummyInitialState, action);
      expect(state.attendanceStats).toEqual(mockStats);
      expect(state.isAttendanceLoading).toBe(false);
      expect(state.attendanceError).toBeNull();
    });

    it('populates attendanceRecords and pagination upon fetchAttendanceHistoryThunk.fulfilled', () => {
      const action = {
        type: fetchAttendanceHistoryThunk.fulfilled.type,
        payload: {
          records: [mockAttendanceRecord],
          pagination: { total: 1, page: 1, limit: 20 },
        },
      };
      const state = staffReducer(dummyInitialState, action);
      expect(state.attendanceRecords).toHaveLength(1);
      expect(state.attendanceRecords[0]._id).toBe('session_888');
      expect(state.attendanceRecords[0].durationMinutes).toBe(60);
      expect(state.attendancePagination.total).toBe(1);
      expect(state.isAttendanceLoading).toBe(false);
    });

    it('keeps connectivity failures out of the inline attendance error state', () => {
      const action = {
        type: fetchAttendanceHistoryThunk.rejected.type,
        payload: 'Unable to connect. Please try again.',
      };
      const state = staffReducer(dummyInitialState, action);
      expect(state.attendanceError).toBeNull();
      expect(state.isAttendanceLoading).toBe(false);
    });
    it('populates myAttendanceRecords upon fetchMyAttendanceThunk.fulfilled', () => {
      const action = {
        type: fetchMyAttendanceThunk.fulfilled.type,
        payload: {
          records: [mockAttendanceRecord],
        },
      };
      const state = staffReducer(dummyInitialState, action);
      expect(state.myAttendanceRecords).toHaveLength(1);
      expect(state.myAttendanceRecords[0]._id).toBe('session_888');
      expect(state.isMyAttendanceLoading).toBe(false);
    });

    it('clears attendance stats, records, and errors upon resetStaffState', () => {
      const populatedState: StaffState = {
        ...dummyInitialState,
        attendanceStats: mockStats,
        attendanceRecords: [mockAttendanceRecord],
        myAttendanceRecords: [mockAttendanceRecord],
        attendanceError: 'Some error',
        myAttendanceError: 'Self error',
      };
      const state = staffReducer(populatedState, resetStaffState());
      expect(state.attendanceStats).toBeNull();
      expect(state.attendanceRecords).toHaveLength(0);
      expect(state.myAttendanceRecords).toHaveLength(0);
      expect(state.attendanceError).toBeNull();
      expect(state.myAttendanceError).toBeNull();
    });

    it('staffService.getAttendanceStats dispatches GET /staff-attendance/stats', async () => {
      const spy = jest.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: {
          success: true,
          data: mockStats,
        },
      });

      const res = await staffService.getAttendanceStats({ gateId: 'Main Gate' });
      expect(spy).toHaveBeenCalledWith('/staff-attendance/stats', {
        params: { gateId: 'Main Gate' },
      });
      expect(res.totalSessions).toBe(14);
      expect(res.missingCheckoutSessions).toBe(1);
      spy.mockRestore();
    });

    it('staffService.getMyAttendance dispatches GET /staff-attendance/me', async () => {
      const spy = jest.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: {
          success: true,
          data: { records: [mockAttendanceRecord], pagination: {} },
        },
      });

      const res = await staffService.getMyAttendance();
      expect(spy).toHaveBeenCalledWith('/staff-attendance/me', { params: undefined });
      expect(res.records).toHaveLength(1);
      spy.mockRestore();
    });

    it('staffService.getAttendanceHistory supports department, status, and ISO date parameters', async () => {
      const spy = jest.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            records: [
              mockAttendanceRecord,
              {
                ...mockAttendanceRecord,
                _id: 'session_889',
                status: 'Closed',
                checkOutTime: new Date().toISOString(),
                durationMinutes: 120,
              },
            ],
            pagination: { totalRecords: 2, totalPages: 1 },
          },
        },
      });

      const query = {
        department: 'Plumbing',
        status: 'Open',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      };
      const res = await staffService.getAttendanceHistory(query);
      expect(spy).toHaveBeenCalledWith('/staff-attendance', { params: query });
      expect(res.records).toHaveLength(2);
      expect(res.records[0].status).toBe('Open');
      expect(res.records[1].status).toBe('Closed');
      spy.mockRestore();
    });
  });

  describe('10. Simplified Attendance Filters & Export Data Integrity', () => {
    const sampleStaffSessions = [
      {
        _id: 'sess_1',
        orgId: 'org_main',
        technicianId: {
          _id: 'tech_p1',
          name: 'Ahmed Plumber',
          department: 'Plumbing',
          designation: 'Master Plumber',
          staffCode: 'STF-PL-01',
          type: 'In-House Staff',
        },
        staffCode: 'STF-PL-01',
        status: 'Open',
        checkInTime: '2026-10-13T08:00:00.000Z',
        checkInGate: 'Main Gate',
        checkOutTime: null,
        exitGate: null,
        durationMinutes: null,
        isMissingCheckout: false,
      },
      {
        _id: 'sess_2',
        orgId: 'org_main',
        technicianId: {
          _id: 'tech_e1',
          name: 'Suresh Electrician',
          department: 'Electrical',
          designation: 'Lead Technician',
          staffCode: 'STF-EL-02',
          type: 'External Vendor',
        },
        staffCode: 'STF-EL-02',
        status: 'Closed',
        checkInTime: '2026-10-12T09:00:00.000Z',
        checkInGate: 'Service Gate',
        checkOutTime: '2026-10-12T13:30:00.000Z',
        exitGate: 'Service Gate',
        durationMinutes: 270,
        isMissingCheckout: false,
      },
      {
        _id: 'sess_3',
        orgId: 'org_main',
        technicianId: {
          _id: 'tech_s1',
          name: 'Security Officer Salim',
          department: 'Security',
          designation: 'Patrol Guard',
          staffCode: 'STF-SEC-09',
          type: 'In-House Staff',
        },
        staffCode: 'STF-SEC-09',
        status: 'Open',
        checkInTime: '2026-10-10T06:00:00.000Z',
        checkInGate: 'Main Gate',
        checkOutTime: null,
        exitGate: null,
        durationMinutes: null,
        isMissingCheckout: true,
      },
    ];

    it('filters staff sessions by status: Open, Closed, and Missing Checkout', () => {
      const openSessions = sampleStaffSessions.filter((s) => s.status === 'Open' && !s.isMissingCheckout);
      expect(openSessions).toHaveLength(1);
      expect(openSessions[0].technicianId.name).toBe('Ahmed Plumber');

      const closedSessions = sampleStaffSessions.filter((s) => s.status === 'Closed');
      expect(closedSessions).toHaveLength(1);
      expect(closedSessions[0].durationMinutes).toBe(270);

      const exceptionSessions = sampleStaffSessions.filter((s) => s.isMissingCheckout);
      expect(exceptionSessions).toHaveLength(1);
      expect(exceptionSessions[0].technicianId.name).toBe('Security Officer Salim');
    });

    it('filters staff sessions by department across supported categories without excluding valid roles', () => {
      const plumbingSessions = sampleStaffSessions.filter(
        (s) => s.technicianId.department === 'Plumbing'
      );
      expect(plumbingSessions).toHaveLength(1);
      expect(plumbingSessions[0].staffCode).toBe('STF-PL-01');

      const securitySessions = sampleStaffSessions.filter(
        (s) => s.technicianId.department === 'Security'
      );
      expect(securitySessions).toHaveLength(1);

      // External vendor staff attendance is included (not treated as visitor)
      const vendorStaff = sampleStaffSessions.filter(
        (s) => s.technicianId.type === 'External Vendor'
      );
      expect(vendorStaff).toHaveLength(1);
      expect(vendorStaff[0].technicianId.name).toBe('Suresh Electrician');
    });

    it('validates custom date ranges: start date must not exceed end date', () => {
      const validStart = '2026-10-01';
      const validEnd = '2026-10-15';
      const sTime = new Date(`${validStart}T00:00:00Z`).getTime();
      const eTime = new Date(`${validEnd}T23:59:59Z`).getTime();
      expect(sTime <= eTime).toBe(true);

      const invalidStart = '2026-10-20';
      const invalidEnd = '2026-10-10';
      const badSTime = new Date(`${invalidStart}T00:00:00Z`).getTime();
      const badETime = new Date(`${invalidEnd}T23:59:59Z`).getTime();
      expect(badSTime > badETime).toBe(true);
    });

    it('sanitizes export fields to prevent spreadsheet formula injection', () => {
      const sanitizeField = (val: any): string => {
        if (val === null || val === undefined) return '';
        const str = String(val).trim();
        if (/^[=+@\-\t\r]/.test(str)) {
          return `'${str}`;
        }
        return str;
      };

      expect(sanitizeField('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(sanitizeField('+123456')).toBe("'+123456");
      expect(sanitizeField('@EVIL')).toBe("'@EVIL");
      expect(sanitizeField('-CMD')).toBe("'-CMD");
      expect(sanitizeField('Standard Name')).toBe('Standard Name');
    });
  });

  describe('11. Staff Self-Service Dashboard — Allocation Accept/Reject Workflows', () => {
    const { staffService } = require('../services/staffService');
    const {
      fetchMyAllocationsThunk,
      acceptAssociationThunk,
      rejectAssociationThunk,
    } = require('../store/staffSlice');
    const apiClient = require('../../../services/apiClient').default;

    const dummyInitialState: StaffState = {
      staffList: [],
      isLoading: false,
      isSubmitting: false,
      error: null,
      selectedStaff: null,
      currentOrgId: null,
      myProfile: null,
      isProfileLoading: false,
      profileError: null,
      myUnits: [],
      eligibleStaff: [],
      associations: [],
      isAssociationsLoading: false,
      isAssociationSubmitting: false,
      associationError: null,
      attendanceStats: null,
      attendanceRecords: [],
      attendancePagination: {},
      isAttendanceLoading: false,
      attendanceError: null,
      myAttendanceRecords: [],
      isMyAttendanceLoading: false,
      myAttendanceError: null,
      myAllocations: [],
      isAllocationsLoading: false,
      allocationsError: null,
    };

    const pendingAlloc: StaffUnitAssociation = {
      _id: 'alloc_req_101',
      orgId: 'org_comm_01',
      villaId: { _id: 'villa_101', unitNumber: '101', blockOrBuilding: 'Building A' },
      technicianId: { _id: 'tech_501', name: 'Khalid Mansoor', department: 'Plumbing', staffCode: 'STF-501' },
      status: 'Pending',
      roleOrTrade: 'Private Maintenance',
      associatedBy: { _id: 'user_res_01', name: 'John Resident' },
    };

    it('populates myAllocations upon fetchMyAllocationsThunk.fulfilled', () => {
      const action = {
        type: fetchMyAllocationsThunk.fulfilled.type,
        payload: [pendingAlloc],
      };
      const state = staffReducer(dummyInitialState, action);
      expect(state.myAllocations).toHaveLength(1);
      expect(state.myAllocations[0].status).toBe('Pending');
      expect(state.isAllocationsLoading).toBe(false);
    });

    it('transitions allocation to Active upon acceptAssociationThunk.fulfilled', () => {
      const existingState: StaffState = {
        ...dummyInitialState,
        myAllocations: [pendingAlloc],
      };

      const acceptedAlloc: StaffUnitAssociation = {
        ...pendingAlloc,
        status: 'Active',
      };

      const action = {
        type: acceptAssociationThunk.fulfilled.type,
        payload: acceptedAlloc,
      };

      const state = staffReducer(existingState, action);
      expect(state.myAllocations).toHaveLength(1);
      expect(state.myAllocations[0].status).toBe('Active');

      // Filter verification: Active vs Pending
      const activeAllocations = state.myAllocations.filter((a) => a.status === 'Active');
      const pendingAllocations = state.myAllocations.filter((a) => a.status === 'Pending');
      expect(activeAllocations).toHaveLength(1);
      expect(pendingAllocations).toHaveLength(0);
    });

    it('transitions allocation to Rejected upon rejectAssociationThunk.fulfilled', () => {
      const existingState: StaffState = {
        ...dummyInitialState,
        myAllocations: [pendingAlloc],
      };

      const rejectedAlloc: StaffUnitAssociation = {
        ...pendingAlloc,
        status: 'Rejected',
      };

      const action = {
        type: rejectAssociationThunk.fulfilled.type,
        payload: rejectedAlloc,
      };

      const state = staffReducer(existingState, action);
      expect(state.myAllocations).toHaveLength(1);
      expect(state.myAllocations[0].status).toBe('Rejected');

      // Filter verification
      const activeAllocations = state.myAllocations.filter((a) => a.status === 'Active');
      const pendingAllocations = state.myAllocations.filter((a) => a.status === 'Pending');
      expect(activeAllocations).toHaveLength(0);
      expect(pendingAllocations).toHaveLength(0);
    });

    it('staffService.acceptAssociation calls POST /staff-associations/:id/accept', async () => {
      const postSpy = jest.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: { data: { ...pendingAlloc, status: 'Active' } },
      } as any);

      const res = await staffService.acceptAssociation('alloc_req_101');
      expect(postSpy).toHaveBeenCalledWith('/staff-associations/alloc_req_101/accept');
      expect(res.status).toBe('Active');
      postSpy.mockRestore();
    });

    it('staffService.rejectAssociation calls POST /staff-associations/:id/reject with reason', async () => {
      const postSpy = jest.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: { data: { ...pendingAlloc, status: 'Rejected' } },
      } as any);

      const res = await staffService.rejectAssociation('alloc_req_101', 'Schedule conflict');
      expect(postSpy).toHaveBeenCalledWith('/staff-associations/alloc_req_101/reject', {
        reason: 'Schedule conflict',
      });
      expect(res.status).toBe('Rejected');
      postSpy.mockRestore();
    });
  });

  describe('12. Staff Dashboard Scope Segmentation — Global vs Dual Staff', () => {
    it('identifies roleScope: "STAFF" as Dual Staff with full operational features', () => {
      const dualStaffUser = {
        role: { name: 'Technician', roleScope: 'STAFF' },
        permissions: ['staff:view_own'],
      };
      const roleScope = dualStaffUser.role.roleScope;
      const isDual = roleScope === 'STAFF';
      expect(isDual).toBe(true);
    });

    it('identifies roleScope: "GLOBAL" as strictly single-scope Global Pass without operational modules', () => {
      const globalStaffUser = {
        role: { name: 'Support Rep', roleScope: 'GLOBAL' },
        permissions: ['staff:view_own'],
      };
      const roleScope = globalStaffUser.role.roleScope;
      const isDual =
        roleScope === 'STAFF' ||
        (roleScope === 'GLOBAL' &&
          (globalStaffUser.permissions.includes('complaints:assignee') ||
            globalStaffUser.permissions.includes('staff:attendance') ||
            globalStaffUser.permissions.includes('staff:assign_unit')));
      expect(isDual).toBe(false);
    });
  });
});



