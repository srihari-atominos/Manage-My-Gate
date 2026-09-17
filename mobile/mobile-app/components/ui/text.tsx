import { cn } from '../../lib/utils';
import { Slot } from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform, Text as RNText, type Role, StyleSheet } from 'react-native';
import i18n from '../../src/utils/i18n';

const textVariants = cva(
  cn(
    'text-foreground text-[18px] leading-7 font-normal text-left',
    Platform.select({
      web: 'select-text',
    })
  ),
  {
    variants: {
      variant: {
        default: '',
        h1: cn(
          'text-center text-4xl font-extrabold tracking-tight',
          Platform.select({ web: 'scroll-m-20 text-balance' })
        ),
        h2: cn(
          'border-border border-b pb-2 text-3xl font-bold tracking-tight text-left',
          Platform.select({ web: 'scroll-m-20 first:mt-0' })
        ),
        h3: cn('text-2xl font-bold tracking-tight text-left', Platform.select({ web: 'scroll-m-20' })),
        h4: cn('text-xl font-bold tracking-tight text-left', Platform.select({ web: 'scroll-m-20' })),
        p: 'mt-3 text-[18px] leading-7 sm:mt-6 text-left',
        blockquote: 'mt-4 border-l-2 pl-3 italic sm:mt-6 sm:pl-6 text-left',
        code: cn(
          'bg-muted relative rounded px-[0.35rem] py-[0.2rem] font-mono text-[15.5px] font-semibold'
        ),
        lead: 'text-muted-foreground text-xl leading-7 text-left',
        large: 'text-xl font-bold tracking-tight text-left',
        small: 'text-[15.5px] font-medium leading-tight text-left',
        muted: 'text-muted-foreground text-[15px] leading-normal text-left',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

type TextVariantProps = VariantProps<typeof textVariants>;

type TextVariant = NonNullable<TextVariantProps['variant']>;

const ROLE: Partial<Record<TextVariant, Role>> = {
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  blockquote: Platform.select({ web: 'blockquote' as Role }),
  code: Platform.select({ web: 'code' as Role }),
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  h1: '1',
  h2: '2',
  h3: '3',
  h4: '4',
};

const TextClassContext = React.createContext<string | undefined>(undefined);

function translateChildren(node: React.ReactNode): React.ReactNode {
  if (typeof node === 'string') {
    return i18n.translateText(node);
  }
  if (Array.isArray(node)) {
    return React.Children.map(node, (child) => translateChildren(child));
  }
  return node;
}

function Text({
  className,
  asChild = false,
  variant = 'default',
  children,
  style,
  ...props
}: React.ComponentProps<typeof RNText> &
  React.RefAttributes<typeof RNText> &
  TextVariantProps & {
    asChild?: boolean;
  }) {
  const textClass = React.useContext(TextClassContext);
  const Component = asChild ? Slot : RNText;

  const [currentLang, setCurrentLang] = React.useState(i18n.getCurrentLanguage());
  React.useEffect(() => {
    return i18n.subscribe((newLang) => setCurrentLang(newLang));
  }, []);

  const isArabic = currentLang === 'ar';

  const translatedChildren = React.useMemo(() => {
    return translateChildren(children);
  }, [children, currentLang]);

  const resolvedStyle = React.useMemo(() => {
    if (!isArabic || !style) return style;
    const flat = StyleSheet.flatten(style) || {};
    if (flat.fontSize) {
      return [
        style,
        {
          fontSize: Math.round(flat.fontSize * 1.15),
          lineHeight: flat.lineHeight ? Math.round(flat.lineHeight * 1.18) : undefined,
        },
      ];
    }
    return style;
  }, [style, isArabic]);

  return (
    <Component
      dir="ltr"
      className={cn(
        textVariants({ variant }),
        textClass,
        isArabic && 'tracking-normal text-[1.08em]',
        className
      )}
      role={variant ? ROLE[variant] : undefined}
      aria-level={variant ? ARIA_LEVEL[variant] : undefined}
      style={resolvedStyle}
      {...(props as any)}
    >
      {translatedChildren}
    </Component>
  );
}

export { Text, TextClassContext };
export default Text;
