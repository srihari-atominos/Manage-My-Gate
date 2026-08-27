import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { cn } from '../../lib/utils';

export interface PayrollRow {
  id: string;
  employeeId: string;
  baseSalary: number;
  deductions: number;
  bonus: number;
  netPay: number;
}

export interface RawPayrollTableProps {
  data: PayrollRow[];
  className?: string;
}

export const RawPayrollTable = ({ data, className }: RawPayrollTableProps) => {
  return (
    <View className={cn('rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden', className)}>
      <ScrollView horizontal bounces={false} showsHorizontalScrollIndicator={false}>
        <View>
          {/* Header */}
          <View className="flex-row border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
            <View className="w-24"><Text className="text-xs font-semibold text-slate-500 uppercase">ID</Text></View>
            <View className="w-32"><Text className="text-xs font-semibold text-slate-500 uppercase">EMP_ID</Text></View>
            <View className="w-24"><Text className="text-xs font-semibold text-right text-slate-500 uppercase">BASE</Text></View>
            <View className="w-24"><Text className="text-xs font-semibold text-right text-slate-500 uppercase">DEDUCT</Text></View>
            <View className="w-24"><Text className="text-xs font-semibold text-right text-slate-500 uppercase">BONUS</Text></View>
            <View className="w-32"><Text className="text-xs font-semibold text-right text-slate-500 uppercase">NET</Text></View>
          </View>
          
          {/* Rows */}
          {data.map((row) => (
            <View key={row.id} className="flex-row border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <View className="w-24"><Text className="text-sm font-mono text-slate-900 dark:text-slate-100">{row.id}</Text></View>
              <View className="w-32"><Text className="text-sm font-mono text-slate-900 dark:text-slate-100">{row.employeeId}</Text></View>
              <View className="w-24"><Text className="text-sm font-mono text-right text-slate-900 dark:text-slate-100">{row.baseSalary}</Text></View>
              <View className="w-24"><Text className="text-sm font-mono text-right text-slate-900 dark:text-slate-100">{row.deductions}</Text></View>
              <View className="w-24"><Text className="text-sm font-mono text-right text-slate-900 dark:text-slate-100">{row.bonus}</Text></View>
              <View className="w-32"><Text className="text-sm font-mono font-bold text-right text-slate-900 dark:text-slate-100">{row.netPay}</Text></View>
            </View>
          ))}
          {data.length === 0 && (
            <View className="p-4 items-center">
              <Text className="text-sm text-slate-500">0</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};
