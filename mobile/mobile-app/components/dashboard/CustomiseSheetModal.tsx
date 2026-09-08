import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Modal, TouchableOpacity, ScrollView, Dimensions, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Sparkles } from 'lucide-react-native';
import CustomiseDeckZone from './CustomiseDeckZone';
import CustomiseAvailableZone, { AvailableFeatureCardItem } from './CustomiseAvailableZone';
import FeatureIcon from '../ui/FeatureIcon';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { isFeatureAllowedForUser, getDefaultQuickActionsForUser } from '../../src/utils/rbac';
import { useTranslation } from '../../src/utils/i18n';
import {
  ALL_AVAILABLE_FEATURES,
  REAL_APP_FEATURES,
  DEFAULT_5_QUICK_ACTIONS,
  AppFeatureItem,
  getRoleDefaultQuickActions,
} from '../../src/features/dashboard/dashboardCatalog';

export { ALL_AVAILABLE_FEATURES, REAL_APP_FEATURES, AppFeatureItem };

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
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
  const { t } = useTranslation();

  const availableFeaturesForUser = useMemo(() => {
    return (availableFeatures || ALL_AVAILABLE_FEATURES).filter((item: any) =>
      isFeatureAllowedForUser(item, user)
    );
  }, [availableFeatures, user]);

  const defaultRoleQuickActions = useMemo(() => {
    return getDefaultQuickActionsForUser(user).slice(0, 5);
  }, [user]);

  // Sanitize incoming IDs to ensure only valid current catalog items allowed for this user are retained (max 5)
  const sanitizedActiveIds = useMemo(() => {
    if (!activeFeatureIds || activeFeatureIds.length === 0) {
      return defaultRoleQuickActions;
    }
    const valid = activeFeatureIds.filter((id) => {
      const item = ALL_AVAILABLE_FEATURES.find((f) => f.id === id);
      return item && isFeatureAllowedForUser(item, user);
    }).slice(0, 5);
    return valid.length > 0 ? valid : defaultRoleQuickActions;
  }, [activeFeatureIds, defaultRoleQuickActions, user]);

  const [selectedIds, setSelectedIds] = useState<string[]>(sanitizedActiveIds);

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
    } else if (selectedIds.length < 5) {
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
    if (onSave) onSave(selectedIds.slice(0, 5));
    onClose();
  };

  // Drag handlers from available cards
  const handleDragStart = (feature: AvailableFeatureCardItem, absX: number, absY: number) => {
    dragX.value = absX - 40;
    dragY.value = absY - 40;
    setDraggingFeature(feature);
  };

  const handleDragMove = (absX: number, absY: number) => {
    dragX.value = absX - 40;
    dragY.value = absY - 40;

    // Deck zone is located roughly at the top 30% of the modal sheet
    const deckZoneThreshold = SCREEN_HEIGHT * 0.45;
    setIsOverDeck(absY < deckZoneThreshold);
  };

  const handleDragEnd = (feature: AvailableFeatureCardItem, absX: number, absY: number) => {
    const deckZoneThreshold = SCREEN_HEIGHT * 0.45;
    if (absY < deckZoneThreshold && !selectedIds.includes(feature.id) && selectedIds.length < 5) {
      setSelectedIds((prev) => [...prev, feature.id]);
    }
    setDraggingFeature(null);
    setIsOverDeck(false);
  };

  // Pan gesture on modal header for pull-down to dismiss
  const headerPanGesture = Gesture.Pan()
    .onChange((e) => {
      if (e.translationY > 0) {
        sheetTranslateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 600) {
        sheetTranslateY.value = withTiming(SHEET_HEIGHT, { duration: 220 }, () => {
          runOnJS(onClose)();
        });
      } else {
        sheetTranslateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    });

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const animatedDragPreviewStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value },
      { translateY: dragY.value },
      { scale: 1.08 },
    ],
    opacity: 0.92,
  }));

  // Active selected items (up to 5, strictly permitted)
  const activeItems = useMemo(() => {
    return selectedIds
      .map((id) => ALL_AVAILABLE_FEATURES.find((f) => f.id === id))
      .filter((item): item is typeof ALL_AVAILABLE_FEATURES[0] =>
        Boolean(item && isFeatureAllowedForUser(item, user))
      )
      .slice(0, 5);
  }, [selectedIds, user]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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

          {/* Scrollable Content Body */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!draggingFeature}
          >
            {/* Active Selection Zone (The Deck - 5 Slots) */}
            <CustomiseDeckZone
              activeItems={activeItems}
              maxCapacity={5}
              onRemoveItem={toggleSelect}
              onReorderItem={handleReorder}
              isDropTargetActive={isOverDeck || (Boolean(draggingFeature) && selectedIds.length < 5)}
            />

            {/* Divider Sub-header */}
            <View className="px-5 py-3 bg-muted/30 border-b border-border flex-row items-center justify-between">
              <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {t('available_actions', 'Available Actions')} ({selectedIds.length}/5 Selected)
              </Text>
              <Sparkles size={14} color="#0284c7" />
            </View>

            {/* Available Features (The Collection - Grouped by Web Domain) */}
            <CustomiseAvailableZone
              features={availableFeaturesForUser}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
            />
          </ScrollView>

          {/* Floating Card Drag Preview */}
          {draggingFeature ? (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { pointerEvents: 'none', zIndex: 9999 },
              ]}
            >
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    width: 80,
                    height: 80,
                    borderRadius: 20,
                    backgroundColor: '#1E293B',
                    borderWidth: 2,
                    borderColor: '#FF6A00',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.35,
                    shadowRadius: 10,
                    elevation: 12,
                  },
                  animatedDragPreviewStyle,
                ]}
              >
                <FeatureIcon
                  iconName={draggingFeature.iconName}
                  color={draggingFeature.colorIcon || '#FF6A00'}
                  size={28}
                />
              </Animated.View>
            </Animated.View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
};

export default CustomiseSheetModal;
