import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { SearchBar } from '@/components/forms/SearchBar';
import {
  Compass,
  X,
  Wrench,
  Building2,
  Receipt,
  ShieldCheck,
  Calendar,
  Search,
  PlusCircle,
  Users,
  Wallet,
  QrCode,
  Sliders,
  Home,
  Sparkles,
} from 'lucide-react-native';

export interface GlobalNavCategory {
  title: string;
  items: Array<{
    id: string;
    label: string;
    route: string;
    icon: any;
    color: string;
    badge?: string;
  }>;
}

interface GlobalNavModalProps {
  visible: boolean;
  onClose: () => void;
}

export const GlobalNavModal: React.FC<GlobalNavModalProps> = ({ visible, onClose }) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const categories: GlobalNavCategory[] = [
    {
      title: 'DASHBOARD & OVERVIEW',
      items: [
        { id: 'dash-main', label: 'Executive Dashboard', route: '/(resident)/amenities/dashboard', icon: Home, color: '#3b82f6' },
        { id: 'dash-comp', label: 'Complaints Dashboard', route: '/(resident)/complaints/dashboard', icon: Wrench, color: '#f59e0b' },
      ],
    },
    {
      title: 'COMMUNITY & DIRECTORY',
      items: [
        { id: 'cd-directory', label: 'Community Directory', route: '/(resident)/directory/index', icon: Users, color: '#10b981' },
        { id: 'cd-notes', label: 'All Community Notes', route: '/(resident)/notes/index', icon: Sparkles, color: '#ec4899', badge: '24h' },
      ],
    },
    {
      title: 'COMPLAINTS & MAINTENANCE',
      items: [
        { id: 'c-raise', label: 'Raise Ticket', route: '/(resident)/complaints/raise-ticket', icon: PlusCircle, color: '#3b82f6' },
        { id: 'c-my', label: 'Track My Tickets', route: '/(resident)/complaints/my-tickets', icon: Search, color: '#f59e0b' },
        { id: 'c-manage', label: 'Management Board', route: '/(resident)/complaints/manage', icon: Sliders, color: '#6366f1' },
        { id: 'c-staff', label: 'Staff Directory', route: '/(resident)/complaints/staff', icon: Users, color: '#10b981' },
      ],
    },
    {
      title: 'AMENITIES & BOOKINGS',
      items: [
        { id: 'a-discover', label: 'Discover Amenities', route: '/(resident)/amenities/discover', icon: Building2, color: '#14b8a6' },
        { id: 'a-bookings', label: 'My Booking Passes', route: '/(resident)/amenities/my-bookings', icon: Calendar, color: '#6366f1' },
        { id: 'a-wallet', label: 'Amenity Wallet', route: '/(resident)/amenities/wallet', icon: Wallet, color: '#06b6d4' },
        { id: 'a-scanner', label: 'QR Scanner', route: '/(resident)/amenities/scanner', icon: QrCode, color: '#a855f7' },
      ],
    },
    {
      title: 'BILLING & INVOICES',
      items: [
        { id: 'b-main', label: 'Billing Center', route: '/(resident)/billing', icon: Receipt, color: '#10b981' },
        { id: 'b-dues', label: 'My Outstanding Dues', route: '/(resident)/billing/my-dues', icon: Receipt, color: '#f43f5e' },
      ],
    },
    {
      title: 'VISITORS & SECURITY',
      items: [
        { id: 'v-main', label: 'Visitor Pass Hub', route: '/(resident)/visitor', icon: ShieldCheck, color: '#8b5cf6' },
      ],
    },
  ];

  const handleNavigate = (route: string) => {
    onClose();
    router.push(route as any);
  };

  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((item) =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase().trim())
      ),
    }))
    .filter((cat) => cat.items.length > 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-card border-t border-border rounded-t-3xl h-[85%] p-4 shadow-2xl gap-3">
          {/* Header Bar */}
          <View className="flex-row items-center justify-between pb-3 border-b border-border/80">
            <View className="flex-row items-center gap-2">
              <View className="bg-primary/15 p-2 rounded-xl border border-primary/25">
                <Icon as={Compass} size={20} className="text-primary" />
              </View>
              <View>
                <Text className="text-base font-bold text-foreground">Global Easy Navigation</Text>
                <Text className="text-xs text-muted-foreground">Jump to any module or feature instantly</Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="p-2 rounded-full bg-secondary border border-border/60">
              <Icon as={X} size={17} className="text-foreground" />
            </TouchableOpacity>
          </View>

          {/* Search Filter Bar */}
          <View className="my-1">
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Filter feature navigation..."
            />
          </View>

          {/* Categorized Navigation List */}
          <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category, catIdx) => (
                <View key={catIdx} className="mb-5">
                  <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5 px-1">
                    {category.title}
                  </Text>

                  <View className="flex-row flex-wrap justify-between gap-y-2.5">
                    {category.items.map((item) => (
                      <Pressable
                        key={item.id}
                        onPress={() => handleNavigate(item.route)}
                        className="w-[48.5%] bg-card p-3 rounded-2xl border border-border/80 flex-row items-center justify-between active:bg-secondary/50 shadow-xs relative"
                      >
                        {item.badge ? (
                          <View className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 bg-primary rounded-full z-10">
                            <Text className="text-[9px] font-bold text-primary-foreground">{item.badge}</Text>
                          </View>
                        ) : null}

                        <View className="flex-row items-center flex-1 me-1">
                          <View className="w-8 h-8 rounded-xl bg-secondary border border-border/50 items-center justify-center me-2.5 shrink-0">
                            <Icon as={item.icon} size={16} color={item.color} />
                          </View>
                          <Text className="text-xs font-bold text-foreground flex-1 text-start" numberOfLines={1}>
                            {item.label}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))
            ) : (
              <View className="p-8 items-center justify-center bg-card rounded-2xl border border-border mt-4">
                <Text className="text-xs font-semibold text-muted-foreground">
                  No matching feature found for "{searchQuery}"
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default GlobalNavModal;
