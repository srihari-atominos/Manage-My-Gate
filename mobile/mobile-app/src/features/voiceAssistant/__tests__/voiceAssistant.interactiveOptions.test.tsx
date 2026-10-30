import React from 'react';
import { render, fireEvent, cleanup, act } from '@testing-library/react-native';
import { AIDeselectableChip } from '../components/AIDeselectableChip';
import { AIInteractiveOptions } from '../components/AIInteractiveOptions';
import { VoiceAssistantChatBubble } from '../components/VoiceAssistantChatBubble';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, navigate: jest.fn() }),
  usePathname: () => '/(resident)/dashboard',
}));

describe('Voice Assistant Universal Hybrid Input Experience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => {
      cleanup();
    });
  });

  describe('AIDeselectableChip', () => {
    it('renders label and badge correctly', async () => {
      const { getByText } = await render(
        <AIDeselectableChip
          id="group"
          label="Group Visit"
          value="GROUP"
          badge="Multi-Guest"
          onPress={jest.fn()}
        />
      );

      expect(getByText('Group Visit')).toBeTruthy();
      expect(getByText('Multi-Guest')).toBeTruthy();
    });

    it('triggers onPress with value when tapped', async () => {
      const onPressMock = jest.fn();
      const { getByTestId } = await render(
        <AIDeselectableChip
          id="cab"
          label="Cab / Auto"
          value="CAB"
          onPress={onPressMock}
        />
      );

      await act(async () => {
        fireEvent.press(getByTestId('ai-chip-cab'));
      });
      expect(onPressMock).toHaveBeenCalledWith('CAB');
    });

    it('triggers onDeselect when already selected and allowDeselect is true', async () => {
      const onDeselectMock = jest.fn();
      const onPressMock = jest.fn();
      const { getByLabelText } = await render(
        <AIDeselectableChip
          id="guest"
          label="Guest Pass"
          value="GUEST"
          selected={true}
          allowDeselect={true}
          onPress={onPressMock}
          onDeselect={onDeselectMock}
        />
      );

      await act(async () => {
        fireEvent.press(getByLabelText('Deselect Guest Pass'));
      });
      expect(onDeselectMock).toHaveBeenCalledWith('GUEST');
    });
  });

  describe('AIInteractiveOptions - Rich Archetype Cards (Visitor Pass)', () => {
    const visitorOptions = [
      {
        id: 'GUEST',
        value: 'GUEST',
        label: 'Guest Pass',
        description: 'Pre-approve individual friends, family, or personal visitors',
        badge: null,
      },
      {
        id: 'GROUP',
        value: 'GROUP',
        label: 'Group Visit',
        description: 'Host events, parties, or bulk visitors with a single pass',
        badge: 'Multi-Guest',
      },
      {
        id: 'CAB',
        value: 'CAB',
        label: 'Cab / Auto',
        description: 'Pre-approve Uber, Ola, or taxi vehicles for auto gate barrier opening',
        badge: null,
      },
      {
        id: 'DELIVERY',
        value: 'DELIVERY',
        label: 'Delivery',
        description: 'Quick entry pass for Swiggy, Zomato, Amazon, courier agents',
        badge: null,
      },
      {
        id: 'SERVICE',
        value: 'SERVICE',
        label: 'Service / Staff',
        description: 'Long-term entry pass for maid, driver, electrician, daily staff',
        badge: 'Recurring',
      },
    ];

    const visitorConfig = {
      mode: 'single',
      targetField: 'passType',
      allowDeselect: true,
      allowCustomText: true,
      title: 'Select Invitation Type:',
      customPlaceholder: 'Or describe your visitor...',
    };

    it('renders all 5 invitation types with labels, descriptions, and badges', async () => {
      const { getByText } = await render(
        <AIInteractiveOptions
          messageId="msg_1"
          options={visitorOptions as any}
          interactiveConfig={visitorConfig as any}
        />
      );

      expect(getByText('Select Invitation Type:')).toBeTruthy();
      expect(getByText('Guest Pass')).toBeTruthy();
      expect(getByText('Pre-approve individual friends, family, or personal visitors')).toBeTruthy();
      expect(getByText('Group Visit')).toBeTruthy();
      expect(getByText('Multi-Guest')).toBeTruthy();
      expect(getByText('Cab / Auto')).toBeTruthy();
      expect(getByText('Delivery')).toBeTruthy();
      expect(getByText('Service / Staff')).toBeTruthy();
      expect(getByText('Recurring')).toBeTruthy();
      expect(getByText('Or describe your visitor...')).toBeTruthy();
    });

    it('invokes onSelectOption with label when an archetype card is pressed', async () => {
      const onSelectMock = jest.fn();
      const { getByTestId } = await render(
        <AIInteractiveOptions
          messageId="msg_1"
          options={visitorOptions as any}
          interactiveConfig={visitorConfig as any}
          onSelectOption={onSelectMock}
        />
      );

      await act(async () => {
        fireEvent.press(getByTestId('ai-option-card-CAB'));
      });
      expect(onSelectMock).toHaveBeenCalledWith('Cab / Auto');
    });

    it('invokes onDeselectOption when tapping an already selected card', async () => {
      const onDeselectMock = jest.fn();
      const optionsWithSelected = visitorOptions.map((o) =>
        o.id === 'CAB' ? { ...o, selected: true } : o
      );

      const { getByTestId } = await render(
        <AIInteractiveOptions
          messageId="msg_1"
          options={optionsWithSelected as any}
          interactiveConfig={visitorConfig as any}
          onDeselectOption={onDeselectMock}
        />
      );

      await act(async () => {
        fireEvent.press(getByTestId('ai-option-card-CAB'));
      });
      expect(onDeselectMock).toHaveBeenCalledWith('deselect CAB');
    });
  });

  describe('AIInteractiveOptions - Compact Chips & Multi-Select', () => {
    const facilityOptions = [
      { id: 'ac', value: 'Air Conditioning', label: 'Air Conditioning' },
      { id: 'lockers', value: 'Lockers', label: 'Lockers' },
      { id: 'floodlights', value: 'Floodlights', label: 'Floodlights' },
    ];

    const multiConfig = {
      mode: 'multiple',
      targetField: 'facilities',
      allowDeselect: true,
      allowCustomText: true,
      title: 'Select Facilities (Multiple):',
    };

    it('renders multi-select chips and toggles selections', async () => {
      const onSelectMock = jest.fn();
      const { getByTestId, getByText } = await render(
        <AIInteractiveOptions
          messageId="msg_2"
          options={facilityOptions as any}
          interactiveConfig={multiConfig as any}
          onSelectOption={onSelectMock}
        />
      );

      expect(getByText('Select Facilities (Multiple):')).toBeTruthy();
      // Select AC
      await act(async () => {
        fireEvent.press(getByTestId('ai-chip-ac'));
      });
      // Select Lockers
      await act(async () => {
        fireEvent.press(getByTestId('ai-chip-lockers'));
      });

      // Apply button should display 2 selected
      expect(getByText('Apply (2)')).toBeTruthy();
      await act(async () => {
        fireEvent.press(getByTestId('submit-multiselect-msg_2'));
      });

      expect(onSelectMock).toHaveBeenCalledWith('Air Conditioning, Lockers');
    });

    it('clears selection when Clear button is pressed', async () => {
      const onDeselectMock = jest.fn();
      const selectedOpts = facilityOptions.map((o) =>
        o.id === 'ac' ? { ...o, selected: true } : o
      );

      const { getByTestId } = await render(
        <AIInteractiveOptions
          messageId="msg_3"
          options={selectedOpts as any}
          interactiveConfig={multiConfig as any}
          onDeselectOption={onDeselectMock}
        />
      );

      await act(async () => {
        fireEvent.press(getByTestId('clear-options-msg_3'));
      });
      expect(onDeselectMock).toHaveBeenCalledWith('clear selection');
    });
  });

  describe('VoiceAssistantChatBubble Integration', () => {
    it('renders AIInteractiveOptions inside assistant message bubble', async () => {
      const msg: any = {
        id: 'asst_1',
        sender: 'assistant',
        text: 'What type of pass would you like to create?',
        timestamp: Date.now(),
        metadata: {
          options: [
            { id: 'GUEST', value: 'GUEST', label: 'Guest Pass', description: 'Individual visitor' },
            { id: 'CAB', value: 'CAB', label: 'Cab / Auto', description: 'Taxi pre-approval' },
          ],
          interactiveConfig: {
            mode: 'single',
            targetField: 'passType',
            allowDeselect: true,
            allowCustomText: true,
            title: 'Select Pass Type:',
          },
        },
      };

      const onSelectOption = jest.fn();
      const { getByText, getByTestId } = await render(
        <VoiceAssistantChatBubble
          message={msg}
          onSelectOption={onSelectOption}
        />
      );

      expect(getByText('What type of pass would you like to create?')).toBeTruthy();
      expect(getByText('Select Pass Type:')).toBeTruthy();
      expect(getByTestId('ai-option-card-GUEST')).toBeTruthy();
      expect(getByTestId('ai-option-card-CAB')).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByTestId('ai-option-card-GUEST'));
      });
      expect(onSelectOption).toHaveBeenCalledWith('Guest Pass');
    });
  });
});
