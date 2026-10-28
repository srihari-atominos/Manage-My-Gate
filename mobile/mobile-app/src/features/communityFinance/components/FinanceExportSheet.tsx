import React, { useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { FileDown, FileSpreadsheet, FileText, CheckCircle2, Filter, Layers } from 'lucide-react-native';
import { type ExportFormat, type TransactionFilters } from '../types';

export type { ExportFormat } from '../types';

export interface FinanceExportSheetProps {
  visible: boolean;
  onClose: () => void;
  filters?: Partial<TransactionFilters>;
  activeFilters?: Partial<TransactionFilters>;
  totalRecords?: number;
  onGenerateExport: (format: ExportFormat) => Promise<void>;
  isExporting?: boolean;
  isLoading?: boolean;
}

interface FormatOption {
  id: ExportFormat;
  title: string;
  badge: string;
  description: string;
  icon: any;
  accentColor: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: 'csv',
    title: 'CSV Spreadsheet',
    badge: '.csv',
    description: 'Download the filtered transactions as a spreadsheet-compatible CSV file.',
    icon: FileDown,
    accentColor: '#3B82F6',
  },
  {
    id: 'xlsx',
    title: 'Microsoft Excel',
    badge: '.xlsx',
    description: 'Download a detailed financial workbook with transaction records, summaries, and charts.',
    icon: FileSpreadsheet,
    accentColor: '#10B981',
  },
  {
    id: 'pdf',
    title: 'Financial PDF Report',
    badge: '.pdf',
    description: 'Download a formatted financial report with financial summaries, charts, graphs, and transaction details.',
    icon: FileText,
    accentColor: '#F59E0B',
  },
];

