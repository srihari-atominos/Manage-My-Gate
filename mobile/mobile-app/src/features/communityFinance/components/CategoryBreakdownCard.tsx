import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { ProgressBar } from '@/components/common/ProgressBar';
import { Icon } from '@/components/ui/icon';
import { PieChart, ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { type IncomeBreakdownItem, type ExpenseBreakdownItem } from '../types';
import { formatINR } from '../utils/financeFormatters';

interface CategoryBreakdownCardProps {
  incomeBreakdown: IncomeBreakdownItem[];
  expenseBreakdown: ExpenseBreakdownItem[];
  totalIncome: number;
  totalExpenses: number;
}

export const CategoryBreakdownCard: React.FC<CategoryBreakdownCardProps> = ({
  incomeBreakdown,
  expenseBreakdown,
  totalIncome,
  totalExpenses,
}) => {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

  const isExpense = activeTab === 'expense';
  const currentTotal = isExpense ? totalExpenses : totalIncome;
  const items = isExpense ? expenseBreakdown : incomeBreakdown;
  const hasItems = Array.isArray(items) && items.length > 0;

  return (
    <View className="p-5 mb-5 bg-card border border-border/50 rounded-2xl">
      {/* Header */}
      <View className="flex-row items-center gap-2.5 mb-1">
        <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center">
          <Icon as={PieChart} size={18} className="text-primary" />
        </View>
        <Text className="text-base font-bold text-foreground font-sans tracking-tight">
          Category Breakdown
        </Text>
      </View>

      {/* Total for Selected Tab */}
      <Text className="text-xs text-muted-foreground mb-4 ms-0.5">
        Total {isExpense ? 'expenses' : 'collections'}:{' '}
        <Text className="text-xs font-bold text-foreground">{formatINR(currentTotal)}</Text>
      </Text>

      {/* Pill Segmented Switch */}
      <View className="flex-row p-1 bg-muted/40 rounded-full border border-border/50 mb-3">
        <TouchableOpacity
          onPress={() => setActiveTab('expense')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: isExpense }}
          accessibilityLabel="Expenses tab"
          className={`flex-1 py-2 items-center rounded-full flex-row justify-center gap-1.5 transition-all ${
            isExpense
              ? 'bg-card shadow-xs border border-border/60'
              : 'opacity-70'
          }`}>
          <Icon
            as={ArrowUpRight}
            size={12}
            className={isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}
          />
          <Text
            className={`text-xs font-semibold ${
              isExpense ? 'text-foreground font-bold' : 'text-muted-foreground'
            }`}>
            Expenses ({expenseBreakdown?.length || 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('income')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: !isExpense }}
          accessibilityLabel="Income sources tab"
          className={`flex-1 py-2 items-center rounded-full flex-row justify-center gap-1.5 transition-all ${
            !isExpense
              ? 'bg-card shadow-xs border border-border/60'
              : 'opacity-70'
          }`}>
          <Icon
            as={ArrowDownLeft}
            size={12}
            className={!isExpense ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}
          />
          <Text
            className={`text-xs font-semibold ${
              !isExpense ? 'text-foreground font-bold' : 'text-muted-foreground'
            }`}>
            Collections ({incomeBreakdown?.length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category List */}
      {!hasItems ? (
        <View className="py-8 px-4 items-center justify-center bg-muted/15 rounded-xl border border-dashed border-border/60">
          <Text className="text-sm text-center text-muted-foreground font-medium">
            {isExpense
              ? 'No expense disbursements recorded for this period.'
              : 'No collections recorded for this period.'}
          </Text>
        </View>
      ) : (
        <View>
          {items.map((item: any, index: number) => {
            const name = item.category || item.source || 'Other';
            const amount = Number(item.amount || 0);
            const percentage = Number(item.percentage || 0);
            const isNegative = amount < 0;
            const isLast = index === items.length - 1;

            return (
              <View
                key={`${name}-${index}`}
                className={`py-3 ${!isLast ? 'border-b border-border/30' : ''}`}>
                <View className="flex-row justify-between items-center mb-2">
                  <Text
                    className="text-sm font-medium text-foreground flex-1 me-2 font-sans"
                    numberOfLines={1}>
                    {name}
                  </Text>
                  <View className="flex-row items-center gap-1.5 shrink-0">
                    <Text
                      className={`text-xs font-bold ${
                        isExpense
                          ? 'text-foreground'
                          : isNegative
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}>
                      {formatINR(amount)}
                    </Text>
                    <View className="bg-muted/60 border border-border/50 px-1.5 py-0.2 rounded-full">
                      <Text className="text-[10px] font-medium text-muted-foreground">
                        {percentage}%
                      </Text>
                    </View>
                  </View>
                </View>
                <ProgressBar
                  progress={Math.max(0, Math.min(100, percentage))}
                  color={isExpense ? 'bg-slate-500 dark:bg-slate-400' : 'bg-emerald-500'}
                  className="h-1.5 w-full bg-muted/60 rounded-full border border-border/30"
                  barClassName="rounded-full"
                />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default CategoryBreakdownCard;
