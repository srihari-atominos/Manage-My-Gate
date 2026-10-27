import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { BarChart3, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { type TimeSeriesPoint } from '../types';
import { formatINR } from '../utils/financeFormatters';

export type ChartTimeframe = 'daily' | 'monthly' | 'yearly' | 'all';

interface IncomeExpenseChartProps {
  data: TimeSeriesPoint[];
  dailyData?: TimeSeriesPoint[];
  monthlyData?: TimeSeriesPoint[];
  yearlyData?: TimeSeriesPoint[];
  allData?: TimeSeriesPoint[];
  initialGrouping?: ChartTimeframe;
  onGroupingChange?: (grouping: ChartTimeframe) => void;
}

const CHART_HEIGHT = 92; // Target 3D bar height in pixels

/**
 * Aggregates raw time series points dynamically by daily, monthly, yearly, or all
 * and strictly sorts in chronological order (oldest to newest)
 */
export const aggregateTimeSeries = (
  rawPoints: TimeSeriesPoint[],
  grouping: ChartTimeframe
): TimeSeriesPoint[] => {
  if (!rawPoints || rawPoints.length === 0) return [];

  // Sort raw points by periodKey ascending (oldest first)
  const sortedRaw = [...rawPoints].sort((a, b) =>
    (a.periodKey || '').localeCompare(b.periodKey || '')
  );

  if (grouping === 'all') {
    return sortedRaw.map((p) => {
      let label = p.label;
      if (p.periodKey && p.periodKey.length === 7 && p.periodKey.includes('-')) {
        const [y, m] = p.periodKey.split('-');
        const dateObj = new Date(Number(y), Number(m) - 1, 1);
        if (!isNaN(dateObj.getTime())) {
          label = dateObj.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        }
      }
      return { ...p, label };
    });
  }

  if (grouping === 'daily') {
    return sortedRaw.map((p) => {
      let label = p.label;
      if (p.periodKey && p.periodKey.length === 10) {
        const [y, m, d] = p.periodKey.split('-');
        const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
        if (!isNaN(dateObj.getTime())) {
          label = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        }
      }
      return { ...p, label };
    });
  }

  if (grouping === 'monthly') {
    const map = new Map<string, { income: number; expense: number; label: string }>();

    for (const point of sortedRaw) {
      const monthKey = point.periodKey ? point.periodKey.substring(0, 7) : point.label;
      let monthLabel = point.label;

      if (monthKey.length === 7 && monthKey.includes('-')) {
        const [y, m] = monthKey.split('-');
        const dateObj = new Date(Number(y), Number(m) - 1, 1);
        if (!isNaN(dateObj.getTime())) {
          monthLabel = dateObj.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        }
      }

      const existing = map.get(monthKey) || { income: 0, expense: 0, label: monthLabel };
      existing.income += Number(point.income || 0);
      existing.expense += Number(point.expense || 0);
      map.set(monthKey, existing);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodKey, val]) => ({
        periodKey,
        label: val.label,
        income: Math.round(val.income),
        expense: Math.round(val.expense),
        netSurplus: Math.round(val.income - val.expense),
      }));
  }

  if (grouping === 'yearly') {
    const map = new Map<string, { income: number; expense: number; label: string }>();

    for (const point of sortedRaw) {
      const yearKey = point.periodKey ? point.periodKey.substring(0, 4) : '2026';
      const existing = map.get(yearKey) || { income: 0, expense: 0, label: yearKey };
      existing.income += Number(point.income || 0);
      existing.expense += Number(point.expense || 0);
      map.set(yearKey, existing);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodKey, val]) => ({
        periodKey,
        label: val.label,
        income: Math.round(val.income),
        expense: Math.round(val.expense),
        netSurplus: Math.round(val.income - val.expense),
      }));
  }

  return sortedRaw;
};

