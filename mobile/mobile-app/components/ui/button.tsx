import React from 'react';
import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { ActivityIndicator, Platform, Pressable } from 'react-native';

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
          Platform.OS === 'web' ? 'hover:opacity-90' : ''
        ),
        primary: cn(
          'bg-primary active:opacity-90 shadow-xs',
          Platform.OS === 'web' ? 'hover:opacity-90' : ''
        ),
        destructive: cn(
          'bg-rose-600 active:bg-rose-700 shadow-xs',
          Platform.OS === 'web'
            ? 'hover:opacity-90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40'
            : ''
        ),
        'destructive-outline': cn(
          'border border-rose-500/40 bg-rose-50 dark:bg-rose-950/40 active:bg-rose-100 dark:active:bg-rose-900/60 shadow-xs',
          Platform.OS === 'web' ? 'hover:bg-rose-100' : ''
        ),
        stop: cn(
          'bg-rose-600 active:bg-rose-700 shadow-xs',
          Platform.OS === 'web' ? 'hover:bg-rose-700' : ''
        ),
        'stop-outline': cn(
          'border border-rose-500/40 bg-rose-50 dark:bg-rose-950/40 active:bg-rose-100 dark:active:bg-rose-900/60 shadow-xs',
          Platform.OS === 'web' ? 'hover:bg-rose-100' : ''
        ),
        success: cn(
          'bg-emerald-600 active:bg-emerald-700 shadow-xs',
          Platform.OS === 'web' ? 'hover:bg-emerald-700' : ''
        ),
        edit: cn(
          'border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 active:bg-emerald-100 dark:active:bg-emerald-900/60 shadow-xs',
          Platform.OS === 'web' ? 'hover:bg-emerald-100' : ''
        ),
        warning: cn(
          'border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 active:bg-amber-100 dark:active:bg-amber-900/60 shadow-xs',
          Platform.OS === 'web' ? 'hover:bg-amber-100' : ''
        ),
        'warning-solid': cn(
          'bg-amber-600 active:bg-amber-700 shadow-xs',
          Platform.OS === 'web' ? 'hover:bg-amber-700' : ''
        ),
        info: cn(
          'border border-blue-500/40 bg-blue-50 dark:bg-blue-950/40 active:bg-blue-100 dark:active:bg-blue-900/60 shadow-xs',
          Platform.OS === 'web' ? 'hover:bg-blue-100' : ''
        ),
        'info-solid': cn(
          'bg-blue-600 active:bg-blue-700 shadow-xs',
          Platform.OS === 'web' ? 'hover:bg-blue-700' : ''
        ),
        purple: cn(
          'border border-purple-500/40 bg-purple-50 dark:bg-purple-950/40 active:bg-purple-100 dark:active:bg-purple-900/60 shadow-xs',
          Platform.OS === 'web' ? 'hover:bg-purple-100' : ''
        ),
        outline: cn(
          'border border-border/80 bg-card active:bg-secondary/60 shadow-xs',
          Platform.OS === 'web' ? 'hover:bg-secondary/60' : ''
        ),
        secondary: cn(
          'bg-secondary border border-border/70 active:bg-secondary/80 shadow-xs',
          Platform.OS === 'web' ? 'hover:bg-secondary/80' : ''
        ),
        ghost: cn(
          'active:bg-secondary/50',
          Platform.OS === 'web' ? 'hover:bg-secondary/50' : ''
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
        primary: 'text-primary-foreground',
        destructive: 'text-white font-bold',
        'destructive-outline': 'text-rose-600 dark:text-rose-400 font-bold',
        stop: 'text-white font-bold',
        'stop-outline': 'text-rose-600 dark:text-rose-400 font-bold',
        success: 'text-white font-bold',
        edit: 'text-emerald-700 dark:text-emerald-400 font-bold',
        warning: 'text-amber-700 dark:text-amber-400 font-bold',
        'warning-solid': 'text-white font-bold',
        info: 'text-blue-700 dark:text-blue-400 font-bold',
        'info-solid': 'text-white font-bold',
        purple: 'text-purple-700 dark:text-purple-400 font-bold',
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

export interface ButtonProps
  extends React.ComponentPropsWithoutRef<typeof Pressable> {
  variant?: 
    | 'default' 
    | 'primary' 
    | 'destructive' 
    | 'destructive-outline'
    | 'stop'
    | 'stop-outline'
    | 'success'
    | 'edit'
    | 'warning'
    | 'warning-solid'
    | 'info'
    | 'info-solid'
    | 'purple'
    | 'outline' 
    | 'secondary' 
    | 'ghost' 
    | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  leftIcon?: React.ComponentType<{ size?: number; className?: string; color?: string }>;
  rightIcon?: React.ComponentType<{ size?: number; className?: string; color?: string }>;
  loading?: boolean;
  textClassName?: string;
}

const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      loading = false,
      disabled = false,
      textClassName,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const iconSize = size === 'sm' ? 16 : size === 'lg' ? 20 : 18;

    return (
      <TextClassContext.Provider value={cn(buttonTextVariants({ variant: variant as any, size }), textClassName)}>
        <Pressable
          ref={ref}
          disabled={isDisabled}
          className={cn(
            isDisabled && 'opacity-50',
            buttonVariants({ variant: variant as any, size }),
            className
          )}
          role="button"
          {...props}
        >
          {(state) => (
            <>
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color={variant === 'default' || variant === 'destructive' ? '#ffffff' : '#737373'}
                />
              ) : (
                LeftIcon && <LeftIcon size={iconSize} className={cn(buttonTextVariants({ variant }))} />
              )}
              {typeof children === 'function'
                ? children(state)
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
              {!loading && RightIcon && (
                <RightIcon size={iconSize} className={cn(buttonTextVariants({ variant }))} />
              )}
            </>
          )}
        </Pressable>
      </TextClassContext.Provider>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonTextVariants, buttonVariants };
export default Button;
