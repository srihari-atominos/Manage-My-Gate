import React from 'react';
import { View, Text } from 'react-native';
import { KPICard, StatusBadge } from '@/components/ui';
import { Card } from '@/components/common';
import { CreditCard, ShieldAlert } from 'lucide-react-native';

interface HeroLiabilityBannerProps {
  totalPortfolioDue: number;
  unitBreakdown?: any[];
  secondaryCompliance?: any[];
  onPayAllPress?: () => void;
}

export const HeroLiabilityBanner: React.FC<HeroLiabilityBannerProps> = ({
  totalPortfolioDue,
  unitBreakdown = [],
  secondaryCompliance = [],
}) => {
  const currencySymbol = '₹';
  const hasArrears = totalPortfolioDue > 0;
  const overdueCount = unitBreakdown.filter((item) => item.status === 'OVERDUE').length;

  return (
    <View className="mb-4 space-y-3">
      {/* Main Total Due Card */}
      <Card className="bg-primary/10 border border-primary/20 p-4 rounded-2xl">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center space-x-2">
            <CreditCard size={20} className="text-primary me-2" />
            <Text className="text-sm font-medium text-muted-foreground text-start">
              Total Outstanding Portfolio Due
            </Text>
          </View>
          <StatusBadge
            label={hasArrears ? `${overdueCount > 0 ? 'OVERDUE' : 'PENDING'}` : 'CLEAR'}
            variant={hasArrears ? (overdueCount > 0 ? 'danger' : 'warning') : 'success'}
            dot
          />
        </View>

        <View className="flex-row items-baseline justify-between mt-1">
          <Text className="text-3xl font-extrabold text-foreground text-start">
            {currencySymbol}{totalPortfolioDue.toLocaleString()}
          </Text>
          <Text className="text-xs text-muted-foreground text-start">
            {unitBreakdown.length} {unitBreakdown.length === 1 ? 'Unit Dues' : 'Units Pending'}
          </Text>
        </View>

        {/* Secondary compliance warnings */}
        {secondaryCompliance.length > 0 && (
          <View className="mt-3 pt-3 border-t border-border flex-row items-center space-x-2">
            <ShieldAlert size={16} className="text-amber-500 me-2" />
            <Text className="text-xs font-medium text-amber-600 dark:text-amber-400 flex-1 text-start">
              {secondaryCompliance.length} compliance warning(s) active on linked units
            </Text>
          </View>
        )}
      </Card>

      {/* KPI Quick Grid */}
      <View className="flex-row space-x-2">
        <View className="flex-1 me-1">
          <KPICard
            title="Total Dues"
            value={`${currencySymbol}${totalPortfolioDue.toLocaleString()}`}
            iconName="CreditCard"
            iconColor="#3b82f6"
          />
        </View>
        <View className="flex-1 ms-1">
          <KPICard
            title="Overdue Units"
            value={overdueCount.toString()}
            iconName="AlertCircle"
            iconColor={overdueCount > 0 ? '#ef4444' : '#3b82f6'}
          />
        </View>
      </View>
    </View>
  );
};

export default HeroLiabilityBanner;
