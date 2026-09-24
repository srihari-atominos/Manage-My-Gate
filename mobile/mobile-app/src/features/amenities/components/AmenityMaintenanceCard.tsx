import React from 'react';
import { View, Image, Pressable } from 'react-native';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Text } from '@/components/ui/text';
import { Amenity, MaintenanceTask } from '../store/amenitySlice';
import { getArchetypeMeta } from '../utils/amenityPresentation';
import {
  Building2,
  ChevronRight,
  DoorOpen,
  MapPin,
  Repeat,
  Sparkles,
  Timer,
  Users,
  Wrench,
} from 'lucide-react-native';

export interface AmenityMaintenanceCardProps {
  amenity: Amenity;
  activeTask?: MaintenanceTask | null;
  activeTasks?: MaintenanceTask[];
  onPress?: (amenity: Amenity) => void;
  // Optional callbacks for backward compatibility
  onSchedule?: (amenityId: string) => void;
  onEditTask?: (task: MaintenanceTask) => void;
  onDeleteTask?: (task: MaintenanceTask) => void;
  onDeleteAllTasks?: (amenityId: string, amenityName: string) => void;
}

export const AmenityMaintenanceCard: React.FC<AmenityMaintenanceCardProps> = ({
  amenity,
  activeTask,
  activeTasks,
  onPress,
  onSchedule,
  onEditTask,
}) => {
  const archetypeMeta = getArchetypeMeta(amenity.category || amenity.type);
  const imageUrl =
    amenity.imageUrl ||
    (Array.isArray(amenity.images) && amenity.images.length > 0 ? amenity.images[0] : '');

  const taskList = React.useMemo(() => {
    if (Array.isArray(activeTasks) && activeTasks.length > 0) {
      return activeTasks.filter((t) => {
        const s = String(t.status || '').toUpperCase();
        return s !== 'CANCELLED' && s !== 'COMPLETED';
      });
    }
    if (activeTask) {
      const s = String(activeTask.status || '').toUpperCase();
      if (s !== 'CANCELLED' && s !== 'COMPLETED') {
        return [activeTask];
      }
    }
    return [];
  }, [activeTasks, activeTask]);

  const hasMaintenance = taskList.length > 0;
  const isMultiple = taskList.length > 1;
  const isProgress = taskList.some(
    (t) => String(t.status || '').toUpperCase() === 'IN_PROGRESS'
  );
  const hasRecurring = taskList.some((t) => t.isRecurring || t.recurringSeriesId);

  const renderArchetypeIcon = () => {
    switch (archetypeMeta.archetype) {
      case 'EXCLUSIVE_HOURLY':
        return <Timer size={11} color="#818cf8" />;
      case 'EVENT_SPACE':
        return <Sparkles size={11} color="#fbbf24" />;
      case 'ROOM_RESOURCE':
        return <DoorOpen size={11} color="#c084fc" />;
      case 'INVENTORY_TOOLS':
        return <Wrench size={11} color="#34d399" />;
      default:
        return <Users size={11} color="#60a5fa" />;
    }
  };

  const handleCardPress = () => {
    if (onPress) {
      onPress(amenity);
    } else if (hasMaintenance && taskList.length > 0 && onEditTask) {
      onEditTask(taskList[0]);
    } else if (onSchedule) {
      onSchedule(amenity._id);
    }
  };

  return (
    <Pressable
      onPress={handleCardPress}
      accessibilityRole="button"
      accessibilityLabel={`${amenity.name} facility card. Tap to view maintenance details.`}
      className="bg-card rounded-3xl border border-border/80 overflow-hidden mb-4 shadow-sm active:opacity-95"
    >
      {/* ── Facility Hero Cover Image & Badges ──────────────────────── */}
      <View className="h-40 w-full relative bg-muted overflow-hidden">
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center bg-primary/10">
            <Building2 size={44} className="text-primary/50" />
          </View>
        )}

        {/* Scrim Overlay */}
        <View className="absolute inset-0 bg-black/20" />

        {/* Top Badges Row */}
        <View className="absolute top-3 inset-x-3 flex-row justify-between items-center z-10">
          {/* Category / Archetype Pill */}
          <View className="bg-black/75 px-3 py-1 rounded-full flex-row items-center gap-1.5 border border-white/20 shadow-xs">
            {renderArchetypeIcon()}
            <Text className="text-xs font-bold text-white uppercase tracking-wider">
              {archetypeMeta.label || amenity.category || amenity.type || 'Facility'}
            </Text>
          </View>

          {/* Current Facility Status Badge */}
          {hasMaintenance ? (
            <StatusBadge
              label={
                isProgress
                  ? 'IN PROGRESS'
                  : isMultiple
                  ? `${taskList.length} WINDOWS`
                  : 'MAINTENANCE'
              }
              variant={isProgress ? 'danger' : 'warning'}
              dot
            />
          ) : (
            <StatusBadge label="OPERATIONAL" variant="success" dot />
          )}
        </View>

        {/* Bottom Recurring Series Pill on Image */}
        {hasMaintenance && hasRecurring ? (
          <View className="absolute bottom-3 left-3 z-10">
            <View className="bg-black/75 px-2.5 py-1 rounded-lg border border-white/20 shadow-xs flex-row items-center gap-1">
              <Repeat size={11} color="#FFFFFF" />
              <Text className="text-[10px] font-bold text-white tracking-wide">
                Recurring Series
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* ── Facility Details & Status Summary ────────────────────────── */}
      <View className="p-4">
        {/* Facility Name & Location */}
        <View className="flex-row items-start justify-between">
          <View className="flex-1 me-2">
            <Text
              numberOfLines={1}
              className="text-base font-extrabold text-foreground tracking-tight"
            >
              {amenity.name}
            </Text>
            <View className="flex-row items-center gap-1 mt-1">
              <MapPin size={13} className="text-muted-foreground shrink-0" />
              <Text
                numberOfLines={1}
                className="text-xs font-medium text-muted-foreground flex-1"
              >
                {amenity.location || 'Community Facilities'}
              </Text>
            </View>
          </View>
        </View>

        {/* Maintenance Indicator / State Summary */}
        <View className="mt-3 pt-2.5 border-t border-border/50 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5 flex-1 me-2">
            <View
              className={`w-2 h-2 rounded-full ${
                hasMaintenance
                  ? isProgress
                    ? 'bg-red-500'
                    : 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
            />
            <Text
              numberOfLines={1}
              className={`text-xs font-semibold ${
                hasMaintenance
                  ? isProgress
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {hasMaintenance
                ? isMultiple
                  ? `${taskList.length} Maintenance Windows Scheduled`
                  : 'Maintenance Scheduled'
                : 'Operational & Open'}
            </Text>
          </View>

          {/* Tap Affordance Callout */}
          <View className="flex-row items-center gap-0.5">
            <Text className="text-xs font-semibold text-primary">
              Tap to view details
            </Text>
            <ChevronRight size={14} className="text-primary" />
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export default AmenityMaintenanceCard;
