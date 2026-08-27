import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import * as LucideIcons from 'lucide-react-native';
import { ChevronDown } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export interface DetailSectionProps {
  title: string;
  iconName?: string;       // Lucide icon name
  children: React.ReactNode;
  collapsible?: boolean;   // can toggle open/close
  defaultExpanded?: boolean; // initial state (default true)
  className?: string;
}

const detailSectionVariants = cva(
  'bg-card rounded-2xl border border-border/80 p-4 mb-3 shadow-xs',
  {
    variants: {
      collapsible: {
        true: '',
        false: '',
      },
    },
    defaultVariants: {
      collapsible: false,
    },
  }
);

const DetailSection = React.forwardRef<View, DetailSectionProps>(
  (
    {
      title,
      iconName,
      children,
      collapsible = false,
      defaultExpanded = true,
      className,
    },
    ref
  ) => {
    const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
    const rotation = useSharedValue(defaultExpanded ? 0 : -180);

    const toggleExpand = React.useCallback(() => {
      if (!collapsible) return;
      setIsExpanded((prev) => {
        const next = !prev;
        rotation.value = withTiming(next ? 0 : -180, { duration: 200 });
        return next;
      });
    }, [collapsible, rotation]);

    const chevronAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${rotation.value}deg` }],
    }));

    const IconComponent = iconName
      ? (LucideIcons as Record<string, any>)[iconName]
      : undefined;

    return (
      <View
        ref={ref}
        className={cn(detailSectionVariants({ collapsible }), className)}
      >
        <Pressable
          onPress={toggleExpand}
          disabled={!collapsible}
          className={cn(
            'flex-row items-center gap-2',
            collapsible && 'active:opacity-70 cursor-pointer'
          )}
          accessibilityRole={collapsible ? 'button' : undefined}
          accessibilityState={collapsible ? { expanded: isExpanded } : undefined}
        >
          {IconComponent ? (
            <Icon as={IconComponent} size={20} className="text-muted-foreground" />
          ) : null}

          <Text variant="default" className="font-semibold text-base flex-1">
            {title}
          </Text>

          {collapsible ? (
            <Animated.View style={chevronAnimatedStyle} className="ml-auto">
              <Icon as={ChevronDown} size={20} className="text-muted-foreground" />
            </Animated.View>
          ) : null}
        </Pressable>

        {(!collapsible || isExpanded) && (
          <Animated.View
            entering={collapsible ? FadeIn.duration(200) : undefined}
            exiting={collapsible ? FadeOut.duration(150) : undefined}
            className="mt-3"
          >
            {children}
          </Animated.View>
        )}
      </View>
    );
  }
);

DetailSection.displayName = 'DetailSection';

export { DetailSection, detailSectionVariants };
