import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Modal, TouchableOpacity, ScrollView, Dimensions, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { SheetGrabHandle } from '@/components/ui/SheetGrabHandle';
import { Sparkles, X, Check } from 'lucide-react-native';
import CustomiseDeckZone from './CustomiseDeckZone';
import CustomiseAvailableZone from './CustomiseAvailableZone';
import FeatureIcon from '@/components/ui/FeatureIcon';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { isFeatureAllowedForUser, getDefaultQuickActionsForUser } from '@/src/utils/rbac';
import { useTranslation } from '@/src/utils/i18n';
import {
  ALL_AVAILABLE_FEATURES,
  REAL_APP_FEATURES,
  DEFAULT_5_QUICK_ACTIONS,
  AppFeatureItem,
  getRoleDefaultQuickActions,
} from '@/src/features/dashboard/dashboardCatalog';

export { ALL_AVAILABLE_FEATURES, REAL_APP_FEATURES, AppFeatureItem };

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    return getDefaultQuickActionsForUser(user);
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
  const prevVisibleRef = React.useRef(visible);

  // Drag & Drop State
  const [draggingFeature, setDraggingFeature] = useState<AppFeatureItem | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isOverDeck, setIsOverDeck] = useState(false);
  const deckLayoutRef = useRef<{ pageY: number; height: number }>({ pageY: 0, height: 180 });

  // Sync selectedIds state ONLY when the modal transitions from closed to open
  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      setSelectedIds(sanitizedActiveIds);
    }
    prevVisibleRef.current = visible;
  }, [visible, sanitizedActiveIds]);

  // Header Pull-Down-to-Dismiss Gesture & Spring Physics
  const sheetTranslateY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      sheetTranslateY.value = 0;
    }
  }, [visible, sheetTranslateY]);

  const headerPanGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        sheetTranslateY.value = e.translationY;
      } else {
        sheetTranslateY.value = e.translationY * 0.15; // subtle rubber-band resistance when pulling up
      }
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 600) {
        sheetTranslateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 }, () => {
          runOnJS(onClose)();
        });
      } else {
        sheetTranslateY.value = withSpring(0, {
          damping: 24,
          stiffness: 350,
          mass: 0.6,
        });
      }
    });

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  // Method A & Toggle logic
  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    } else if (selectedIds.length < 5) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      // If already at 5, replace the last item with the newly chosen one so customization is frictionless
      setSelectedIds((prev) => [...prev.slice(0, 4), id]);
    }
    if (onToggleFeature) onToggleFeature(id);
  };

  // Method B: Drag & Drop Callbacks
  const handleItemDragStart = (feature: AppFeatureItem, x: number, y: number) => {
    setDraggingFeature(feature);
    setDragPosition({ x, y });
    const deckBottom = deckLayoutRef.current.pageY + deckLayoutRef.current.height;
    setIsOverDeck(y <= deckBottom + 40);
  };

  const handleItemDragMove = (x: number, y: number) => {
    setDragPosition({ x, y });
    const deckBottom = deckLayoutRef.current.pageY + deckLayoutRef.current.height;
    setIsOverDeck(y <= deckBottom + 40);
  };

  const handleItemDragEnd = (x: number, y: number) => {
    const deckBottom = deckLayoutRef.current.pageY + deckLayoutRef.current.height;
    if (draggingFeature && (isOverDeck || y <= deckBottom + 40)) {
      if (!selectedIds.includes(draggingFeature.id)) {
        if (selectedIds.length < 5) {
          setSelectedIds((prev) => [...prev, draggingFeature.id]);
        } else {
          setSelectedIds((prev) => [...prev.slice(0, 4), draggingFeature.id]);
        }
        if (onToggleFeature) onToggleFeature(draggingFeature.id);
      }
    }
    setDraggingFeature(null);
    setIsOverDeck(false);
  };

  const handleSave = () => {
    if (onSave) onSave(selectedIds.slice(0, 5));
    onClose();
  };

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

        {/* Bottom Sheet Container with Draggable Header & Spring Physics */}
        <Animated.View
          style={[
            animatedSheetStyle,
            { height: Math.round(SCREEN_HEIGHT * 0.85) },
          ]}
          className="bg-card border-t border-border rounded-t-3xl shadow-2xl overflow-hidden flex-col relative"
        >
          {/* Header area wrapped in Pan gesture detector for pull-down dismiss */}
          <GestureDetector gesture={headerPanGesture}>
            <View className="bg-card">
              {/* Top Pill Grab Handle */}
              <SheetGrabHandle onClose={onClose} />

              {/* Header Bar */}
              <View className="flex-row justify-between items-center px-5 py-3 border-b border-border">
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.7}
                  className="py-1 px-2 rounded-lg active:bg-secondary"
                >
                  <Text className="text-sm font-semibold text-muted-foreground">
                    {t('cancel', 'Cancel')}
                  </Text>
                </TouchableOpacity>

                <Text className="text-base font-extrabold text-foreground">
                  {t('customise_dashboard', 'Customise Dashboard')}
                </Text>

                <TouchableOpacity
                  onPress={handleSave}
                  activeOpacity={0.8}
                  className="bg-primary px-4 py-1.5 rounded-full"
                >
                  <Text className="text-xs font-bold text-primary-foreground">
                    {t('save', 'Save')}
                  </Text>
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
            nestedScrollEnabled={true}
          >
            {/* Active Selection Zone (The Deck - 5 Slots) */}
            <CustomiseDeckZone
              activeItems={activeItems}
              maxCapacity={5}
              isDropTargetActive={isOverDeck || Boolean(draggingFeature)}
              onRemoveItem={toggleSelect}
              onLayout={(e) => {
                e.target.measure?.((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
                  deckLayoutRef.current = { pageY: pageY || 100, height: height || 180 };
                });
              }}
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
              isMaxCapacityReached={selectedIds.length >= 5}
              onToggleSelect={toggleSelect}
              onItemDragStart={handleItemDragStart}
              onItemDragMove={handleItemDragMove}
              onItemDragEnd={handleItemDragEnd}
            />
          </ScrollView>

          {/* Floating Drag Feedback Card Preview Overlay */}
          {draggingFeature && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: Math.max(20, dragPosition.y - 120),
                left: Math.max(20, dragPosition.x - 45),
                zIndex: 9999,
                elevation: 20,
              }}
              className="p-3 bg-card rounded-2xl border-2 border-primary shadow-2xl items-center justify-center gap-1.5 opacity-95 scale-105"
            >
              <View className={`w-[48px] h-[48px] items-center justify-center rounded-[16px] border border-border/40 ${draggingFeature.colorBg || 'bg-secondary'}`}>
                <FeatureIcon
                  iconName={draggingFeature.iconName}
                  color={draggingFeature.colorIcon || '#245FA8'}
                  size={22}
                />
              </View>
              <Text className="text-[10px] font-bold font-sans text-primary text-center">
                {t('drag_to_add', 'Dragging')}
              </Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

export default CustomiseSheetModal;

