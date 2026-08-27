import React from 'react';
import { View, ViewProps } from 'react-native';
import { cn } from '../../lib/utils';

export interface GridRowProps extends ViewProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const GridRow = ({
  children,
  columns = 2,
  gap = 'md',
  className,
  ...props
}: GridRowProps) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <View
      className={cn(
        'flex-row flex-wrap',
        gapClasses[gap],
        className
      )}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return null;
        
        // Dynamically style children based on columns, adjusting for gap
        const widthClass = {
          1: 'w-full',
          2: gap === 'sm' ? 'w-[48%]' : gap === 'md' ? 'w-[47%]' : 'w-[45%]',
          3: gap === 'sm' ? 'w-[32%]' : gap === 'md' ? 'w-[30%]' : 'w-[28%]',
          4: gap === 'sm' ? 'w-[23%]' : gap === 'md' ? 'w-[22%]' : 'w-[20%]',
        }[columns];

        return (
          <View className={widthClass}>
            {child}
          </View>
        );
      })}
    </View>
  );
};
