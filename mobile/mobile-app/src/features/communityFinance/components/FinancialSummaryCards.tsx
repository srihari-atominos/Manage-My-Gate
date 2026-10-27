import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Pressable, Animated, Easing } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';
import { type DashboardOverview, type RunwayAnalytics } from '../types';
import { formatINR } from '../utils/financeFormatters';

interface FinancialSummaryCardsProps {
  overview?: DashboardOverview | null;
  runway?: RunwayAnalytics | null;
  onViewInflows?: () => void;
  onViewOutflows?: () => void;
  onOpenSimulator?: () => void;
}

/**
 * Card with a staggered 3D entrance (tilts up from the back) and a
 * press-down tilt when tappable.
 */
const Card3D: React.FC<{
  index: number;
  className?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  children: React.ReactNode;
}> = ({ index, className, onPress, accessibilityLabel, children }) => {
  const enter = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 520,
      delay: index * 110,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  const animatePress = (to: number) =>
    Animated.spring(press, { toValue: to, friction: 6, tension: 160, useNativeDriver: true }).start();

  const style = {
    opacity: enter,
    transform: [
      { perspective: 900 },
      { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) },
      { rotateX: enter.interpolate({ inputRange: [0, 1], outputRange: ['28deg', '0deg'] }) },
      { rotateX: press.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '6deg'] }) },
      { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }) },
    ],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  };

  const body = <View className={className}>{children}</View>;

  return (
    <Animated.View style={[style, onPress ? { flex: 1 } : null]}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          onPressIn={() => animatePress(1)}
          onPressOut={() => animatePress(0)}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}>
          {body}
        </Pressable>
      ) : (
        body
      )}
    </Animated.View>
  );
};

const RUNWAY_MAX_MONTHS = 12;

