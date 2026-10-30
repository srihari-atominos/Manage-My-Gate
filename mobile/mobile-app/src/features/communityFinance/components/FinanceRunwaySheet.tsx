import React, { useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge';
import {
  ShieldCheck,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Sparkles,
} from 'lucide-react-native';
import { type DashboardOverview, type RunwayAnalytics } from '../types';
import { formatINR } from '../utils/financeFormatters';

export interface FinanceRunwaySheetProps {
  visible: boolean;
  onClose: () => void;
  overview?: DashboardOverview | null;
  initialRunway?: RunwayAnalytics | null;
}

export const FinanceRunwaySheet: React.FC<FinanceRunwaySheetProps> = ({
  visible,
  onClose,
  overview,
  initialRunway,
}) => {
  const activeRunway = initialRunway || overview?.runway;

  const currentBalance = useMemo(
    () => Math.round(Number(activeRunway?.remainingBalance ?? overview?.netSurplusOrDeficit ?? 0)),
    [activeRunway, overview]
  );

  const monthlyExpenses = useMemo(
    () =>
      Math.round(
        Number(
          activeRunway?.averageMonthlyExpenses ||
            overview?.reconciledExpensePayments ||
            overview?.totalExpensesIncurred ||
            0
        )
      ),
    [activeRunway, overview]
  );

  const monthlyCollections = useMemo(
    () =>
      Math.round(
        Number(
          activeRunway?.averageMonthlyCollections ||
            overview?.netCollectionsAfterRefunds ||
            overview?.grossSuccessfulCollections ||
            0
        )
      ),
    [activeRunway, overview]
  );

  const netMonthlyFlow = monthlyCollections - monthlyExpenses;
  const isSelfSustaining =
    activeRunway?.isSelfSustaining ?? netMonthlyFlow >= 0;

  // Inflow Coverage ratio (Collections / Expenses)
  const coverageRatio =
    monthlyExpenses > 0
      ? Math.round((monthlyCollections / monthlyExpenses) * 100)
      : 100;

  const statusVariant: StatusVariant = isSelfSustaining
    ? 'success'
    : coverageRatio >= 80
    ? 'warning'
    : 'danger';

  const statusLabel = isSelfSustaining
    ? 'Self-Sustaining'
    : coverageRatio >= 80
    ? 'Moderate Buffer'
    : 'Action Needed';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Runway & Cash Flow Details"
      footer={
        <View className="px-4 pt-2 pb-4">
          <Button
            variant="default"
            className="w-full shadow-xs active:opacity-90"
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close runway details">
            <Text className="text-sm font-semibold text-primary-foreground">Done</Text>
          </Button>
        </View>
      }>
      <View className="py-1">
        <View className="gap-3 pb-2">
          {/* ── 1. Hero 3D Financial Health Status Card ── */}
          <View className="p-3.5 rounded-2xl border-t-2 border-t-emerald-400 border border-emerald-500/25 bg-emerald-500/5 shadow-xs">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 items-center justify-center shadow-2xs">
                  <Icon
                    as={isSelfSustaining ? ShieldCheck : AlertTriangle}
                    size={18}
                    className={isSelfSustaining ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}
                  />
                </View>
                <View>
                  <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Cash Flow Status
                  </Text>
                  <Text className="text-base font-extrabold text-foreground tracking-tight">
                    {statusLabel}
                  </Text>
                </View>
              </View>
              <StatusBadge label={isSelfSustaining ? 'Surplus' : 'Deficit'} variant={statusVariant} />
            </View>

            <Text className="text-xs text-muted-foreground font-medium leading-relaxed">
              {isSelfSustaining ? (
                <>
                  Monthly collections exceed expenses by{' '}
                  <Text className="font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatINR(netMonthlyFlow)}
                  </Text>
                  , keeping operations fully funded each month.
                </>
              ) : (
                <>
                  Monthly expenses exceed collections by{' '}
                  <Text className="font-bold text-rose-600 dark:text-rose-400">
                    {formatINR(Math.abs(netMonthlyFlow))}
                  </Text>
                  . Current reserves sustain {formatINR(currentBalance)}.
                </>
              )}
            </Text>
          </View>

          {/* ── 2. User-Friendly 2x2 Financial Metrics Grid (3D Elevated Tiles) ── */}
          <View className="gap-2">
            <View className="flex-row gap-2">
              {/* Reserve Balance */}
              <View className="flex-1 p-3 rounded-2xl border-t-2 border-t-primary border border-border/50 bg-card shadow-2xs">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <View className="w-5 h-5 rounded-md bg-primary/10 items-center justify-center">
                    <Icon as={Wallet} size={11} className="text-primary" />
                  </View>
                  <Text className="text-[11px] text-muted-foreground font-medium">Reserve Fund</Text>
                </View>
                <Text numberOfLines={1} adjustsFontSizeToFit className="text-base font-extrabold text-foreground">
                  {formatINR(currentBalance)}
                </Text>
                <Text className="text-[10px] text-muted-foreground mt-0.5">Liquid balance</Text>
              </View>

              {/* Net Monthly Flow */}
              <View className="flex-1 p-3 rounded-2xl border-t-2 border-t-emerald-400 border border-border/50 bg-card shadow-2xs">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <View className="w-5 h-5 rounded-md bg-emerald-500/10 items-center justify-center">
                    <Icon
                      as={netMonthlyFlow >= 0 ? TrendingUp : TrendingDown}
                      size={11}
                      className={netMonthlyFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}
                    />
                  </View>
                  <Text className="text-[11px] text-muted-foreground font-medium">Net Monthly</Text>
                </View>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  className={`text-base font-extrabold ${
                    netMonthlyFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                  {netMonthlyFlow >= 0 ? `+${formatINR(netMonthlyFlow)}` : `-${formatINR(Math.abs(netMonthlyFlow))}`}
                </Text>
                <Text className="text-[10px] text-muted-foreground mt-0.5">Added to reserves</Text>
              </View>
            </View>

            <View className="flex-row gap-2">
              {/* Monthly Collections */}
              <View className="flex-1 p-3 rounded-2xl border-t-2 border-t-emerald-400 border border-border/50 bg-card shadow-2xs">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <View className="w-5 h-5 rounded-md bg-emerald-500/10 items-center justify-center">
                    <Icon as={ArrowDownLeft} size={11} className="text-emerald-600 dark:text-emerald-400" />
                  </View>
                  <Text className="text-[11px] text-muted-foreground font-medium">Monthly In</Text>
                </View>
                <Text numberOfLines={1} adjustsFontSizeToFit className="text-sm font-extrabold text-foreground">
                  +{formatINR(monthlyCollections)}
                </Text>
                <Text className="text-[10px] text-muted-foreground mt-0.5">Maintenance & dues</Text>
              </View>

              {/* Monthly Expenses */}
              <View className="flex-1 p-3 rounded-2xl border-t-2 border-t-slate-400 border border-border/50 bg-card shadow-2xs">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <View className="w-5 h-5 rounded-md bg-slate-500/10 items-center justify-center">
                    <Icon as={ArrowUpRight} size={11} className="text-slate-600 dark:text-slate-400" />
                  </View>
                  <Text className="text-[11px] text-muted-foreground font-medium">Monthly Out</Text>
                </View>
                <Text numberOfLines={1} adjustsFontSizeToFit className="text-sm font-extrabold text-foreground">
                  -{formatINR(monthlyExpenses)}
                </Text>
                <Text className="text-[10px] text-muted-foreground mt-0.5">Staff, AMC & utilities</Text>
              </View>
            </View>
          </View>

          {/* ── 3. 3D Coverage Ratio Bar ── */}
          <View className="p-3.5 rounded-2xl border border-border/40 bg-card shadow-2xs">
            <View className="flex-row items-center justify-between mb-1.5">
              <View className="flex-row items-center gap-1.5">
                <Icon as={Sparkles} size={13} className="text-emerald-600 dark:text-emerald-400" />
                <Text className="text-xs font-bold text-foreground">Collections vs Expenses</Text>
              </View>
              <Text className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                {coverageRatio}% Covered
              </Text>
            </View>

            {/* Layered 3D Bar */}
            <View className="h-2 w-full bg-muted/60 rounded-full overflow-hidden border border-border/40 shadow-inner">
              <View
                style={{
                  width: `${Math.min(100, coverageRatio)}%`,
                  backgroundColor: '#10B981',
                  borderTopWidth: 1,
                  borderTopColor: '#6EE7B7',
                }}
                className="h-full rounded-full"
              />
            </View>
            <Text className="text-[10px] text-muted-foreground mt-1 text-end">
              Inflows comfortably cover 100% of recurring society costs.
            </Text>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
};

export default FinanceRunwaySheet;
