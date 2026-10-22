import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/common/Card';
import { ProgressBar } from '@/components/common/ProgressBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  PieChart,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react-native';
import {
  ExpenseSummaryData,
  ExpenseCategoryBreakdown,
} from '../services/expenseService';

interface ExpensePeriodAnalysisCardProps {
  period: string;
  summary: ExpenseSummaryData | null;
  loading?: boolean;
}

const formatCurrency = (value: number | string | null | undefined) =>
  String.fromCharCode(0x20b9) + Number(value || 0).toLocaleString('en-IN');

const categoryColors = [
  'bg-primary',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-indigo-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-violet-500',
];

const periodDisplayNames: Record<string, string> = {
  TODAY: 'Today',
  WEEKLY: 'This Week',
  MONTHLY: 'This Month',
  YEARLY: 'This Year',
  ALL_TIME: 'All Time',
};

const periodBenchmarkNames: Record<string, string> = {
  TODAY: 'yesterday',
  WEEKLY: 'last week',
  MONTHLY: 'last month',
  YEARLY: 'last year',
};

export const ExpensePeriodAnalysisCard: React.FC<ExpensePeriodAnalysisCardProps> = ({
  period,
  summary,
  loading = false,
}) => {
  const [expanded, setExpanded] = useState(false);

  const categories: ExpenseCategoryBreakdown[] = summary?.categoryBreakdown || [];
  const totalExpenses = summary?.totalExpenses || 0;
  const comparison = summary?.comparison;
  const periodLabel = periodDisplayNames[period] || 'Selected Period';
  const benchmarkLabel = periodBenchmarkNames[period] || 'prior period';

  // Do not show comparison pill for ALL_TIME as there is no prior period
  const hasComparison = period !== 'ALL_TIME' && comparison && comparison.percentageChange !== null;
  const isUp = comparison?.trendDirection === 'up';
  const isDown = comparison?.trendDirection === 'down';

  // Find top spending category
  const topCategory = categories.length > 0 ? categories[0] : null;

  if (!loading && categories.length === 0 && totalExpenses === 0) {
    return null;
  }

  return (
    <Card className="p-3.5 border border-border/80 shadow-xs mb-1">
      {/* Header Row: Whole card header is clickable */}
      <Pressable
        onPress={() => setExpanded(!expanded)}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse spending analysis' : 'Expand spending analysis'}
        className="flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
          <View className="size-8 rounded-xl bg-primary/10 items-center justify-center shrink-0">
            <PieChart size={17} className="text-primary" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-xs font-bold text-foreground">
              {periodLabel} Category Analysis
            </Text>
            <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
              {topCategory && !expanded
                ? `Top: ${topCategory.category} (${topCategory.percentage}%)`
                : `${categories.length} ${categories.length === 1 ? 'category' : 'categories'} recorded`}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2 shrink-0">
          {hasComparison && (
            <View
              className={`flex-row items-center gap-1 rounded-full px-2 py-0.5 ${
                isUp
                  ? 'bg-amber-500/10 border border-amber-500/20'
                  : isDown
                  ? 'bg-emerald-500/10 border border-emerald-500/20'
                  : 'bg-muted border border-border'
              }`}
            >
              {isUp ? (
                <TrendingUp size={11} className="text-amber-600 dark:text-amber-400" />
              ) : isDown ? (
                <TrendingDown size={11} className="text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Minus size={11} className="text-muted-foreground" />
              )}
              <Text
                className={`text-[10px] font-bold ${
                  isUp
                    ? 'text-amber-600 dark:text-amber-400'
                    : isDown
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground'
                }`}
              >
                {Math.abs(comparison.percentageChange || 0)}% vs {benchmarkLabel}
              </Text>
            </View>
          )}

          <View className="size-7 rounded-lg items-center justify-center bg-muted/60">
            {expanded ? (
              <ChevronUp size={15} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={15} className="text-muted-foreground" />
            )}
          </View>
        </View>
      </Pressable>

      {/* Expanded Breakdown Section */}
      {expanded && (
        <View className="mt-4 pt-3 border-t border-border/60 gap-3.5">
          {topCategory && totalExpenses > 0 && (
            <View className="flex-row items-center justify-between rounded-xl bg-muted/40 p-2.5 border border-border/40">
              <View className="flex-row items-center gap-2">
                <Layers size={14} className="text-primary" />
                <Text className="text-xs text-muted-foreground font-medium">
                  Dominant Spend:
                </Text>
                <Text className="text-xs font-bold text-foreground">
                  {topCategory.category}
                </Text>
              </View>
              <StatusBadge
                label={`${topCategory.percentage}%`}
                variant="info"
                size="sm"
              />
            </View>
          )}

          {/* Category Progress Bars */}
          <View className="gap-3">
            {categories.map((item, index) => {
              const colorClass = categoryColors[index % categoryColors.length];
              return (
                <View key={item.category} className="gap-1.5">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2 flex-1">
                      <View className={`size-2.5 rounded-full ${colorClass}`} />
                      <Text
                        numberOfLines={1}
                        className="text-xs font-semibold text-foreground flex-1"
                      >
                        {item.category}
                      </Text>
                      <Text className="text-[11px] text-muted-foreground">
                        ({item.count} {item.count === 1 ? 'bill' : 'bills'})
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-xs font-bold text-foreground">
                        {formatCurrency(item.amount)}
                      </Text>
                      <Text className="text-[11px] font-bold text-muted-foreground w-11 text-right">
                        {item.percentage}%
                      </Text>
                    </View>
                  </View>

                  <ProgressBar
                    progress={item.percentage}
                    color={colorClass}
                    className="h-1.5 bg-muted/70"
                  />
                </View>
              );
            })}
          </View>
        </View>
      )}
    </Card>
  );
};
