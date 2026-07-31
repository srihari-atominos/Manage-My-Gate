import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import {
  X,
  SlidersHorizontal,
  Plus,
  Check,
  Search,
  CreditCard,
  Wrench,
  Bell,
  ShieldCheck,
  Building2,
  Users,
  Wallet,
  Home,
  UserCheck,
  FileText,
  Clock,
} from 'lucide-react-native';

export interface AppFeatureItem {
  id: string;
  name: string;
  subtitle: string;
  moduleKey: 'billing' | 'visitor' | 'complaints' | 'noticeBoard' | 'amenities' | 'villa' | 'auth';
  moduleGroup: string;
  iconName: string;
  badge?: string;
  badgeColor?: string;
  colorBg: string;
  colorIcon: string;
}

export const REAL_APP_FEATURES: AppFeatureItem[] = [
  // Billing & Finance
  {
    id: 'billing_dues',
    name: 'Billing & Dues',
    subtitle: 'Pay maintenance charges',
    moduleKey: 'billing',
    moduleGroup: 'Billing & Finance',
    iconName: 'CreditCard',
    badge: 'New Bill',
    badgeColor: 'bg-primary text-white',
    colorBg: 'bg-primary/10',
    colorIcon: '#03A9F4',
  },
  {
    id: 'digital_wallet',
    name: 'Digital Wallet',
    subtitle: 'Manage prepaid balance',
    moduleKey: 'billing',
    moduleGroup: 'Billing & Finance',
    iconName: 'Wallet',
    colorBg: 'bg-cyan-500/10',
    colorIcon: '#06b6d4',
  },
  {
    id: 'payment_history',
    name: 'Payment Receipts',
    subtitle: 'View tax invoices & receipts',
    moduleKey: 'billing',
    moduleGroup: 'Billing & Finance',
    iconName: 'FileText',
    colorBg: 'bg-blue-500/10',
    colorIcon: '#3b82f6',
  },

  // Visitor Management
  {
    id: 'visitor_pass',
    name: 'Visitor Pass',
    subtitle: 'Create entry invite QR codes',
    moduleKey: 'visitor',
    moduleGroup: 'Visitor Management',
    iconName: 'ShieldCheck',
    colorBg: 'bg-emerald-500/10',
    colorIcon: '#10b981',
  },
  {
    id: 'gate_logs',
    name: 'Gate Entry Logs',
    subtitle: 'Track check-in & check-out',
    moduleKey: 'visitor',
    moduleGroup: 'Visitor Management',
    iconName: 'Clock',
    colorBg: 'bg-amber-500/10',
    colorIcon: '#f59e0b',
  },

  // Helpdesk & Complaints
  {
    id: 'helpdesk',
    name: 'Help Desk',
    subtitle: 'Log and track complaints',
    moduleKey: 'complaints',
    moduleGroup: 'Helpdesk & Maintenance',
    iconName: 'Wrench',
    colorBg: 'bg-rose-500/10',
    colorIcon: '#f43f5e',
  },

  // Notice Board & Announcements
  {
    id: 'notice_board',
    name: 'Notice Board',
    subtitle: 'View society announcements',
    moduleKey: 'noticeBoard',
    moduleGroup: 'Notice Board',
    iconName: 'Bell',
    badge: '8',
    badgeColor: 'bg-rose-500 text-white',
    colorBg: 'bg-teal-500/10',
    colorIcon: '#14b8a6',
  },

  // Facilities & Amenities
  {
    id: 'book_amenity',
    name: 'Book Amenities',
    subtitle: 'Clubhouse, pool & sports slots',
    moduleKey: 'amenities',
    moduleGroup: 'Facilities & Amenities',
    iconName: 'Building2',
    colorBg: 'bg-indigo-500/10',
    colorIcon: '#6366f1',
  },

  // Property & Villa
  {
    id: 'villa_unit',
    name: 'My Villa Unit',
    subtitle: 'Villa details & household',
    moduleKey: 'villa',
    moduleGroup: 'Property & Villa',
    iconName: 'Home',
    colorBg: 'bg-purple-500/10',
    colorIcon: '#a855f7',
  },
  {
    id: 'resident_directory',
    name: 'Resident Directory',
    subtitle: 'Community member contacts',
    moduleKey: 'villa',
    moduleGroup: 'Property & Villa',
    iconName: 'Users',
    colorBg: 'bg-orange-500/10',
    colorIcon: '#f97316',
  },

  // Auth & Profile
  {
    id: 'profile_security',
    name: 'Account Security',
    subtitle: 'Sessions & password',
    moduleKey: 'auth',
    moduleGroup: 'Account & Identity',
    iconName: 'UserCheck',
    colorBg: 'bg-slate-500/10',
    colorIcon: '#64748b',
  },
];

interface CustomiseSheetModalProps {
  visible: boolean;
  onClose: () => void;
  activeFeatureIds: string[];
  onToggleFeature: (featureId: string) => void;
}

