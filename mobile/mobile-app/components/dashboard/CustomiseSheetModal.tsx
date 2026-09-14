import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Modal, TouchableOpacity, ScrollView, Dimensions, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Sparkles } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import CustomiseDeckZone from './CustomiseDeckZone';
import CustomiseAvailableZone, { AvailableFeatureCardItem } from './CustomiseAvailableZone';
import FeatureIcon from '../ui/FeatureIcon';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { isFeatureAllowedForUser, getDefaultQuickActionsForUser } from '../../src/utils/rbac';
import { useTranslation } from '../../src/utils/i18n';
import {
  ALL_AVAILABLE_FEATURES,
  REAL_APP_FEATURES,
  DEFAULT_6_QUICK_ACTIONS,
  DEFAULT_5_QUICK_ACTIONS,
  AppFeatureItem,
  getRoleDefaultQuickActions,
} from '../../src/features/dashboard/dashboardCatalog';

export { ALL_AVAILABLE_FEATURES, REAL_APP_FEATURES, AppFeatureItem };

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.85);

interface CustomiseSheetModalProps {
  visible: boolean;
  onClose: () => void;
  activeFeatureIds?: string[];
  availableFeatures?: any[];
  onToggleFeature?: (featureId: string) => void;
  onSave?: (selectedIds: string[]) => void;
}

