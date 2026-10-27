import React from 'react';
import { View, Image, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { ArrowUpRight, ShieldCheck } from 'lucide-react-native';

interface CommunityFinanceHeaderProps {
  onPressTransactions?: () => void;
  runwayMonths?: number;
}

/** A deliberately quiet, institutional header for the community's financial record. */
export const CommunityFinanceHeader: React.FC<CommunityFinanceHeaderProps> = ({ onPressTransactions, runwayMonths = 0 }) => (
  <View className="mb-5 overflow-hidden rounded-2xl border shadow-sm" style={{ backgroundColor: '#0C2035', borderColor: '#1D3A56', elevation: 2 }}>
    <View className="h-40 w-full">
      <Image source={require('../../../../assets/images/banners/community_finance_header.png')} className="h-full w-full opacity-40" resizeMode="cover" accessibilityLabel="Community estate architecture" />
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(6, 19, 33, 0.68)' }} />
      <View className="absolute inset-0 justify-between px-5 pb-4 pt-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2 self-start rounded-full border px-2.5 py-1" style={{ borderColor: 'rgba(222, 186, 103, .5)', backgroundColor: 'rgba(222, 186, 103, .12)' }}>
            <View className="size-1.5 rounded-full" style={{ backgroundColor: '#DEBA67' }} />
            <Text className="text-[9px] font-bold uppercase tracking-[1.8px]" style={{ color: '#F4DEA2' }}>Community treasury</Text>
          </View>
          {runwayMonths > 0 && <View className="flex-row items-center gap-1.5"><Icon as={ShieldCheck} size={13} color="#9ED6C0" /><Text className="text-[11px] font-semibold text-white/85">{runwayMonths} months cover</Text></View>}
        </View>
        <View>
          <View className="mb-2 h-px w-10" style={{ backgroundColor: '#DEBA67' }} />
          <View className="flex-row items-end justify-between">
            <View className="flex-1 pe-3"><Text className="text-[22px] font-bold tracking-tight text-white">Financial position</Text><Text className="mt-1 text-[11px] font-medium text-white/65">A clear view of collections, spending and reserve health.</Text></View>
            {onPressTransactions && (
  <Pressable
    onPress={onPressTransactions}
    accessibilityRole="button"
    accessibilityLabel="Open financial ledger"
    className="relative flex-row items-center gap-1.5 overflow-hidden rounded-lg border px-3 py-2"
    style={({ pressed }) => [
      {
        borderColor: 'rgba(244, 222, 162, .55)',
        backgroundColor: pressed ? '#173A58' : '#204666',
        elevation: pressed ? 1 : 5,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: pressed ? 1 : 4 },
        shadowOpacity: pressed ? 0.18 : 0.34,
        shadowRadius: pressed ? 1 : 2,
      },
      pressed && { transform: [{ translateY: 2 }] },
    ]}>
    <View className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: '#0A1B2B' }} />
    <Text className="text-[11px] font-bold" style={{ color: '#F4DEA2' }}>Ledger</Text>
    <Icon as={ArrowUpRight} size={12} color="#F4DEA2" />
  </Pressable>
)}
          </View>
        </View>
      </View>
    </View>
    <View className="h-1" style={{ backgroundColor: '#DEBA67' }} />
  </View>
);

export default CommunityFinanceHeader;