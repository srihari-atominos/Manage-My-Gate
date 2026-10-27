import React from 'react';
import { View, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as LucideIcons from 'lucide-react-native';
import { Text } from './text';
import { cn } from '../../lib/utils';
import i18n from '../../src/utils/i18n';

export interface ActionGridItem {
  id: string;
  name: string;
  route?: string;
  onPress?: () => void;
  iconName?: string;
  icon?: React.ReactNode;
  colorBg?: string; // e.g., 'bg-primary/10' or 'bg-teal-500/10'
  colorIcon?: string; // e.g., '#14b8a6' or theme token
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
    const query = searchQuery.toLowerCase().trim();
    return items.filter((item) => {
      const translated = i18n.t(item.id, item.name) || i18n.translateText(item.name);
      return (
        item.name.toLowerCase().includes(query) ||
        translated.toLowerCase().includes(query)
      );
    });
  }, [items, searchQuery]);

  return (
    <View className={cn('mb-6', className)}>
      {/* Optional Title Header */}
      {title ? (
        <View className="flex-row items-center justify-between mt-1 mb-3 px-1">
          <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {i18n.translateText(title)}
          </Text>
          {headerRight}
        </View>
      ) : null}

      {/* Universal 3-Column Wrap Grid with Adaptive Layout */}
      {filteredItems.length > 0 ? (
        <View className="flex-row flex-wrap justify-start gap-x-[2.9%] gap-y-3">
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

            const displayName = i18n.t(item.id, item.name) || i18n.translateText(item.name);

            // Responsive single-line font size computation so long names stay on the exact same line
            const isLong = displayName.length > 13;
            const isMedium = displayName.length > 10;
            const singleLineFontSize = isLong ? 9.5 : isMedium ? 10.5 : 11.5;

            return (
              <Pressable
                key={item.id}
                onPress={handlePress}
                onPressIn={() => {
                  if (item.route && !item.disabled) router.prefetch(item.route as any);
                }}
                disabled={item.disabled}
                accessibilityRole="button"
                accessibilityLabel={displayName}
                className={cn(
                  'w-[31.4%] bg-card px-1 py-3 rounded-2xl border border-border/80 items-center justify-center active:opacity-75 shadow-xs relative min-h-[88px] phone-md:min-h-[92px]',
                  item.disabled && 'opacity-50'
                )}
              >
                {/* Optional Badge Indicator */}
                {item.badge ? (
                  <View
                    className={cn(
                      'absolute -top-1.5 -end-1.5 px-1.5 py-0.5 rounded-full z-10',
                      item.badgeColor || 'bg-primary'
                    )}
                  >
                    <Text className="text-[10px] font-bold text-white leading-none">
                      {item.badge}
                    </Text>
                  </View>
                ) : null}

                {/* Icon Container */}
                <View
                  className={cn(
                    'w-9.5 h-9.5 rounded-xl items-center justify-center mb-1.5',
                    item.colorBg || 'bg-primary/10'
                  )}
                >
                  {item.icon ? (
                    item.icon
                  ) : (
                    <IconComp
                      size={20}
                      color={item.colorIcon || 'hsl(var(--primary))'}
                      strokeWidth={2.2}
                    />
                  )}
                </View>

                {/* Label Title Strictly on the SAME SINGLE LINE */}
                <View className="w-full items-center justify-center px-0.5">
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.5}
                    style={[
                      {
                        fontSize: singleLineFontSize,
                        lineHeight: singleLineFontSize + 3,
                        textAlign: 'center',
                        ...(Platform.OS === 'web'
                          ? {
                              whiteSpace: 'nowrap' as any,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              wordBreak: 'keep-all',
                            }
                          : {}),
                      },
                      i18n.getCurrentLanguage() === 'ar'
                        ? { fontSize: Math.max(singleLineFontSize, 10.5) }
                        : undefined,
                    ]}
                    className="w-full text-center font-bold text-foreground tracking-tight"
                  >
                    {displayName}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View className="bg-card p-4 rounded-xl border border-border items-center">
          <Text className="text-xs font-semibold text-muted-foreground">
            {i18n.t('no_matching_features', `No matching features found for "${searchQuery}"`)}
          </Text>
        </View>
      )}
    </View>
  );
}

export default ActionGrid;
