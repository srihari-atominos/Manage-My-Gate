export const THEME = {
  light: {
    background: 'hsl(218 38% 94%)', // #EEF3F9 Soft Cool Blue/Grey Canvas
    foreground: 'hsl(227 66% 12%)', // #0B1437 Deep NAHOM Charcoal
    card: 'hsl(0 0% 100%)', // #FFFFFF Pure White
    cardForeground: 'hsl(227 66% 12%)',
    popover: 'hsl(0 0% 100%)',
    popoverForeground: 'hsl(227 66% 12%)',
    primary: 'hsl(227 66% 26%)', // #172B70 NAHOM Primary Navy
    primaryForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(218 35% 91%)', // #DCE6F3 Elevated Secondary Surface
    secondaryForeground: 'hsl(227 66% 20%)',
    muted: 'hsl(218 30% 90%)',
    mutedForeground: 'hsl(220 20% 36%)', // #475569 High-Contrast Slate
    accent: 'hsl(252 38% 41%)', // #51418F NAHOM Indigo
    accentForeground: 'hsl(0 0% 100%)',
    destructive: 'hsl(0 72% 51%)', // #DC2626
    border: 'hsl(218 28% 85%)', // #CBD7E6 Crisp Defined Border
    input: 'hsl(218 28% 85%)',
    ring: 'hsl(227 66% 26%)',
    radius: '1.125rem', // 18px
    chart1: 'hsl(227 66% 26%)',
    chart2: 'hsl(213 65% 40%)', // #245FA8 Royal Blue
    chart3: 'hsl(252 38% 41%)', // #51418F Indigo
    chart4: 'hsl(322 72% 38%)', // #A51B73 Magenta
    chart5: 'hsl(142 71% 45%)',
  },
  dark: {
    background: 'hsl(227 50% 6%)', // #070B18 Sleek Obsidian/Midnight Base
    foreground: 'hsl(210 20% 98%)', // #F8FAFC
    card: 'hsl(227 40% 10%)', // #0F162B Clean Frosted Surface
    cardForeground: 'hsl(210 20% 98%)',
    popover: 'hsl(227 38% 13%)', // #151F3D
    popoverForeground: 'hsl(210 20% 98%)',
    primary: 'hsl(213 85% 58%)', // #3884E8 Vibrant Royal Blue
    primaryForeground: 'hsl(227 50% 6%)', // #070B18
    secondary: 'hsl(227 30% 14%)', // #16203B
    secondaryForeground: 'hsl(210 20% 98%)',
    muted: 'hsl(227 30% 14%)',
    mutedForeground: 'hsl(218 18% 65%)', // #94A3B8
    accent: 'hsl(252 65% 65%)', // #8A7CE0
    accentForeground: 'hsl(227 50% 6%)',
    destructive: 'hsl(0 84% 60%)', // #EF4444
    border: 'hsl(227 25% 18%)', // #202D4E
    input: 'hsl(227 25% 18%)',
    ring: 'hsl(213 85% 58%)',
    radius: '1.125rem', // 18px
    chart1: 'hsl(213 85% 58%)',
    chart2: 'hsl(252 65% 65%)',
    chart3: 'hsl(322 72% 55%)',
    chart4: 'hsl(142 71% 45%)',
    chart5: 'hsl(38 92% 50%)',
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