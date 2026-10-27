import React from 'react';
import { View, TouchableOpacity } from 'react-native';
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

  const displayMonthlyIn =
    activeRunway && activeRunway.averageMonthlyCollections > 0
      ? Math.round(activeRunway.averageMonthlyCollections)
      : Math.round(totalIncome);
  const displayMonthlyOut =
    activeRunway && activeRunway.averageMonthlyExpenses > 0
      ? Math.round(activeRunway.averageMonthlyExpenses)
      : Math.round(totalExpenses);
  const displayNetMonthly = displayMonthlyIn - displayMonthlyOut;

  return (
    <View className="mb-3.5 gap-2.5">
      {/* ── Unified Net Balance Card ── */}
      <View className="p-3.5 bg-card border border-border/60 rounded-2xl shadow-md">
        {/* Top Row: Icon + Balance + Status Badge */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 me-2">
            <View
              className={`w-10 h-10 rounded-2xl items-center justify-center me-3 shrink-0 shadow-xs ${
                isDeficit ? 'bg-rose-500/15 border border-rose-500/20' : 'bg-primary/15 border border-primary/20'
              }`}>
              <Icon
                as={isDeficit ? TrendingDown : Wallet}
                size={20}
                className={isDeficit ? 'text-rose-600 dark:text-rose-400' : 'text-primary'}
              />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                {isDeficit ? 'Net Deficit' : 'Net Balance'}
              </Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                className={`text-2xl font-extrabold tracking-tight mt-0.5 ${
                  isDeficit ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
                }`}>
                {formatINR(netSurplus)}
              </Text>
            </View>
          </View>
          <StatusBadge
            label={statusLabel}
            variant={statusVariant}
            className="py-0.5 px-2.5 rounded-full shrink-0"
          />
        </View>

        {/* Divider */}
        <View className="mt-3 pt-2.5 border-t border-border/40">
          {/* Collections | Expenses inline row */}
          <View className="flex-row items-stretch gap-2 mb-2.5">
            {/* Collections */}
            <TouchableOpacity
              onPress={onViewInflows}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="View Collections Ledger"
              className="flex-1 flex-row items-center gap-1.5 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-2.5 py-2">
              <View className="w-6 h-6 rounded-full bg-emerald-500/15 items-center justify-center shrink-0">
                <Icon as={ArrowDownLeft} size={12} className="text-emerald-600 dark:text-emerald-400" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-[10px] text-muted-foreground font-medium">Collections</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit className="text-xs font-bold text-foreground">
                  {formatINR(totalIncome)}
                </Text>
              </View>
              <Icon as={ChevronRight} size={12} className="text-muted-foreground/40 shrink-0" />
            </TouchableOpacity>

            {/* Expenses */}
            <TouchableOpacity
              onPress={onViewOutflows}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="View Expenses Ledger"
              className="flex-1 flex-row items-center gap-1.5 bg-rose-500/8 border border-rose-500/20 rounded-xl px-2.5 py-2">
              <View className="w-6 h-6 rounded-full bg-rose-500/15 items-center justify-center shrink-0">
                <Icon as={ArrowUpRight} size={12} className="text-rose-600 dark:text-rose-400" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-[10px] text-muted-foreground font-medium">Expenses</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit className="text-xs font-bold text-foreground">
                  {formatINR(totalExpenses)}
                </Text>
                {overview.outstandingVendorLiabilities > 0 && (overview.reconciledExpensePayments ?? 0) === 0 && (
                  <Text className="text-[9px] text-amber-600 dark:text-amber-400 font-medium" numberOfLines={1}>
                    Pending payout
                  </Text>
                )}
              </View>
              <Icon as={ChevronRight} size={12} className="text-muted-foreground/40 shrink-0" />
            </TouchableOpacity>
          </View>

          {/* Runway Row */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 flex-1 me-2">
              <View className="w-6 h-6 rounded-xl bg-emerald-500/15 border border-emerald-500/30 items-center justify-center shrink-0">
                <Icon as={ShieldCheck} size={12} className="text-emerald-600 dark:text-emerald-400" />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-semibold text-foreground" numberOfLines={1}>
                  Runway · {exactRunwayText}
                </Text>
                <Text className="text-[10px] text-muted-foreground" numberOfLines={1}>
                  {isSelfSustaining
                    ? 'Collections exceed operational expenses.'
                    : `Sustains ~${exactRunwayText} of operational expenses`}
                </Text>
              </View>
            </View>

            {onOpenSimulator && (
              <TouchableOpacity
                onPress={onOpenSimulator}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="View Reserve & Cash Flow Details"
                className="flex-row items-center gap-0.5 px-2 py-1 rounded-lg bg-muted/60 border border-border/50 shrink-0">
                <Text className="text-[11px] font-semibold text-foreground">Details</Text>
                <Icon as={ChevronRight} size={12} className="text-muted-foreground" />
              </TouchableOpacity>
            )}
          </View>

          {/* Monthly Metrics Row (only when data > 0) */}
          {(displayMonthlyIn > 0 || displayMonthlyOut > 0) && (
            <View className="flex-row items-center justify-between mt-2.5 p-2 bg-muted/30 rounded-xl border border-border/30">
              <View className="flex-1 items-center">
                <Text className="text-[10px] text-muted-foreground font-medium mb-0.5">Monthly In</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit className="text-xs font-bold text-foreground">
                  {formatINR(displayMonthlyIn)}
                </Text>
              </View>
              <View className="h-5 w-px bg-border/40" />
              <View className="flex-1 items-center">
                <Text className="text-[10px] text-muted-foreground font-medium mb-0.5">Monthly Out</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit className="text-xs font-bold text-foreground">
                  {formatINR(displayMonthlyOut)}
                </Text>
              </View>
              <View className="h-5 w-px bg-border/40" />
              <View className="flex-1 items-center">
                <Text className="text-[10px] text-muted-foreground font-medium mb-0.5">Net Monthly</Text>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  className={`text-xs font-bold ${
                    displayNetMonthly >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                  {displayNetMonthly >= 0
                    ? `+${formatINR(displayNetMonthly)}`
                    : `-${formatINR(Math.abs(displayNetMonthly))}`}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* ── Pending Dues Alert ── */}
      {outstandingDues > 0 && (
        <View className="px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex-row items-center justify-between">
          <View className="flex-row items-center gap-2 flex-1 me-2">
            <Icon as={AlertCircle} size={15} className="text-amber-700 dark:text-amber-400 shrink-0" />
            <Text className="text-xs font-medium text-foreground" numberOfLines={1}>
              Pending Dues
            </Text>
          </View>
          <Text numberOfLines={1} className="text-sm font-bold text-amber-800 dark:text-amber-300">
            {formatINR(outstandingDues)}
          </Text>
        </View>
      )}
    </View>
  );
};

export default FinancialSummaryCards;
