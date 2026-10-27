import React from 'react';
import { View } from 'react-native';
import { Card } from '@/components/common/Card';
import { Text } from '@/components/ui/text';
import { ProgressBar } from '@/components/common/ProgressBar';
import { Icon } from '@/components/ui/icon';
import { Layers } from 'lucide-react-native';
import { type ExpenseBreakdownItem } from '../types';
import { formatINR } from '../utils/financeFormatters';

interface ExpenseBreakdownCardProps {
  breakdown: ExpenseBreakdownItem[];
  totalExpenses: number;
}

const CATEGORY_COLORS = [
  'bg-amber-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-sky-500',
  'bg-purple-500',
  'bg-rose-500',
  'bg-orange-500',
];

export const ExpenseBreakdownCard: React.FC<ExpenseBreakdownCardProps> = ({
  breakdown,
  totalExpenses,
}) => {
  const hasItems = Array.isArray(breakdown) && breakdown.length > 0;

  return (
    <Card className="p-5 mb-5 rounded-3xl border border-border/80 bg-card shadow-2xs">
      <View className="flex-row items-center justify-between flex-wrap gap-2 mb-4">
        <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
          <View className="size-9 rounded-2xl bg-rose-500/10 border border-rose-500/20 items-center justify-center shrink-0">
            <Icon as={Layers} size={18} className="text-rose-600 dark:text-rose-400" />
          </View>
          <View>
            <Text className="text-base font-bold text-foreground" numberOfLines={1}>
              Disbursements
            </Text>
            <Text className="text-[11px] text-muted-foreground font-medium">
              Expense categorization
            </Text>
          </View>
        </View>
        <View className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 shrink-0">
          <Text className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">
            {formatINR(totalExpenses)}
          </Text>
        </View>
      </View>

      {!hasItems ? (
        <View className="py-8 items-center justify-center bg-muted/15 rounded-2xl border border-dashed border-border/60">
          <Text className="text-xs text-muted-foreground font-medium">
            No disbursements recorded for this period.
          </Text>
        </View>
      ) : (
        <View className="gap-3.5 pt-1">
          {breakdown.map((item, index) => {
            const colorClass = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
            return (
              <View key={item.category} className="gap-1.5 p-3 rounded-2xl bg-muted/20 border border-border/40">
                <View className="flex-row justify-between items-center">
                  <Text
                    className="text-sm font-bold text-foreground flex-1 me-2"
                    numberOfLines={1}>
                    {item.category}
                  </Text>
                  <View className="flex-row items-center gap-1.5 shrink-0">
                    <Text className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
                      {formatINR(item.amount)}
                    </Text>
                    <View className="px-1.5 py-0.5 rounded bg-muted border border-border/40">
                      <Text className="text-[10px] font-bold text-muted-foreground">
                        {item.percentage}%
                      </Text>
                    </View>
                  </View>
                </View>
                <ProgressBar
                  progress={Math.max(0, Math.min(100, item.percentage))}
                  color={colorClass}
                />
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
};

export default ExpenseBreakdownCard;
