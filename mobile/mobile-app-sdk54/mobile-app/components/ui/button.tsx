import React from 'react';
import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, Pressable } from 'react-native';

const buttonVariants = cva(
  cn(
    'group shrink-0 flex-row items-center justify-center gap-2 rounded-2xl shadow-none',
    Platform.select({
      web: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    })
  ),
  {
    variants: {
      variant: {
        default: cn(
          'bg-primary active:opacity-90 shadow-xs',
          Platform.select({ web: 'hover:opacity-90' })
        ),
        destructive: cn(
          'bg-destructive active:opacity-90 shadow-xs',
          Platform.select({
            web: 'hover:opacity-90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
          })
        ),
        outline: cn(
          'border border-border/80 bg-card active:bg-secondary/60 shadow-xs',
          Platform.select({
            web: 'hover:bg-secondary/60',
          })
        ),
        secondary: cn(
          'bg-secondary border border-border/70 active:bg-secondary/80 shadow-xs',
          Platform.select({ web: 'hover:bg-secondary/80' })
        ),
        ghost: cn(
          'active:bg-secondary/50',
          Platform.select({ web: 'hover:bg-secondary/50' })
        ),
        link: '',
      },
      size: {
        default: cn('h-12 px-5 py-2.5 sm:h-11', Platform.select({ web: 'has-[>svg]:px-4' })),
        sm: cn('h-9 gap-1.5 rounded-xl px-3.5 sm:h-8', Platform.select({ web: 'has-[>svg]:px-3' })),
        lg: cn('h-14 rounded-2xl px-7 sm:h-12', Platform.select({ web: 'has-[>svg]:px-5' })),
        icon: 'h-11 w-11 sm:h-10 sm:w-10 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const buttonTextVariants = cva(
  cn(
    'text-foreground text-[15px] font-semibold tracking-tight font-sans',
    Platform.select({ web: 'pointer-events-none transition-colors' })
  ),
  {
    variants: {
      variant: {
        default: 'text-primary-foreground',
        destructive: 'text-destructive-foreground',
        outline: 'text-foreground group-active:text-foreground',
        secondary: 'text-secondary-foreground',
        ghost: 'text-foreground group-active:text-foreground',
        link: cn(
          'text-primary group-active:underline',
          Platform.select({ web: 'underline-offset-4 hover:underline group-hover:underline' })
        ),
      },
      size: {
        default: '',
        sm: 'text-[13px]',
        lg: 'text-[16px]',
        icon: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

type ButtonProps = React.ComponentProps<typeof Pressable> & React.RefAttributes<typeof Pressable> & VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, children, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        className={cn(props.disabled && 'opacity-50', buttonVariants({ variant, size }), className)}
        role="button"
        {...props}
      >
        {typeof children === 'function'
          ? children
          : React.Children.map(children, (child) => {
              if (typeof child === 'string') {
                if (!child.trim()) return null;
                return <Text>{child}</Text>;
              }
              if (typeof child === 'number') {
                return <Text>{child}</Text>;
              }
              return child;
            })}
      </Pressable>
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
