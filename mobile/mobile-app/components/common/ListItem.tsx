import React from 'react';
import { type PressableProps } from 'react-native';
import { type LucideIcon } from 'lucide-react-native';
import { StandardRecordCard } from './StandardRecordCard';

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
  return (
    <StandardRecordCard
      title={title}
      subtitle={subtitle}
      leftIcon={leftIcon}
      showChevron={showChevron}
      rightContent={RightIcon ? <RightIcon size={20} className="text-muted-foreground" /> : undefined}
      onPress={onPress}
      variant="row"
      className={className}
      {...props}
    />
  );
};

export default ListItem;
