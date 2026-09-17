import React, { memo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Path,
  Line,
  Circle,
  G,
} from 'react-native-svg';
import { useColorScheme } from 'nativewind';

export interface DashboardBackgroundProps {
  style?: ViewStyle;
  testID?: string;
}

/**
 * NAHOM Dashboard Background System
 * "Connected Community / Architectural Abstract"
 *
 * Vector-based, lightweight, responsive background representing Home, Community,
 * Connectivity, and Security. Automatically reacts to NativeWind light/dark theme.
 */
export const DashboardBackground: React.FC<DashboardBackgroundProps> = memo(
  ({ style, testID = 'dashboard-background' }) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
      <View
        testID={testID}
        style={[StyleSheet.absoluteFillObject, styles.container, style]}
        pointerEvents="none"
      >
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 400 900"
          preserveAspectRatio="xMidYMid slice"
        >
          <Defs>
            {/* Background Base Gradients */}
            <LinearGradient id="lightBaseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FAF8F6" stopOpacity="1" />
              <Stop offset="45%" stopColor="#F5F1EC" stopOpacity="1" />
              <Stop offset="100%" stopColor="#EDE6DF" stopOpacity="1" />
            </LinearGradient>

            <LinearGradient id="darkBaseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#0B0F19" stopOpacity="1" />
              <Stop offset="50%" stopColor="#0E1424" stopOpacity="1" />
              <Stop offset="100%" stopColor="#080C14" stopOpacity="1" />
            </LinearGradient>

            {/* Ambient Lighting Orbs */}
            <RadialGradient id="lightWarmAura" cx="85%" cy="12%" r="55%">
              <Stop offset="0%" stopColor="#FF6A00" stopOpacity="0.065" />
              <Stop offset="50%" stopColor="#C2410C" stopOpacity="0.02" />
              <Stop offset="100%" stopColor="#FAF8F6" stopOpacity="0" />
            </RadialGradient>

            <RadialGradient id="darkWarmAura" cx="85%" cy="12%" r="55%">
              <Stop offset="0%" stopColor="#FF6A00" stopOpacity="0.08" />
              <Stop offset="55%" stopColor="#172B70" stopOpacity="0.04" />
              <Stop offset="100%" stopColor="#0B0F19" stopOpacity="0" />
            </RadialGradient>

            <RadialGradient id="lightCoolAura" cx="15%" cy="65%" r="50%">
              <Stop offset="0%" stopColor="#245FA8" stopOpacity="0.035" />
              <Stop offset="60%" stopColor="#51418F" stopOpacity="0.015" />
              <Stop offset="100%" stopColor="#FAF8F6" stopOpacity="0" />
            </RadialGradient>

            <RadialGradient id="darkCoolAura" cx="15%" cy="65%" r="50%">
              <Stop offset="0%" stopColor="#245FA8" stopOpacity="0.07" />
              <Stop offset="60%" stopColor="#51418F" stopOpacity="0.03" />
              <Stop offset="100%" stopColor="#0B0F19" stopOpacity="0" />
            </RadialGradient>

            {/* Architectural Shading Gradients */}
            <LinearGradient id="archShadeLight" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#1E293B" stopOpacity="0.03" />
              <Stop offset="100%" stopColor="#1E293B" stopOpacity="0.005" />
            </LinearGradient>

            <LinearGradient id="archShadeDark" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.04" />
              <Stop offset="100%" stopColor="#818CF8" stopOpacity="0.01" />
            </LinearGradient>
          </Defs>

          {/* 1. Base Canvas */}
          <Rect
            x="0"
            y="0"
            width="400"
            height="900"
            fill={isDark ? 'url(#darkBaseGrad)' : 'url(#lightBaseGrad)'}
          />

          {/* 2. Ambient Atmosphere Glows */}
          <Rect
            x="0"
            y="0"
            width="400"
            height="900"
            fill={isDark ? 'url(#darkWarmAura)' : 'url(#lightWarmAura)'}
          />
          <Rect
            x="0"
            y="0"
            width="400"
            height="900"
            fill={isDark ? 'url(#darkCoolAura)' : 'url(#lightCoolAura)'}
          />

          {/* 3. Subtle Architectural Grid (Community / Structural Infrastructure) */}
          <G opacity={isDark ? 0.35 : 0.45}>
            {/* Horizontal Structure Guidelines */}
            <Line
              x1="20"
              y1="85"
              x2="380"
              y2="85"
              stroke={isDark ? '#334155' : '#CBD5E1'}
              strokeWidth="0.8"
              strokeDasharray="3 6"
            />
            <Line
              x1="20"
              y1="220"
              x2="380"
              y2="220"
              stroke={isDark ? '#334155' : '#CBD5E1'}
              strokeWidth="0.8"
              strokeDasharray="4 8"
            />
            <Line
              x1="20"
              y1="390"
              x2="380"
              y2="390"
              stroke={isDark ? '#334155' : '#CBD5E1'}
              strokeWidth="0.8"
              strokeDasharray="3 6"
            />
            <Line
              x1="20"
              y1="570"
              x2="380"
              y2="570"
              stroke={isDark ? '#334155' : '#CBD5E1'}
              strokeWidth="0.8"
              strokeDasharray="4 8"
            />
            <Line
              x1="20"
              y1="750"
              x2="380"
              y2="750"
              stroke={isDark ? '#334155' : '#CBD5E1'}
              strokeWidth="0.8"
              strokeDasharray="3 6"
            />

            {/* Vertical Infrastructure Axis */}
            <Line
              x1="65"
              y1="40"
              x2="65"
              y2="860"
              stroke={isDark ? '#1E293B' : '#E2E8F0'}
              strokeWidth="0.7"
              strokeDasharray="2 6"
            />
            <Line
              x1="200"
              y1="40"
              x2="200"
              y2="860"
              stroke={isDark ? '#1E293B' : '#E2E8F0'}
              strokeWidth="0.7"
              strokeDasharray="2 6"
            />
            <Line
              x1="335"
              y1="40"
              x2="335"
              y2="860"
              stroke={isDark ? '#1E293B' : '#E2E8F0'}
              strokeWidth="0.7"
              strokeDasharray="2 6"
            />
          </G>

          {/* 4. Abstract Architectural Silhouettes & Geometric Forms */}
          {/* Upper Horizon Silhouette: Modern Residence / Pavilion Angles */}
          <G opacity={isDark ? 0.45 : 0.6}>
            {/* Pavilion Facet 1 */}
            <Path
              d="M-20,130 L110,80 L220,125 L220,195 L-20,195 Z"
              fill={isDark ? 'url(#archShadeDark)' : 'url(#archShadeLight)'}
              stroke={isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(30, 41, 59, 0.06)'}
              strokeWidth="1"
            />

            {/* Pavilion Facet 2: Overlapping Cantilever */}
            <Path
              d="M180,110 L310,65 L420,110 L420,175 L180,175 Z"
              fill={isDark ? 'url(#archShadeDark)' : 'url(#archShadeLight)'}
              stroke={isDark ? 'rgba(99, 102, 241, 0.14)' : 'rgba(30, 41, 59, 0.05)'}
              strokeWidth="1"
            />

            {/* Architectural Rhythmic Colonnade (Vertical Louvers) */}
            <Line
              x1="225"
              y1="75"
              x2="225"
              y2="135"
              stroke={isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 41, 59, 0.07)'}
              strokeWidth="1"
            />
            <Line
              x1="245"
              y1="72"
              x2="245"
              y2="138"
              stroke={isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 41, 59, 0.07)'}
              strokeWidth="1"
            />
            <Line
              x1="265"
              y1="69"
              x2="265"
              y2="142"
              stroke={isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 41, 59, 0.07)'}
              strokeWidth="1"
            />
            <Line
              x1="285"
              y1="66"
              x2="285"
              y2="148"
              stroke={isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 41, 59, 0.07)'}
              strokeWidth="1"
            />
          </G>

          {/* Center-Lower: Community Portal / Gateway Curved Geometry */}
          <G opacity={isDark ? 0.4 : 0.5}>
            {/* Grand Community Archway Curve (Security Gate / Portal Concept) */}
            <Path
              d="M-30,480 C90,440 310,440 430,480"
              fill="none"
              stroke={isDark ? 'rgba(56, 189, 248, 0.18)' : 'rgba(36, 95, 168, 0.12)'}
              strokeWidth="1.2"
            />
            <Path
              d="M-10,510 C100,475 300,475 410,510"
              fill="none"
              stroke={isDark ? 'rgba(129, 140, 248, 0.12)' : 'rgba(81, 65, 143, 0.08)'}
              strokeWidth="1"
              strokeDasharray="6 4"
            />

            {/* Lower Isometric Community Base Platform */}
            <Path
              d="M40,780 L200,720 L360,780 L200,840 Z"
              fill={isDark ? 'url(#archShadeDark)' : 'url(#archShadeLight)'}
              stroke={isDark ? 'rgba(56, 189, 248, 0.14)' : 'rgba(30, 41, 59, 0.06)'}
              strokeWidth="1"
            />
            <Line
              x1="200"
              y1="720"
              x2="200"
              y2="840"
              stroke={isDark ? 'rgba(56, 189, 248, 0.16)' : 'rgba(30, 41, 59, 0.06)'}
              strokeWidth="0.8"
            />
          </G>

          {/* 5. Connectivity Network Lines & Smart Hub Nodes */}
          <G>
            {/* Network Vector Pathways */}
            <Path
              d="M65,85 L110,80 L200,125 L335,85"
              fill="none"
              stroke={isDark ? 'rgba(56, 189, 248, 0.16)' : 'rgba(30, 41, 59, 0.08)'}
              strokeWidth="0.9"
            />
            <Path
              d="M65,220 L130,270 L270,270 L335,220"
              fill="none"
              stroke={isDark ? 'rgba(56, 189, 248, 0.14)' : 'rgba(30, 41, 59, 0.07)'}
              strokeWidth="0.9"
              strokeDasharray="4 4"
            />
            <Path
              d="M65,570 L160,540 L240,600 L335,570"
              fill="none"
              stroke={isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(36, 95, 168, 0.08)'}
              strokeWidth="0.9"
            />

            {/* Standard Network Nodes (Intersection points) */}
            <Circle
              cx="65"
              cy="85"
              r="2.5"
              fill={isDark ? '#38BDF8' : '#94A3B8'}
              opacity={isDark ? 0.4 : 0.4}
            />
            <Circle
              cx="200"
              cy="125"
              r="2.5"
              fill={isDark ? '#38BDF8' : '#94A3B8'}
              opacity={isDark ? 0.4 : 0.4}
            />
            <Circle
              cx="335"
              cy="85"
              r="2.5"
              fill={isDark ? '#38BDF8' : '#94A3B8'}
              opacity={isDark ? 0.4 : 0.4}
            />
            <Circle
              cx="130"
              cy="270"
              r="2.5"
              fill={isDark ? '#818CF8' : '#94A3B8'}
              opacity={isDark ? 0.35 : 0.35}
            />
            <Circle
              cx="270"
              cy="270"
              r="2.5"
              fill={isDark ? '#818CF8' : '#94A3B8'}
              opacity={isDark ? 0.35 : 0.35}
            />
            <Circle
              cx="65"
              cy="390"
              r="2.5"
              fill={isDark ? '#38BDF8' : '#94A3B8'}
              opacity={isDark ? 0.3 : 0.35}
            />
            <Circle
              cx="335"
              cy="390"
              r="2.5"
              fill={isDark ? '#38BDF8' : '#94A3B8'}
              opacity={isDark ? 0.3 : 0.35}
            />
            <Circle
              cx="160"
              cy="540"
              r="2.5"
              fill={isDark ? '#818CF8' : '#94A3B8'}
              opacity={isDark ? 0.35 : 0.35}
            />
            <Circle
              cx="240"
              cy="600"
              r="2.5"
              fill={isDark ? '#818CF8' : '#94A3B8'}
              opacity={isDark ? 0.35 : 0.35}
            />

            {/* 6. Signature NAHOM Orange Accent Nodes (Faint, high-precision accents) */}
            {/* Accent Node 1: Near Top-Right Horizon */}
            <Circle
              cx="310"
              cy="65"
              r="6.5"
              fill="#FF6A00"
              opacity={isDark ? 0.15 : 0.12}
            />
            <Circle
              cx="310"
              cy="65"
              r="2.2"
              fill="#FF6A00"
              opacity={isDark ? 0.8 : 0.7}
            />

            {/* Accent Node 2: Central Community Nexus */}
            <Circle
              cx="200"
              cy="390"
              r="7.5"
              fill="#FF6A00"
              opacity={isDark ? 0.14 : 0.1}
            />
            <Circle
              cx="200"
              cy="390"
              r="2.4"
              fill="#FF6A00"
              opacity={isDark ? 0.75 : 0.65}
            />

            {/* Accent Node 3: Ground / Gate Nexus */}
            <Circle
              cx="200"
              cy="720"
              r="6"
              fill="#FF6A00"
              opacity={isDark ? 0.15 : 0.1}
            />
            <Circle
              cx="200"
              cy="720"
              r="2"
              fill="#FF6A00"
              opacity={isDark ? 0.75 : 0.65}
            />
          </G>
        </Svg>
      </View>
    );
  }
);

DashboardBackground.displayName = 'DashboardBackground';

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    zIndex: 0,
  },
});

export default DashboardBackground;