export const CustomiseSheetModal: React.FC<CustomiseSheetModalProps> = ({
  visible,
  onClose,
  activeFeatureIds,
  availableFeatures,
  onToggleFeature,
  onSave,
}) => {
  const { user } = useAuth();
  const { t, tFeatureName } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const availableFeaturesForUser = useMemo(() => {
    return (availableFeatures || ALL_AVAILABLE_FEATURES).filter((item: any) =>
      isFeatureAllowedForUser(item, user)
    );
  }, [availableFeatures, user]);

  const defaultRoleQuickActions = useMemo(() => {
    return getDefaultQuickActionsForUser(user).slice(0, 6);
  }, [user]);

  // Sanitize incoming IDs to ensure only valid current catalog items allowed for this user are retained (max 6)
  const sanitizedActiveIds = useMemo(() => {
    if (!activeFeatureIds || activeFeatureIds.length === 0) {
      return defaultRoleQuickActions;
    }
    const valid = activeFeatureIds.filter((id) => {
      const item = ALL_AVAILABLE_FEATURES.find((f) => f.id === id);
      return item && isFeatureAllowedForUser(item, user);
    }).slice(0, 6);
    return valid.length > 0 ? valid : defaultRoleQuickActions;
  }, [activeFeatureIds, defaultRoleQuickActions, user]);

  const [selectedIds, setSelectedIds] = useState<string[]>(sanitizedActiveIds);
  const [deckHeight, setDeckHeight] = useState(190);

  // Drag & drop floating state
  const [draggingFeature, setDraggingFeature] = useState<AvailableFeatureCardItem | null>(null);
  const [isOverDeck, setIsOverDeck] = useState(false);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);

  // Pull down to dismiss sheet transform
  const sheetTranslateY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setSelectedIds(sanitizedActiveIds);
      sheetTranslateY.value = 0;
    }
  }, [visible, sanitizedActiveIds]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    } else if (selectedIds.length < 6) {
      setSelectedIds((prev) => [...prev, id]);
    }
    if (onToggleFeature) onToggleFeature(id);
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    setSelectedIds((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, removed);
      return copy;
    });
  };

  const handleSave = () => {
    if (onSave) onSave(selectedIds.slice(0, 6));
    onClose();
  };

  // Drag handlers from available cards
  const handleDragStart = (feature: AvailableFeatureCardItem, absX: number, absY: number) => {
    dragX.value = absX - 38;
    dragY.value = absY - 38;
    setDraggingFeature(feature);
  };

  const handleDragMove = (absX: number, absY: number) => {
    dragX.value = absX - 38;
    dragY.value = absY - 38;

    // Deck is pinned at top of the bottom sheet
    const sheetTop = SCREEN_HEIGHT - SHEET_HEIGHT;
    const deckZoneThreshold = sheetTop + 54 + deckHeight + 40;
    setIsOverDeck(absY > 0 && absY < deckZoneThreshold);
  };

  const handleDragEnd = (feature: AvailableFeatureCardItem, absX: number, absY: number) => {
    const sheetTop = SCREEN_HEIGHT - SHEET_HEIGHT;
    const deckZoneThreshold = sheetTop + 54 + deckHeight + 40;

    if (absY > 0 && absY < deckZoneThreshold && !selectedIds.includes(feature.id) && selectedIds.length < 6) {
      setSelectedIds((prev) => [...prev, feature.id]);
    }
    setDraggingFeature(null);
    setIsOverDeck(false);
  };

  // Pan gesture on modal header for pull-down to dismiss
  const headerPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onUpdate((e) => {
          if (e.translationY > 0) {
            sheetTranslateY.value = e.translationY;
          }
        })
        .onEnd((e) => {
          if (e.translationY > 120 || e.velocityY > 600) {
            sheetTranslateY.value = withTiming(SHEET_HEIGHT, { duration: 220 }, (finished) => {
              if (finished) {
                runOnJS(onClose)();
              }
            });
          } else {
            sheetTranslateY.value = withSpring(0, { damping: 18, stiffness: 220 });
          }
        }),
    [onClose]
  );

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const animatedDragPreviewStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value },
      { translateY: dragY.value },
      { scale: 1.12 },
    ],
    opacity: 0.95,
  }));

  // Active selected items (up to 6, strictly permitted)
  const activeItems = useMemo(() => {
    return selectedIds
      .map((id) => ALL_AVAILABLE_FEATURES.find((f) => f.id === id))
      .filter((item): item is typeof ALL_AVAILABLE_FEATURES[0] =>
        Boolean(item && isFeatureAllowedForUser(item, user))
      )
      .slice(0, 6);
  }, [selectedIds, user]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className="flex-1 bg-black/60 justify-end">
          {/* Backdrop dismiss touchable */}
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={onClose}
          />

          {/* Bottom Sheet Container with guaranteed height */}
          <Animated.View
            style={[{ height: SHEET_HEIGHT }, animatedSheetStyle]}
            className="bg-card border-t border-border rounded-t-3xl shadow-2xl overflow-hidden flex-col"
          >
            {/* Top Pill Handle & Header with Pull-Down Pan Gesture */}
            <GestureDetector gesture={headerPanGesture}>
              <View className="bg-card">
                <View className="items-center pt-2.5 pb-1">
                  <View className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
                </View>

                {/* Header Bar */}
                <View className="flex-row justify-between items-center px-5 py-3 border-b border-border">
                  <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="py-1 px-2 rounded-lg active:bg-secondary">
                    <Text className="text-sm font-semibold text-muted-foreground">{t('cancel', 'Cancel')}</Text>
                  </TouchableOpacity>

                  <Text className="text-base font-extrabold text-foreground">{t('customise_dashboard', 'Customise Dashboard')}</Text>

                  <TouchableOpacity onPress={handleSave} activeOpacity={0.8} className="bg-primary px-4 py-1.5 rounded-full">
                    <Text className="text-xs font-bold text-primary-foreground">{t('save', 'Save')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </GestureDetector>

            {/* Pinned Active Selection Zone (The Deck - 6 Slots, always visible at top) */}
            <View onLayout={(e) => setDeckHeight(e.nativeEvent.layout.height)}>
              <CustomiseDeckZone
                activeItems={activeItems}
                maxCapacity={6}
                onRemoveItem={toggleSelect}
                onReorderItem={handleReorder}
                isDropTargetActive={isOverDeck || (Boolean(draggingFeature) && selectedIds.length < 6)}
              />
            </View>

            {/* Divider Sub-header */}
            <View className="px-5 py-2.5 bg-muted/30 border-b border-border flex-row items-center justify-between">
              <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {t('available_actions', 'Available Actions')} ({selectedIds.length}/6 Selected)
              </Text>
              <Sparkles size={14} color="#0284c7" />
            </View>

            {/* Scrollable Available Features Body */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 60 }}
              showsVerticalScrollIndicator={false}
              scrollEnabled={!draggingFeature}
            >
              <CustomiseAvailableZone
                features={availableFeaturesForUser}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
              />
            </ScrollView>
          </Animated.View>

          {/* Floating Card Drag Preview: Never clipped, floats directly under user's finger */}
          {draggingFeature ? (
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 76,
                  height: 76,
                  borderRadius: 20,
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderWidth: 2.5,
                  borderColor: '#FF6A00',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.45,
                  shadowRadius: 14,
                  elevation: 24,
                  zIndex: 99999,
                },
                animatedDragPreviewStyle,
              ]}
            >
              <FeatureIcon
                iconName={draggingFeature.iconName}
                color={draggingFeature.colorIcon || '#FF6A00'}
                size={30}
              />
              <Text
                numberOfLines={1}
                className="text-[9px] font-bold font-sans text-foreground text-center mt-1 px-1"
              >
                {tFeatureName(draggingFeature.id, draggingFeature.name)}
              </Text>
            </Animated.View>
          ) : null}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

export default CustomiseSheetModal;
