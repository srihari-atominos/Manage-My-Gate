import React, { useState } from 'react';
import { View, Modal, Pressable, ScrollView } from 'react-native';
import { X, Plus, Activity, MessageSquare } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { PulseItem, PulseCategory } from '../types/communityPulseTypes';
import { formatRelativeTime } from '../hooks/useCommunityPulse';

export interface PulseFeedModalProps {
  visible: boolean;
  onClose: () => void;
  pulses: PulseItem[];
  onCreatePulse: () => void;
}

export const PulseFeedModal = ({
  visible,
  onClose,
  pulses,
  onCreatePulse,
}: PulseFeedModalProps) => {
  const [activeCategory, setActiveCategory] = useState<'all' | PulseCategory>('all');

  const filteredPulses = pulses.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="bg-card border-t border-border rounded-t-3xl p-5 gap-4 max-h-[88%] min-h-[50%]">
          {/* Modal Header */}
          <View className="flex-row items-center justify-between pb-2 border-b border-border">
            <View className="flex-row items-center gap-2">
              <View className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 items-center justify-center">
                <Activity size={18} className="text-primary" />
              </View>
              <View>
                <Text className="text-base font-bold text-foreground">Community Pulse</Text>
                <Text className="text-[11px] text-muted-foreground">What's happening around you today</Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              <Button size="sm" onPress={onCreatePulse} leftIcon={Plus} className="h-8 px-3 bg-primary rounded-xl">
                Pulse
              </Button>
              <Pressable onPress={onClose} className="p-1.5 rounded-full active:bg-muted/60">
                <X size={20} className="text-foreground" />
              </Pressable>
            </View>
          </View>

          {/* Category Tabs */}
          <View className="flex-row bg-muted/40 border border-border p-1 rounded-xl gap-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'up_for', label: "I'm Up For" },
              { key: 'looking_for', label: 'Looking For' },
            ].map((tab) => {
              const isSelected = activeCategory === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveCategory(tab.key as any)}
                  className={`flex-1 py-2 rounded-lg items-center ${
                    isSelected ? 'bg-card border border-border shadow-xs' : 'bg-transparent'
                  }`}
                >
                  <Text
                    className={`text-xs ${
                      isSelected ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Active Pulses List */}
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {filteredPulses.length > 0 ? (
              <View className="gap-2.5 pt-1 pb-4">
                {filteredPulses.map((item) => (
                  <View
                    key={item.id}
                    className="bg-card border border-border rounded-2xl p-3.5 gap-2 shadow-xs"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2.5">
                        <View className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
                          <Text className="text-base">{item.emoji || '💬'}</Text>
                        </View>
                        <View>
                          <Text className="text-xs font-bold text-foreground">{item.userName}</Text>
                          {item.userVilla ? (
                            <Text className="text-[10px] text-muted-foreground">{item.userVilla}</Text>
                          ) : null}
                        </View>
                      </View>
                      <Text className="text-[10px] font-mono text-muted-foreground">
                        {formatRelativeTime(item.createdAt)}
                      </Text>
                    </View>

                    <Text className="text-sm text-foreground font-bold px-1">{item.text}</Text>
                    {item.contextText ? (
                      <Text className="text-xs text-muted-foreground font-medium px-1 mt-0.5">
                        {item.contextText}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <View className="items-center justify-center py-10 bg-muted/20 border border-dashed border-border rounded-2xl gap-2">
                <MessageSquare size={24} className="text-muted-foreground" />
                <Text className="text-sm font-semibold text-foreground">No Pulses found 👋</Text>
                <Text className="text-xs text-muted-foreground text-center px-4">
                  Be the first to share what's happening around your community.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default PulseFeedModal;
