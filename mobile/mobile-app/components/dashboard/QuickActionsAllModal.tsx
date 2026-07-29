import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import {
  X,
  Search,
  UserPlus,
  Car,
  Truck,
  Wrench,
  Phone,
  MessageSquare,
  QrCode,
  Baby,
  Users,
  SearchCode,
  UserCheck,
  CreditCard,
  Wallet,
  Bell,
  Building2,
  FileText,
  AlertCircle,
  ChevronRight,
} from 'lucide-react-native';

interface QuickActionsAllModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectFeature?: (featureId: string) => void;
}

export const QuickActionsAllModal: React.FC<QuickActionsAllModalProps> = ({
  visible,
  onClose,
  onSelectFeature,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleTileClick = (featureId: string) => {
    if (onSelectFeature) onSelectFeature(featureId);
    onClose();
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background">
        {/* Header Bar */}
        <View className="bg-card border-b border-border px-4 py-3.5 flex-row items-center justify-between shadow-xs">
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="p-1">
            <X size={22} color="#444" />
          </TouchableOpacity>
          <Text className="text-base font-extrabold text-foreground">Quick Actions</Text>
          <View className="size-6" />
        </View>

        <ScrollView className="flex-1 px-4 pt-3">
          <View className="gap-5 pb-12 max-w-md mx-auto w-full">
            {/* Search All Features Bar */}
            <View className="flex-row items-center bg-muted/50 border border-border rounded-2xl px-3.5 py-2.5 shadow-xs">
              <Search size={18} color="#888" className="mr-2" />
              <TextInput
                placeholder="Search all features"
                placeholderTextColor="#888"
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 text-xs text-foreground py-0"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} className="p-0.5">
                  <X size={16} color="#888" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Featured Promo Banner Card */}
            <View className="bg-card border border-border rounded-2xl p-4 flex-row items-center justify-between shadow-xs">
              <View className="flex-row items-center gap-3 flex-1">
                <View className="size-11 rounded-full bg-purple-500/15 items-center justify-center border border-purple-500/30">
                  <Text className="text-purple-600 font-extrabold text-sm">IH</Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-extrabold text-foreground">Instahelp</Text>
                    <View className="bg-purple-600 px-2 py-0.5 rounded-full">
                      <Text className="text-white text-[9px] font-bold">10 mins</Text>
                    </View>
                  </View>
                  <Text className="text-[10px] text-muted-foreground mt-0.5">
                    1Mn+ Houses • ⭐ 4.8
                  </Text>
                </View>
              </View>
              <Button size="sm" className="bg-muted border border-border px-3 h-8">
                <Text className="text-xs font-bold text-foreground">Book now</Text>
              </Button>
            </View>

            {/* SECTION 1: Visitors & Security */}
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-extrabold text-foreground">Visitors & Security</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  className="bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full flex-row items-center gap-1.5"
                >
                  <AlertCircle size={13} color="#f43f5e" />
                  <Text className="text-xs font-bold text-rose-500">Raise Alert</Text>
                </TouchableOpacity>
              </View>

              {/* 4-Column Grid */}
              <View className="flex-row flex-wrap gap-y-3.5 -mx-1">
                <ActionTile icon={<UserPlus size={20} color="#555" />} label="Invite Guest" onPress={() => handleTileClick('invite_guest')} />
                <ActionTile icon={<Car size={20} color="#555" />} label="Cab/Auto" onPress={() => handleTileClick('cab_auto')} />
                <ActionTile icon={<Truck size={20} color="#555" />} label="Allow Delivery" onPress={() => handleTileClick('allow_delivery')} />
                <ActionTile icon={<Wrench size={20} color="#555" />} label="Visiting Help" onPress={() => handleTileClick('visiting_help')} />

                <ActionTile icon={<Phone size={20} color="#555" />} label="Call Security" onPress={() => handleTileClick('call_security')} />
                <ActionTile icon={<MessageSquare size={20} color="#555" />} label="Message Guard" onPress={() => handleTileClick('message_guard')} />
                <ActionTile icon={<QrCode size={20} color="#555" />} label="MyPasses" onPress={() => handleTileClick('my_passes')} />
                <ActionTile icon={<Baby size={20} color="#555" />} label="Allow Kid Exit" onPress={() => handleTileClick('allow_kid_exit')} />
              </View>
            </View>

            {/* SECTION 2: Community & Dues */}
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-extrabold text-foreground">Community</Text>
                <TouchableOpacity activeOpacity={0.7} className="flex-row items-center gap-1">
                  <Text className="text-xs font-bold text-primary">View all</Text>
                  <ChevronRight size={13} color="#03A9F4" />
                </TouchableOpacity>
              </View>

              {/* 4-Column Grid */}
              <View className="flex-row flex-wrap gap-y-3.5 -mx-1">
                <ActionTile icon={<Users size={20} color="#555" />} label="Residents" onPress={() => handleTileClick('residents')} />
                <ActionTile icon={<SearchCode size={20} color="#555" />} label="Search Vehicle" onPress={() => handleTileClick('search_vehicle')} />
                <ActionTile icon={<UserCheck size={20} color="#555" />} label="Find Daily Help" onPress={() => handleTileClick('daily_help')} />
                <ActionTile icon={<CreditCard size={20} color="#03A9F4" />} label="Billing & Dues" onPress={() => handleTileClick('billing_dues')} />

                <ActionTile icon={<Wallet size={20} color="#06b6d4" />} label="Digital Wallet" onPress={() => handleTileClick('digital_wallet')} />
              </View>
            </View>

            {/* SECTION 3: Facilities & Services */}
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-extrabold text-foreground">Facilities & Services</Text>
                <TouchableOpacity activeOpacity={0.7} className="flex-row items-center gap-1">
                  <Text className="text-xs font-bold text-primary">View all</Text>
                  <ChevronRight size={13} color="#03A9F4" />
                </TouchableOpacity>
              </View>

              {/* 4-Column Grid */}
              <View className="flex-row flex-wrap gap-y-3.5 -mx-1">
                <ActionTile icon={<Wrench size={20} color="#f43f5e" />} label="Helpdesk" onPress={() => handleTileClick('helpdesk')} />
                <ActionTile icon={<Building2 size={20} color="#6366f1" />} label="Book Amenities" onPress={() => handleTileClick('book_amenities')} />
                <ActionTile icon={<Bell size={20} color="#14b8a6" />} label="Notice Board" onPress={() => handleTileClick('notice_board')} />
                <ActionTile icon={<FileText size={20} color="#3b82f6" />} label="Documents" onPress={() => handleTileClick('documents')} />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const ActionTile = ({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) => (
  <View className="w-1/4 px-1">
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="bg-card border border-border rounded-2xl p-2 items-center justify-center gap-2 aspect-square shadow-xs"
    >
      <View className="size-10 rounded-2xl bg-muted/60 items-center justify-center">
        {icon}
      </View>
      <Text
        numberOfLines={2}
        ellipsizeMode="tail"
        className="text-[10px] font-semibold text-foreground text-center leading-tight"
      >
        {label}
      </Text>
    </TouchableOpacity>
  </View>
);

export default QuickActionsAllModal;
