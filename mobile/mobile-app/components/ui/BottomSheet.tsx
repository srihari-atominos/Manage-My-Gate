import {
  View,
  Modal,
  TouchableOpacity,
  Pressable,
  useWindowDimensions,
  Dimensions,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { Text } from './text';
import { X } from 'lucide-react-native';
import { cva } from 'class-variance-authority';

import { SheetGrabHandle } from './SheetGrabHandle';
import { KeyboardAwareScrollView } from '../layout/KeyboardAwareScrollView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboard } from '../layout/useKeyboard';

export interface AppBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  snapPoints?: (string | number)[];
  children: React.ReactNode;
  footer?: React.ReactNode;
  enableDynamicSizing?: boolean;
  contentContainerStyle?: any;
  testID?: string;
  scrollable?: boolean;
}

const bottomSheetHeaderVariants = cva(
  'w-full pb-2.5 border-b border-border/80 items-center justify-between flex-row px-5 py-3.5'
);

const bottomSheetTitleVariants = cva(
  'text-[17px] font-bold font-sans text-foreground tracking-tight'
);

const bottomSheetContentVariants = cva('px-4 pb-6');

function BottomSheet({
  visible,
  onClose,
  title,
  snapPoints,
  children,
  contentContainerStyle,
  footer,
  testID,
  scrollable = true,
}: AppBottomSheetProps) {
  const { height: windowHeight } = useWindowDimensions();
  const screenHeight = Dimensions.get('screen')?.height || windowHeight;
  const insets = useSafeAreaInsets();
  const { keyboardShown, keyboardHeight } = useKeyboard();
  if (!visible) return null;

  // On Android with statusBarTranslucent={false}, windowHeight shrinks automatically on keyboard open (adjustResize).
  // On iOS, windowHeight stays constant, and KeyboardAvoidingView behavior="padding" handles the keyboard offset.
  const topSafeMargin = Math.max(insets.top, Platform.OS === 'android' ? 8 : 44);
  const maxAvailableHeight = windowHeight - topSafeMargin;

  // Parse snapPoints if supplied (e.g. ['75%'] or [500])
  let customSnapHeight: number | null = null;
  if (snapPoints && snapPoints.length > 0) {
    const firstSnap = snapPoints[0];
    if (typeof firstSnap === 'number') {
      customSnapHeight = firstSnap;
    } else if (typeof firstSnap === 'string' && firstSnap.endsWith('%')) {
      const pct = parseFloat(firstSnap) / 100;
      if (!isNaN(pct)) customSnapHeight = Math.round(windowHeight * pct);
    }
  }

  const defaultMaxHeight = customSnapHeight
    ? Math.min(customSnapHeight, maxAvailableHeight)
    : Platform.OS === 'web'
    ? Math.min(Math.round(windowHeight * 0.85), 680)
    : Math.min(Math.round(windowHeight * 0.88), maxAvailableHeight);

  // When keyboard opens, dynamically constrain sheet height so top header never gets pushed off-screen
  // on both Android and iOS without double-deduction.
  const availableHeightAboveKeyboard = Math.min(
    windowHeight,
    screenHeight - (keyboardShown ? keyboardHeight : 0)
  ) - topSafeMargin - 10;

  const effectiveMaxHeight = keyboardShown
    ? Math.max(Math.min(defaultMaxHeight, availableHeightAboveKeyboard), 220)
    : defaultMaxHeight;

  const resolvedHeight = customSnapHeight
    ? Math.min(customSnapHeight, effectiveMaxHeight)
    : effectiveMaxHeight;

  const handleClose = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent={false}
      animationType="slide"
      onRequestClose={handleClose}
      testID={testID || 'bottom-sheet-modal'}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          width: '100%',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        {/* Backdrop */}
        <Pressable 
          className="absolute inset-0 bg-black/60" 
          style={{ zIndex: 1 }}
          onPress={handleClose} 
        />
        
        {/* Content Box */}
        <View
          style={[
            {
              height: resolvedHeight,
              maxHeight: effectiveMaxHeight,
              minHeight: Math.min(280, effectiveMaxHeight),
              maxWidth: '100%',
              zIndex: 10,
              elevation: 10,
            },
            contentContainerStyle,
          ]}
          className="bg-card border-t border-border/80 rounded-t-3xl sm:rounded-3xl sm:border sm:mb-4 shadow-2xl overflow-hidden flex-col w-full max-w-md mx-auto"
        >
          {/* Top grab handle */}
          <SheetGrabHandle onClose={handleClose} />

          {/* Title Header with Close X */}
          {Boolean(title) && (
            <View className={bottomSheetHeaderVariants()}>
              <Text
                className={`${bottomSheetTitleVariants()} flex-1 min-w-0 me-3`}
                numberOfLines={1}
                minimumFontScale={0.75}
              >
                {title}
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                activeOpacity={0.7}
                className="p-1.5 rounded-full bg-secondary border border-border/60"
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={16} className="text-foreground" />
              </TouchableOpacity>
            </View>
          )}

          {/* Body Content */}
          {scrollable ? (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              extraScrollHeight={48}
              contentContainerStyle={[
                { paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom + 24, 48), flexGrow: 1 },
                contentContainerStyle,
              ]}
              showsVerticalScrollIndicator={true}
              bounces={true}
              alwaysBounceVertical={false}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            >
              {children}
            </KeyboardAwareScrollView>
          ) : (
            <View
              style={[{ flex: 1, paddingHorizontal: 12, paddingTop: 8 }, contentContainerStyle]}
              className="flex-1 flex-col overflow-hidden w-full"
            >
              {children}
            </View>
          )}
          {footer && (
            <View
              className="pt-3 px-4 border-t border-border/80 bg-card"
              style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            >
              {footer}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export {
  BottomSheet,
  bottomSheetHeaderVariants,
  bottomSheetTitleVariants,
};
