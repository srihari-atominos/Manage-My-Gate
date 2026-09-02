import React, { useState } from 'react';
import { View, Modal, Pressable, ScrollView, Image, Alert, Linking } from 'react-native';
import { X, Users, Search, User as UserIcon, MessageCircle, Send, Phone, MessageSquare } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PulseItem } from '@/src/features/communityPulse/types/communityPulseTypes';
import { formatRelativeTime } from '@/src/features/communityPulse/hooks/useCommunityPulse';
import { getStatusTabStyle } from '@/components/ui/statusTabColors';

export interface ResidentDirectoryModalProps {
  visible: boolean;
  onClose: () => void;
  pulses: PulseItem[];
}

export interface ResidentProfileItem {
  id: string;
  name: string;
  villa: string;
  role: string;
  phone: string;
  avatar?: string;
  activePulse?: PulseItem;
  interests: Array<{ name: string; emoji: string }>;
}

const SAMPLE_NEIGHBORS: ResidentProfileItem[] = [
  {
    id: 'n1',
    name: 'Arun Kumar',
    villa: 'Villa 104',
    role: 'Resident',
    phone: '+919876543210',
    interests: [
      { name: 'Badminton', emoji: '🏸' },
      { name: 'Coffee & Chat', emoji: '☕' },
      { name: 'Fitness', emoji: '🏋️' },
    ],
  },
  {
    id: 'n2',
    name: 'Priya Sharma',
    villa: 'Block B - 202',
    role: 'Resident',
    phone: '+919876543211',
    interests: [
      { name: 'Coffee & Chat', emoji: '☕' },
      { name: 'Book Club', emoji: '📚' },
      { name: 'Gardening', emoji: '🌱' },
    ],
  },
  {
    id: 'n3',
    name: 'Karthik Raja',
    villa: 'Villa 210',
    role: 'Resident',
    phone: '+919876543212',
    interests: [
      { name: 'Walking / Jogging', emoji: '🚶' },
      { name: 'Pet Care', emoji: '🐶' },
      { name: 'Gaming', emoji: '🎮' },
    ],
  },
  {
    id: 'n4',
    name: 'Meena Reddy',
    villa: 'Villa 305',
    role: 'Resident',
    phone: '+919876543213',
    interests: [
      { name: 'Gardening', emoji: '🌱' },
      { name: 'Cooking', emoji: '🍳' },
      { name: 'Music', emoji: '🎵' },
    ],
  },
];

export const ResidentDirectoryModal = ({
  visible,
  onClose,
  pulses,
}: ResidentDirectoryModalProps) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active_pulse' | 'interests'>('all');
  const [connectNeighbor, setConnectNeighbor] = useState<ResidentProfileItem | null>(null);
  const [messageText, setMessageText] = useState('');

  const neighborList: ResidentProfileItem[] = SAMPLE_NEIGHBORS.map((neighbor) => {
    const pulse = pulses.find((p) =>
      p.userName.toLowerCase().includes(neighbor.name.split(' ')[0].toLowerCase())
    );
    return { ...neighbor, activePulse: pulse || undefined };
  });

  const filteredNeighbors = neighborList.filter((item) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      item.name.toLowerCase().includes(query) ||
      item.villa.toLowerCase().includes(query) ||
      (item.activePulse && item.activePulse.text.toLowerCase().includes(query)) ||
      item.interests.some((i) => i.name.toLowerCase().includes(query));

    if (!matchesSearch) return false;
    if (activeTab === 'active_pulse') return Boolean(item.activePulse);
    if (activeTab === 'interests') return item.interests.length > 0;
    return true;
  });

  const handleOpenWhatsApp = () => {
    if (!connectNeighbor) return;
    const cleanPhone = connectNeighbor.phone.replace(/[^0-9]/g, '');
    const msg = messageText.trim() || `Hi ${connectNeighbor.name}, saw your status on Community Pulse!`;
    const nativeUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    const webUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    Linking.openURL(nativeUrl).catch(() => {
      Linking.openURL(webUrl).catch(() => {
        Alert.alert('WhatsApp', `Opening WhatsApp for ${connectNeighbor.name}…`);
      });
    });
  };

  const handleMakeCall = () => {
    if (!connectNeighbor) return;
    Linking.openURL(`tel:${connectNeighbor.phone}`).catch(() => {
      Alert.alert('Phone Call', `Dialing ${connectNeighbor.name} at ${connectNeighbor.phone}`);
    });
  };

  const handleSendMessage = () => {
    if (!connectNeighbor) return;
    const finalMsg = messageText.trim() || 'Hi! I saw your status on Community Pulse.';
    Alert.alert('Notification Sent!', `"${finalMsg}" sent to ${connectNeighbor.name}.`);
    setMessageText('');
    setConnectNeighbor(null);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <Pressable className="absolute inset-0" onPress={onClose} />

        <View className="bg-card rounded-t-3xl overflow-hidden" style={{ maxHeight: '92%' }}>
          {/* Grab Handle */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pb-3 border-b border-border">
            <View className="flex-row items-center gap-2.5 flex-1 me-2">
              <Users size={20} className="text-primary" />
              <View className="flex-1">
                <Text className="text-base font-bold text-foreground">Community Directory</Text>
                <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                  Neighbors, pulses & shared interests
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              className="h-8 w-8 rounded-full bg-muted/60 items-center justify-center"
            >
              <X size={16} className="text-foreground" />
            </Pressable>
          </View>

          {/* Search + Tabs + List */}
          <View className="flex-1">
            {/* Search */}
            <View className="px-4 pt-3 pb-2">
              <View className="relative">
                <Input
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search name, villa, or activity…"
                  className="h-10 bg-muted/30 border-border text-foreground text-xs ps-9 rounded-xl"
                />
                <View className="absolute left-3 top-2.5">
                  <Search size={14} className="text-muted-foreground" />
                </View>
                {searchQuery ? (
                  <Pressable onPress={() => setSearchQuery('')} className="absolute right-3 top-2.5">
                    <X size={14} className="text-muted-foreground" />
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Tabs */}
            <View className="flex-row mx-4 mb-3 bg-muted/40 border border-border p-0.5 rounded-xl gap-0.5">
              {[
                { key: 'all', label: 'All' },
                { key: 'active_pulse', label: 'Active Pulses' },
                { key: 'interests', label: 'Interests' },
              ].map((tab) => {
                const isActive = activeTab === tab.key;
                const statusStyle = getStatusTabStyle(tab.key, isActive);
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key as any)}
                    className={`flex-1 py-2 rounded-lg items-center ${
                      isActive ? `${statusStyle.containerClass} shadow-sm` : ''
                    }`}
                  >
                    <Text
                      className={`text-xs ${
                        isActive ? statusStyle.textClass : 'font-medium text-muted-foreground'
                      }`}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Neighbor Cards */}
            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) + 8 }}
            >
              {filteredNeighbors.length > 0 ? (
                filteredNeighbors.map((item) => (
                  <View
                    key={item.id}
                    className="bg-card border border-border rounded-2xl mb-3 overflow-hidden"
                  >
                    {/* Profile Row */}
                    <Pressable
                      onPress={() => setConnectNeighbor(item)}
                      className="flex-row items-center p-3.5 active:bg-muted/30"
                    >
                      <View className="h-11 w-11 rounded-full bg-primary/10 border border-primary/20 items-center justify-center overflow-hidden me-3 shrink-0">
                        {item.avatar ? (
                          <Image source={{ uri: item.avatar }} className="h-full w-full" />
                        ) : (
                          <UserIcon size={20} className="text-primary" />
                        )}
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text className="text-xs text-muted-foreground mt-0.5">
                          {item.villa} • {item.role}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => setConnectNeighbor(item)}
                        className="h-8 px-3 bg-primary/10 border border-primary/20 rounded-full flex-row items-center gap-1.5 active:bg-primary/20"
                      >
                        <MessageCircle size={13} className="text-primary" />
                        <Text className="text-[11px] font-bold text-primary">Connect</Text>
                      </Pressable>
                    </Pressable>

                    {/* Active Pulse */}
                    {item.activePulse ? (
                      <Pressable
                        onPress={() => setConnectNeighbor(item)}
                        className="mx-3.5 mb-3 bg-primary/8 border border-primary/15 rounded-xl p-2.5 flex-row items-center active:opacity-80"
                      >
                        <Text className="text-base me-2">{item.activePulse.emoji || '💬'}</Text>
                        <View className="flex-1 min-w-0 me-2">
                          <Text className="text-xs font-bold text-foreground" numberOfLines={1}>
                            {item.activePulse.text}
                          </Text>
                          {item.activePulse.contextText ? (
                            <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                              {item.activePulse.contextText}
                            </Text>
                          ) : null}
                        </View>
                        <Text className="text-[10px] font-mono text-muted-foreground shrink-0">
                          {formatRelativeTime(item.activePulse.createdAt)}
                        </Text>
                      </Pressable>
                    ) : null}

                    {/* Interest Chips */}
                    <View className="flex-row flex-wrap gap-1.5 px-3.5 pb-3">
                      {item.interests.map((interest, idx) => (
                        <Pressable
                          key={idx}
                          onPress={() => setSearchQuery(interest.name)}
                          className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-muted/30 border border-border active:bg-primary/10"
                        >
                          <Text className="text-[11px]">{interest.emoji}</Text>
                          <Text className="text-[11px] font-semibold text-muted-foreground">
                            {interest.name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))
              ) : (
                <View className="items-center justify-center py-12 gap-2">
                  <Users size={28} className="text-muted-foreground" />
                  <Text className="text-sm font-semibold text-foreground">No neighbors found</Text>
                  <Text className="text-xs text-muted-foreground text-center px-6">
                    Try adjusting your search or filter.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>

        {/* Connect / Communicate Overlay */}
        {connectNeighbor ? (
          <View className="absolute inset-0 bg-black/60 justify-end z-50">
            <Pressable className="absolute inset-0" onPress={() => setConnectNeighbor(null)} />
            <View className="bg-card rounded-t-3xl overflow-hidden">
              <View className="items-center pt-3 pb-1">
                <View className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </View>

              <View className="px-5 pb-2 gap-4">
                {/* Header */}
                <View className="flex-row items-center justify-between pt-1">
                  <View className="flex-row items-center gap-2.5">
                    <View className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
                      <UserIcon size={20} className="text-primary" />
                    </View>
                    <View>
                      <Text className="text-base font-bold text-foreground">
                        {connectNeighbor.name}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {connectNeighbor.villa} • {connectNeighbor.phone}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => setConnectNeighbor(null)}
                    className="h-8 w-8 rounded-full bg-muted/60 items-center justify-center"
                  >
                    <X size={16} className="text-foreground" />
                  </Pressable>
                </View>

                {/* Preset Chips */}
                <View className="gap-2">
                  <Text className="text-xs font-semibold text-muted-foreground">Quick Messages</Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {['Hi neighbor! 👋', 'Up for coffee today? ☕', 'Are you playing badminton? 🏸', 'Quick question! ❓'].map(
                      (chip) => (
                        <Pressable
                          key={chip}
                          onPress={() => setMessageText(chip)}
                          className={`px-3 py-1.5 rounded-full border ${
                            messageText === chip
                              ? 'bg-primary/10 border-primary'
                              : 'bg-muted/30 border-border active:bg-muted/60'
                          }`}
                        >
                          <Text
                            className={`text-xs ${
                              messageText === chip ? 'font-bold text-primary' : 'font-medium text-foreground'
                            }`}
                          >
                            {chip}
                          </Text>
                        </Pressable>
                      )
                    )}
                  </View>
                </View>

                {/* Custom Message */}
                <Input
                  value={messageText}
                  onChangeText={setMessageText}
                  placeholder="Or type a custom message…"
                  className="h-11 bg-muted/20 border-border text-foreground text-xs rounded-xl"
                />

                {/* Action Buttons */}
                <View className="flex-row gap-2">
                  <Button
                    onPress={handleOpenWhatsApp}
                    className="flex-1 bg-emerald-600 rounded-xl h-11 flex-row items-center justify-center gap-2"
                  >
                    <MessageSquare size={16} color="#fff" />
                    <Text className="text-white font-semibold text-xs">WhatsApp</Text>
                  </Button>
                  <Button
                    onPress={handleMakeCall}
                    variant="outline"
                    className="flex-1 border-primary rounded-xl h-11 flex-row items-center justify-center gap-2"
                  >
                    <Phone size={16} className="text-primary" />
                    <Text className="text-primary font-semibold text-xs">Call</Text>
                  </Button>
                </View>

                <Button
                  onPress={handleSendMessage}
                  className="h-11 bg-primary rounded-xl flex-row items-center justify-center gap-2"
                >
                  <Send size={16} className="text-primary-foreground" />
                  <Text className="text-primary-foreground font-bold text-xs">Send In-App Notification</Text>
                </Button>
              </View>
              <View style={{ height: Math.max(insets.bottom, 16) }} />
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

export default ResidentDirectoryModal;
