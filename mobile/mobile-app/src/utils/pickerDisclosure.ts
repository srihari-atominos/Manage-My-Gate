import { Alert } from 'react-native';

export type PickerDisclosureKind = 'photo' | 'document';

/**
 * Explains a user-initiated handoff to the platform picker. Android's secure
 * photo/document pickers grant access only to user-selected items, so this is
 * deliberately not a broad storage-permission request.
 */
export const confirmPickerDisclosure = (kind: PickerDisclosureKind): Promise<boolean> =>
  new Promise((resolve) => {
    const isPhoto = kind === 'photo';
    Alert.alert(
      isPhoto ? 'Select a photo' : 'Select a file',
      isPhoto
        ? 'Choose a photo from your device to attach to this item.'
        : 'Choose a file from your device to attach to this item.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continue', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });