import React from 'react';
import { View, Image, Pressable, TouchableOpacity } from 'react-native';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Amenity, MaintenanceTask } from '../store/amenitySlice';
import { getArchetypeMeta } from '../utils/amenityPresentation';
import {
  Building2,
  Calendar,
  Clock,
  Edit2,
  MapPin,
  Plus,
  Repeat,
  Trash2,
  Wrench,
  DoorOpen,
  Sparkles,
  Timer,
  Users,
  CheckCircle2,
} from 'lucide-react-native';

export interface AmenityMaintenanceCardProps {
  amenity: Amenity;
  activeTask?: MaintenanceTask | null;
  onSchedule: (amenityId: string) => void;
  onEditTask: (task: MaintenanceTask) => void;
  onDeleteTask: (task: MaintenanceTask) => void;
}

export const AmenityMaintenanceCard: React.FC<AmenityMaintenanceCardProps> = ({
  amenity,
  activeTask,
  onSchedule,
  onEditTask,
  onDeleteTask,
}) => {
  const archetypeMeta = getArchetypeMeta(amenity.category || amenity.type);
  const imageUrl =
    amenity.imageUrl ||
    (Array.isArray(amenity.images) && amenity.images.length > 0 ? amenity.images[0] : '');

  const taskStatus = String(activeTask?.status || '').toUpperCase();
  const hasMaintenance = Boolean(
    activeTask &&
      taskStatus !== 'CANCELLED' &&
      taskStatus !== 'COMPLETED'
  );

  const isProgress = taskStatus === 'IN_PROGRESS';

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
    if (hasMaintenance && activeTask) {
      onEditTask(activeTask);
    } else {
      onSchedule(amenity._id);
    }
  };

  return (
    <View className="bg-card rounded-3xl border border-border/80 overflow-hidden mb-4 shadow-sm">
      {/* ── Clickable Card Area: Hero Cover Image & Amenity Info ─────── */}
      <Pressable
        onPress={handleCardPress}
        accessibilityRole="button"
        accessibilityLabel={`${amenity.name} maintenance card`}
        className="active:opacity-95"
      >
        {/* User-Uploaded Cover Image Header */}
        <View className="h-44 w-full relative bg-muted overflow-hidden">
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

            {/* Maintenance Status Badge */}
            {hasMaintenance ? (
              <StatusBadge
                label={isProgress ? 'IN PROGRESS' : 'MAINTENANCE'}
                variant={isProgress ? 'danger' : 'warning'}
                dot
              />
            ) : (
              <StatusBadge label="OPERATIONAL" variant="success" dot />
            )}
          </View>

          {/* Bottom Recurring Series Pill on Image */}
          {hasMaintenance && (activeTask?.isRecurring || activeTask?.recurringSeriesId) ? (
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

        {/* Amenity Title & Location */}
        <View className="p-4 pb-2">
          <Text className="text-lg font-extrabold text-foreground tracking-tight">
            {amenity.name}
          </Text>
          <View className="flex-row items-center gap-1 mt-0.5">
            <MapPin size={13} className="text-muted-foreground" />
            <Text className="text-xs font-medium text-muted-foreground">
              {amenity.location || 'Community Facilities'}
            </Text>
          </View>

          {/* Upkeep Task Details Block (if maintenance is scheduled) */}
          {hasMaintenance && activeTask ? (
            <View className="bg-secondary/60 rounded-2xl p-3.5 border border-border/80 gap-2 mt-3">
              {/* Task Title & Type */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-1.5 flex-1 me-2">
                  <Wrench size={13} className="text-primary shrink-0" />
                  <Text
                    numberOfLines={1}
                    className="text-xs font-bold text-foreground flex-1"
                  >
                    {activeTask.title}
                  </Text>
                </View>
                <View className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                  <Text className="text-[10px] font-extrabold text-primary uppercase">
                    {activeTask.maintenanceType || 'CLEANING'}
                  </Text>
                </View>
              </View>

              {/* Date & Time Window */}
              <View className="flex-row items-center gap-1 flex-wrap">
                <Calendar size={12} className="text-muted-foreground shrink-0" />
                <Text className="text-xs font-semibold text-muted-foreground">
                  {activeTask.startDate}
                  {activeTask.endDate && activeTask.endDate !== activeTask.startDate
                    ? ` to ${activeTask.endDate}`
                    : ''}
                </Text>
                <Text className="text-xs text-muted-foreground mx-1">•</Text>
                <Clock size={12} className="text-muted-foreground shrink-0" />
                <Text className="text-xs font-semibold text-muted-foreground">
                  {activeTask.startTime || '08:00'} - {activeTask.endTime || '18:00'}
                </Text>
              </View>

              {/* Staff / Description Subtext */}
              {activeTask.assignedStaff ? (
                <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                  Assigned Staff:{' '}
                  <Text className="font-semibold text-foreground">
                    {activeTask.assignedStaff}
                  </Text>
                </Text>
              ) : null}

              {activeTask.description ? (
                <Text className="text-[11px] text-muted-foreground italic" numberOfLines={2}>
                  {activeTask.description}
                </Text>
              ) : null}
            </View>
          ) : (
            /* Operational Notice when no maintenance is scheduled */
            <View className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 flex-row items-center gap-2 mt-3">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <Text className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex-1">
                Facility is currently operational and open for resident bookings.
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      {/* ── Action Buttons Row ─────────────────────────────────────── */}
      <View className="px-4 pb-4 pt-2">
        {hasMaintenance && activeTask ? (
          <View className="flex-row items-center gap-2">
            <Button
              variant="edit"
              size="sm"
              onPress={() => onEditTask(activeTask)}
              className="flex-1 flex-row items-center justify-center gap-1.5 h-10 rounded-xl"
              accessibilityLabel={`Edit maintenance for ${amenity.name}`}
            >
              <Edit2 size={13} color="#059669" />
              <Text className="font-bold">Edit Task</Text>
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onPress={() => onDeleteTask(activeTask)}
              className="flex-1 flex-row items-center justify-center gap-1.5 h-10 rounded-xl"
              accessibilityLabel={`Delete maintenance for ${amenity.name}`}
            >
              <Trash2 size={13} color="#FFFFFF" />
              <Text className="font-bold text-white">Delete Scheduling</Text>
            </Button>
          </View>
        ) : (
          <Button
            variant="default"
            size="sm"
            onPress={() => onSchedule(amenity._id)}
            className="w-full flex-row items-center justify-center gap-1.5 h-10 rounded-xl bg-primary"
            accessibilityLabel={`Schedule upkeep for ${amenity.name}`}
          >
            <Plus size={15} color="#FFFFFF" />
            <Text className="font-bold text-white">Schedule Maintenance</Text>
          </Button>
        )}
      </View>
    </View>
  );
};

export default AmenityMaintenanceCard;
