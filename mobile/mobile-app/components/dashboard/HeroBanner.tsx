import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, useWindowDimensions, Pressable } from 'react-native';
import { Text } from '../ui/text';
import { ArrowRight, Sparkles, Megaphone, ShieldCheck, Building2, Coins } from 'lucide-react-native';
import { useTranslation } from '../../src/utils/i18n';

export interface BannerItem {
  id: string;
  tagKey: string;
  titleKey: string;
  subtitleKey: string;
  defaultTag: string;
  defaultTitle: string;
  defaultSubtitle: string;
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
    tagKey: 'tag_community',
    titleKey: 'banner_welcome_title',
    subtitleKey: 'banner_welcome_sub',
    defaultTag: 'Community',
    defaultTitle: 'Welcome to NAHOM',
    defaultSubtitle: 'Nexus Around Home — Connected Harmony & Security.',
    icon: <Megaphone size={12} color="#60A5FA" />,
    bgClass: 'bg-[#0B1437] border-[#245FA8]/50',
    borderClass: 'border-[#245FA8]/40',
    pillBg: 'bg-[#172B70]/80 border-[#245FA8]/50',
    ctaBg: 'bg-[#FF6A00] border-[#FF6A00]',
    textColor: 'text-white',
    subtextColor: 'text-blue-100/90',
    glowColor: 'bg-[#245FA8]/25',
  },
  {
    id: '2',
    tagKey: 'tag_security_gate',
    titleKey: 'banner_qr_title',
    subtitleKey: 'banner_qr_sub',
    defaultTag: 'Security Gate',
    defaultTitle: 'Instant QR Visitor Passes',
    defaultSubtitle: 'Generate guest passes for seamless touchless gate validation.',
    icon: <ShieldCheck size={12} color="#34D399" />,
    bgClass: 'bg-[#061C24] border-emerald-500/40',
    borderClass: 'border-emerald-500/40',
    pillBg: 'bg-emerald-500/20 border-emerald-400/40',
    ctaBg: 'bg-emerald-600 border-emerald-500/50',
    textColor: 'text-white',
    subtextColor: 'text-emerald-100/80',
    glowColor: 'bg-emerald-500/20',
  },
  {
    id: '3',
    tagKey: 'tag_amenities',
    titleKey: 'banner_amenities_title',
    subtitleKey: 'banner_amenities_sub',
    defaultTag: 'Amenities',
    defaultTitle: 'Clubhouse & Facility Booking',
    defaultSubtitle: 'Reserve community amenities, tennis courts, and slots in seconds.',
    icon: <Building2 size={12} color="#A78BFA" />,
    bgClass: 'bg-[#140F2E] border-[#51418F]/50',
    borderClass: 'border-[#51418F]/40',
    pillBg: 'bg-[#51418F]/30 border-[#8A7CE0]/40',
    ctaBg: 'bg-indigo-600 border-indigo-500/50',
    textColor: 'text-white',
    subtextColor: 'text-indigo-100/80',
    glowColor: 'bg-[#51418F]/25',
  },
  {
    id: '4',
    tagKey: 'tag_financial',
    titleKey: 'banner_billing_title',
    subtitleKey: 'banner_billing_sub',
    defaultTag: 'Financial Suite',
    defaultTitle: 'Zero-Hassle Bill Payments',
    defaultSubtitle: 'Pay maintenance dues and top up your digital prepaid wallet.',
    icon: <Coins size={12} color="#FBBF24" />,
    bgClass: 'bg-[#181528] border-amber-500/40',
    borderClass: 'border-amber-500/40',
    pillBg: 'bg-amber-500/20 border-amber-400/40',
    ctaBg: 'bg-[#FF6A00] border-amber-500/50',
    textColor: 'text-white',
    subtextColor: 'text-amber-100/80',
    glowColor: 'bg-amber-500/20',
  },
];

interface HeroBannerProps {
  onBannerPress?: (banner: BannerItem) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onBannerPress }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const bannerWidth = Math.max(280, Math.min(windowWidth - 32, 380));

  useEffect(() => {
    let isMounted = true;
    const timer = setInterval(() => {
      if (!isMounted) return;
      setActiveIndex((prev) => {
        if (!isMounted) return prev;
        const nextIndex = (prev + 1) % BANNERS.length;
        scrollViewRef.current?.scrollTo({
          x: nextIndex * bannerWidth,
          animated: true,
        });
        return nextIndex;
      });
    }, 4500);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [bannerWidth]);

  const handleScrollEnd = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / (bannerWidth + 12));
    if (index >= 0 && index < BANNERS.length) {
      setActiveIndex(index);
    }
  };

  return (
    <View className="w-full py-1">
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        decelerationRate="fast"
        snapToInterval={bannerWidth + 12}
        snapToAlignment="start"
      >
        {BANNERS.map((banner) => (
          <Pressable
            key={banner.id}
            onPress={() => onBannerPress?.(banner)}
            style={{ width: bannerWidth, marginRight: 12 }}
            className="active:opacity-95"
            accessibilityRole="button"
            accessibilityLabel={`${banner.defaultTitle} banner`}
          >
            <View
              className={`${banner.bgClass} border ${banner.borderClass} rounded-2xl p-3 gap-1.5 relative overflow-hidden min-h-[120px] justify-between`}
            >
              {/* Ambient Glowing Background Circles */}
              <View
                className={`absolute -right-8 -top-8 size-28 rounded-full ${banner.glowColor} pointer-events-none`}
              />
              <View
                className={`absolute -left-10 -bottom-10 size-24 rounded-full ${banner.glowColor} pointer-events-none`}
              />

              {/* Tag Header */}
              <View className="flex-row items-center justify-between z-10">
                <View className={`${banner.pillBg} border px-2 py-0.5 rounded-full flex-row items-center gap-1`}>
                  {banner.icon}
                  <Text className="text-white text-[10.5px] font-bold uppercase tracking-wider font-sans">
                    {t(banner.tagKey, banner.defaultTag)}
                  </Text>
                </View>

                <Sparkles size={13} color="#ffffff" opacity={0.8} />
              </View>

              {/* Title & Subtitle */}
              <View className="gap-1 pe-2 z-10">
                <Text className={`${banner.textColor} text-[16px] font-extrabold tracking-tight font-sans leading-tight`}>
                  {t(banner.titleKey, banner.defaultTitle)}
                </Text>
                <Text className={`${banner.subtextColor} text-[12px] font-medium font-sans leading-snug`}>
                  {t(banner.subtitleKey, banner.defaultSubtitle)}
                </Text>
              </View>

              {/* CTA Link Button */}
              <View className="flex-row items-center justify-between pt-0.5 z-10">
                <View className={`${banner.ctaBg} px-2 py-0.5 rounded-full flex-row items-center gap-1 border`}>
                  <Text className="text-white text-[9.5px] font-bold font-sans">{t('explore_module', 'Explore Module')}</Text>
                  <ArrowRight size={10} color="#ffffff" />
                </View>

                <Text className="text-white/70 text-[9px] font-medium font-sans">{t('swipe', 'Swipe →')}</Text>
              </View>
            </View>
          </Pressable>
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
