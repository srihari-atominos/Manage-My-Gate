import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge';
import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react-native';
import { type RunwayAnalytics } from '../types';
import { formatINR } from '../utils/financeFormatters';

interface FinancialRunwayCardProps {
  runway?: RunwayAnalytics | null;
}

export const FinancialRunwayCard: React.FC<FinancialRunwayCardProps> = ({ runway }) => {
  if (!runway) return null;

  const {
    remainingBalance = 0,
    averageMonthlyExpenses = 0,
    averageMonthlyCollections = 0,
    netMonthlyBurn = 0,
    isSelfSustaining = false,
    runwayMonths,
    grossRunwayMonths,
    runwayHealth,
    projectedDepletionDate,
  } = runway;

  // If there's no transaction or financial data yet for this period, omit cleanly
  const hasData =
    averageMonthlyExpenses > 0 ||
    averageMonthlyCollections > 0 ||
    remainingBalance !== 0;
  if (!hasData) return null;

  const isHealthyOrSurplus =
    isSelfSustaining || runwayHealth === 'SURPLUS' || runwayHealth === 'HEALTHY';
  const isCaution = runwayHealth === 'CAUTION';
  const isCritical = runwayHealth === 'CRITICAL' || remainingBalance < 0;

  const coverageMonths = isSelfSustaining
    ? (grossRunwayMonths ?? runwayMonths ?? 0)
    : (runwayMonths ?? grossRunwayMonths ?? 0);

  const statusVariant: StatusVariant = isHealthyOrSurplus
    ? 'success'
    : isCaution
    ? 'warning'
    : 'danger';

  const statusLabel = isSelfSustaining
    ? 'Self-Sustaining'
    : runwayHealth === 'HEALTHY'
    ? `${coverageMonths} Mo Reserve`
    : isCaution
    ? `${coverageMonths} Mo Reserve`
    : 'Action Needed';

  // Standard community benchmark: 6 Months reserve fund
  const targetReserveMonths = 6;
  const progressPercent = Math.min(
    100,
    Math.max(0, (coverageMonths / targetReserveMonths) * 100)
  );

  return (
    <View className="p-3.5 mb-3.5 bg-card border border-border/40 rounded-2xl shadow-xs">
      {/* ── 1. Header ── */}
      <View className="flex-row items-center justify-between mb-2.5 pb-2.5 border-b border-border/30">
        <View className="flex-row items-center gap-2.5">
          <View
            className={`w-8 h-8 rounded-full items-center justify-center ${
              isHealthyOrSurplus
                ? 'bg-emerald-500/10'
                : isCaution
                ? 'bg-amber-500/10'
                : 'bg-rose-500/10'
            }`}>
            <Icon
              as={
                isHealthyOrSurplus
                  ? ShieldCheck
                  : isCaution
                  ? AlertTriangle
                  : ShieldAlert
              }
              size={16}
              className={
                isHealthyOrSurplus
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : isCaution
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
              }
            />
          </View>
          <Text className="text-sm font-bold text-foreground font-sans tracking-tight">
            Reserve & Cash Flow Health
          </Text>
        </View>

        <StatusBadge
          label={statusLabel}
          variant={statusVariant}
          className="py-0.5 px-2.5 rounded-full shrink-0"
        />
      </View>

      {/* ── 2. Plain English Explanation ── */}
      <View className="mb-3">
        {isSelfSustaining ? (
          <View className="flex-row items-start gap-1.5">
            <Icon
              as={Sparkles}
              size={13}
              className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
            />
            <Text className="text-xs text-foreground font-medium leading-relaxed">
              Collections exceed expenses with an estimated net surplus of{' '}
              <Text className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatINR(Math.abs(netMonthlyBurn))}/mo
              </Text>
              . Current reserves can cover{' '}
              <Text className="font-bold text-foreground">
                {coverageMonths} months
              </Text>{' '}
              of operating costs with zero new income.
            </Text>
          </View>
        ) : isCritical ? (
          <Text className="text-xs text-rose-700 dark:text-rose-400 font-medium leading-relaxed">
            Expenses exceed collections and society reserves are low. Collecting pending maintenance dues will stabilize the cash flow.
          </Text>
        ) : (
          <Text className="text-xs text-foreground font-medium leading-relaxed">
            Expenses currently exceed collections by{' '}
            <Text className="font-bold text-rose-600 dark:text-rose-400">
              {formatINR(netMonthlyBurn)}/mo
            </Text>
            . Existing reserves will sustain normal operations for approximately{' '}
            <Text className="font-bold text-foreground">
              {coverageMonths} months
            </Text>
            {projectedDepletionDate ? ` (projected until ${projectedDepletionDate})` : ''}.
          </Text>
        )}
      </View>

      {/* ── 3. Simple Monthly Cash Flow Benchmarks ── */}
      <View className="flex-row items-center justify-between p-2.5 bg-muted/30 rounded-xl mb-3">
        {/* Monthly Collections */}
        <View className="flex-1 items-center">
          <View className="flex-row items-center gap-1 mb-0.5">
            <Icon as={ArrowDownLeft} size={11} className="text-emerald-600 dark:text-emerald-400" />
            <Text className="text-[10px] text-muted-foreground font-medium">Monthly In</Text>
          </View>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            className="text-xs font-bold text-foreground">
            {formatINR(averageMonthlyCollections)}
          </Text>
        </View>

        <View className="h-6 w-px bg-border/40" />

        {/* Monthly Expenses */}
        <View className="flex-1 items-center">
          <View className="flex-row items-center gap-1 mb-0.5">
            <Icon as={ArrowUpRight} size={11} className="text-rose-600 dark:text-rose-400" />
            <Text className="text-[10px] text-muted-foreground font-medium">Monthly Out</Text>
          </View>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            className="text-xs font-bold text-foreground">
            {formatINR(averageMonthlyExpenses)}
          </Text>
        </View>

        <View className="h-6 w-px bg-border/40" />

        {/* Net Flow */}
        <View className="flex-1 items-center">
          <Text className="text-[10px] text-muted-foreground font-medium mb-0.5">Net Monthly</Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            className={`text-xs font-bold ${
              isSelfSustaining || netMonthlyBurn <= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}>
            {netMonthlyBurn <= 0
              ? `+${formatINR(Math.abs(netMonthlyBurn))}`
              : `-${formatINR(netMonthlyBurn)}`}
          </Text>
        </View>
      </View>

      {/* ── 4. Reserve Coverage Progress Bar ── */}
      <View className="pt-1">
        <View className="flex-row items-center justify-between mb-1.5">
          <Text className="text-xs font-semibold text-foreground">
            Reserve Coverage
          </Text>
          <Text className="text-xs font-bold text-foreground">
            {coverageMonths > 0 ? `${coverageMonths} Months` : '0 Months'}
          </Text>
        </View>

        <View className="h-2 w-full bg-muted/60 rounded-full overflow-hidden border border-border/30">
          <View
            style={{ width: `${progressPercent}%` }}
            className={`h-full rounded-full ${
              isHealthyOrSurplus
                ? 'bg-emerald-500'
                : isCaution
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
          />
        </View>

        <View className="flex-row items-center justify-between mt-1.5">
          <Text className="text-[10px] text-muted-foreground">
            Target: 6.0 Months Reserve Fund
          </Text>
          <Text className="text-[10px] text-muted-foreground">
            {progressPercent >= 100 ? 'Fully Funded' : `${Math.round(progressPercent)}% of target`}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default FinancialRunwayCard;
