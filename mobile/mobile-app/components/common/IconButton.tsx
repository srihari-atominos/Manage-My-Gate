import React from 'react';
import { LucideIcon } from 'lucide-react-native';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '../../lib/utils';

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'size'> {
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  iconClassName?: string;
}

export const IconButton = ({
  icon: Icon,
  size = 'md',
  variant = 'outline',
  disabled = false,
  className,
  iconClassName,
  ...props
}: IconButtonProps) => {
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 22 : 18;
  const buttonSizeClass = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';

  return (
    <Button
      variant={(variant as any) === 'primary' ? 'default' : (variant as any) === 'default' ? 'outline' : variant}
      size="icon"
      disabled={disabled}
      className={cn('rounded-full', buttonSizeClass, className)}
      {...props}
    >
      {Icon && (typeof Icon === 'function' || (typeof Icon === 'object' && Icon !== null)) ? (
        <Icon size={iconSize} className={iconClassName} />
      ) : null}
    </Button>
  );
};

export default IconButton;
