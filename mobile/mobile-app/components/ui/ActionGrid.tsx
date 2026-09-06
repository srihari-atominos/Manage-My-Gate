import React from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as LucideIcons from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export interface ActionGridItem {
  id: string;
  name: string;
  route?: string;
  onPress?: () => void;
  iconName?: string;
  icon?: React.ReactNode;
  colorBg?: string;    // e.g., 'bg-primary/10' or 'bg-teal-500/10'
  colorIcon?: string;  // e.g., '#14b8a6' or theme token
  badge?: string | number;
  badgeColor?: string; // e.g., 'bg-primary' or 'bg-teal-500'
  disabled?: boolean;
}

export interface ActionGridProps {
  title?: string;
  items: ActionGridItem[];
  searchQuery?: string;
  className?: string;
  headerRight?: React.ReactNode;
}

export function ActionGrid({
  title,
  items = [],
  searchQuery = '',
  className,
  headerRight,
}: ActionGridProps) {
  const router = useRouter();

  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return items;
    return items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [items, searchQuery]);

  return (
    <View className={cn('mb-6', className)}>
      {/* Optional Title Header */}
      {title ? (
        <View className="flex-row items-center justify-between mt-1 mb-3 px-1">
          <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {title}
          </Text>
          {headerRight}
        </View>
      ) : null}

      {/* Universal 3-Column Wrap Grid */}
      {filteredItems.length > 0 ? (
        <View className="flex-row flex-wrap justify-start gap-x-[3.5%] gap-y-3">
          {filteredItems.map((item) => {
            const IconComp = item.iconName
              ? (LucideIcons as Record<string, any>)[item.iconName] || LucideIcons.Circle
              : LucideIcons.Circle;

            const handlePress = () => {
              if (item.disabled) return;
              if (item.onPress) {
                item.onPress();
              } else if (item.route) {
                router.push(item.route as any);
              }
            };

            return (
              <Pressable
                key={item.id}
                onPress={handlePress}
                disabled={item.disabled}
                accessibilityRole="button"
                accessibilityLabel={item.name}
                className={cn(
                  'w-[31%] bg-card p-3 rounded-2xl border border-border items-center justify-center active:opacity-75 shadow-xs relative min-h-[96px]',
                  item.disabled && 'opacity-50'
                )}
              >
                {/* Icon Container */}
                <View
                  className={cn(
                    'w-12 h-12 rounded-[16px] items-center justify-center mb-2',
                    item.colorBg || 'bg-primary/10'
                  )}
                >
                  {item.icon ? (
                    item.icon
                  ) : (
                    <IconComp size={22} color={item.colorIcon || 'hsl(var(--primary))'} strokeWidth={2.2} />
                  )}
                </View>

                {/* Label Title */}
                <Text
                  className="text-[11px] font-semibold text-foreground text-center leading-[1.18] px-0.5"
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {item.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View className="bg-card p-4 rounded-xl border border-border items-center">
          <Text className="text-xs font-semibold text-muted-foreground">
            No matching features found for "{searchQuery}"
          </Text>
        </View>
      )}
    </View>
  );
}

export default ActionGrid;