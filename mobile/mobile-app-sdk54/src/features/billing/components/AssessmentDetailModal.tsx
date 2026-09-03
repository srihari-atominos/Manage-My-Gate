import React from 'react';
import { View, ScrollView } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/common/Button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Play, Pencil, Trash2, Receipt, Calendar, Calculator, Users } from 'lucide-react-native';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface AssessmentDetailModalProps {
  visible: boolean;
  onClose: () => void;
  assessment: any | null;
  onRun?: (assessment: any) => void;
  onEdit?: (assessment: any) => void;
  onDelete?: (assessment: any) => void;
  onViewLedger?: () => void;
}

export const AssessmentDetailModal: React.FC<AssessmentDetailModalProps> = ({
  visible,
  onClose,
  assessment,
  onRun,
  onEdit,
  onDelete,
  onViewLedger,
}) => {
  if (!assessment) return null;

  const isActive = assessment.isActive !== false;
  const calcMethod = assessment.calculationMethod || {};
  const calcType = calcMethod.type || 'FLAT_RATE';
  const targetScope = assessment.targetScope || {};
  const scopeType = targetScope.type || 'ALL_COMMUNITY';
  const scopeIds = targetScope.scopeIds || [];
  const targetRoleIds = targetScope.targetRoleIds || [];

  // Rate Display helper
  const getRateDisplay = () => {
    if (calcType === 'PER_SQ_FT') {
      return `₹${calcMethod.ratePerSqFt || 0} / sq.ft`;
    }
    if (calcType === 'TIERED_BHK') {
      return 'Tiered by Floorplan Layout';
    }
    return `₹${(calcMethod.flatAmount || 0).toLocaleString('en-IN')} Flat / Unit`;
  };

  // Schedule Timing helper
  const getScheduleTiming = () => {
    if (assessment.type === 'ONE_TIME') {
      if (assessment.triggerMode === 'SCHEDULED' && assessment.scheduledDateTime) {
        return `Scheduled: ${new Date(assessment.scheduledDateTime).toLocaleString()}`;
      }
      return 'Immediate Trigger';
    }
    if (assessment.billingCycle === 'WEEKLY') {
      const days = Array.isArray(assessment.selectedDays) && assessment.selectedDays.length > 0
        ? assessment.selectedDays.map((d: number) => WEEKDAYS[d] || `Day ${d}`).join(', ')
        : 'Every Monday';
      return `Weekly on ${days}`;
    }
    const day = assessment.generationDay;
    if (day === 'LAST_DAY_OF_MONTH') return 'Last day of the month';
    if (day === 'FIRST' || day === 1) return '1st day of the month';
    return `Day ${day || 1} of the month`;
  };

  // Target Scope Display helper
  const getScopeDisplay = () => {
    switch (scopeType) {
      case 'ALL_COMMUNITY':
        return 'Entire Community (All Active Homes)';
      case 'SPECIFIC_UNITS':
        return `${scopeIds.length} Specific Unit${scopeIds.length === 1 ? '' : 's'}`;
      case 'VILLA_BLOCK':
        return `Block / Tower (${scopeIds.join(', ') || 'All Blocks'})`;
      case 'UNIT_TYPE':
        return `Floorplan Type (${scopeIds.join(', ') || 'All Types'})`;
      case 'SPECIFIC_USERS':
        return `${scopeIds.length} Specific Resident${scopeIds.length === 1 ? '' : 's'}`;
      default:
        return scopeType.replace(/_/g, ' ');
    }
  };

  const tieredRates = calcMethod.tieredRates || {};
  const hasTieredRates = calcType === 'TIERED_BHK' && Object.keys(tieredRates).length > 0;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Assessment Rule Details"
    >
      <View className="gap-3.5 pb-6">
        {/* Top Hero Card */}
        <View className="bg-primary/5 border border-primary/20 rounded-2xl p-4 gap-2">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 me-2">
              <Text className="text-lg font-extrabold text-foreground" numberOfLines={2}>
                {assessment.name}
              </Text>
              <Text className="text-xs text-muted-foreground font-semibold mt-0.5">
                {assessment.billingCycle || 'MONTHLY'} • {assessment.type || 'RECURRING'}
              </Text>
            </View>
            <StatusBadge
              label={isActive ? 'ACTIVE' : 'INACTIVE'}
              variant={isActive ? 'success' : 'neutral'}
              dot
            />
          </View>

          {/* Quick Rate & Period Pill */}
          <View className="flex-row flex-wrap gap-2 pt-1">
            <View className="bg-background border border-border px-2.5 py-1 rounded-full flex-row items-center gap-1.5">
              <Icon as={Calculator} size={12} className="text-primary" />
              <Text className="text-xs font-bold text-primary">{getRateDisplay()}</Text>
            </View>
            <View className="bg-background border border-border px-2.5 py-1 rounded-full flex-row items-center gap-1.5">
              <Icon as={Calendar} size={12} className="text-muted-foreground" />
              <Text className="text-xs text-muted-foreground font-medium">
                {assessment.billingCycle || 'MONTHLY'}
              </Text>
            </View>
          </View>
        </View>

        {/* Section 1: Schedule & Frequency */}
        <DetailSection title="Schedule & Frequency" iconName="Calendar">
          <DetailRow label="Assessment Type" value={assessment.type || 'RECURRING'} />
          <DetailRow label="Billing Frequency" value={assessment.billingCycle || 'MONTHLY'} />
          <DetailRow label="Invoice Generation" value={getScheduleTiming()} />
          {assessment.type === 'CAPITAL_REPAIR' ? (
            <>
              <DetailRow
                label="Collection Method"
                value={assessment.collectionMethod === 'INSTALLMENT' ? 'Installment Plan' : 'Lump Sum'}
              />
              {assessment.collectionMethod === 'INSTALLMENT' && (
                <DetailRow
                  label="Total Installments"
                  value={`${assessment.totalInstallments || 2} Cycles`}
                />
              )}
            </>
          ) : null}
          {assessment.createdAt ? (
            <DetailRow
              label="Created On"
              value={new Date(assessment.createdAt).toLocaleDateString()}
            />
          ) : null}
        </DetailSection>

        {/* Section 2: Calculation Method & Rates */}
        <DetailSection title="Calculation Formula" iconName="Calculator">
          <DetailRow label="Method Type" value={calcType.replace(/_/g, ' ')} />
          {calcType === 'FLAT_RATE' && (
            <DetailRow
              label="Flat Rate Amount"
              value={`₹${(calcMethod.flatAmount || 0).toLocaleString('en-IN')}`}
            />
          )}
          {calcType === 'PER_SQ_FT' && (
            <DetailRow
              label="Rate per Sq.Ft"
              value={`₹${calcMethod.ratePerSqFt || 0} / sq.ft`}
            />
          )}

          {/* Tiered BHK Grid */}
          {hasTieredRates && (
            <View className="pt-2 gap-1.5">
              <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Rates by Floorplan Layout:
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
                {[
                  { label: 'Studio', key: 'studio' },
                  { label: '1 BHK', key: 'bhk1' },
                  { label: '2 BHK', key: 'bhk2' },
                  { label: '3 BHK', key: 'bhk3' },
                  { label: '4 BHK', key: 'bhk4' },
                  { label: 'Penthouse', key: 'penthouse' },
                  { label: 'Duplex', key: 'duplex' },
                ].map(({ label, key }) => {
                  const val = tieredRates[key];
                  if (!val || Number(val) <= 0) return null;
                  return (
                    <View
                      key={key}
                      className="bg-muted/60 border border-border px-2.5 py-1.5 rounded-xl flex-row items-center gap-1"
                    >
                      <Text className="text-xs text-muted-foreground font-semibold">{label}:</Text>
                      <Text className="text-xs font-bold text-foreground">
                        ₹{Number(val).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </DetailSection>

        {/* Section 3: Target Scope & Roles */}
        <DetailSection title="Target Audience & Scope" iconName="Users">
          <DetailRow label="Target Scope" value={getScopeDisplay()} />
          <DetailRow
            label="Billable Roles"
            value={
              targetRoleIds.length > 0
                ? `${targetRoleIds.length} Resident Role${targetRoleIds.length === 1 ? '' : 's'}`
                : targetScope.targetRole || 'Owner & Tenant'
            }
          />
          {scopeType === 'SPECIFIC_UNITS' && scopeIds.length > 0 && (
            <DetailRow label="Linked Units" value={`${scopeIds.length} Units Targeted`} />
          )}
        </DetailSection>

        {/* Section 4: Execution & Billing History */}
        <DetailSection title="Execution & Billing History" iconName="Clock">
          <DetailRow
            label="Last Billed Period"
            value={assessment.lastBilledPeriod ? `Cycle ${assessment.lastBilledPeriod}` : 'Never Executed'}
          />
          {assessment.lastRunAt ? (
            <DetailRow
              label="Last Run Timestamp"
              value={new Date(assessment.lastRunAt).toLocaleString()}
            />
          ) : null}
          {assessment.lastRunStats?.totalTargeted ? (
            <DetailRow
              label="Batch Summary"
              value={`${assessment.lastRunStats.created || 0} Invoiced, ${assessment.lastRunStats.duplicatesSkipped || 0} Skipped`}
            />
          ) : null}
          <DetailRow
            label="Current Cycle Status"
            value={
              assessment.lastBilledPeriod
                ? `Last generated for ${assessment.lastBilledPeriod}`
                : 'Ready for initial run'
            }
          />
        </DetailSection>

        {/* Action Buttons */}
        <View className="gap-2 pt-2">
          {/* Primary Action: Run Billing */}
          {onRun && (
            <Button
              variant="default"
              size="lg"
              className="w-full bg-emerald-600 active:bg-emerald-700 flex-row items-center justify-center"
              onPress={() => {
                onClose();
                onRun(assessment);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Execute manual billing run for ${assessment.name}`}
            >
              <Icon as={Play} size={16} className="text-white me-2" />
              <Text className="font-bold text-sm text-white">Run Billing Now</Text>
            </Button>
          )}

          {/* Secondary Action Row: Edit & Ledger */}
          <View className="flex-row gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="default"
                className="flex-1 border-border flex-row items-center justify-center"
                onPress={() => {
                  onClose();
                  onEdit(assessment);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${assessment.name}`}
              >
                <Icon as={Pencil} size={14} className="text-foreground me-1.5" />
                <Text className="font-bold text-xs text-foreground">Edit Rule</Text>
              </Button>
            )}

            {onViewLedger && (
              <Button
                variant="outline"
                size="default"
                className="flex-1 border-border flex-row items-center justify-center"
                onPress={() => {
                  onClose();
                  onViewLedger();
                }}
                accessibilityRole="button"
                accessibilityLabel="View linked invoices in ledger"
              >
                <Icon as={Receipt} size={14} className="text-foreground me-1.5" />
                <Text className="font-bold text-xs text-foreground">View Ledger</Text>
              </Button>
            )}
          </View>

          {/* Destructive Action: Delete Rule */}
          {onDelete && (
            <Button
              variant="outline"
              size="default"
              className="w-full border-destructive/30 bg-destructive/5 active:bg-destructive/15 flex-row items-center justify-center"
              onPress={() => {
                onClose();
                onDelete(assessment);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Delete assessment rule ${assessment.name}`}
            >
              <Icon as={Trash2} size={14} className="text-destructive me-1.5" />
              <Text className="font-bold text-xs text-destructive">Delete Assessment Rule</Text>
            </Button>
          )}
        </View>
      </View>
    </BottomSheet>
  );
};

export default AssessmentDetailModal;
