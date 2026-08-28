export const THEME = {
  light: {
    background: 'hsl(220 20% 98%)', // #F7F8FA
    foreground: 'hsl(222 24% 11%)', // #151922
    card: 'hsl(0 0% 100%)', // #FFFFFF
    cardForeground: 'hsl(222 24% 11%)',
    popover: 'hsl(0 0% 100%)',
    popoverForeground: 'hsl(222 24% 11%)',
    primary: 'hsl(38 45% 48%)', // #B38838 Warm Champagne Gold
    primaryForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(210 14% 95%)', // #F1F3F5
    secondaryForeground: 'hsl(222 24% 11%)',
    muted: 'hsl(210 14% 95%)',
    mutedForeground: 'hsl(220 9% 46%)', // #6B7280
    accent: 'hsl(38 52% 52%)', // #C99E44
    accentForeground: 'hsl(0 0% 100%)',
    destructive: 'hsl(0 72% 51%)', // #DC2626
    border: 'hsl(220 13% 90%)', // #E2E4E9
    input: 'hsl(220 13% 90%)',
    ring: 'hsl(38 52% 52%)',
    radius: '1.125rem', // 18px
    chart1: 'hsl(38 52% 52%)',
    chart2: 'hsl(173 58% 39%)',
    chart3: 'hsl(197 37% 24%)',
    chart4: 'hsl(43 74% 66%)',
    chart5: 'hsl(27 87% 67%)',
  },
  dark: {
    background: 'hsl(222 30% 6%)', // #0B0E14 Sleek Obsidian Base
    foreground: 'hsl(210 20% 98%)', // #F8FAFC
    card: 'hsl(222 25% 10%)', // #121721 Clean Frosted Surface
    cardForeground: 'hsl(210 20% 98%)',
    popover: 'hsl(222 24% 13%)', // #181F2C
    popoverForeground: 'hsl(210 20% 98%)',
    primary: 'hsl(38 75% 55%)', // #E5A93C Attractive Vibrant Champagne Gold
    primaryForeground: 'hsl(222 35% 6%)', // #080B10
    secondary: 'hsl(222 20% 13%)', // #171E29
    secondaryForeground: 'hsl(210 20% 98%)',
    muted: 'hsl(222 20% 13%)',
    mutedForeground: 'hsl(218 15% 65%)', // #94A3B8
    accent: 'hsl(38 80% 58%)', // #F0B345
    accentForeground: 'hsl(222 35% 6%)',
    destructive: 'hsl(0 84% 60%)', // #EF4444
    border: 'hsl(222 20% 18%)', // #222B3A
    input: 'hsl(222 20% 18%)',
    ring: 'hsl(38 75% 55%)',
    radius: '1.125rem', // 18px
    chart1: 'hsl(38 75% 55%)',
    chart2: 'hsl(142 71% 45%)',
    chart3: 'hsl(38 92% 50%)',
    chart4: 'hsl(280 65% 60%)',
    chart5: 'hsl(0 84% 60%)',
  },
};
 
export interface NavThemeColors {
  primary: string;
  background: string;
  card: string;
  text: string;
  border: string;
  notification: string;
}

export interface NavTheme {
  dark: boolean;
  colors: NavThemeColors;
}

export const NAV_THEME: Record<'light' | 'dark', NavTheme> = {
  light: {
    dark: false,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    dark: true,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};