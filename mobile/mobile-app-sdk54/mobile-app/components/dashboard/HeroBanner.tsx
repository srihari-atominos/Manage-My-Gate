import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { ArrowRight, Sparkles, Megaphone, ShieldCheck, Building2, Coins } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = Math.min(SCREEN_WIDTH - 32, 400);

export interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  icon: React.ReactNode;
  bgClass: string;
  borderClass: string;
  pillBg: string;
  ctaBg: string;
  textColor: string;
  subtextColor: string;
  glowColor: string;
}

const BANNERS: BannerItem[] = [
  {
    id: '1',
    title: 'Welcome to Manage My Gate',
    subtitle: 'Your luxury community & digital security management system.',
    tag: 'Community',
    icon: <Megaphone size={12} color="#FBBF24" />,
    bgClass: 'bg-[#121826] border-amber-500/40',
    borderClass: 'border-amber-500/40',
    pillBg: 'bg-amber-500/20 border-amber-400/40',
    ctaBg: 'bg-amber-500/25 border-amber-400/50',
    textColor: 'text-white',
    subtextColor: 'text-amber-100/80',
    glowColor: 'bg-amber-500/20',
  },
  {
    id: '2',
    title: 'Instant QR Visitor Passes',
    subtitle: 'Generate guest passes for seamless touchless gate validation.',
    tag: 'Security Gate',
    icon: <ShieldCheck size={12} color="#34D399" />,
    bgClass: 'bg-[#081F1A] border-emerald-500/40',
    borderClass: 'border-emerald-500/40',
    pillBg: 'bg-emerald-500/20 border-emerald-400/40',
    ctaBg: 'bg-emerald-500/25 border-emerald-400/50',
    textColor: 'text-white',
    subtextColor: 'text-emerald-100/80',
    glowColor: 'bg-emerald-500/20',
  },
  {
    id: '3',
    title: 'Clubhouse & Facility Booking',
    subtitle: 'Reserve community amenities, tennis courts, and slots in seconds.',
    tag: 'Amenities',
    icon: <Building2 size={12} color="#38BDF8" />,
    bgClass: 'bg-[#0C1A38] border-sky-500/40',
    borderClass: 'border-sky-500/40',
    pillBg: 'bg-sky-500/20 border-sky-400/40',
    ctaBg: 'bg-sky-500/25 border-sky-400/50',
    textColor: 'text-white',
    subtextColor: 'text-sky-100/80',
    glowColor: 'bg-sky-500/20',
  },
  {
    id: '4',
    title: 'Zero-Hassle Bill Payments',
    subtitle: 'Pay maintenance dues and top up your digital prepaid wallet.',
    tag: 'Financial Suite',
    icon: <Coins size={12} color="#C084FC" />,
    bgClass: 'bg-[#1F1033] border-purple-500/40',
    borderClass: 'border-purple-500/40',
    pillBg: 'bg-purple-500/20 border-purple-400/40',
    ctaBg: 'bg-purple-500/25 border-purple-400/50',
    textColor: 'text-white',
    subtextColor: 'text-purple-100/80',
    glowColor: 'bg-purple-500/20',
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
    }, 4500);

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
              className={`${banner.bgClass} border ${banner.borderClass} rounded-2xl p-4 gap-2.5 relative overflow-hidden min-h-[148px] justify-between`}
            >
              {/* Ambient Glowing Background Circles */}
              <View
                className={`absolute -right-8 -top-8 size-36 rounded-full ${banner.glowColor} pointer-events-none`}
              />
              <View
                className={`absolute -left-10 -bottom-10 size-32 rounded-full ${banner.glowColor} pointer-events-none`}
              />

              {/* Tag Header */}
              <View className="flex-row items-center justify-between z-10">
                <View className={`${banner.pillBg} border px-2.5 py-1 rounded-full flex-row items-center gap-1.5`}>
                  {banner.icon}
                  <Text className="text-white text-[10.5px] font-bold uppercase tracking-wider font-sans">
                    {banner.tag}
                  </Text>
                </View>

                <Sparkles size={16} color="#ffffff" opacity={0.8} />
              </View>

              {/* Title & Subtitle */}
              <View className="gap-1 pr-2 z-10">
                <Text className={`${banner.textColor} text-[16px] font-extrabold tracking-tight font-sans leading-tight`}>
                  {banner.title}
                </Text>
                <Text className={`${banner.subtextColor} text-[12px] font-medium font-sans leading-snug`}>
                  {banner.subtitle}
                </Text>
              </View>

              {/* CTA Link Button */}
              <View className="flex-row items-center justify-between pt-1 z-10">
                <View className={`${banner.ctaBg} px-3 py-1 rounded-full flex-row items-center gap-1.5 border`}>
                  <Text className="text-white text-[11px] font-bold font-sans">Explore Module</Text>
                  <ArrowRight size={12} color="#ffffff" />
                </View>

                <Text className="text-white/70 text-[10px] font-medium font-sans">Swipe →</Text>
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
