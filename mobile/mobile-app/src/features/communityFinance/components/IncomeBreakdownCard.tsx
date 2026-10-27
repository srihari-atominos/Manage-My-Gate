import React from 'react';
import { View } from 'react-native';
import { Card } from '@/components/common/Card';
import { Text } from '@/components/ui/text';
import { ProgressBar } from '@/components/common/ProgressBar';
import { Icon } from '@/components/ui/icon';
import { Landmark, ArrowDownLeft } from 'lucide-react-native';
import { type IncomeBreakdownItem } from '../types';
import { formatINR } from '../utils/financeFormatters';

interface IncomeBreakdownCardProps {
  breakdown: IncomeBreakdownItem[];
  totalIncome: number;
}

export const IncomeBreakdownCard: React.FC<IncomeBreakdownCardProps> = ({
  breakdown,
  totalIncome,
}) => {
  const hasItems = Array.isArray(breakdown) && breakdown.length > 0;

  return (
    <Card className="p-5 mb-5 rounded-3xl border border-border/80 bg-card shadow-2xs">
      <View className="flex-row items-center justify-between flex-wrap gap-2 mb-4">
        <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
          <View className="size-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 items-center justify-center shrink-0">
            <Icon as={Landmark} size={18} className="text-emerald-600 dark:text-emerald-400" />
          </View>
          <View>
            <Text className="text-base font-bold text-foreground" numberOfLines={1}>
              Income Sources
            </Text>
            <Text className="text-[11px] text-muted-foreground font-medium">
              Revenue distribution
            </Text>
          </View>
        </View>
        <View className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 shrink-0">
          <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {formatINR(totalIncome)}
          </Text>
        </View>
      </View>

      {!hasItems ? (
        <View className="py-8 items-center justify-center bg-muted/15 rounded-2xl border border-dashed border-border/60">
          <Text className="text-xs text-muted-foreground font-medium">
            No income recorded for this period.
          </Text>
        </View>
      ) : (
        <View className="gap-3.5 pt-1">
          {breakdown.map((item) => {
            const isNegative = item.amount < 0;
            return (
              <View key={item.source} className="gap-1.5 p-3 rounded-2xl bg-muted/20 border border-border/40">
                <View className="flex-row justify-between items-center">
                  <Text
                    className="text-sm font-bold text-foreground flex-1 me-2"
                    numberOfLines={1}>
                    {item.source}
                  </Text>
                  <View className="flex-row items-center gap-1.5 shrink-0">
                    <Text
                      className={`text-sm font-bold font-mono ${
                        isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
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
                  color={isNegative ? 'bg-destructive' : 'bg-emerald-500'}
                />
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
};

export default IncomeBreakdownCard;