/** Extruded 3D progress bar that grows in; full bar = 12+ months of runway. */
const RunwayBar: React.FC<{ months: number }> = ({ months }) => {
  const grow = useRef(new Animated.Value(0)).current;
  const pct = Math.max(0, Math.min(1, months / RUNWAY_MAX_MONTHS));
  const barColor = months >= 6 ? '#10B981' : months >= 3 ? '#F59E0B' : '#F43F5E';
  const edgeColor = months >= 6 ? '#047857' : months >= 3 ? '#B45309' : '#BE123C';
  const topColor = months >= 6 ? '#6EE7B7' : months >= 3 ? '#FCD34D' : '#FDA4AF';

  useEffect(() => {
    grow.setValue(0);
    Animated.timing(grow, {
      toValue: pct,
      duration: 900,
      delay: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [grow, pct]);

  return (
    <View>
      <View className="h-3 rounded-full bg-border/50 overflow-hidden">
        <Animated.View
          style={{
            height: '100%',
            width: grow.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            backgroundColor: barColor,
            borderTopWidth: 3,
            borderTopColor: topColor,
            borderBottomWidth: 2,
            borderBottomColor: edgeColor,
            borderRadius: 999,
          }}
        />
      </View>
      <View className="flex-row justify-between mt-1.5">
        <Text className="text-[11px] text-muted-foreground">0</Text>
        <Text className="text-[11px] text-muted-foreground">6</Text>
        <Text className="text-[11px] text-muted-foreground">12+ months</Text>
      </View>
    </View>
  );
};

export const FinancialSummaryCards: React.FC<FinancialSummaryCardsProps> = ({
  overview,
  runway,
  onViewInflows,
  onViewOutflows,
  onOpenSimulator,
}) => {
  if (!overview) return null;

  const totalIncome = overview.netCollectionsAfterRefunds ?? 0;
  const totalExpenses =
    (overview.reconciledExpensePayments ?? 0) > 0
      ? overview.reconciledExpensePayments
      : (overview.totalExpensesIncurred ?? 0);
  const netSurplus =
    overview.reconciledExpensePayments > 0
      ? (overview.netSurplusOrDeficit ?? (totalIncome - totalExpenses))
      : (totalIncome - totalExpenses);
  const outstandingDues = overview.outstandingDues ?? 0;
  const isDeficit = netSurplus < 0;
  const isZero = netSurplus === 0 && totalIncome === 0 && totalExpenses === 0;

  const activeRunway = runway || overview.runway;
  const isSelfSustaining = activeRunway?.isSelfSustaining ?? (activeRunway && activeRunway.netMonthlyBurn <= 0);
  const runwayMonths = activeRunway?.runwayMonths;
  const grossRunwayMonths = activeRunway?.grossRunwayMonths;
  const runwayHealth = activeRunway?.runwayHealth;

  // Exact numeric months calculation (e.g. 0.02, 0.4, 2, 3)
  const rawMonths =
    grossRunwayMonths !== null && grossRunwayMonths !== undefined
      ? grossRunwayMonths
      : runwayMonths !== null && runwayMonths !== undefined
      ? runwayMonths
      : activeRunway && activeRunway.averageMonthlyExpenses > 0
      ? (activeRunway.remainingBalance / activeRunway.averageMonthlyExpenses)
      : totalExpenses > 0
      ? (netSurplus / totalExpenses)
      : 0;

  const formattedMonths =
    rawMonths >= 10
      ? String(Math.round(rawMonths))
      : rawMonths >= 1
      ? String(Math.round(rawMonths * 10) / 10)
      : rawMonths >= 0.1
      ? String(Math.round(rawMonths * 10) / 10)
      : rawMonths > 0
      ? String(Math.round(rawMonths * 100) / 100)
      : '0';

  const exactRunwayText = `${formattedMonths} ${Number(formattedMonths) === 1 ? 'Month' : 'Months'}`;

  const statusVariant: StatusVariant = isDeficit
    ? 'danger'
    : isZero
    ? 'neutral'
    : 'success';

  const statusLabel = isDeficit ? 'Deficit' : isZero ? 'Balanced' : 'Surplus';

  return (
    <View className="mb-5 gap-4">
      {/* ── 1. Net Balance + Runway ── */}
      <Card3D index={0} className="p-5 bg-card border border-border/50 rounded-3xl">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2.5 flex-1 me-2">
            <View
              className={`w-10 h-10 rounded-full items-center justify-center ${
                isDeficit ? 'bg-rose-500/15' : 'bg-primary/15'
              }`}>
              <Icon
                as={isDeficit ? TrendingDown : Wallet}
                size={20}
                className={isDeficit ? 'text-rose-600 dark:text-rose-400' : 'text-primary'}
              />
            </View>
            <Text className="text-sm font-semibold text-muted-foreground">
              {isDeficit ? 'Net Deficit' : 'Net Balance'}
            </Text>
          </View>
          <StatusBadge
            label={statusLabel}
            variant={statusVariant}
            className="py-1 px-3 rounded-full shrink-0"
          />
        </View>

        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          className={`text-4xl font-extrabold tracking-tight ${
            isDeficit ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
          }`}>
          {formatINR(netSurplus)}
        </Text>

        {/* Runway strip */}
        <View className="mt-5 p-4 rounded-2xl bg-muted/40 border border-border/40">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <Icon as={ShieldCheck} size={16} className="text-emerald-600 dark:text-emerald-400" />
              <Text className="text-sm font-semibold text-foreground">Runway</Text>
            </View>
            {onOpenSimulator && (
              <TouchableOpacity
                onPress={onOpenSimulator}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="View Reserve & Cash Flow Details"
                hitSlop={8}
                className="flex-row items-center">
                <Text className="text-xs font-semibold text-primary">Details</Text>
                <Icon as={ChevronRight} size={14} className="text-primary" />
              </TouchableOpacity>
            )}
          </View>

          <Text className="text-2xl font-extrabold text-foreground mb-3">{exactRunwayText}</Text>

          <RunwayBar months={Number(rawMonths) || 0} />

          <Text className="text-xs text-muted-foreground mt-3">
            {isSelfSustaining
              ? 'Collections exceed expenses'
              : `Funds cover about ${exactRunwayText} of expenses`}
          </Text>
        </View>
      </Card3D>

      {/* ── 2 & 3. Collections | Expenses ── */}
      <View className="flex-row gap-4">
        <Card3D
          index={1}
          onPress={onViewInflows}
          accessibilityLabel="View Collections Ledger"
          className="flex-1 p-4 bg-card border border-border/50 rounded-2xl">
          <View className="flex-row items-center justify-between mb-3">
            <View className="w-9 h-9 rounded-full bg-emerald-500/15 items-center justify-center">
              <Icon as={ArrowDownLeft} size={18} className="text-emerald-600 dark:text-emerald-400" />
            </View>
            <Icon as={ChevronRight} size={16} className="text-muted-foreground/50" />
          </View>
          <Text className="text-xs font-medium text-muted-foreground">Collections</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit className="text-xl font-bold text-foreground mt-0.5">
            {formatINR(totalIncome)}
          </Text>
        </Card3D>

        <Card3D
          index={2}
          onPress={onViewOutflows}
          accessibilityLabel="View Expenses Ledger"
          className="flex-1 p-4 bg-card border border-border/50 rounded-2xl">
          <View className="flex-row items-center justify-between mb-3">
            <View className="w-9 h-9 rounded-full bg-rose-500/15 items-center justify-center">
              <Icon as={ArrowUpRight} size={18} className="text-rose-600 dark:text-rose-400" />
            </View>
            <Icon as={ChevronRight} size={16} className="text-muted-foreground/50" />
          </View>
          <Text className="text-xs font-medium text-muted-foreground">Expenses</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit className="text-xl font-bold text-foreground mt-0.5">
            {formatINR(totalExpenses)}
          </Text>
          {overview.outstandingVendorLiabilities > 0 && (overview.reconciledExpensePayments ?? 0) === 0 && (
            <Text className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
              Pending payout
            </Text>
          )}
        </Card3D>
      </View>

      {/* ── 4. Pending Dues ── */}
      <Card3D
        index={3}
        className="px-4 py-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5 flex-1 me-3">
            <Icon as={AlertCircle} size={20} className="text-amber-700 dark:text-amber-400" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">Pending Dues</Text>
              <Text className="text-xs text-muted-foreground mt-0.5">Yet to be collected</Text>
            </View>
          </View>
          <Text className="text-lg font-bold text-amber-800 dark:text-amber-300">
            {formatINR(outstandingDues)}
          </Text>
        </View>
      </Card3D>
    </View>
  );
};

export default FinancialSummaryCards;
