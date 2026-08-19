import React, { useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { User, Users } from 'lucide-react-native';

interface VoterListBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  poll: any;
  votersGrouped: Record<number, any[]>;
  loading: boolean;
}

export function VoterListBottomSheet({
  visible,
  onClose,
  poll,
  votersGrouped,
  loading,
}: VoterListBottomSheetProps) {
  
  // Flatten the grouped voters into a list with headers for the PaginatedList
  const listData = useMemo(() => {
    if (!poll || !votersGrouped) return [];
    
    const data: any[] = [];
    
    poll.options.forEach((option: any, index: number) => {
      const votersForOption = votersGrouped[index] || [];
      
      // Add section header
      data.push({
        type: 'header',
        id: `header-${index}`,
        title: option.text,
        count: votersForOption.length,
        percentage: poll.options.reduce((sum: number, opt: any) => sum + opt.votesCount, 0) > 0 
          ? Math.round((votersForOption.length / poll.options.reduce((sum: number, opt: any) => sum + opt.votesCount, 0)) * 100) 
          : 0
      });
      
      // Add voters
      votersForOption.forEach((voter: any, vIndex: number) => {
        data.push({
          type: 'voter',
          id: `voter-${index}-${vIndex}`,
          ...voter
        });
      });
      
      // If no voters for this option
      if (votersForOption.length === 0) {
        data.push({
          type: 'empty',
          id: `empty-${index}`
        });
      }
    });
    
    return data;
  }, [poll, votersGrouped]);

  const renderItem = (item: any, index: number) => {
    if (item.type === 'header') {
      return (
        <View className="mt-4 mb-2 flex-row justify-between items-end">
          <Text className="text-foreground font-bold flex-1 text-sm">{item.title}</Text>
          <View className="flex-row items-center gap-1 bg-muted px-2 py-0.5 rounded-full">
            <Users size={12} className="text-muted-foreground" />
            <Text className="text-xs font-semibold text-muted-foreground">
              {item.count} ({item.percentage}%)
            </Text>
          </View>
        </View>
      );
    }
    
    if (item.type === 'empty') {
      return (
        <View className="py-3 px-4 bg-muted/30 rounded-lg border border-border/50 items-center">
          <Text className="text-xs text-muted-foreground italic">No votes yet</Text>
        </View>
      );
    }
    
    return (
      <View className="flex-row items-center p-3 bg-card border border-border rounded-lg mb-2">
        <View className="bg-primary/10 p-2 rounded-full mr-3">
          <User size={16} className="text-primary" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-foreground">{item.name}</Text>
          {item.unit ? (
            <Text className="text-xs text-muted-foreground mt-0.5">Unit {item.unit}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Poll Voters"
    >
      <View className="p-4 bg-background h-[70vh]">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-muted-foreground mt-3">Loading voters...</Text>
          </View>
        ) : !poll ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-muted-foreground">No poll selected</Text>
          </View>
        ) : (
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground mb-1">
              {poll.question}
            </Text>
            <Text className="text-xs text-muted-foreground mb-4">
              Detailed voter breakdown by option
            </Text>
            
            <PaginatedList<any>
              data={listData}
              renderItem={renderItem}
              keyExtractor={(item: any) => item.id}
              loading={loading}
              onRefresh={() => {}}
              onLoadMore={() => {}}
              pagination={{
                currentPage: 1,
                totalPages: 1,
                totalRecords: listData.length,
                limit: Math.max(100, listData.length),
              }}
              contentContainerClassName="pb-6"
            />
          </View>
        )}
      </View>
    </BottomSheet>
  );
}
