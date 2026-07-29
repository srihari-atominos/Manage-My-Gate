import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Bell, ArrowRight, Sparkles, Megaphone } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = Math.min(SCREEN_WIDTH - 32, 400);

export interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  bgGradient: string;
  badgeBg: string;
}

const BANNERS: BannerItem[] = [
  {
    id: '1',
    title: 'Summer Clubhouse Fest 2026',
    subtitle: 'Register for pool games & live BBQ evening on Saturday',
    tag: 'Notice Board',
    bgGradient: 'bg-indigo-600',
    badgeBg: 'bg-indigo-500/30',
  },
  {
    id: '2',
    title: 'Pre-Approve Visitor Passes',
    subtitle: 'Generate instant QR passes for seamless gate entry',
    tag: 'Security Gate',
    bgGradient: 'bg-emerald-600',
    badgeBg: 'bg-emerald-500/30',
  },
  {
    id: '3',
    title: 'July Maintenance Assessment Due',
    subtitle: 'Pay before 10th July to claim 5% early bird cashback',
    tag: 'Billing & Dues',
    bgGradient: 'bg-amber-600',
    badgeBg: 'bg-amber-500/30',
  },
];

interface HeroBannerProps {
  onBannerPress?: (banner: BannerItem) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onBannerPress }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const nextIndex = (activeIndex + 1) % BANNERS.length;
      setActiveIndex(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: nextIndex * BANNER_WIDTH,
        animated: true,
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [activeIndex]);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / BANNER_WIDTH);
    if (index !== activeIndex && index >= 0 && index < BANNERS.length) {
      setActiveIndex(index);
    }
  };

  return (
    <View className="gap-2.5 my-2">
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={BANNER_WIDTH}
        decelerationRate="fast"
      >
        {BANNERS.map((banner) => (
          <TouchableOpacity
            key={banner.id}
            activeOpacity={0.9}
            onPress={() => onBannerPress && onBannerPress(banner)}
            style={{ width: BANNER_WIDTH }}
            className="px-1"
          >
            <View
              className={`${banner.bgGradient} rounded-3xl p-5 gap-3 relative overflow-hidden shadow-md`}
            >
              {/* Decorative Background Element */}
              <View className="absolute -right-6 -bottom-6 size-28 rounded-full bg-white/10" />

              {/* Tag Header */}
              <View className="flex-row items-center justify-between">
                <View className={`${banner.badgeBg} border border-white/20 px-3 py-1 rounded-full flex-row items-center gap-1.5`}>
                  <Megaphone size={12} color="#fff" />
                  <Text className="text-white text-[10px] font-bold uppercase tracking-wider">
                    {banner.tag}
                  </Text>
                </View>

                <Sparkles size={16} color="#ffffff80" />
              </View>

              {/* Title & Subtitle */}
              <View className="gap-1 pr-6">
                <Text className="text-white text-lg font-black tracking-tight">
                  {banner.title}
                </Text>
                <Text className="text-white/80 text-xs font-medium">
                  {banner.subtitle}
                </Text>
              </View>

              {/* CTA Link */}
              <View className="flex-row items-center gap-1.5 pt-1">
                <Text className="text-white text-xs font-bold">View Notice Details</Text>
                <ArrowRight size={14} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      <View className="flex-row justify-center items-center gap-1.5 pt-1">
        {BANNERS.map((_, idx) => (
          <View
            key={idx}
            className={`h-1.5 rounded-full transition-all ${
              idx === activeIndex ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30'
            }`}
          />
        ))}
      </View>
    </View>
  );
};

export default HeroBanner;