export const CustomiseSheetModal: React.FC<CustomiseSheetModalProps> = ({
  visible,
  onClose,
  activeFeatureIds,
  onToggleFeature,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter features based on search query
  const filteredFeatures = React.useMemo(() => {
    if (!searchQuery.trim()) return REAL_APP_FEATURES;
    const q = searchQuery.toLowerCase().trim();
    return REAL_APP_FEATURES.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.subtitle.toLowerCase().includes(q) ||
        f.moduleGroup.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Group features by Module Group
  const groupedFeatures = React.useMemo(() => {
    const groups: { [key: string]: AppFeatureItem[] } = {};
    filteredFeatures.forEach((feature) => {
      if (!groups[feature.moduleGroup]) {
        groups[feature.moduleGroup] = [];
      }
      groups[feature.moduleGroup].push(feature);
    });
    return groups;
  }, [filteredFeatures]);

  // Active Equipped items
  const equippedItems = React.useMemo(() => {
    return REAL_APP_FEATURES.filter((f) => (activeFeatureIds || []).includes(f.id)).slice(0, 8);
  }, [activeFeatureIds]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-card border-t border-border rounded-t-3xl p-5 gap-3.5 max-h-[88%] shadow-2xl">
          {/* Header Bar */}
          <View className="flex-row justify-between items-center pb-2 border-b border-border">
            <View className="flex-row items-center gap-2">
              <View className="bg-primary/10 p-2 rounded-xl">
                <SlidersHorizontal size={20} color="#03A9F4" />
              </View>
              <View>
                <Text className="text-base font-extrabold text-foreground">Customise Quick Actions</Text>
                <Text className="text-[10px] text-muted-foreground">
                  Equip up to 8 tools for your 4x2 quick action grid ({(activeFeatureIds || []).length}/8 equipped)
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="p-1">
              <X size={20} color="#888" />
            </TouchableOpacity>
          </View>

          {/* Search Bar Input */}
          <View className="flex-row items-center bg-muted/50 border border-border rounded-xl px-3 py-2">
            <Search size={16} color="#888" className="mr-2" />
            <TextInput
              placeholder="Search app features (e.g. Pass, Dues, Notice)..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-xs text-foreground py-0"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} className="p-0.5">
                <X size={14} color="#888" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Equipped Deck Bar (8 Slots Preview) */}
          <View className="bg-primary/5 border border-primary/20 rounded-2xl p-3 gap-2">
            <Text className="text-[10px] font-bold text-primary uppercase tracking-wider">
              Equipped Quick Actions ({equippedItems.length}/8)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {equippedItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => onToggleFeature(item.id)}
                    activeOpacity={0.7}
                    className="bg-card border border-primary/30 px-2.5 py-1.5 rounded-xl flex-row items-center gap-1.5"
                  >
                    <RenderFeatureIcon iconName={item.iconName} color={item.colorIcon} size={14} />
                    <Text className="text-xs font-bold text-foreground">{item.name}</Text>
                    <X size={12} color="#f43f5e" />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Features List Grouped by Parent Module */}
          <ScrollView className="flex-1">
            <View className="gap-4 pb-4">
              {Object.keys(groupedFeatures).map((groupName) => (
                <View key={groupName} className="gap-2">
                  <Text className="text-xs font-extrabold text-muted-foreground uppercase px-1">
                    📁 {groupName}
                  </Text>

                  <View className="gap-2">
                    {groupedFeatures[groupName].map((feature) => {
                      const isEquipped = (activeFeatureIds || []).includes(feature.id);
                      return (
                        <TouchableOpacity
                          key={feature.id}
                          onPress={() => onToggleFeature(feature.id)}
                          activeOpacity={0.8}
                          className={`flex-row items-center justify-between p-3 rounded-2xl border ${
                            isEquipped
                              ? 'bg-primary/10 border-primary'
                              : 'bg-muted/30 border-border'
                          }`}
                        >
                          <View className="flex-row items-center gap-3 flex-1">
                            <View className={`p-2.5 rounded-xl ${feature.colorBg}`}>
                              <RenderFeatureIcon iconName={feature.iconName} color={feature.colorIcon} />
                            </View>
                            <View className="flex-1">
                              <Text className="text-xs font-bold text-foreground">
                                {feature.name}
                              </Text>
                              <Text className="text-[10px] text-muted-foreground">
                                {feature.subtitle}
                              </Text>
                            </View>
                          </View>

                          <View
                            className={`px-2.5 py-1 rounded-xl flex-row items-center gap-1 ${
                              isEquipped ? 'bg-primary' : 'bg-muted border border-border'
                            }`}
                          >
                            {isEquipped ? (
                              <>
                                <Check size={12} color="#fff" />
                                <Text className="text-[11px] font-bold text-primary-foreground">Equipped</Text>
                              </>
                            ) : (
                              <>
                                <Plus size={12} color="#777" />
                                <Text className="text-[11px] font-bold text-muted-foreground">Equip</Text>
                              </>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Done Button */}
          <Button onPress={onClose} className="h-11 bg-primary rounded-xl">
            <Text className="font-bold text-primary-foreground text-sm">Done Customising</Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
};

export const RenderFeatureIcon = ({ iconName, color, size = 18 }: { iconName: string; color: string; size?: number }) => {
  switch (iconName) {
    case 'CreditCard':
      return <CreditCard size={size} color={color} />;
    case 'Wrench':
      return <Wrench size={size} color={color} />;
    case 'Bell':
      return <Bell size={size} color={color} />;
    case 'ShieldCheck':
      return <ShieldCheck size={size} color={color} />;
    case 'Building2':
      return <Building2 size={size} color={color} />;
    case 'Users':
      return <Users size={size} color={color} />;
    case 'Wallet':
      return <Wallet size={size} color={color} />;
    case 'Home':
      return <Home size={size} color={color} />;
    case 'UserCheck':
      return <UserCheck size={size} color={color} />;
    case 'FileText':
      return <FileText size={size} color={color} />;
    case 'Clock':
      return <Clock size={size} color={color} />;
    default:
      return <Building2 size={size} color={color} />;
  }
};

export default CustomiseSheetModal;
