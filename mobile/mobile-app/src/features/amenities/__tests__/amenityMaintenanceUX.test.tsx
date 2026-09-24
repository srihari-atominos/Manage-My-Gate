import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { AmenityMaintenanceCard } from '../components/AmenityMaintenanceCard';
import { FacilityMaintenanceDetailSheet } from '../components/FacilityMaintenanceDetailSheet';
import { MaintenanceWizard } from '../components/maintenance-wizard/MaintenanceWizard';
import { Amenity, MaintenanceTask } from '../store/amenitySlice';

// Mock react-native-worklets
jest.mock('react-native-worklets', () => ({
  isWorkletFunction: jest.fn(() => false),
  createWorkletRuntime: jest.fn(),
  runOnJS: jest.fn((fn) => fn),
  runOnUI: jest.fn((fn) => fn),
  scheduleOnUI: jest.fn((fn) => fn),
  createSerializable: jest.fn((val) => val),
  serializableMappingCache: new Map(),
  makeShareable: jest.fn((val) => val),
  makeMutable: jest.fn((val) => ({ value: val })),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  return {
    ...Reanimated,
    useAnimatedStyle: (fn: any) => (typeof fn === 'function' ? fn() : {}),
    useSharedValue: (val: any) => ({ value: val }),
    withTiming: (val: any) => val,
    withRepeat: (val: any) => val,
    withSequence: (...args: any[]) => args[0],
    FadeIn: { duration: () => ({}) },
    FadeOut: { duration: () => ({}) },
  };
});

describe('NAHOM — Maintenance Facility List UX Refactor Tests', () => {
  const mockAmenity: Amenity = {
    _id: 'amenity-gym-1',
    name: 'Community Gym',
    category: 'EXCLUSIVE_HOURLY',
    location: 'Building B, 2nd Floor',
    code: 'FAC-GYM-01',
  };

  const mockTask1: MaintenanceTask = {
    _id: 'task-1',
    amenityId: 'amenity-gym-1',
    amenityName: 'Community Gym',
    title: 'Routine Cleaning & Servicing',
    description: 'Deep sanitize all weight machines and treadmills.',
    startDate: '2026-09-24',
    endDate: '2026-09-25',
    startTime: '08:00',
    endTime: '18:00',
    maintenanceType: 'CLEANING',
    assignedStaff: 'Facilities Team',
    status: 'SCHEDULED' as any,
  };

  const mockTask2: MaintenanceTask = {
    _id: 'task-2',
    amenityId: 'amenity-gym-1',
    amenityName: 'Community Gym',
    title: 'AC Filter Replacement',
    description: 'Replace HVAC air filters for gym floor.',
    startDate: '2026-10-01',
    endDate: '2026-10-01',
    startTime: '10:00',
    endTime: '14:00',
    maintenanceType: 'REPAIR',
    assignedStaff: 'HVAC Specialist',
    status: 'SCHEDULED' as any,
  };

  describe('1. AmenityMaintenanceCard (Clean Facility Summary)', () => {
    it('renders facility-level information cleanly without detailed maintenance windows', async () => {
      const handlePress = jest.fn();

      await render(
        <AmenityMaintenanceCard
          amenity={mockAmenity}
          activeTasks={[mockTask1]}
          onPress={handlePress}
        />
      );

      // Facility name and location MUST render
      expect(screen.getByText('Community Gym')).toBeTruthy();
      expect(screen.getByText('Building B, 2nd Floor')).toBeTruthy();

      // Maintenance indicator MUST render
      expect(screen.getByText('Maintenance Scheduled')).toBeTruthy();

      // Tap affordance MUST render
      expect(screen.getByText('Tap to view details')).toBeTruthy();

      // Maintenance window details MUST NOT render on the main card
      expect(screen.queryByText('Deep sanitize all weight machines and treadmills.')).toBeNull();
      expect(screen.queryByText('2026-09-24 – 2026-09-25')).toBeNull();
      expect(screen.queryByText('08:00 – 18:00')).toBeNull();
      expect(screen.queryByText('Facilities Team')).toBeNull();

      // Inline action buttons MUST NOT render on the main card
      expect(screen.queryByText('Add Window')).toBeNull();
      expect(screen.queryByText('Edit Task')).toBeNull();
      expect(screen.queryByText('Delete Scheduling')).toBeNull();
      expect(screen.queryByText('Cancel All')).toBeNull();
    });

    it('renders operational state when no maintenance tasks exist', async () => {
      await render(
        <AmenityMaintenanceCard
          amenity={mockAmenity}
          activeTasks={[]}
          onPress={jest.fn()}
        />
      );

      expect(screen.getByText('OPERATIONAL')).toBeTruthy();
      expect(screen.getByText('Operational & Open')).toBeTruthy();
    });

    it('triggers onPress when the card is tapped', async () => {
      const handlePress = jest.fn();

      await render(
        <AmenityMaintenanceCard
          amenity={mockAmenity}
          activeTasks={[mockTask1]}
          onPress={handlePress}
        />
      );

      const card = screen.getByLabelText('Community Gym facility card. Tap to view maintenance details.');
      await act(async () => {
        fireEvent.press(card);
      });

      expect(handlePress).toHaveBeenCalledTimes(1);
      expect(handlePress).toHaveBeenCalledWith(mockAmenity);
    });
  });

  describe('2. FacilityMaintenanceDetailSheet (Detail & Actions View)', () => {
    it('renders facility header and empty state when no maintenance tasks exist', async () => {
      await render(
        <FacilityMaintenanceDetailSheet
          visible={true}
          onClose={jest.fn()}
          amenity={mockAmenity}
          activeTasks={[]}
          onAddWindow={jest.fn()}
          onEditTask={jest.fn()}
          onCancelTask={jest.fn()}
        />
      );

      // Header summary
      expect(screen.getByText('Community Gym')).toBeTruthy();
      expect(screen.getByText('Building B, 2nd Floor')).toBeTruthy();
      expect(screen.getByText('OPERATIONAL')).toBeTruthy();

      // Empty state
      expect(screen.getByText('No scheduled maintenance windows.')).toBeTruthy();
      expect(
        screen.getByText('Facility is operational and open for resident bookings.')
      ).toBeTruthy();

      // Action buttons
      expect(screen.getByText('Add Maintenance Window')).toBeTruthy();
      expect(screen.queryByText('Edit Facility')).toBeNull();
    });

    it('renders single maintenance window with details, Edit, and Cancel buttons', async () => {
      const handleEditTask = jest.fn();
      const handleCancelTask = jest.fn();

      await render(
        <FacilityMaintenanceDetailSheet
          visible={true}
          onClose={jest.fn()}
          amenity={mockAmenity}
          activeTasks={[mockTask1]}
          onAddWindow={jest.fn()}
          onEditTask={handleEditTask}
          onCancelTask={handleCancelTask}
        />
      );

      // Window title and details
      expect(screen.getByText('Routine Cleaning & Servicing')).toBeTruthy();
      expect(screen.getByText('2026-09-24 – 2026-09-25')).toBeTruthy();
      expect(screen.getByText('08:00 – 18:00')).toBeTruthy();
      expect(screen.getByText('Facilities Team')).toBeTruthy();
      expect(screen.getByText('"Deep sanitize all weight machines and treadmills."')).toBeTruthy();

      // Actions on the window
      const editBtn = screen.getByLabelText('Edit window Routine Cleaning & Servicing');
      await act(async () => {
        fireEvent.press(editBtn);
      });
      expect(handleEditTask).toHaveBeenCalledWith(mockTask1);

      const cancelBtn = screen.getByLabelText('Cancel window Routine Cleaning & Servicing');
      await act(async () => {
        fireEvent.press(cancelBtn);
      });

      // In-sheet confirmation appears
      const confirmBtn = screen.getByText('Confirm Cancel');
      await act(async () => {
        fireEvent.press(confirmBtn);
      });
      expect(handleCancelTask).toHaveBeenCalledWith(mockTask1);
    });

    it('renders multiple maintenance windows in scrollable section', async () => {
      await render(
        <FacilityMaintenanceDetailSheet
          visible={true}
          onClose={jest.fn()}
          amenity={mockAmenity}
          activeTasks={[mockTask1, mockTask2]}
          onAddWindow={jest.fn()}
          onEditTask={jest.fn()}
          onCancelTask={jest.fn()}
        />
      );

      // Both windows must be rendered
      expect(screen.getByText('Routine Cleaning & Servicing')).toBeTruthy();
      expect(screen.getByText('AC Filter Replacement')).toBeTruthy();
      expect(screen.getByText('HVAC Specialist')).toBeTruthy();
    });

    it('triggers onAddWindow when Add Maintenance Window is pressed', async () => {
      const handleAddWindow = jest.fn();

      await render(
        <FacilityMaintenanceDetailSheet
          visible={true}
          onClose={jest.fn()}
          amenity={mockAmenity}
          activeTasks={[mockTask1]}
          onAddWindow={handleAddWindow}
          onEditTask={jest.fn()}
          onCancelTask={jest.fn()}
        />
      );

      const addBtn = screen.getByLabelText('Add Maintenance Window');
      await act(async () => {
        fireEvent.press(addBtn);
      });

      expect(handleAddWindow).toHaveBeenCalledWith('amenity-gym-1');
    });

    it('does not render Edit Facility button inside the maintenance detail sheet', async () => {
      await render(
        <FacilityMaintenanceDetailSheet
          visible={true}
          onClose={jest.fn()}
          amenity={mockAmenity}
          activeTasks={[mockTask1]}
          onAddWindow={jest.fn()}
          onEditTask={jest.fn()}
          onCancelTask={jest.fn()}
        />
      );

      expect(screen.queryByText('Edit Facility')).toBeNull();
      expect(screen.queryByLabelText('Edit Facility Master')).toBeNull();
    });
  });

  describe('3. Dynamic State Refresh Simulation', () => {
    it('updates detail sheet when a new window is added without closing sheet', async () => {
      const { rerender } = await render(
        <FacilityMaintenanceDetailSheet
          visible={true}
          onClose={jest.fn()}
          amenity={mockAmenity}
          activeTasks={[mockTask1]}
          onAddWindow={jest.fn()}
          onEditTask={jest.fn()}
          onCancelTask={jest.fn()}
        />
      );

      expect(screen.getByText('Routine Cleaning & Servicing')).toBeTruthy();
      expect(screen.queryByText('AC Filter Replacement')).toBeNull();

      // Simulate state update after Add Window save
      await act(async () => {
        await rerender(
          <FacilityMaintenanceDetailSheet
            visible={true}
            onClose={jest.fn()}
            amenity={mockAmenity}
            activeTasks={[mockTask1, mockTask2]}
            onAddWindow={jest.fn()}
            onEditTask={jest.fn()}
            onCancelTask={jest.fn()}
          />
        );
      });

      expect(screen.getByText('Routine Cleaning & Servicing')).toBeTruthy();
      expect(screen.getByText('AC Filter Replacement')).toBeTruthy();
    });

    it('updates detail sheet when a window is cancelled without closing sheet', async () => {
      const { rerender } = await render(
        <FacilityMaintenanceDetailSheet
          visible={true}
          onClose={jest.fn()}
          amenity={mockAmenity}
          activeTasks={[mockTask1]}
          onAddWindow={jest.fn()}
          onEditTask={jest.fn()}
          onCancelTask={jest.fn()}
        />
      );

      expect(screen.getByText('Routine Cleaning & Servicing')).toBeTruthy();

      // Simulate state update after Cancel Window confirmed
      await act(async () => {
        await rerender(
          <FacilityMaintenanceDetailSheet
            visible={true}
            onClose={jest.fn()}
            amenity={mockAmenity}
            activeTasks={[]}
            onAddWindow={jest.fn()}
            onEditTask={jest.fn()}
            onCancelTask={jest.fn()}
          />
        );
      });

      expect(screen.queryByText('Routine Cleaning & Servicing')).toBeNull();
      expect(screen.getByText('No scheduled maintenance windows.')).toBeTruthy();
    });
  });

  describe('4. MaintenanceWizard (Multi-Step Creation & Edit Flow)', () => {
    it('renders Step 1 (Scope & Type) with facility info, type chips, and title', async () => {
      await render(
        <MaintenanceWizard
          visible={true}
          onClose={jest.fn()}
          onSubmit={jest.fn()}
          amenities={[mockAmenity]}
          initialAmenityId="amenity-gym-1"
        />
      );

      // Step indicator and header
      expect(screen.getByText('Step 1 of 3: Scope & Type')).toBeTruthy();
      expect(screen.getByText('Scope & Type')).toBeTruthy();

      // Facility details
      expect(screen.getByText('Community Gym')).toBeTruthy();

      // Form inputs
      expect(screen.getByDisplayValue('Routine Cleaning & Servicing')).toBeTruthy();
      expect(screen.getByText('Cleaning & Sanitization')).toBeTruthy();
      expect(screen.getByText('Continue to Schedule')).toBeTruthy();
    });

    it('advances through steps to Review and does not render Complete Facility Closure', async () => {
      const handleSubmit = jest.fn();

      await render(
        <MaintenanceWizard
          visible={true}
          onClose={jest.fn()}
          onSubmit={handleSubmit}
          amenities={[mockAmenity]}
          initialAmenityId="amenity-gym-1"
        />
      );

      // Step 1 -> Step 2
      const nextBtn = screen.getByText('Continue to Schedule');
      await act(async () => {
        fireEvent.press(nextBtn);
      });

      expect(screen.getByText('Step 2 of 3: Date & Time')).toBeTruthy();
      expect(screen.getByText('Date & Time')).toBeTruthy();

      // Step 2 -> Step 3
      await act(async () => {
        fireEvent.press(screen.getByText('Continue to Review'));
      });

      expect(screen.getByText('Step 3 of 3: Review & Confirm')).toBeTruthy();
      expect(screen.getByText('Review & Confirm')).toBeTruthy();

      // Verify "Complete Facility Closure" is removed from the UI
      expect(screen.queryByText('Complete Facility Closure')).toBeNull();
      expect(screen.queryByText('Degraded Capacity')).toBeNull();

      // Review Step shows summary and Auto-cancel toggle
      expect(screen.getByText('Auto-Cancel Conflicting Bookings')).toBeTruthy();

      // Submit
      const confirmBtn = screen.getByText('Confirm & Schedule Upkeep');
      await act(async () => {
        fireEvent.press(confirmBtn);
      });

      expect(handleSubmit).toHaveBeenCalledTimes(1);
      const submittedData = handleSubmit.mock.calls[0][1];
      expect(submittedData.title).toBe('Routine Cleaning & Servicing');
      expect(submittedData.isCompleteClosure).toBe(true);
    });

    it('populates initial data when editing an existing task', async () => {
      await render(
        <MaintenanceWizard
          visible={true}
          onClose={jest.fn()}
          onSubmit={jest.fn()}
          amenities={[mockAmenity]}
          initialData={mockTask1}
        />
      );

      expect(screen.getByText('Scope & Type')).toBeTruthy();
      expect(screen.getByDisplayValue('Routine Cleaning & Servicing')).toBeTruthy();
      expect(screen.getByDisplayValue('Facilities Team')).toBeTruthy();
      expect(screen.getByDisplayValue('Deep sanitize all weight machines and treadmills.')).toBeTruthy();
    });

    it('supports Ongoing (No Limit) recurring maintenance mode by default', async () => {
      const handleSubmit = jest.fn();

      await render(
        <MaintenanceWizard
          visible={true}
          onClose={jest.fn()}
          onSubmit={handleSubmit}
          amenities={[mockAmenity]}
          initialAmenityId="amenity-gym-1"
        />
      );

      // Step 1 -> Step 2
      await act(async () => {
        fireEvent.press(screen.getByText('Continue to Schedule'));
      });

      // Enable Recurring Switch
      const recurringSwitch = screen.getByRole('switch');
      await act(async () => {
        fireEvent(recurringSwitch, 'valueChange', true);
      });

      // Ongoing (No Limit) is selected by default
      expect(screen.getByText('Ongoing (No Limit)')).toBeTruthy();
      expect(
        screen.getByText('Repeats automatically on schedule until manually cancelled or paused.')
      ).toBeTruthy();

      // Step 2 -> Step 3
      await act(async () => {
        fireEvent.press(screen.getByText('Continue to Review'));
      });

      // Review step reflects Ongoing status
      expect(screen.getByText(/Ongoing \(Until Cancelled\)/i)).toBeTruthy();

      // Submit
      await act(async () => {
        fireEvent.press(screen.getByText('Confirm & Schedule Upkeep'));
      });

      expect(handleSubmit).toHaveBeenCalledTimes(1);
      const submittedData = handleSubmit.mock.calls[0][1];
      expect(submittedData.isRecurring).toBe(true);
      expect(submittedData.isOngoing).toBe(true);
    });
  });
});