export const FinanceExportSheet: React.FC<FinanceExportSheetProps> = ({
  visible,
  onClose,
  filters,
  activeFilters,
  totalRecords,
  onGenerateExport,
  isExporting,
  isLoading,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('xlsx');

  const safeFilters: TransactionFilters = {
    period: filters?.period || activeFilters?.period || 'This Month',
    type: filters?.type || activeFilters?.type || 'all',
    domain: filters?.domain || activeFilters?.domain || 'ALL',
    status: filters?.status || activeFilters?.status || 'ALL',
    search: filters?.search || activeFilters?.search || '',
    startDate: filters?.startDate || activeFilters?.startDate,
    endDate: filters?.endDate || activeFilters?.endDate,
  };

  const effectiveIsExporting = Boolean(isExporting || isLoading);

  const hasCustomFilters = Boolean(
    safeFilters.search ||
    (safeFilters.type && safeFilters.type !== 'all') ||
    (safeFilters.domain && safeFilters.domain !== 'ALL') ||
    (safeFilters.status && safeFilters.status !== 'ALL')
  );

  const handleGenerate = async () => {
    if (effectiveIsExporting) return;
    await onGenerateExport(selectedFormat);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Export Financial Records">
      <View className="p-4 gap-4">
        {/* 1. Active Filters & Scope Summary */}
        <View className="p-3.5 rounded-2xl bg-muted/40 border border-border/60">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-1.5">
              <Icon as={hasCustomFilters ? Filter : Layers} size={13} className="text-primary" />
              <Text className="text-xs font-bold text-foreground">
                {hasCustomFilters ? 'Active Filter Scope' : 'Export Scope'}
              </Text>
            </View>
            {totalRecords !== undefined ? (
              <View className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                <Text className="text-[10px] font-bold text-primary">
                  {totalRecords} {totalRecords === 1 ? 'Record' : 'Records'}
                </Text>
              </View>
            ) : (
              <View className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                <Text className="text-[10px] font-bold text-primary">
                  All Matching
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row flex-wrap gap-1.5 mt-1">
            {/* Period Badge */}
            <View className="px-2.5 py-1 rounded-full bg-card border border-border/70 flex-row items-center gap-1">
              <Text className="text-[10px] text-muted-foreground">Period:</Text>
              <Text className="text-[10px] font-bold text-foreground">
                {safeFilters.period}
              </Text>
            </View>

            {/* Type Badge */}
            {safeFilters.type !== 'all' && (
              <View className="px-2.5 py-1 rounded-full bg-card border border-border/70 flex-row items-center gap-1">
                <Text className="text-[10px] text-muted-foreground">Flow:</Text>
                <Text className="text-[10px] font-bold text-foreground">
                  {safeFilters.type === 'income' ? 'Inflows' : 'Outflows'}
                </Text>
              </View>
            )}

            {/* Domain Badge */}
            {safeFilters.domain !== 'ALL' && (
              <View className="px-2.5 py-1 rounded-full bg-card border border-border/70 flex-row items-center gap-1">
                <Text className="text-[10px] text-muted-foreground">Source:</Text>
                <Text className="text-[10px] font-bold text-foreground">
                  {safeFilters.domain}
                </Text>
              </View>
            )}

            {/* Status Badge */}
            {safeFilters.status !== 'ALL' && (
              <View className="px-2.5 py-1 rounded-full bg-card border border-border/70 flex-row items-center gap-1">
                <Text className="text-[10px] text-muted-foreground">Status:</Text>
                <Text className="text-[10px] font-bold text-foreground">
                  {safeFilters.status}
                </Text>
              </View>
            )}

            {/* Search Badge */}
            {Boolean(safeFilters.search) && (
              <View className="px-2.5 py-1 rounded-full bg-card border border-border/70 flex-row items-center gap-1">
                <Text className="text-[10px] text-muted-foreground">Query:</Text>
                <Text className="text-[10px] font-bold text-foreground" numberOfLines={1}>
                  "{safeFilters.search}"
                </Text>
              </View>
            )}

            {/* Date Range if set */}
            {Boolean(safeFilters.startDate && safeFilters.endDate) && (
              <View className="px-2.5 py-1 rounded-full bg-card border border-border/70 flex-row items-center gap-1">
                <Text className="text-[10px] text-muted-foreground">Dates:</Text>
                <Text className="text-[10px] font-bold text-foreground">
                  {safeFilters.startDate} to {safeFilters.endDate}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 2. Format Selection Cards */}
        <Text className="text-xs font-semibold text-muted-foreground">
          Select Export Format
        </Text>

        <View className="gap-2.5">
          {FORMAT_OPTIONS.map((opt) => {
            const isSelected = selectedFormat === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setSelectedFormat(opt.id)}
                disabled={isExporting}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Select ${opt.title} format`}
                className={`p-3.5 rounded-2xl border transition-all flex-row items-start gap-3 ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-border/80 bg-card'
                }`}>
                {/* Format Icon */}
                <View
                  className="h-10 w-10 rounded-xl items-center justify-center mt-0.5"
                  style={{ backgroundColor: `${opt.accentColor}18` }}>
                  <Icon as={opt.icon} size={20} color={opt.accentColor} />
                </View>

                {/* Details */}
                <View className="flex-1">
                  <View className="flex-row items-center justify-between mb-0.5">
                    <Text className="text-sm font-bold text-foreground">
                      {opt.title}
                    </Text>
                    <View className="px-2 py-0.5 rounded-md bg-muted border border-border/60">
                      <Text className="text-[10px] font-bold text-foreground">
                        {opt.badge}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-muted-foreground leading-relaxed">
                    {opt.description}
                  </Text>
                </View>

                {/* Radio check */}
                <View className="ms-1 mt-1">
                  {isSelected ? (
                    <Icon as={CheckCircle2} size={18} className="text-primary" />
                  ) : (
                    <View className="h-4 w-4 rounded-full border border-border/80" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 3. Empty data notice if 0 records */}
        {totalRecords === 0 && (
          <View className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
            <Text className="text-xs text-blue-900 dark:text-blue-300 font-medium">
              {hasCustomFilters
                ? 'No transactions match the selected filters. Export will generate a statement for this scope.'
                : 'No cash transactions recorded for this period. Export will generate a statement showing opening balance, dues, and financial summary.'}
            </Text>
          </View>
        )}

        {/* 4. Action Buttons */}
        <View className="gap-2 pt-2">
          <Button
            variant="default"
            onPress={handleGenerate}
            disabled={effectiveIsExporting}
            className="w-full h-12 rounded-xl flex-row items-center justify-center gap-2">
            {effectiveIsExporting ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text className="font-bold text-white text-sm">
                  Generating {selectedFormat.toUpperCase()} Report...
                </Text>
              </>
            ) : (
              <>
                <Icon as={FileDown} size={17} className="text-white" />
                <Text className="font-bold text-white text-sm">
                  Generate {selectedFormat.toUpperCase()} Export
                </Text>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onPress={onClose}
            disabled={effectiveIsExporting}
            className="w-full h-11 rounded-xl">
            <Text className="font-semibold text-foreground text-sm">Cancel</Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};

export default FinanceExportSheet;
