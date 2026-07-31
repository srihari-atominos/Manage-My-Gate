import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { ArrowRight, Sparkles, Megaphone, AlertCircle, ShieldAlert, Wrench, Calendar, Building2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useHeroNotices, HeroNoticeSlide } from '@/src/features/noticeBoard/hooks/useHeroNotices';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = Math.min(SCREEN_WIDTH - 32, 400);

interface HeroBannerProps {
  onBannerPress?: (banner: HeroNoticeSlide) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onBannerPress }) => {
  const router = useRouter();
  const { slides } = useHeroNotices();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = setInterval(() => {
      const nextIndex = (activeIndex + 1) % slides.length;
      setActiveIndex(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: nextIndex * BANNER_WIDTH,
        animated: true,
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [activeIndex, slides.length]);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / BANNER_WIDTH);
    if (index !== activeIndex && index >= 0 && index < slides.length) {
      setActiveIndex(index);
    }
  };

  const handlePress = (slide: HeroNoticeSlide) => {
    if (onBannerPress) {
      onBannerPress(slide);
    } else {
      router.push(slide.route as any);
    }
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'AlertCircle':
        return <AlertCircle size={12} color="#fff" />;
      case 'ShieldAlert':
        return <ShieldAlert size={12} color="#fff" />;
      case 'Wrench':
        return <Wrench size={12} color="#fff" />;
      case 'Calendar':
        return <Calendar size={12} color="#fff" />;
      case 'Building2':
        return <Building2 size={12} color="#fff" />;
      default:
        return <Megaphone size={12} color="#fff" />;
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
        {slides.map((slide) => (
          <TouchableOpacity
            key={slide.id}
            activeOpacity={0.9}
            onPress={() => handlePress(slide)}
            style={{ width: BANNER_WIDTH }}
            className="px-1"
          >
            <View
              style={{ backgroundColor: slide.cardBgHex || '#047857' }}
              className="rounded-3xl p-5 gap-3 relative overflow-hidden shadow-md"
            >
              {/* Decorative Background Element */}
              <View className="absolute -right-6 -bottom-6 size-28 rounded-full bg-white/10" />

              {/* Badge & Category Header */}
              <View className="flex-row items-center justify-between">
                <View
                  style={{ backgroundColor: slide.badgeBgHex || 'rgba(255, 255, 255, 0.2)' }}
                  className="border border-white/20 px-3 py-1 rounded-full flex-row items-center gap-1.5"
                >
                  {renderIcon(slide.iconName)}
                  <Text
                    style={{ color: slide.badgeTextHex || '#ffffff' }}
                    className="text-[10px] font-extrabold uppercase tracking-wider"
                  >
                    {slide.badgeText}
                  </Text>
                </View>

                <Sparkles size={16} color="#ffffff80" />
              </View>

              {/* Title & Description */}
              <View className="gap-1 pr-6">
                <Text className="text-white text-lg font-black tracking-tight" numberOfLines={1}>
                  {slide.title}
                </Text>
                <Text className="text-white/80 text-xs font-medium" numberOfLines={2}>
                  {slide.description}
                </Text>
              </View>

              {/* Action Link */}
              <View className="flex-row items-center gap-1.5 pt-1">
                <Text className="text-white text-xs font-bold">
                  {slide.isFallback ? 'Explore Notice Board' : 'View Notice Details'}
                </Text>
                <ArrowRight size={14} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Pagination Indicators (rendered if 2 or more notices exist) */}
      {slides.length > 1 && (
        <View className="flex-row justify-center items-center gap-1.5 pt-1">
          {slides.map((_, idx) => (
            <View
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === activeIndex ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default HeroBanner;
