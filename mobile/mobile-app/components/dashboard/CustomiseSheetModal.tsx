import React, { useState, useEffect, useMemo } from 'react';
import { View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Sparkles } from 'lucide-react-native';
import CustomiseDeckZone from './CustomiseDeckZone';
import CustomiseAvailableZone from './CustomiseAvailableZone';
import { useAuth } from '@/src/features/auth/hooks/useAuth';

export interface AppFeatureItem {
  id: string;
  name: string;
  subtitle: string;
  iconName: string;
  colorBg: string;
  colorIcon: string;
  route?: string;
  categoryKey?: string;
  categoryName?: string;
  badge?: string;
  badgeColor?: string;
  permission?: string;
}

export const ALL_AVAILABLE_FEATURES: AppFeatureItem[] = [
  // Visitor & Gate Security (Web App Aligned)
  { id: 'visitor_resident_passes', name: 'Resident Passes', subtitle: 'QR Visitor Pass', iconName: 'QrCode', colorBg: 'bg-sky-500/10', colorIcon: '#03A9F4', route: '/(resident)/visitor', permission: 'visitor:resident', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },
  { id: 'visitor_admin_dashboard', name: 'Admin Visitor Console', subtitle: 'Master Control', iconName: 'LayoutDashboard', colorBg: 'bg-indigo-500/10', colorIcon: '#6366f1', route: '/(resident)/visitor/admin', permission: 'visitor:admin', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },
  { id: 'visitor_community_passes', name: 'All Community Passes', subtitle: 'All Villa Passes', iconName: 'Filter', colorBg: 'bg-sky-500/10', colorIcon: '#03A9F4', route: '/(resident)/visitor/admin/community-passes', permission: 'visitor:admin', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },
  { id: 'visitor_blacklist', name: 'Visitor Blacklist', subtitle: 'Restricted Registry', iconName: 'ShieldX', colorBg: 'bg-rose-500/10', colorIcon: '#f43f5e', route: '/(resident)/visitor/admin/blacklist', permission: 'visitor:admin', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },
  { id: 'visitor_admin_logs', name: 'Admin Gate Logs', subtitle: 'Live Gate Audit', iconName: 'ShieldAlert', colorBg: 'bg-slate-500/10', colorIcon: '#64748b', route: '/(resident)/visitor/admin-logs', permission: 'visitor:admin', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },
  { id: 'visitor_gate_console', name: 'Gate Console', subtitle: 'Guard Check-in', iconName: 'ScanLine', colorBg: 'bg-emerald-500/10', colorIcon: '#10b981', route: '/(resident)/visitor/gate-console', permission: 'visitor:guard', categoryKey: 'visitor_management', categoryName: 'Visitor & Gate Security' },

  // Amenities & Facilities (Web App Aligned)
  { id: 'amenities_discover', name: 'Discover Amenities', subtitle: 'Browse Facilities', iconName: 'Search', colorBg: 'bg-blue-500/10', colorIcon: '#3b82f6', permission: 'amenities:discover', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Facilities' },
  { id: 'amenities_my_booking', name: 'My Bookings', subtitle: 'Active Reservations', iconName: 'CalendarCheck', colorBg: 'bg-indigo-500/10', colorIcon: '#6366f1', permission: 'amenities:my_booking', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Facilities' },
  { id: 'amenities_wallet', name: 'Digital Wallet', subtitle: 'Prepaid Credits', iconName: 'Wallet', colorBg: 'bg-cyan-500/10', colorIcon: '#06b6d4', permission: 'amenities:wallet', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Facilities' },
  { id: 'amenities_master', name: 'Amenity Master', subtitle: 'Slot & Pricing Config', iconName: 'Building2', colorBg: 'bg-teal-500/10', colorIcon: '#14b8a6', permission: 'amenities:amenities', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Facilities' },
  { id: 'amenities_admin_calendar', name: 'Admin Calendar', subtitle: 'Master Schedule', iconName: 'CalendarDays', colorBg: 'bg-sky-500/10', colorIcon: '#03A9F4', permission: 'amenities:admin_calander', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Facilities' },
  { id: 'amenities_ledgers', name: 'Ledgers', subtitle: 'Revenue & Refunds', iconName: 'Receipt', colorBg: 'bg-emerald-500/10', colorIcon: '#10b981', permission: 'amenities:ledgers', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Facilities' },
  { id: 'amenities_maintenance', name: 'Maintenance', subtitle: 'Facility Downtime', iconName: 'Wrench', colorBg: 'bg-amber-500/10', colorIcon: '#f59e0b', permission: 'amenities:maintenance', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Facilities' },
  { id: 'amenities_scanner', name: 'Security Scanner', subtitle: 'Gate Scanner', iconName: 'QrCode', colorBg: 'bg-purple-500/10', colorIcon: '#a855f7', permission: 'amenities:scanner', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Facilities' },
  { id: 'amenities_security_logs', name: 'Security Logs', subtitle: 'Audit Trails', iconName: 'ClipboardList', colorBg: 'bg-slate-500/10', colorIcon: '#64748b', permission: 'amenities:security_logs', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Facilities' },
  { id: 'amenities_settings', name: 'Amenity Settings', subtitle: 'Global Rules', iconName: 'SlidersHorizontal', colorBg: 'bg-rose-500/10', colorIcon: '#f43f5e', permission: 'amenities:settings', categoryKey: 'amenities_facilities', categoryName: 'Amenities & Facilities' },

  // Complaints & Helpdesk (Web App Aligned)
  { id: 'complaints_dashboard', name: 'Complaints Analytics', subtitle: 'SLA Tracking', iconName: 'BarChart3', colorBg: 'bg-purple-500/10', colorIcon: '#a855f7', permission: 'complaints:dashboard', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },
  { id: 'complaints_raise_ticket', name: 'Raise Ticket', subtitle: 'Report Issue', iconName: 'PlusCircle', colorBg: 'bg-rose-500/10', colorIcon: '#f43f5e', permission: 'complaints:raise_ticket', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },
  { id: 'complaints_track_requests', name: 'Track My Tickets', subtitle: 'Live Ticket Status', iconName: 'ListOrdered', colorBg: 'bg-sky-500/10', colorIcon: '#03A9F4', permission: 'complaints:track_requests', badge: '1', badgeColor: 'bg-rose-500 text-white', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },
  { id: 'complaints_complaint_management', name: 'Complaint Queue', subtitle: 'Admin Board', iconName: 'Kanban', colorBg: 'bg-indigo-500/10', colorIcon: '#6366f1', permission: 'complaints:complaint_management', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },
  { id: 'complaints_staff', name: 'Staff & Vendors', subtitle: 'Roster & Contacts', iconName: 'Users2', colorBg: 'bg-teal-500/10', colorIcon: '#14b8a6', permission: 'complaints:staff', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },
  { id: 'complaints_assignee', name: 'Assignee Console', subtitle: 'Work Orders', iconName: 'UserCheck', colorBg: 'bg-emerald-500/10', colorIcon: '#10b981', permission: 'complaints:assignee', categoryKey: 'complaints_helpdesk', categoryName: 'Complaints & Maintenance' },

  // Notice Board (Web App Aligned)
  { id: 'notices_active_board', name: 'Notice Board', subtitle: 'Community Circulars', iconName: 'BellRing', colorBg: 'bg-teal-500/10', colorIcon: '#14b8a6', permission: 'notices:active_board', badge: '8', badgeColor: 'bg-teal-600 text-white', categoryKey: 'notice_board_polls', categoryName: 'Notice Board' },
  { id: 'notices_dashboard', name: 'Notice Dashboard', subtitle: 'Broadcast Stats', iconName: 'LayoutDashboard', colorBg: 'bg-indigo-500/10', colorIcon: '#6366f1', permission: 'notices:dashboard', categoryKey: 'notice_board_polls', categoryName: 'Notice Board' },
  { id: 'notices_manage_notices', name: 'Manage Notices', subtitle: 'Draft & Publish', iconName: 'FileEdit', colorBg: 'bg-sky-500/10', colorIcon: '#03A9F4', permission: 'notices:manage_notices', categoryKey: 'notice_board_polls', categoryName: 'Notice Board' },
  { id: 'notices_polls', name: 'Community Polls', subtitle: 'Resident Voting', iconName: 'Vote', colorBg: 'bg-purple-500/10', colorIcon: '#a855f7', permission: 'notices:polls', categoryKey: 'notice_board_polls', categoryName: 'Notice Board' },

  // Financial Suite & Billing (Web App Aligned)
  { id: 'billing_dashboard', name: 'Billing & Dues', subtitle: 'Pay Invoices', iconName: 'CreditCard', colorBg: 'bg-sky-500/10', colorIcon: '#03A9F4', permission: 'billing:dashboard', badge: 'Due', badgeColor: 'bg-amber-500 text-white', categoryKey: 'financial_billing', categoryName: 'Financial Suite & Billing' },
  { id: 'billing_assessment_manager', name: 'Assessments', subtitle: 'Levy Generation', iconName: 'Calculator', colorBg: 'bg-emerald-500/10', colorIcon: '#10b981', permission: 'billing:assessment_manager', categoryKey: 'financial_billing', categoryName: 'Financial Suite & Billing' },
  { id: 'billing_action_center', name: 'Dispute Center', subtitle: 'Tax Receipts', iconName: 'FileText', colorBg: 'bg-blue-500/10', colorIcon: '#3b82f6', permission: 'billing:action_center', categoryKey: 'financial_billing', categoryName: 'Financial Suite & Billing' },

  // Administration & Security (Web App Aligned)
  { id: 'admin_users', name: 'User Management', subtitle: 'Residents & Staff', iconName: 'Users', colorBg: 'bg-indigo-500/10', colorIcon: '#6366f1', permission: 'users:read', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_villas', name: 'Unit Management', subtitle: 'Blocks & Villas', iconName: 'Home', colorBg: 'bg-teal-500/10', colorIcon: '#14b8a6', permission: 'villas:read', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_role_builder', name: 'Role Builder', subtitle: 'RBAC Matrices', iconName: 'ShieldCheck', colorBg: 'bg-rose-500/10', colorIcon: '#f43f5e', permission: 'roles:read', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_workspace_settings', name: 'Workspace Settings', subtitle: 'Tenant Rules', iconName: 'Settings', colorBg: 'bg-sky-500/10', colorIcon: '#03A9F4', permission: 'workspaces:read', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_integrations', name: 'Integration Hub', subtitle: 'API & Webhooks', iconName: 'Layers', colorBg: 'bg-amber-500/10', colorIcon: '#f59e0b', permission: 'integrations:read', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_organizations', name: 'Org Manager', subtitle: 'Platform Multi-tenant', iconName: 'Building', colorBg: 'bg-purple-500/10', colorIcon: '#a855f7', permission: 'platform:super_admin', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
  { id: 'admin_audit_logs', name: 'Audit Logs', subtitle: 'Security & Access Logs', iconName: 'FileSpreadsheet', colorBg: 'bg-slate-500/10', colorIcon: '#64748b', permission: 'platform:super_admin', categoryKey: 'administration_security', categoryName: 'Administration & Security' },
];

export const REAL_APP_FEATURES = ALL_AVAILABLE_FEATURES;

const VALID_CATALOG_IDS = new Set(ALL_AVAILABLE_FEATURES.map((f) => f.id));

const DEFAULT_FEATURE_SELECTION = [
  'billing_dashboard',
  'visitor_resident_passes',
  'complaints_track_requests',
  'notices_active_board',
];

interface CustomiseSheetModalProps {
  visible: boolean;
  onClose: () => void;
  activeFeatureIds?: string[];
  onToggleFeature?: (featureId: string) => void;
  onSave?: (selectedIds: string[]) => void;
}

export const CustomiseSheetModal: React.FC<CustomiseSheetModalProps> = ({
  visible,
  onClose,
  activeFeatureIds = DEFAULT_FEATURE_SELECTION,
  onToggleFeature,
  onSave,
}) => {
  const { user } = useAuth();
  const userPermissions: string[] = user?.permissions || [];
  const userRoleName = user?.role || (user as any)?.activeRole || (Array.isArray((user as any)?.roles) ? (typeof (user as any).roles[0] === 'string' ? (user as any).roles[0] : (user as any).roles[0]?.name) : '');
  const isSuperAdmin = Boolean(
    userPermissions.includes('platform:super_admin') ||
    userRoleName === 'Platform Super Admin' ||
    userRoleName === 'SuperAdmin' ||
    userRoleName === 'Community Admin' ||
    user?.isPlatform === true
  );

  const availableFeaturesForUser = useMemo(() => {
    return ALL_AVAILABLE_FEATURES.filter((item: any) => {
      if (item.permission && !isSuperAdmin) {
        return userPermissions.includes(item.permission);
      }
      return true;
    });
  }, [userPermissions, isSuperAdmin]);

  // Sanitize incoming IDs to ensure only valid current catalog items are retained
  const sanitizedActiveIds = useMemo(() => {
    if (!activeFeatureIds || activeFeatureIds.length === 0) {
      return DEFAULT_FEATURE_SELECTION;
    }
    const valid = activeFeatureIds.filter((id) => VALID_CATALOG_IDS.has(id));
    return valid.length > 0 ? valid : DEFAULT_FEATURE_SELECTION;
  }, [activeFeatureIds]);

  const [selectedIds, setSelectedIds] = useState<string[]>(sanitizedActiveIds);

  // Sync selectedIds state whenever activeFeatureIds or visible state changes
  useEffect(() => {
    if (visible) {
      setSelectedIds(sanitizedActiveIds);
    }
  }, [visible, sanitizedActiveIds]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else if (selectedIds.length < 7) {
      setSelectedIds([...selectedIds, id]);
    }
    if (onToggleFeature) onToggleFeature(id);
  };

  const handleSave = () => {
    if (onSave) onSave(selectedIds);
    onClose();
  };

  // Active selected items (up to 7)
  const activeItems = useMemo(() => {
    return ALL_AVAILABLE_FEATURES.filter((f) => selectedIds.includes(f.id)).slice(0, 7);
  }, [selectedIds]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-card border-t border-border rounded-t-3xl max-h-[90%] shadow-2xl overflow-hidden flex-col">
          {/* Header Bar */}
          <View className="flex-row justify-between items-center px-5 py-4 border-b border-border bg-card">
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="py-1 px-2">
              <Text className="text-sm font-semibold text-muted-foreground">Cancel</Text>
            </TouchableOpacity>

            <Text className="text-base font-extrabold text-foreground">Customise Dashboard</Text>

            <TouchableOpacity onPress={handleSave} activeOpacity={0.8} className="bg-primary px-4 py-1.5 rounded-full">
              <Text className="text-xs font-bold text-primary-foreground">Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {/* Active Selection Zone (The Deck) */}
            <CustomiseDeckZone
              activeItems={activeItems}
              maxCapacity={7}
              onRemoveItem={toggleSelect}
            />

            {/* Divider Sub-header */}
            <View className="px-5 py-3 bg-muted/30 border-b border-border flex-row items-center justify-between">
              <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Available Actions ({selectedIds.length}/7 Selected)
              </Text>
              <Sparkles size={14} color="#0284c7" />
            </View>

            {/* Available Features (The Collection - Grouped by Web Domain) */}
            <CustomiseAvailableZone
              features={availableFeaturesForUser}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default CustomiseSheetModal;