export const IncomeExpenseChart: React.FC<IncomeExpenseChartProps> = ({
  data,
  dailyData,
  monthlyData,
  yearlyData,
  allData,
  initialGrouping = 'daily',
  onGroupingChange,
}) => {
  const [activeGrouping, setActiveGrouping] = useState<ChartTimeframe>(initialGrouping);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Dynamic series selection per timeframe
  const rawCurrentSeries = useMemo(() => {
    if (activeGrouping === 'daily') {
      return dailyData && dailyData.length > 0 ? dailyData : data;
    }
    if (activeGrouping === 'monthly') {
      if (monthlyData && monthlyData.length > 0) return monthlyData;
      return data;
    }
    if (activeGrouping === 'yearly') {
      if (yearlyData && yearlyData.length > 0) return yearlyData;
      if (monthlyData && monthlyData.length > 0) return monthlyData;
      return data;
    }
    if (activeGrouping === 'all') {
      if (allData && allData.length > 0) return allData;
      if (monthlyData && monthlyData.length > 0) return monthlyData;
      return data;
    }
    return data;
  }, [activeGrouping, data, dailyData, monthlyData, yearlyData, allData]);

  // Grouped dataset according to active timeframe
  const displayData = useMemo(
    () => aggregateTimeSeries(rawCurrentSeries, activeGrouping),
    [rawCurrentSeries, activeGrouping]
  );

  // Horizontal ScrollView ref for auto-positioning at the latest date
  const scrollViewRef = useRef<ScrollView>(null);
  const isInitialScrollDone = useRef(false);

  // Smooth 3D Extrusion Entrance Animation
  const animProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animProgress.setValue(0);
    Animated.timing(animProgress, {
      toValue: 1,
      duration: 450,
      useNativeDriver: false,
    }).start();
  }, [displayData, animProgress]);

  // Auto-select latest data point
  useEffect(() => {
    if (displayData && displayData.length > 0) {
      const lastActive = [...displayData].reverse().find((d) => d.income > 0 || d.expense > 0);
      setSelectedKey(lastActive?.periodKey || displayData[displayData.length - 1].periodKey);
    } else {
      setSelectedKey(null);
    }
  }, [displayData]);

  // When timeframe or data changes, scroll to the latest point on the right
  const handleContentSizeChange = () => {
    if (displayData.length > 4) {
      scrollViewRef.current?.scrollToEnd({ animated: isInitialScrollDone.current });
      isInitialScrollDone.current = true;
    }
  };

  const handleGroupingChange = (grouping: ChartTimeframe) => {
    setActiveGrouping(grouping);
    isInitialScrollDone.current = false;
    if (onGroupingChange) {
      onGroupingChange(grouping);
    }
  };

  const maxVal = Math.max(
    ...displayData.map((d) => Math.max(Number(d.income || 0), Number(d.expense || 0))),
    1000 // Fallback ceiling to avoid division by zero
  );

  const activePoint = displayData.find((d) => d.periodKey === selectedKey) || null;
  const isScrollable = displayData.length > 4;

  // Responsive column dimensions adapted for phone viewports
  const isCompactLayout = displayData.length <= 4;
  const columnWidth = isCompactLayout ? 18 : displayData.length <= 8 ? 15 : 12;
  const itemMinWidth = isCompactLayout ? 76 : displayData.length <= 8 ? 64 : 56;
  const groundShadowWidth = isCompactLayout ? 42 : displayData.length <= 8 ? 34 : 26;

  return (
    <View className="p-5 mb-5 bg-card border border-border/50 rounded-2xl">
      {/* ── 1. Header ── */}
      <View className="flex-row items-center gap-2.5 mb-1">
        <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center">
          <Icon as={BarChart3} size={18} className="text-primary" />
        </View>
        <Text className="text-base font-bold text-foreground font-sans tracking-tight">
          Cash Flow Trend
        </Text>
      </View>

      {/* Legend */}
      <View className="flex-row items-center gap-4 mb-4 ms-0.5">
        <View className="flex-row items-center gap-1.5">
          <View className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <Text className="text-xs text-muted-foreground font-medium">Collections</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="w-2.5 h-2.5 rounded-sm bg-slate-500" />
          <Text className="text-xs text-muted-foreground font-medium">Expenses</Text>
        </View>
      </View>

      {/* ── 2. Timeframe Selector Tabs (Daily, Monthly, Yearly, All) ── */}
      <View className="flex-row items-center justify-between p-1 bg-muted/30 rounded-xl border border-border/40 mb-4">
        {(['daily', 'monthly', 'yearly', 'all'] as const).map((mode) => {
          const isActive = activeGrouping === mode;
          const label =
            mode === 'daily'
              ? 'Daily'
              : mode === 'monthly'
              ? 'Monthly'
              : mode === 'yearly'
              ? 'Yearly'
              : 'All';

          return (
            <TouchableOpacity
              key={mode}
              onPress={() => handleGroupingChange(mode)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`View ${label} Cash Flow Trend`}
              className={`flex-1 py-2 rounded-lg items-center justify-center ${
                isActive
                  ? 'bg-primary shadow-xs'
                  : 'active:bg-muted/50'
              }`}>
              <Text
                className={`text-xs ${
                  isActive
                    ? 'font-bold text-primary-foreground'
                    : 'font-medium text-muted-foreground'
                }`}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── 3. Interactive 3D Inspection Banner ── */}
      {activePoint ? (
        <View className="mb-3 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/40 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="text-xs font-bold text-foreground">
              {activePoint.label}
            </Text>
            <View className="h-3 w-px bg-border/60" />
            <View className="flex-row items-center gap-1">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {formatINR(activePoint.income)}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <View className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {formatINR(activePoint.expense)}
              </Text>
            </View>
          </View>

          {/* Net Pill */}
          <View
            className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full ${
              activePoint.netSurplus >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'
            }`}>
            <Icon
              as={activePoint.netSurplus >= 0 ? TrendingUp : TrendingDown}
              size={11}
              className={
                activePoint.netSurplus >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }
            />
            <Text
              className={`text-[10px] font-bold ${
                activePoint.netSurplus >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}>
              {formatINR(activePoint.netSurplus)}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Side-Scroll Notice if list has many items */}
      {isScrollable && (
        <View className="flex-row items-center justify-between px-1 mb-1">
          <View className="flex-row items-center gap-1">
            <Icon as={ChevronLeft} size={11} className="text-muted-foreground/70" />
            <Text className="text-[10px] text-muted-foreground/70 font-medium">
              Swipe left to view earlier {activeGrouping === 'daily' ? 'days' : activeGrouping === 'monthly' ? 'months' : 'years'}
            </Text>
          </View>
          <Text className="text-[10px] text-muted-foreground/60 font-medium">
            {displayData.length} records
          </Text>
        </View>
      )}

      {/* ── 4. Chart Visual Area with 3D Extrusion & Horizontal Side-Scroll ── */}
      {displayData.length === 0 ? (
        <View className="py-8 px-4 items-center justify-center bg-muted/15 rounded-xl border border-dashed border-border/60">
          <Text className="text-sm text-center text-muted-foreground font-medium">
            No cash flow records available for this timeframe.
          </Text>
        </View>
      ) : (
        <View className="relative pt-1">
          {/* Subtle Background Perspective Guide Gridlines */}
          <View
            pointerEvents="none"
            style={{ height: CHART_HEIGHT }}
            className="absolute left-0 right-0 top-1 justify-between">
            <View className="w-full border-b border-dashed border-border/25 flex-row justify-end pr-1">
              <Text className="text-[9px] text-muted-foreground/50">{formatINR(maxVal)}</Text>
            </View>
            <View className="w-full border-b border-dashed border-border/20 flex-row justify-end pr-1">
              <Text className="text-[9px] text-muted-foreground/40">{formatINR(Math.round(maxVal / 2))}</Text>
            </View>
            <View className="w-full border-b border-border/40" />
          </View>

          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onContentSizeChange={handleContentSizeChange}
            contentContainerStyle={{
              paddingHorizontal: 8,
              minWidth: '100%',
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: isCompactLayout ? 'space-around' : 'flex-start',
            }}>
            {displayData.map((point) => {
              const isSelected = point.periodKey === selectedKey;

              // Compute exact pixel heights
              const rawIncome = Number(point.income || 0);
              const rawExpense = Number(point.expense || 0);

              const targetIncomeHeight =
                rawIncome > 0
                  ? Math.max(8, Math.min(CHART_HEIGHT, Math.round((rawIncome / maxVal) * CHART_HEIGHT)))
                  : 4; // subtle baseline cap

              const targetExpenseHeight =
                rawExpense > 0
                  ? Math.max(8, Math.min(CHART_HEIGHT, Math.round((rawExpense / maxVal) * CHART_HEIGHT)))
                  : 4; // subtle baseline cap

              // Animated height interpolation for smooth 3D growth
              const incomeAnimatedHeight = animProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [4, targetIncomeHeight],
              });

              const expenseAnimatedHeight = animProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [4, targetExpenseHeight],
              });

              return (
                <TouchableOpacity
                  key={point.periodKey}
                  onPress={() => setSelectedKey(point.periodKey)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`${point.label}: Collections ${formatINR(rawIncome)}, Expenses ${formatINR(rawExpense)}`}
                  style={{ minWidth: itemMinWidth }}
                  className="items-center px-1">
                  {/* Dual 3D Extruded Columns */}
                  <View
                    style={{ height: CHART_HEIGHT }}
                    className="flex-row items-end justify-center gap-1.5 w-full">
                    {/* 3D Income Column (Collections) */}
                    <View className="items-center justify-end">
                      <Animated.View
                        style={{
                          height: incomeAnimatedHeight,
                          width: columnWidth,
                          backgroundColor: '#10B981',
                          borderTopWidth: 3,
                          borderTopColor: '#6EE7B7', // 3D Top Highlight
                          borderRightWidth: 2,
                          borderRightColor: '#047857', // 3D Side Shadow
                          borderLeftWidth: 1,
                          borderLeftColor: '#34D399',
                          borderTopLeftRadius: 4,
                          borderTopRightRadius: 4,
                          shadowColor: '#047857',
                          shadowOffset: { width: 0, height: 1.5 },
                          shadowOpacity: 0.3,
                          shadowRadius: 2.5,
                          elevation: 3,
                        }}
                      />
                    </View>

                    {/* 3D Expense Column */}
                    <View className="items-center justify-end">
                      <Animated.View
                        style={{
                          height: expenseAnimatedHeight,
                          width: columnWidth,
                          backgroundColor: '#64748B',
                          borderTopWidth: 3,
                          borderTopColor: '#E2E8F0', // 3D Top Highlight
                          borderRightWidth: 2,
                          borderRightColor: '#334155', // 3D Side Shadow
                          borderLeftWidth: 1,
                          borderLeftColor: '#94A3B8',
                          borderTopLeftRadius: 4,
                          borderTopRightRadius: 4,
                          shadowColor: '#1E293B',
                          shadowOffset: { width: 0, height: 1.5 },
                          shadowOpacity: 0.3,
                          shadowRadius: 2.5,
                          elevation: 3,
                        }}
                      />
                    </View>
                  </View>

                  {/* 3D Ground Shadow / Baseline Ellipse */}
                  <View
                    style={{ width: groundShadowWidth }}
                    className={`h-1.5 rounded-full mt-1 ${
                      isSelected ? 'bg-primary/50' : 'bg-border/60'
                    }`}
                  />

                  {/* Period Date Label with Selection Pill */}
                  <View
                    className={`mt-1.5 px-2 py-0.5 rounded-md ${
                      isSelected ? 'bg-primary/15 border border-primary/30' : ''
                    }`}>
                    <Text
                      className={`text-[10px] text-center font-medium ${
                        isSelected ? 'font-bold text-primary' : 'text-muted-foreground'
                      }`}
                      numberOfLines={1}>
                      {point.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default IncomeExpenseChart;
