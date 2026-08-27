import React from 'react';
import { type PressableProps } from 'react-native';
import { type LucideIcon } from 'lucide-react-native';
import { ListCard } from '@/components/ui/ListCard';

export interface ListItemProps extends PressableProps {
  title: string;
  subtitle?: string;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  showChevron?: boolean;
  onPress?: () => void;
  className?: string;
}

export const ListItem = ({
  title,
  subtitle,
  leftIcon,
  rightIcon: RightIcon,
  showChevron = false,
  onPress,
  className,
  ...props
}: ListItemProps) => {
    const { onLongPress, ...restProps } = props;
    return (
      <ListCard
        title={title}
        subtitle={subtitle}
        leftIcon={leftIcon}
        showChevron={showChevron}
        rightContent={RightIcon ? <RightIcon size={20} className="text-muted-foreground" /> : undefined}
        onPress={onPress}
        onLongPress={onLongPress ? () => onLongPress(null as any) : undefined}
        variant="row"
        className={className}
        {...restProps}
      />
    );
};

export default ListItem;
